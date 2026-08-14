import { BALANCE_RESULTADOS_FIELDS } from "@/lib/balanceContableFormConfig"
import {
  ejercicioFieldForColumn,
  fechaCierreFieldForColumn,
  fieldForColumn,
  hasConfirmedBalanceContable,
} from "@/lib/balanceContableModel"
import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"

/**
 * @typedef {{
 *   id: string;
 *   label: string;
 *   points: number;
 *   maxPoints: number;
 * }} DocumentQualityBreakdownItem
 */

/**
 * @typedef {{
 *   score: number;
 *   maxScore: number;
 *   breakdown: DocumentQualityBreakdownItem[];
 * }} DocumentQualityScoreResult
 */

const REQUIRED_STRUCTURAL = [
  "activoCorriente",
  "pasivoCorriente",
  "totalActivo",
  "totalPasivo",
  "patrimonioNeto",
]

const PATRIMONIAL_ERROR_THRESHOLD = 0.01
const PATRIMONIAL_EXACT_EPSILON = 0.0001

/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null | undefined} doc
 * @param {import("@/lib/balanceContableModel").BalanceContableColumn} column
 */
function columnAmount(doc, column, baseField) {
  if (!doc) return null
  return parseBalanceAmount(doc[fieldForColumn(baseField, column)])
}

/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null | undefined} doc
 * @param {import("@/lib/balanceContableModel").BalanceContableColumn} column
 */
function isExerciseComplete(doc, column) {
  if (!doc) return false

  const hasStructural = REQUIRED_STRUCTURAL.every(
    (field) => columnAmount(doc, column, field) !== null
  )
  const hasRubro = BALANCE_RESULTADOS_FIELDS.some((field) => {
    const value = columnAmount(doc, column, field)
    return value !== null && value !== 0
  })
  const hasFecha = Boolean(
    String(doc[fechaCierreFieldForColumn(column)] ?? "").trim()
  )
  const hasEjercicio = Boolean(
    String(doc[ejercicioFieldForColumn(column)] ?? "").trim()
  )

  return hasStructural && hasRubro && hasFecha && hasEjercicio
}

/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null | undefined} doc
 * @param {import("@/lib/balanceContableModel").BalanceContableColumn} column
 */
function patrimonialScoreForColumn(doc, column, maxPoints) {
  const totalActivo = columnAmount(doc, column, "totalActivo")
  const totalPasivo = columnAmount(doc, column, "totalPasivo")
  const patrimonioNeto = columnAmount(doc, column, "patrimonioNeto")

  if (
    totalActivo === null ||
    totalPasivo === null ||
    patrimonioNeto === null
  ) {
    return 0
  }

  const pasivoMasPn = totalPasivo + patrimonioNeto
  const base = Math.max(Math.abs(totalActivo), Math.abs(pasivoMasPn), 1)
  const ratio = Math.abs(totalActivo - pasivoMasPn) / base

  if (ratio <= PATRIMONIAL_EXACT_EPSILON) {
    return maxPoints
  }
  if (ratio <= PATRIMONIAL_ERROR_THRESHOLD) {
    return Math.round(maxPoints * 0.5)
  }
  return 0
}

/**
 * Calcula el score de calidad documental (no afecta la calificación crediticia).
 *
 * @param {{
 *   balanceContable?: import("@/lib/balanceContableModel").BalanceContableDoc | null;
 *   ivaDocs?: unknown[];
 *   iibbDocs?: unknown[];
 * }} input
 * @returns {DocumentQualityScoreResult}
 */
export function computeDocumentQualityScore(input) {
  const doc = input.balanceContable ?? null
  const ivaDocs = input.ivaDocs ?? []
  const iibbDocs = input.iibbDocs ?? []

  const balanceCompletoPoints = doc && hasConfirmedBalanceContable(doc) ? 40 : 0
  const patrimonialActual = patrimonialScoreForColumn(doc, "actual", 10)
  const patrimonialAnterior = patrimonialScoreForColumn(doc, "anterior", 10)
  const patrimonialPoints = patrimonialActual + patrimonialAnterior

  const ejercicioActualPoints = isExerciseComplete(doc, "actual") ? 10 : 0
  const ejercicioAnteriorPoints = isExerciseComplete(doc, "anterior") ? 10 : 0
  const dosEjerciciosPoints = ejercicioActualPoints + ejercicioAnteriorPoints

  const ivaPoints = ivaDocs.length > 0 ? 10 : 0
  const iibbPoints = iibbDocs.length > 0 ? 10 : 0

  const breakdown = [
    {
      id: "balance_completo",
      label: "Balance completo",
      points: balanceCompletoPoints,
      maxPoints: 40,
    },
    {
      id: "ecuacion_patrimonial",
      label: "Ecuación patrimonial",
      points: patrimonialPoints,
      maxPoints: 20,
    },
    {
      id: "dos_ejercicios",
      label: "Dos ejercicios",
      points: dosEjerciciosPoints,
      maxPoints: 20,
    },
    {
      id: "iva",
      label: "IVA cargado",
      points: ivaPoints,
      maxPoints: 10,
    },
    {
      id: "iibb",
      label: "IIBB cargado",
      points: iibbPoints,
      maxPoints: 10,
    },
  ]

  const score = breakdown.reduce((sum, item) => sum + item.points, 0)

  return {
    score,
    maxScore: 100,
    normalized: score / 100,
    breakdown,
    scoringRole: "advisory",
    componentKey: "documentQuality",
    appliedWeight: 0,
    contributionToGeneral: 0,
  }
}
