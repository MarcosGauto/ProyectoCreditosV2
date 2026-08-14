import { getCoeficienteTipoEmpresa } from "@/lib/scoring/prequalification"
import { TIPO_OPERACION } from "@/lib/coverageRequirements"

/** @typedef {import("@/lib/balance/balanceGeminiAnalysis").BalanceGeminiAnalysisResult} BalanceGeminiAnalysisResult */

export const DRAFT_FIELD_KEYS = [
  "tipoEmpresa",
  "coeficienteEmpresa",
  "tipoContribuyente",
  "recomendacionAnalista",
  "montoCreditoOtorgado",
  "tipoOperacion",
  "fechaInicioActividad",
  "facturasAlContado",
  "analisisBalanceIA",
]

/**
 * @param {Record<string, unknown> | null | undefined} source
 */
export function pickDraftFields(source) {
  if (!source || typeof source !== "object") {
    return {}
  }

  /** @type {Record<string, unknown>} */
  const picked = {}

  for (const key of DRAFT_FIELD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      picked[key] = source[key]
    }
  }

  return picked
}

/**
 * @param {Record<string, unknown>} delta
 */
export function normalizeDraftDelta(delta) {
  /** @type {Record<string, unknown>} */
  const normalized = {}

  if (Object.prototype.hasOwnProperty.call(delta, "tipoEmpresa")) {
    const tipoEmpresa =
      typeof delta.tipoEmpresa === "string" && delta.tipoEmpresa.trim()
        ? delta.tipoEmpresa.trim()
        : null
    normalized.tipoEmpresa = tipoEmpresa
  }

  if (
    Object.prototype.hasOwnProperty.call(delta, "coeficienteEmpresa") ||
    Object.prototype.hasOwnProperty.call(delta, "tipoEmpresa")
  ) {
    const tipoEmpresa =
      typeof normalized.tipoEmpresa === "string"
        ? normalized.tipoEmpresa
        : typeof delta.tipoEmpresa === "string" && delta.tipoEmpresa.trim()
          ? delta.tipoEmpresa.trim()
          : null

    const coeficienteEmpresa =
      delta.coeficienteEmpresa != null &&
      Number.isFinite(Number(delta.coeficienteEmpresa)) &&
      Number(delta.coeficienteEmpresa) > 0
        ? Number(delta.coeficienteEmpresa)
        : tipoEmpresa
          ? getCoeficienteTipoEmpresa(tipoEmpresa)
          : null

    normalized.coeficienteEmpresa = coeficienteEmpresa
  }

  if (Object.prototype.hasOwnProperty.call(delta, "tipoContribuyente")) {
    normalized.tipoContribuyente =
      typeof delta.tipoContribuyente === "string" &&
      delta.tipoContribuyente.trim()
        ? delta.tipoContribuyente.trim()
        : null
  }

  if (Object.prototype.hasOwnProperty.call(delta, "recomendacionAnalista")) {
    normalized.recomendacionAnalista =
      typeof delta.recomendacionAnalista === "string"
        ? delta.recomendacionAnalista
        : ""
  }

  if (Object.prototype.hasOwnProperty.call(delta, "montoCreditoOtorgado")) {
    normalized.montoCreditoOtorgado =
      delta.montoCreditoOtorgado != null &&
      Number.isFinite(Number(delta.montoCreditoOtorgado)) &&
      Number(delta.montoCreditoOtorgado) >= 0
        ? Number(delta.montoCreditoOtorgado)
        : null
  }

  if (Object.prototype.hasOwnProperty.call(delta, "tipoOperacion")) {
    const tipoOperacion = delta.tipoOperacion
    normalized.tipoOperacion =
      tipoOperacion === TIPO_OPERACION.NOMINADO ||
      tipoOperacion === TIPO_OPERACION.DISCRECIONAL
        ? tipoOperacion
        : null
  }

  if (Object.prototype.hasOwnProperty.call(delta, "fechaInicioActividad")) {
    normalized.fechaInicioActividad =
      typeof delta.fechaInicioActividad === "string" &&
      delta.fechaInicioActividad.trim()
        ? delta.fechaInicioActividad.trim()
        : null
  }

  if (Object.prototype.hasOwnProperty.call(delta, "facturasAlContado")) {
    const value = delta.facturasAlContado
    normalized.facturasAlContado =
      value === true || value === false ? value : null
  }

  if (Object.prototype.hasOwnProperty.call(delta, "analisisBalanceIA")) {
    const value = delta.analisisBalanceIA
    normalized.analisisBalanceIA =
      value && typeof value === "object" ? value : null
  }

  return pickDraftFields(normalized)
}

/**
 * @param {unknown} left
 * @param {unknown} right
 */
function draftFieldValuesEqual(left, right) {
  if (left === right) {
    return true
  }

  if (left == null && right == null) {
    return true
  }

  if (
    typeof left === "object" &&
    left !== null &&
    typeof right === "object" &&
    right !== null
  ) {
    return JSON.stringify(left) === JSON.stringify(right)
  }

  return false
}

/**
 * Comparación superficial por whitelist (sin diff profundo del estado completo).
 *
 * @param {Record<string, unknown> | null | undefined} current
 * @param {Record<string, unknown> | null | undefined} baseline
 */
export function draftPartialDiffersFromPublished(current, baseline) {
  const left = pickDraftFields(current ?? {})
  const right = pickDraftFields(baseline ?? {})

  for (const key of DRAFT_FIELD_KEYS) {
    if (!draftFieldValuesEqual(left[key], right[key])) {
      return true
    }
  }

  return false
}
