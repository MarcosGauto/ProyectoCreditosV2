/**
 * Carga presentacional — Revisión Rápida de Cheques.
 * Solo lectura. No escribe en engines ni análisis (salvo append BCRA vía servicio existente).
 * Acepta CUIT con o sin guiones (30-71592848-1 / 30715928481).
 */

import { collection, getDoc, getDocs, doc, orderBy, query, limit } from "firebase/firestore"

import { db } from "@/service/firebase"
import { LatestRepository } from "@/lib/creditAnalysis/repositories/LatestRepository"
import { fetchAndPersistBcraByCuit } from "@/lib/bcra/bcraReportsRepository"
import { fetchChequesRechazadosByCuit } from "@/lib/chequesRechazadosService"
import { normalizeCuit } from "@/lib/chequesRechazadosModel"
import {
  computeBcraMetrics,
  normalizeBcraReport,
} from "@/lib/normalizeBcraReport"

/**
 * Formato XX-XXXXXXXX-X a partir de 11 dígitos.
 * @param {string} digits
 */
function formatCuitDashed(digits) {
  if (digits.length !== 11) return digits
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}

/**
 * Resuelve el id de documento en `empresas` (dígitos o con guiones).
 * @param {string} digits
 */
async function resolveEmpresaDocId(digits) {
  const plainSnap = await getDoc(doc(db, "empresas", digits))
  if (plainSnap.exists()) {
    return { id: digits, snap: plainSnap }
  }
  const dashed = formatCuitDashed(digits)
  const dashedSnap = await getDoc(doc(db, "empresas", dashed))
  if (dashedSnap.exists()) {
    return { id: dashed, snap: dashedSnap }
  }
  return { id: digits, snap: plainSnap }
}

/**
 * @param {string} cuitRaw
 * @param {{ refreshBcra?: boolean; queriedBy?: string | null }} [options]
 */
export async function loadRevisionRapidaCheques(cuitRaw, options = {}) {
  const cuit = normalizeCuit(cuitRaw)
  if (!cuit || cuit.length !== 11) {
    return {
      ok: false,
      error:
        "Ingresá un CUIT válido de 11 dígitos (con o sin guiones), p. ej. 30-71592848-1 o 30715928481.",
      cuit: cuit || "",
    }
  }

  const resolved = await resolveEmpresaDocId(cuit)
  const empresaId = resolved.id
  const bcraCol = collection(db, "empresas", empresaId, "bcra_reports")

  const [latestPlain, chequesRechazados, bcraSnap] = await Promise.all([
    LatestRepository.get(cuit),
    fetchChequesRechazadosByCuit(cuit),
    getDocs(query(bcraCol, orderBy("fetchedAt", "desc"), limit(40))).catch(
      async () => {
        try {
          return await getDocs(bcraCol)
        } catch {
          return { docs: [] }
        }
      }
    ),
  ])

  let latestDoc = latestPlain
  if (!latestDoc && empresaId !== cuit) {
    latestDoc = await LatestRepository.get(empresaId)
  }

  let bcraDocsSnap = bcraSnap
  if ((bcraSnap.docs ?? []).length === 0 && empresaId !== cuit) {
    const altCol = collection(db, "empresas", cuit, "bcra_reports")
    try {
      bcraDocsSnap = await getDocs(
        query(altCol, orderBy("fetchedAt", "desc"), limit(40))
      )
    } catch {
      try {
        bcraDocsSnap = await getDocs(altCol)
      } catch {
        bcraDocsSnap = { docs: [] }
      }
    }
  }

  const empresaExists = resolved.snap.exists()
  const empresa = empresaExists
    ? /** @type {Record<string, unknown>} */ (resolved.snap.data())
    : null

  /** @type {Array<Record<string, unknown>>} */
  const bcraReports = (bcraDocsSnap.docs ?? []).map((d) => ({
    id: d.id,
    ...d.data(),
  }))

  bcraReports.sort((a, b) => reportTs(a) - reportTs(b))

  let liveBcra = null
  let bcraError = null
  let lastBcraFetchedAt = null

  if (options.refreshBcra !== false) {
    try {
      const result = await fetchAndPersistBcraByCuit(cuit, {
        queryOrigin: "manual",
        queriedBy: options.queriedBy ?? null,
      })
      if (result.ok && result.data) {
        liveBcra = result.data
        lastBcraFetchedAt = new Date().toISOString()
      } else {
        bcraError =
          result.error?.message ||
          result.error?.error ||
          "No se pudo consultar BCRA."
      }
    } catch (error) {
      bcraError =
        error instanceof Error ? error.message : "Error al consultar BCRA."
    }
  }

  let bcraSource = liveBcra
  if (!bcraSource && bcraReports.length > 0) {
    const last = bcraReports[bcraReports.length - 1]
    if (!lastBcraFetchedAt) {
      lastBcraFetchedAt = last.fetchedAt ?? null
    }
    bcraSource =
      last.rawPayload && typeof last.rawPayload === "object"
        ? last.rawPayload
        : last
  } else if (bcraReports.length > 0 && !lastBcraFetchedAt) {
    lastBcraFetchedAt = bcraReports[bcraReports.length - 1].fetchedAt ?? null
  }

  const normalized = bcraSource ? normalizeBcraReport(bcraSource) : null
  const metrics = normalized ? computeBcraMetrics(normalized) : null

  return {
    ok: true,
    cuit,
    empresaExists,
    empresa,
    latest: latestDoc,
    chequesRechazados,
    bcraReports,
    liveBcra,
    bcraError,
    lastBcraFetchedAt,
    normalized,
    metrics,
  }
}

/** @deprecated Prefer loadRevisionRapidaCheques */
export const loadRevisionRapidaBundle = loadRevisionRapidaCheques

/**
 * @param {Record<string, unknown>} report
 */
function reportTs(report) {
  const raw = report.fetchedAt ?? report.createdAt ?? 0
  if (typeof raw === "number") return raw
  if (raw && typeof raw === "object" && "toMillis" in raw) {
    return Number(/** @type {{ toMillis: () => number }} */ (raw).toMillis()) || 0
  }
  if (typeof raw === "string") {
    const parsed = Date.parse(raw)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}
