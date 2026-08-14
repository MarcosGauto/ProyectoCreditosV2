import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"
import { EMPTY_BALANCE_INDICATORS } from "@/lib/balanceIndicators"
import {
  BALANCE_LABEL_RULES,
  matchBalanceField,
  normalizeBalanceLabel,
} from "@/lib/balance/balanceLabelRules"

/** @type {Array<{ field: keyof typeof EMPTY_BALANCE_INDICATORS; patterns: RegExp[] }>} */
const LABEL_RULES = BALANCE_LABEL_RULES

/**
 * @param {string} label
 * @returns {string}
 */
function normalizeLabel(label) {
  return normalizeBalanceLabel(label)
}

/**
 * @param {string} label
 * @returns {keyof typeof EMPTY_BALANCE_INDICATORS | null}
 */
function matchField(label) {
  return matchBalanceField(label)
}

/**
 * @param {unknown} cell
 * @returns {string}
 */
function cellToText(cell) {
  if (cell == null) {
    return ""
  }
  if (typeof cell === "number" && Number.isFinite(cell)) {
    return String(cell)
  }
  return String(cell).trim()
}

/**
 * @param {string} text
 * @returns {number | null}
 */
function parseNumericCell(text) {
  const cleaned = text.replace(/[^\d.,\-()]/g, "").trim()
  if (!cleaned) {
    return null
  }
  return parseBalanceAmount(cleaned)
}

/**
 * @param {import("xlsx").WorkBook} workbook
 * @param {typeof import("xlsx").utils} utils
 * @returns {Partial<typeof EMPTY_BALANCE_INDICATORS>}
 */
function extractFromWorkbook(workbook, utils) {
  /** @type {Partial<typeof EMPTY_BALANCE_INDICATORS>} */
  const found = {}

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet || !sheet["!ref"]) {
      continue
    }

    const range = utils.decode_range(sheet["!ref"])

    for (let row = range.s.r; row <= range.e.r; row += 1) {
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const address = utils.encode_cell({ r: row, c: col })
        const cell = sheet[address]
        const label = cellToText(cell?.v ?? cell?.w)
        const field = matchField(label)

        if (!field || found[field]) {
          continue
        }

        let value = null
        for (let offset = 1; offset <= 3; offset += 1) {
          const rightAddress = utils.encode_cell({ r: row, c: col + offset })
          const rightCell = sheet[rightAddress]
          value = parseNumericCell(cellToText(rightCell?.v ?? rightCell?.w))
          if (value !== null) {
            break
          }

          const belowAddress = utils.encode_cell({ r: row + offset, c: col })
          const belowCell = sheet[belowAddress]
          value = parseNumericCell(cellToText(belowCell?.v ?? belowCell?.w))
          if (value !== null) {
            break
          }
        }

        if (value !== null) {
          found[field] = String(Math.round(value))
        }
      }
    }
  }

  return found
}

/**
 * @param {File} file
 * @returns {Promise<{ values: Partial<typeof EMPTY_BALANCE_INDICATORS>; detected: string[] }>}
 */
export async function parseBalanceExcelFile(file) {
  const XLSX = await import("xlsx")
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
  const extracted = extractFromWorkbook(workbook, XLSX.utils)

  return {
    values: extracted,
    detected: Object.keys(extracted),
  }
}
