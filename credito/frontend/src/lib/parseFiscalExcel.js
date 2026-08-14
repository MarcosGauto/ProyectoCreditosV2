import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"

/**
 * @param {string} label
 * @returns {string}
 */
function normalizeLabel(label) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
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
  const cleaned = text.replace(/[^\d.,\-()%]/g, "").trim()
  if (!cleaned) {
    return null
  }
  return parseBalanceAmount(cleaned.replace("%", ""))
}

/**
 * @param {string} label
 * @param {Array<{ field: string; patterns: RegExp[] }>} labelRules
 * @returns {string | null}
 */
function matchField(label, labelRules) {
  const normalized = normalizeLabel(label)
  if (!normalized) {
    return null
  }

  for (const rule of labelRules) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.field
    }
  }

  return null
}

/**
 * @param {import("xlsx").WorkBook} workbook
 * @param {typeof import("xlsx").utils} utils
 * @param {Array<{ field: string; patterns: RegExp[] }>} labelRules
 * @returns {Partial<Record<string, string>>}
 */
function extractFromWorkbook(workbook, utils, labelRules) {
  /** @type {Partial<Record<string, string>>} */
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
        const field = matchField(label, labelRules)

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
          found[field] = String(
            field === "alicuota" ? value : Math.round(value)
          )
        }
      }
    }
  }

  return found
}

/**
 * @param {File} file
 * @param {Array<{ field: string; patterns: RegExp[] }>} labelRules
 * @returns {Promise<{ values: Partial<Record<string, string>>; detected: string[] }>}
 */
export async function parseLabeledExcelFile(file, labelRules) {
  const XLSX = await import("xlsx")
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
  const extracted = extractFromWorkbook(workbook, XLSX.utils, labelRules)

  return {
    values: extracted,
    detected: Object.keys(extracted),
  }
}
