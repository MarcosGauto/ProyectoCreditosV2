import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"
import { BALANCE_LABEL_RULES, matchBalanceField } from "@/lib/balance/balanceLabelRules"

/**
 * @param {string} raw
 * @returns {number | null}
 */
function parseAmountToken(raw) {
  const cleaned = String(raw).replace(/[^\d.,\-()]/g, "").trim()
  if (!cleaned) {
    return null
  }
  return parseBalanceAmount(cleaned)
}

/**
 * Extrae montos desde texto plano (PDF o OCR local).
 *
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseBalanceFromText(text) {
  /** @type {Record<string, string>} */
  const found = {}
  const compact = String(text ?? "").replace(/\r/g, "\n")

  const lines = compact.split("\n").map((line) => line.trim()).filter(Boolean)

  for (const line of lines) {
    const field = matchBalanceField(line)
    if (!field || found[field]) {
      continue
    }

    for (const rule of BALANCE_LABEL_RULES) {
      if (rule.field !== field) {
        continue
      }

      for (const pattern of rule.patterns) {
        const labelPattern = pattern.source.replace(/^\^|\$$/g, "")
        const regex = new RegExp(
          `${labelPattern}[\\s:.$]*([\\d.,()\\-]+(?:[\\s\\d.,()\\-]+)?)`,
          "i"
        )
        const match = line.match(regex)
        if (!match?.[1]) {
          continue
        }

        const amount = parseAmountToken(match[1].split(/\s{2,}/)[0])
        if (amount !== null) {
          found[field] = String(Math.round(amount))
          break
        }
      }
    }
  }

  if (Object.keys(found).length > 0) {
    return found
  }

  const joined = compact.replace(/\s+/g, " ")
  for (const rule of BALANCE_LABEL_RULES) {
    if (found[rule.field]) {
      continue
    }

    for (const pattern of rule.patterns) {
      const labelPattern = pattern.source.replace(/^\^|\$$/g, "")
      const regex = new RegExp(
        `${labelPattern}[\\s:.$]*\\$?\\s*([\\d.,()\\-]+)`,
        "i"
      )
      const match = joined.match(regex)
      if (!match?.[1]) {
        continue
      }

      const amount = parseAmountToken(match[1])
      if (amount !== null) {
        found[rule.field] = String(Math.round(amount))
        break
      }
    }
  }

  return found
}

/**
 * @param {Record<string, string>} singleColumn
 * @returns {Record<string, string>}
 */
export function mapSingleColumnToContableActual(singleColumn) {
  /** @type {Record<string, string>} */
  const mapped = {}

  for (const [field, value] of Object.entries(singleColumn)) {
    if (field.endsWith("Actual") || field.endsWith("Anterior")) {
      mapped[field] = value
      continue
    }
    mapped[`${field}Actual`] = value
  }

  return mapped
}
