import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"
import { applyDerivedBalanceFields } from "@/lib/balanceIndicators"

/** @typedef {{ id: string; message: string }} BalanceIndicatorWarning */

const TOLERANCE_RATIO = 0.02

/**
 * @param {number} expected
 * @param {number} actual
 * @returns {boolean}
 */
function exceedsTolerance(expected, actual) {
  const base = Math.max(Math.abs(expected), Math.abs(actual), 1)
  return Math.abs(expected - actual) / base > TOLERANCE_RATIO
}

/**
 * @param {import("@/lib/balanceIndicators").BalanceIndicatorsFormValues} values
 * @returns {BalanceIndicatorWarning[]}
 */
export function computeBalanceIndicatorWarnings(values) {
  /** @type {BalanceIndicatorWarning[]} */
  const warnings = []

  const derived = applyDerivedBalanceFields(values)

  /** @param {string} field */
  const amount = (field) => parseBalanceAmount(derived[field])

  const totalActivo = amount("totalActivo")
  const totalPasivo = amount("totalPasivo")
  const patrimonioNeto = amount("patrimonioNeto")

  if (
    totalActivo !== null &&
    totalPasivo !== null &&
    patrimonioNeto !== null &&
    exceedsTolerance(totalActivo, totalPasivo + patrimonioNeto)
  ) {
    warnings.push({
      id: "patrimonial",
      message: "El balance no se encuentra balanceado.",
    })
  }

  return warnings
}
