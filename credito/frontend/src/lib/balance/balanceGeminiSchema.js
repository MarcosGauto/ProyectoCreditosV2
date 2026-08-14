import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"
import { fieldForColumn } from "@/lib/balanceContableModel"
import {
  BALANCE_COMPUTED_FIELDS,
  BALANCE_RESULTADOS_FIELDS,
  BALANCE_STRUCTURAL_BASE_FIELDS,
} from "@/lib/balanceContableFormConfig"

const GEMINI_BALANCE_FIELDS = [
  "ejercicioActual",
  "ejercicioAnterior",
  "fechaCierreActual",
  "fechaCierreAnterior",
  "moneda",
  ...BALANCE_STRUCTURAL_BASE_FIELDS.flatMap((base) => [
    fieldForColumn(base, "actual"),
    fieldForColumn(base, "anterior"),
  ]),
  ...BALANCE_COMPUTED_FIELDS.flatMap((base) => [
    fieldForColumn(base, "actual"),
    fieldForColumn(base, "anterior"),
  ]),
  ...BALANCE_RESULTADOS_FIELDS.flatMap((base) => [
    fieldForColumn(base, "actual"),
    fieldForColumn(base, "anterior"),
  ]),
  "resultadoOperativoActual",
  "resultadoOperativoAnterior",
  "resultadoNetoActual",
  "resultadoNetoAnterior",
  "ebitdaActual",
  "ebitdaAnterior",
]

export const BALANCE_GEMINI_JSON_EXAMPLE = `{
  "ejercicioActual": "2024",
  "ejercicioAnterior": "2023",
  "fechaCierreActual": "2024-12-31",
  "fechaCierreAnterior": "2023-12-31",
  "moneda": "ARS",
  "activoCorrienteActual": 1500000,
  "activoCorrienteAnterior": 1200000,
  "pasivoCorrienteActual": 800000,
  "pasivoCorrienteAnterior": 700000,
  "patrimonioNetoActual": 900000,
  "patrimonioNetoAnterior": 750000,
  "ventasActual": 5000000,
  "ventasAnterior": 4200000,
  "resultadoNetoActual": 250000,
  "resultadoNetoAnterior": 180000
}`

/**
 * @param {Record<string, unknown>} raw
 * @returns {{ values: Record<string, string>; detected: string[] }}
 */
export function normalizeBalanceGeminiValues(raw) {
  /** @type {Record<string, string>} */
  const values = {}
  /** @type {string[]} */
  const detected = []

  for (const key of GEMINI_BALANCE_FIELDS) {
    if (!(key in raw)) {
      continue
    }

    const value = raw[key]
    if (value == null || value === "") {
      continue
    }

    if (
      key === "ejercicioActual" ||
      key === "ejercicioAnterior" ||
      key === "fechaCierreActual" ||
      key === "fechaCierreAnterior" ||
      key === "moneda"
    ) {
      values[key] = String(value).trim()
      if (values[key]) {
        detected.push(key)
      }
      continue
    }

    const amount = parseBalanceAmount(value)
    if (amount !== null) {
      values[key] = String(Math.round(amount))
      detected.push(key)
    }
  }

  return { values, detected }
}
