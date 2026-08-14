/**
 * Cartera SC-1.0 — solo lectura de latest.summary.sc1*
 * No ejecuta Score Engine ni Limit Engine.
 */

import {
  formatSc1Estado,
  formatSc1EstadoLabel,
  PORTFOLIO_SC1_ESTADO_OPTIONS,
  resolveSc1EstadoId,
} from "@/components/workspace/sc1EstadoPresentation"

export { PORTFOLIO_SC1_ESTADO_OPTIONS }

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function asFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Extrae KPIs SC-1.0 publicados en summary (nunca asume existencia).
 *
 * @param {Record<string, unknown> | null | undefined} summary
 * @returns {{
 *   hasSc1: boolean;
 *   sc1Score: number | null;
 *   sc1Category: string | null;
 *   sc1Confidence: number | null;
 *   sc1SuggestedLimit: number | null;
 * }}
 */
export function readSummarySc1Fields(summary) {
  const s = summary && typeof summary === "object" ? summary : {}

  const sc1Score = asFiniteNumber(s.sc1Score)
  const sc1Category =
    typeof s.sc1Category === "string" && s.sc1Category.trim()
      ? s.sc1Category.trim()
      : null
  const sc1Confidence = asFiniteNumber(s.sc1Confidence)
  const sc1SuggestedLimit = asFiniteNumber(s.sc1SuggestedLimit)

  const hasSc1 =
    sc1Score != null ||
    sc1Category != null ||
    sc1Confidence != null ||
    sc1SuggestedLimit != null

  return {
    hasSc1,
    sc1Score,
    sc1Category,
    sc1Confidence,
    sc1SuggestedLimit,
  }
}

/**
 * Buckets de presentación para filtrar confidence (valor 0–1 publicado).
 * No es lógica de motor: solo triaje de UI.
 *
 * @param {number | null | undefined} value
 * @returns {"high"|"medium"|"low"|null}
 */
export function portfolioSc1ConfidenceBucket(value) {
  if (value == null || !Number.isFinite(Number(value))) return null
  const n = Number(value)
  if (n >= 0.7) return "high"
  if (n >= 0.4) return "medium"
  return "low"
}

/**
 * @param {number | null | undefined} value
 */
export function formatPortfolioSc1Score(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—"
  return Number(value).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  })
}

/**
 * @param {number | null | undefined} value
 */
export function formatPortfolioSc1Confidence(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—"
  return `${Math.round(Number(value) * 100)} %`
}

/**
 * @param {number | null | undefined} value
 */
export function formatPortfolioSc1Limit(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—"
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(value))
  } catch {
    return String(value)
  }
}

/**
 * Estado SC-1.0 para UI / CSV (a partir del código interno publicado).
 * @param {string | null | undefined} categoryCode
 */
export function formatPortfolioSc1Estado(categoryCode) {
  return formatSc1Estado(categoryCode)
}

/**
 * @param {string | null | undefined} categoryCode
 */
export function formatPortfolioSc1EstadoPlain(categoryCode) {
  return formatSc1EstadoLabel(categoryCode)
}

/** @typedef {{
 *   category: string | null;
 *   confidence: "high"|"medium"|"low"|null;
 *   scoreMin: number | null;
 *   scoreMax: number | null;
 * }} PortfolioSc1FilterState */

/** @type {PortfolioSc1FilterState} */
export const EMPTY_PORTFOLIO_SC1_FILTERS = {
  category: null,
  confidence: null,
  scoreMin: null,
  scoreMax: null,
}

/**
 * @param {PortfolioSc1FilterState} filters
 */
export function hasActivePortfolioSc1Filters(filters) {
  if (!filters) return false
  return (
    Boolean(filters.category) ||
    Boolean(filters.confidence) ||
    filters.scoreMin != null ||
    filters.scoreMax != null
  )
}

/**
 * Filtros SC-1.0 — independientes de los chips legacy.
 * `filters.category` guarda el id de Estado funcional (aprobado, observado, …).
 *
 * @param {Array<{
 *   hasSc1?: boolean;
 *   sc1Score?: number | null;
 *   sc1Category?: string | null;
 *   sc1Confidence?: number | null;
 * }>} rows
 * @param {PortfolioSc1FilterState} filters
 */
export function applyPortfolioSc1Filters(rows, filters) {
  const list = Array.isArray(rows) ? rows : []
  if (!hasActivePortfolioSc1Filters(filters)) return list

  return list.filter((row) => {
    if (!row?.hasSc1) return false

    if (filters.category) {
      const estadoId = resolveSc1EstadoId(row.sc1Category)
      if (estadoId !== filters.category) return false
    }

    if (filters.confidence) {
      if (portfolioSc1ConfidenceBucket(row.sc1Confidence) !== filters.confidence) {
        return false
      }
    }

    if (filters.scoreMin != null) {
      if (row.sc1Score == null || row.sc1Score < filters.scoreMin) return false
    }

    if (filters.scoreMax != null) {
      if (row.sc1Score == null || row.sc1Score > filters.scoreMax) return false
    }

    return true
  })
}

/**
 * @deprecated Prefer PORTFOLIO_SC1_ESTADO_OPTIONS
 * @param {Array<{ sc1Category?: string | null }>} _rows
 * @returns {string[]}
 */
export function collectPortfolioSc1Categories(_rows) {
  return PORTFOLIO_SC1_ESTADO_OPTIONS.map((o) => o.id)
}

/** Opciones UI para confidence */
export const PORTFOLIO_SC1_CONFIDENCE_OPTIONS = [
  { id: "high", label: "Alta" },
  { id: "medium", label: "Media" },
  { id: "low", label: "Baja" },
]
