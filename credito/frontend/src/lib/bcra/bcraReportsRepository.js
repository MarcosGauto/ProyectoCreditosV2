import { db } from "@/service/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

import { fetchBcraByCuit } from "@/lib/fetchBcra"
import {
  computeBcraMetrics,
  normalizeBcraReport,
} from "@/lib/normalizeBcraReport"
import { saveBcraData } from "@/lib/bcraStorage"

/** @typedef {"manual" | "automatic" | "refresh"} BcraQueryOrigin */

/**
 * @typedef {{
 *   queryOrigin?: BcraQueryOrigin;
 *   queriedBy?: string | null;
 * }} BcraPersistMeta
 */

/**
 * @param {string} cuit
 */
function bcraReportsCol(cuit) {
  return collection(db, "empresas", cuit, "bcra_reports")
}

/**
 * Persiste una respuesta exitosa del API BCRA en Firestore (append-only).
 *
 * @param {string} cuit
 * @param {Record<string, unknown>} apiData
 * @param {BcraPersistMeta} [meta]
 * @returns {Promise<string | null>}
 */
export async function saveBcraReportFromApi(cuit, apiData, meta = {}) {
  const id = String(cuit).replace(/\D/g, "")
  if (!id || !apiData || typeof apiData !== "object") {
    return null
  }

  const normalized = normalizeBcraReport(apiData)
  const metrics = computeBcraMetrics(normalized)
  const queryOrigin = meta.queryOrigin ?? "automatic"

  const docRef = await addDoc(bcraReportsCol(id), {
    cuit: id,
    fetchedAt: serverTimestamp(),
    source: "api",
    queryOrigin,
    queriedBy: meta.queriedBy ?? null,
    denominacion: normalized.denominacion,
    entidades: normalized.entidades,
    resumen:
      apiData.resumen && typeof apiData.resumen === "object"
        ? apiData.resumen
        : null,
    montoFormato: normalized.montoFormato ?? apiData.montoFormato ?? "PESOS",
    estadoDeuda: apiData.estadoDeuda ?? null,
    metrics,
    rawPayload: apiData,
  })

  return docRef.id
}

/**
 * Consulta BCRA, persiste en Firestore y actualiza sessionStorage.
 *
 * @param {string} cuit
 * @param {BcraPersistMeta} [meta]
 */
export async function fetchAndPersistBcraByCuit(cuit, meta = {}) {
  const result = await fetchBcraByCuit(cuit)

  if (result.ok && result.data) {
    saveBcraData(cuit, result.data)
    try {
      await saveBcraReportFromApi(cuit, result.data, meta)
    } catch (error) {
      console.error("[bcraReportsRepository] save", error)
    }
  }

  return result
}

/**
 * Convierte un documento almacenado en Firestore al formato consumible por la UI.
 *
 * @param {Record<string, unknown> | null | undefined} storedDoc
 */
export function bcraReportDocToDisplaySource(storedDoc) {
  if (!storedDoc || typeof storedDoc !== "object") {
    return null
  }

  const rawPayload = storedDoc.rawPayload
  if (rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)) {
    return /** @type {Record<string, unknown>} */ (rawPayload)
  }

  return storedDoc
}
