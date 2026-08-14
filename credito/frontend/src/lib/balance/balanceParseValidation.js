import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"

/** Campos mínimos para considerar una lectura válida. */
export const BALANCE_PARSE_KEY_FIELDS = [
  "activoCorriente",
  "pasivoCorriente",
  "patrimonioNeto",
  "totalActivo",
  "ventas",
  "resultadoNeto",
]

/**
 * @param {Record<string, unknown>} values
 * @param {{ minFields?: number; suffix?: "" | "Actual" | "Anterior" }} [options]
 */
export function isBalanceParseSufficient(values, options = {}) {
  const minFields = options.minFields ?? 3
  const suffix = options.suffix ?? ""

  let found = 0
  for (const base of BALANCE_PARSE_KEY_FIELDS) {
    const key = suffix ? `${base}${suffix}` : base
    const amount = parseBalanceAmount(values[key])
    if (amount !== null && amount !== 0) {
      found += 1
    }
  }

  return found >= minFields
}

/**
 * @param {Record<string, unknown>} values
 */
export function countBalanceParseFields(values) {
  const keys = new Set()

  for (const key of Object.keys(values)) {
    const amount = parseBalanceAmount(values[key])
    if (amount !== null) {
      keys.add(key)
    }
  }

  return keys.size
}
