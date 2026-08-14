import { parseBalanceExcelFile } from "@/lib/parseBalanceExcel"
import {
  extractBalancePdfText,
  getBalanceFileKindFromFile,
} from "@/lib/balance/extractBalancePdfText"
import {
  mapSingleColumnToContableActual,
  parseBalanceFromText,
} from "@/lib/balance/parseBalanceFromText"
import { isBalanceParseSufficient } from "@/lib/balance/balanceParseValidation"
import {
  BALANCE_GEMINI_SATURATED_MESSAGE,
  fetchBalanceGeminiOcr,
} from "@/lib/balance/balanceGeminiOcr"

/**
 * @typedef {"excel" | "parser" | "gemini"} BalanceParseMethod
 * @typedef {"excel" | "pdf" | "image" | "other"} BalanceFileKind
 *
 * @typedef {Object} BalanceParseResult
 * @property {Record<string, string>} values
 * @property {string[]} detected
 * @property {BalanceParseMethod} method
 * @property {BalanceFileKind} fileKind
 * @property {boolean} usedGeminiFallback
 * @property {string} [warning]
 * @property {string} [error]
 */

const MIN_TEXT_LENGTH_FOR_PARSER = 80

/**
 * @param {Record<string, string>} values
 * @param {"single" | "contable"} target
 */
function isParseResultValid(values, target) {
  if (target === "contable") {
    return (
      isBalanceParseSufficient(values, { suffix: "Actual", minFields: 2 }) ||
      isBalanceParseSufficient(values, { suffix: "Anterior", minFields: 2 }) ||
      isBalanceParseSufficient(values, { minFields: 3 })
    )
  }

  return isBalanceParseSufficient(values, { minFields: 3 })
}

/**
 * @param {Record<string, string | number | null>} geminiValues
 * @param {"single" | "contable"} target
 */
function normalizeGeminiValues(geminiValues, target) {
  /** @type {Record<string, string>} */
  const values = {}

  for (const [key, raw] of Object.entries(geminiValues)) {
    if (raw == null || raw === "") {
      continue
    }
    values[key] = String(raw)
  }

  if (target === "contable") {
    const hasDual = Object.keys(values).some(
      (key) => key.endsWith("Actual") || key.endsWith("Anterior")
    )
    if (!hasDual) {
      return mapSingleColumnToContableActual(values)
    }
    return values
  }

  /** @type {Record<string, string>} */
  const single = {}
  for (const [key, raw] of Object.entries(values)) {
    if (key.endsWith("Actual")) {
      single[key.replace(/Actual$/, "")] = raw
      continue
    }
    if (!key.endsWith("Anterior")) {
      single[key] = raw
    }
  }
  return single
}

/**
 * @param {File} file
 * @param {{
 *   target?: "single" | "contable";
 *   onProgress?: (progress: number, status: string) => void;
 * }} [options]
 * @returns {Promise<BalanceParseResult>}
 */
export async function parseBalanceFile(file, options = {}) {
  const target = options.target ?? "contable"
  const fileKind = getBalanceFileKindFromFile(file)

  if (fileKind === "excel") {
    const { values: extracted, detected } = await parseBalanceExcelFile(file)
    const values =
      target === "contable"
        ? mapSingleColumnToContableActual(
            /** @type {Record<string, string>} */ (extracted)
          )
        : /** @type {Record<string, string>} */ (extracted)

    if (!isParseResultValid(values, target)) {
      return {
        values,
        detected,
        method: "excel",
        fileKind,
        usedGeminiFallback: false,
        warning:
          "El Excel no aportó suficientes cuentas clave. Revise y complete manualmente.",
      }
    }

    return {
      values,
      detected,
      method: "excel",
      fileKind,
      usedGeminiFallback: false,
    }
  }

  if (fileKind === "pdf") {
    let text = ""
    try {
      text = await extractBalancePdfText(file)
    } catch (error) {
      console.warn("[parseBalanceFile] PDF text extraction failed", error)
    }

    if (text.length >= MIN_TEXT_LENGTH_FOR_PARSER) {
      const parsed = parseBalanceFromText(text)
      const values =
        target === "contable"
          ? mapSingleColumnToContableActual(parsed)
          : parsed

      if (isParseResultValid(values, target)) {
        return {
          values,
          detected: Object.keys(parsed),
          method: "parser",
          fileKind,
          usedGeminiFallback: false,
        }
      }
    }

    try {
      options.onProgress?.(20, "Procesando balance con IA...")
      const gemini = await fetchBalanceGeminiOcr(file, options.onProgress)
      const values = normalizeGeminiValues(gemini.values, target)

      if (!isParseResultValid(values, target)) {
        return {
          values,
          detected: gemini.detected,
          method: "gemini",
          fileKind,
          usedGeminiFallback: true,
          warning:
            "La IA no detectó suficientes cuentas. Complete los campos manualmente.",
        }
      }

      return {
        values,
        detected: gemini.detected,
        method: "gemini",
        fileKind,
        usedGeminiFallback: true,
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error procesando balance con IA"
      const saturated =
        (error instanceof Error && error.geminiStatus === "UNAVAILABLE") ||
        message.includes("saturado")

      return {
        values: {},
        detected: [],
        method: "parser",
        fileKind,
        usedGeminiFallback: true,
        error: saturated ? BALANCE_GEMINI_SATURATED_MESSAGE : message,
      }
    }
  }

  if (fileKind === "image") {
    try {
      options.onProgress?.(20, "Procesando balance con IA...")
      const gemini = await fetchBalanceGeminiOcr(file, options.onProgress)
      const values = normalizeGeminiValues(gemini.values, target)

      if (!isParseResultValid(values, target)) {
        return {
          values,
          detected: gemini.detected,
          method: "gemini",
          fileKind,
          usedGeminiFallback: true,
          warning:
            "La IA no detectó suficientes cuentas. Complete los campos manualmente.",
        }
      }

      return {
        values,
        detected: gemini.detected,
        method: "gemini",
        fileKind,
        usedGeminiFallback: true,
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error procesando balance con IA"
      const saturated =
        (error instanceof Error && error.geminiStatus === "UNAVAILABLE") ||
        message.includes("saturado")

      return {
        values: {},
        detected: [],
        method: "gemini",
        fileKind,
        usedGeminiFallback: true,
        error: saturated ? BALANCE_GEMINI_SATURATED_MESSAGE : message,
      }
    }
  }

  return {
    values: {},
    detected: [],
    method: "parser",
    fileKind,
    usedGeminiFallback: false,
    error: "Formato de archivo no soportado para lectura automática.",
  }
}
