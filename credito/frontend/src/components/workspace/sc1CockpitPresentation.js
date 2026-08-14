/**
 * Presentación UI de códigos SC-1.0 (Decision Cockpit).
 * Traduce códigos del motor; no inventa lógica de decisión.
 */

/** @typedef {import("@/lib/creditLimit/result/decisionTraceTypes").DecisionStepCode} DecisionStepCode */
/** @typedef {import("@/lib/creditLimit/result/suggestedLimitTypes").LimitDecisionCode} LimitDecisionCode */
/** @typedef {import("@/lib/creditLimit/result/suggestedLimitTypes").LimitOrigin} LimitOrigin */

/** @type {Record<string, string>} */
const DECISION_CODE_LABELS = {
  approve_suggested: "Aprobar sugerido",
  approve_with_conditions: "Aprobar con condiciones",
  deny: "Denegar",
  review_manual: "Revisión manual",
  insufficient_data: "Datos insuficientes",
  disabled: "Deshabilitado",
  invalid_policy: "Política inválida",
  not_implemented: "No implementado",
}

/** @type {Record<string, string>} */
const LIMIT_ORIGIN_LABELS = {
  ALGORITHM: "Algoritmo",
  POLICY: "Política",
  MANUAL: "Manual",
  OVERRIDE: "Override",
}

/** @type {Record<string, string>} */
const CONFIDENCE_LEVEL_LABELS = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
}

/** @type {Record<string, string>} */
const STEP_CODE_LABELS = {
  score: "Score",
  category: "Categoría",
  base_limit: "Límite base",
  confidence: "Confidence",
  confidence_adjustment: "Ajuste por confidence",
  coverage: "Cobertura",
  coverage_restriction: "Restricción de cobertura",
  sales_metric: "Métrica de ventas",
  commercial_ceiling: "Techo comercial",
  guarantees: "Garantías",
  conditions: "Condiciones",
  manual_override: "Override manual",
  final_result: "Resultado final",
}

/** @type {Record<string, string>} */
const STAGE_LABELS = {
  category_base: "Base por categoría",
  confidence: "Confidence",
  coverage: "Cobertura",
  commercial_ceiling: "Techo comercial",
  guarantees: "Garantías",
  manual_override: "Override",
  result: "Resultado",
}

/**
 * @param {string | null | undefined} code
 */
export function labelDecisionCode(code) {
  if (!code) return "—"
  return DECISION_CODE_LABELS[code] ?? code
}

/**
 * @param {string | null | undefined} origin
 */
export function labelLimitOrigin(origin) {
  if (!origin) return "—"
  return LIMIT_ORIGIN_LABELS[origin] ?? origin
}

/**
 * @param {string | null | undefined} level
 * @param {string | null | undefined} fallbackLabel
 */
export function labelConfidenceLevel(level, fallbackLabel) {
  if (fallbackLabel) return fallbackLabel
  if (!level) return "—"
  return CONFIDENCE_LEVEL_LABELS[level] ?? level
}

/**
 * @param {string | null | undefined} code
 */
export function labelStepCode(code) {
  if (!code) return "—"
  return STEP_CODE_LABELS[code] ?? code
}

/**
 * @param {string | null | undefined} stage
 */
export function labelPipelineStage(stage) {
  if (!stage) return "—"
  return STAGE_LABELS[stage] ?? stage
}

/**
 * @param {number | null | undefined} value
 * @param {string} [currency]
 */
export function formatSc1Amount(value, currency = "ARS") {
  if (value == null || !Number.isFinite(Number(value))) return "—"
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency || "ARS",
      maximumFractionDigits: 0,
    }).format(Number(value))
  } catch {
    return `${Number(value).toLocaleString("es-AR")} ${currency || ""}`.trim()
  }
}

/**
 * @param {number | null | undefined} value
 * @param {number} [digits]
 */
export function formatSc1Number(value, digits = 0) {
  if (value == null || !Number.isFinite(Number(value))) return "—"
  return Number(value).toLocaleString("es-AR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

/**
 * @param {number | null | undefined} value 0–1
 */
export function formatSc1ConfidencePct(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—"
  return `${Math.round(Number(value) * 100)} %`
}

/**
 * @param {{ termMonths?: number | null; maxTermMonths?: number | null } | null | undefined} term
 */
export function formatSc1Term(term) {
  if (!term) return "—"
  const months = term.termMonths
  const max = term.maxTermMonths
  if (months == null && max == null) return "—"
  if (months != null && max != null && months !== max) {
    return `${months}–${max} meses`
  }
  const v = months ?? max
  return v != null ? `${v} meses` : "—"
}
