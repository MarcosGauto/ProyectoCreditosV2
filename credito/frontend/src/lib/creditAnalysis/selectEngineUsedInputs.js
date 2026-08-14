import { resolveBalancePair } from "@/lib/balancePairModel"
import {
  balanceContableLatestEjercicioLegacyDoc,
  hasBalanceContableIndicators,
  isBalanceContableSchema,
} from "@/lib/balanceContableModel"
import { getLatestDocument } from "@/lib/getLatestDocumentPeriod"
import { getLatestNosisReport } from "@/lib/nosisModel"
import { pickLatestBcraDocument } from "@/lib/normalizeBcraReport"

/**
 * @param {unknown[]} docs
 */
function withPreservedIds(docs) {
  if (!Array.isArray(docs)) {
    return []
  }

  return docs.map((doc) => {
    if (!doc || typeof doc !== "object") {
      return doc
    }
    const row = /** @type {Record<string, unknown>} */ ({ ...doc })
    const id = String(row.id ?? row.firestoreId ?? row.documentoId ?? "").trim()
    return id ? { id, ...row } : row
  })
}

/**
 * IVA usados por el motor: confirmados si existen; si no, todos los cargados.
 *
 * @param {unknown[]} iva
 */
export function selectIvaUsedByEngine(iva) {
  const rows = withPreservedIds(iva)
  const confirmed = rows.filter(
    (row) =>
      row &&
      typeof row === "object" &&
      String(/** @type {{ validationStatus?: string }} */ (row).validationStatus ?? "") ===
        "confirmed"
  )
  return confirmed.length > 0 ? confirmed : rows
}

/**
 * IIBB usados por pre-calificación (confirmados) y motor (promedio sobre el mismo criterio).
 *
 * @param {unknown[]} iibb
 */
export function selectIibbUsedByEngine(iibb) {
  const rows = withPreservedIds(iibb)
  const confirmed = rows.filter(
    (row) =>
      row &&
      typeof row === "object" &&
      String(/** @type {{ validationStatus?: string }} */ (row).validationStatus ?? "") ===
        "confirmed"
  )
  return confirmed.length > 0 ? confirmed : rows
}

/**
 * Balances usados por el motor / pre-calificación.
 *
 * @param {Record<string, unknown> | null | undefined} balanceContable
 * @param {unknown[]} balances
 */
export function selectBalancesUsedByEngine(balanceContable, balances) {
  if (balanceContable && hasBalanceContableIndicators(balanceContable)) {
    return []
  }

  const docs = Array.isArray(balances)
    ? balances.filter((item) => item && typeof item === "object")
    : []

  const contableRow = docs.find((doc) =>
    isBalanceContableSchema(/** @type {Record<string, unknown>} */ (doc))
  )
  if (contableRow) {
    return withPreservedIds([contableRow])
  }

  const pair = resolveBalancePair(docs)
  const used = [pair.actual, pair.anterior].filter(Boolean)
  if (used.length > 0) {
    return withPreservedIds(used)
  }

  const latest = getLatestDocument(docs)
  return latest ? withPreservedIds([latest]) : []
}

/**
 * BCRA usados en cobertura (historial de periodos) + análisis (último informe).
 *
 * @param {unknown[]} bcraReports
 * @param {string | null | undefined} explicitReportId
 */
export function selectBcraReportsUsedByEngine(bcraReports, explicitReportId = null) {
  const rows = withPreservedIds(bcraReports)
  if (rows.length === 0) {
    return []
  }

  const byId = new Map(
    rows.map((row) => [
      String(/** @type {{ id?: string }} */ (row).id ?? ""),
      row,
    ])
  )

  /** @type {unknown[]} */
  const selected = []

  const latest = pickLatestBcraDocument(
    /** @type {Record<string, unknown>[]} */ (rows)
  )
  if (latest) {
    selected.push(latest)
  }

  if (explicitReportId && byId.has(explicitReportId)) {
    const explicit = byId.get(explicitReportId)
    if (
      explicit &&
      !selected.some(
        (row) =>
          String(/** @type {{ id?: string }} */ (row).id ?? "") === explicitReportId
      )
    ) {
      selected.push(explicit)
    }
  }

  for (const row of rows) {
    const periodos = /** @type {{ periodos?: unknown }} */ (row).periodos
    if (Array.isArray(periodos) && periodos.length > 0) {
      const id = String(/** @type {{ id?: string }} */ (row).id ?? "")
      if (!selected.some((item) => String(/** @type {{ id?: string }} */ (item).id ?? "") === id)) {
        selected.push(row)
      }
    }
  }

  return withPreservedIds(selected)
}

/**
 * @param {{
 *   empresa?: Record<string, unknown> | null;
 *   balances?: unknown[];
 *   balanceContable?: Record<string, unknown> | null;
 *   iva?: unknown[];
 *   iibb?: unknown[];
 *   nosis?: unknown[];
 *   bcraReports?: unknown[];
 *   bcraReportId?: string | null;
 *   chequesRechazados?: unknown[];
 *   analistaConfig?: Record<string, unknown>;
 * }} params
 */
export function selectEngineUsedInputs(params) {
  const usedIva = selectIvaUsedByEngine(params.iva ?? [])
  const usedIibb = selectIibbUsedByEngine(params.iibb ?? [])
  const usedBalances = selectBalancesUsedByEngine(
    params.balanceContable,
    params.balances ?? []
  )
  const usedBcraReports = selectBcraReportsUsedByEngine(
    params.bcraReports ?? [],
    params.bcraReportId ?? null
  )

  const latestNosis = getLatestNosisReport(params.nosis ?? [])
  const latestBcraDoc = pickLatestBcraDocument(
    /** @type {Record<string, unknown>[]} */ (usedBcraReports)
  )

  let bcraDoc = latestBcraDoc
  if (params.bcraReportId) {
    const explicit = usedBcraReports.find((row) => {
      if (!row || typeof row !== "object") {
        return false
      }
      return String(/** @type {{ id?: string }} */ (row).id ?? "") === params.bcraReportId
    })
    if (explicit && typeof explicit === "object") {
      bcraDoc = /** @type {Record<string, unknown>} */ (explicit)
    }
  }

  const cheques = withPreservedIds(params.chequesRechazados ?? [])

  return {
    usedIva,
    usedIibb,
    usedBalances,
    usedBcraReports,
    latestNosis,
    bcraDoc,
    cheques,
    balanceContable: params.balanceContable ? { ...params.balanceContable } : null,
    empresa: params.empresa ?? null,
    analistaConfig: params.analistaConfig ?? {},
  }
}
