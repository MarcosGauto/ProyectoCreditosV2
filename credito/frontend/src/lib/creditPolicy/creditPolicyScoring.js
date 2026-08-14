/** @typedef {import("./creditPolicyTypes").CreditPolicyIndicator} CreditPolicyIndicator */
/** @typedef {import("./creditPolicyTypes").CreditPolicyEstadoGeneral} CreditPolicyEstadoGeneral */

const SCORING_TARGET = 100

/**
 * @param {number} total
 * @param {"scoring" | "ponderación general"} contextLabel
 */
function buildWeightValidation(total, contextLabel) {
  const delta = SCORING_TARGET - total
  const disponible = Math.max(0, delta)

  if (total === SCORING_TARGET) {
    return {
      total,
      disponible: 0,
      isValid: true,
      status: /** @type {const} */ ("valid"),
      delta: 0,
      message: "✅ Configuración válida.",
    }
  }

  if (total < SCORING_TARGET) {
    const faltante = SCORING_TARGET - total
    return {
      total,
      disponible: faltante,
      isValid: false,
      status: /** @type {const} */ ("under"),
      delta: faltante,
      message: `⚠ Faltan ${faltante}% para completar la ${contextLabel}.`,
    }
  }

  const excedente = total - SCORING_TARGET
  return {
    total,
    disponible: 0,
    isValid: false,
    status: /** @type {const} */ ("over"),
    delta: -excedente,
    message: `⚠ Excede ${excedente}% del máximo permitido.`,
  }
}

/**
 * Suma de pesos de indicadores con Activo=true e Impacta Score=true.
 *
 * @param {CreditPolicyIndicator[]} indicators
 * @returns {number}
 */
export function computeScoringWeightTotal(indicators = []) {
  return indicators
    .filter((row) => row.activo && row.impactaScore)
    .reduce((sum, row) => {
      const peso = Number(row.peso)
      return sum + (Number.isFinite(peso) ? peso : 0)
    }, 0)
}

/**
 * @param {CreditPolicyIndicator[]} indicators
 */
export function getScoringWeightValidation(indicators = []) {
  const total = computeScoringWeightTotal(indicators)
  return buildWeightValidation(total, "scoring")
}

export const SCORING_WEIGHT_SAVE_BLOCKED_MESSAGE =
  "No es posible guardar una política de scoring cuya suma de pesos sea distinta de 100%."

/**
 * @param {CreditPolicyEstadoGeneral | null | undefined} estadoGeneral
 * @returns {number}
 */
export function computeGeneralScoreWeightTotal(estadoGeneral) {
  if (!estadoGeneral) {
    return 0
  }
  const fin = Number(estadoGeneral.scoreFinancieroPeso)
  const nosis = Number(estadoGeneral.scoreNosisPeso)
  return (Number.isFinite(fin) ? fin : 0) + (Number.isFinite(nosis) ? nosis : 0)
}

/**
 * @param {CreditPolicyEstadoGeneral | null | undefined} estadoGeneral
 */
export function getGeneralScoreWeightValidation(estadoGeneral) {
  const total = computeGeneralScoreWeightTotal(estadoGeneral)
  return buildWeightValidation(total, "ponderación general")
}

export const GENERAL_SCORE_WEIGHT_SAVE_BLOCKED_MESSAGE =
  "No es posible guardar una política cuya ponderación general sea distinta de 100%."
