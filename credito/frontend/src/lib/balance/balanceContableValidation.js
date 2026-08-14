import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"
import { BALANCE_RESULTADOS_FIELDS } from "@/lib/balanceContableFormConfig"
import { BALANCE_FIELD_LABELS } from "@/lib/balance/balanceFieldLabels"
import {
  BALANCE_CONTABLE_COLUMNS,
  ejercicioFieldForColumn,
  fechaCierreFieldForColumn,
  fieldForColumn,
  hasConfirmedBalanceContable,
} from "@/lib/balanceContableModel"

/** @typedef {"error" | "warning"} BalanceValidationLevel */
/** @typedef {"green" | "yellow" | "red"} BalanceValidationStatus */

/**
 * @typedef {{
 *   id: string;
 *   level: BalanceValidationLevel;
 *   message: string;
 *   column?: import("@/lib/balanceContableModel").BalanceContableColumn;
 * }} BalanceValidationItem
 */

/**
 * @typedef {{
 *   id: string;
 *   label: string;
 *   ok: boolean;
 *   status?: BalanceValidationStatus;
 *   detail?: string;
 * }} BalanceValidationChecklistItem
 */

/**
 * @typedef {{
 *   valid: boolean;
 *   status: BalanceValidationStatus;
 *   canScoreFinancial: boolean;
 *   canConfirm: boolean;
 *   items: BalanceValidationItem[];
 *   checklist: BalanceValidationChecklistItem[];
 *   errors: string[];
 *   warnings: string[];
 * }} BalanceContableValidationResult
 */

/** Desvío > 1 % bloquea el score. Desvío ≤ 1 % genera advertencia amarilla. */
const PATRIMONIAL_ERROR_THRESHOLD = 0.01
const PATRIMONIAL_EXACT_EPSILON = 0.0001

const REQUIRED_STRUCTURAL_FOR_SCORE = [
  "activoCorriente",
  "pasivoCorriente",
  "totalActivo",
  "totalPasivo",
  "patrimonioNeto",
]

const COLUMN_LABELS = {
  actual: "Ejercicio actual",
  anterior: "Ejercicio anterior",
}

/**
 * @param {number} value
 */
function formatAmount(value) {
  return value.toLocaleString("es-AR", { maximumFractionDigits: 0 })
}

/**
 * @param {number} ratio
 */
function formatDeviationPercent(ratio) {
  return `${(ratio * 100).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`
}

/**
 * @param {number} totalActivo
 * @param {number} totalPasivo
 * @param {number} patrimonioNeto
 */
function computePatrimonialDeviation(totalActivo, totalPasivo, patrimonioNeto) {
  const pasivoMasPn = totalPasivo + patrimonioNeto
  const diff = totalActivo - pasivoMasPn
  const base = Math.max(Math.abs(totalActivo), Math.abs(pasivoMasPn), 1)
  const ratio = Math.abs(diff) / base
  return { diff, ratio, pasivoMasPn }
}

/**
 * @param {unknown} value
 */
function parseDateValue(value) {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) {
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const parsed = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      )
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    return null
  }
  return d
}

/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null | undefined} doc
 * @param {import("@/lib/balanceContableModel").BalanceContableColumn} column
 */
function columnAmount(doc, column, baseField) {
  return parseBalanceAmount(doc[fieldForColumn(baseField, column)])
}

/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null | undefined} doc
 * @param {import("@/lib/balanceContableModel").BalanceContableColumn} column
 */
function validateColumnPatrimonial(doc, column) {
  /** @type {BalanceValidationItem[]} */
  const items = []

  const totalActivo = columnAmount(doc, column, "totalActivo")
  const totalPasivo = columnAmount(doc, column, "totalPasivo")
  const patrimonioNeto = columnAmount(doc, column, "patrimonioNeto")

  if (patrimonioNeto !== null && patrimonioNeto < 0) {
    items.push({
      id: `patrimonio_negativo_${column}`,
      level: "warning",
      message: `${COLUMN_LABELS[column]}: Patrimonio Neto negativo (${formatAmount(patrimonioNeto)}).`,
      column,
    })
  }

  if (
    totalActivo === null ||
    totalPasivo === null ||
    patrimonioNeto === null
  ) {
    return items
  }

  const { ratio, pasivoMasPn } = computePatrimonialDeviation(
    totalActivo,
    totalPasivo,
    patrimonioNeto
  )

  if (ratio <= PATRIMONIAL_EXACT_EPSILON) {
    return items
  }

  const detailLines = [
    `Activo Total ............ ${formatAmount(totalActivo)}`,
    `Pasivo + PN ............. ${formatAmount(pasivoMasPn)}`,
    `Diferencia .............. ${formatDeviationPercent(ratio)}`,
  ].join("\n")

  if (ratio > PATRIMONIAL_ERROR_THRESHOLD) {
    items.push({
      id: `patrimonial_${column}`,
      level: "error",
      message: `${COLUMN_LABELS[column]}: desvío patrimonial ${formatDeviationPercent(ratio)} (supera 1 %).\n${detailLines}`,
      column,
    })
  } else {
    items.push({
      id: `patrimonial_warning_${column}`,
      level: "warning",
      message: `${COLUMN_LABELS[column]}: desvío patrimonial menor al 1 %.\n${detailLines}`,
      column,
    })
  }

  return items
}

/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null | undefined} doc
 * @param {import("@/lib/balanceContableModel").BalanceContableColumn} column
 */
function validateColumnCompleteness(doc, column) {
  /** @type {BalanceValidationItem[]} */
  const items = []

  for (const field of REQUIRED_STRUCTURAL_FOR_SCORE) {
    const value = columnAmount(doc, column, field)
    if (value === null) {
      const level = column === "actual" ? "error" : "warning"
      items.push({
        id: `missing_${field}_${column}`,
        level,
        message: `Falta ${BALANCE_FIELD_LABELS[field]} (${COLUMN_LABELS[column].toLowerCase()}).`,
        column,
      })
    }
  }

  const hasRubro = BALANCE_RESULTADOS_FIELDS.some((rubro) => {
    const value = columnAmount(doc, column, rubro)
    return value !== null && value !== 0
  })

  if (!hasRubro) {
    items.push({
      id: `no_rubros_${column}`,
      level: "warning",
      message: `${COLUMN_LABELS[column]}: sin ${BALANCE_FIELD_LABELS.resultados.toLowerCase()}.`,
      column,
    })
  }

  const fecha = String(doc[fechaCierreFieldForColumn(column)] ?? "").trim()
  const ejercicio = String(doc[ejercicioFieldForColumn(column)] ?? "").trim()

  if (!fecha) {
    items.push({
      id: `missing_fecha_${column}`,
      level: "warning",
      message: `Falta ${BALANCE_FIELD_LABELS.fechaCierre} (${COLUMN_LABELS[column].toLowerCase()}).`,
      column,
    })
  }

  if (!ejercicio) {
    items.push({
      id: `missing_ejercicio_${column}`,
      level: "warning",
      message: `Falta ${BALANCE_FIELD_LABELS.ejercicio} (${COLUMN_LABELS[column].toLowerCase()}).`,
      column,
    })
  }

  if ((fecha || ejercicio) && !(fecha && ejercicio)) {
    items.push({
      id: `fecha_ejercicio_${column}`,
      level: "warning",
      message: `${COLUMN_LABELS[column]}: complete fecha de cierre y año de ejercicio.`,
      column,
    })
  }

  return items
}

/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null | undefined} doc
 */
function validateExerciseDates(doc) {
  /** @type {BalanceValidationItem[]} */
  const items = []

  const fechaActual = parseDateValue(doc[fechaCierreFieldForColumn("actual")])
  const fechaAnterior = parseDateValue(doc[fechaCierreFieldForColumn("anterior")])

  if (fechaActual && fechaAnterior && fechaActual.getTime() <= fechaAnterior.getTime()) {
    items.push({
      id: "fecha_cierre_order",
      level: "error",
      message:
        "La fecha de cierre del ejercicio actual debe ser posterior a la del ejercicio anterior.",
    })
  }

  const yearActual = Number(doc[ejercicioFieldForColumn("actual")])
  const yearAnterior = Number(doc[ejercicioFieldForColumn("anterior")])

  if (
    Number.isFinite(yearActual) &&
    Number.isFinite(yearAnterior) &&
    yearActual > 0 &&
    yearAnterior > 0 &&
    yearActual <= yearAnterior
  ) {
    items.push({
      id: "ejercicio_year_order",
      level: "error",
      message:
        "El año del ejercicio actual debe ser mayor al del ejercicio anterior.",
    })
  }

  return items
}

/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc} doc
 * @param {import("@/lib/balanceContableModel").BalanceContableColumn} column
 */
function buildFieldChecklistForColumn(doc, column) {
  /** @type {BalanceValidationChecklistItem[]} */
  const checklist = []

  for (const field of REQUIRED_STRUCTURAL_FOR_SCORE) {
    const value = columnAmount(doc, column, field)
    checklist.push({
      id: `${field}_${column}`,
      label: BALANCE_FIELD_LABELS[field],
      ok: value !== null,
      status: value !== null ? "green" : "red",
    })
  }

  const hasRubro = BALANCE_RESULTADOS_FIELDS.some((rubro) => {
    const value = columnAmount(doc, column, rubro)
    return value !== null && value !== 0
  })

  checklist.push({
    id: `resultados_${column}`,
    label: BALANCE_FIELD_LABELS.resultados,
    ok: hasRubro,
    status: hasRubro ? "green" : "yellow",
  })

  const fecha = String(doc[fechaCierreFieldForColumn(column)] ?? "").trim()
  checklist.push({
    id: `fechaCierre_${column}`,
    label: BALANCE_FIELD_LABELS.fechaCierre,
    ok: Boolean(fecha),
    status: fecha ? "green" : "yellow",
  })

  const ejercicio = String(doc[ejercicioFieldForColumn(column)] ?? "").trim()
  checklist.push({
    id: `ejercicio_${column}`,
    label: BALANCE_FIELD_LABELS.ejercicio,
    ok: Boolean(ejercicio),
    status: ejercicio ? "green" : "yellow",
  })

  const totalActivo = columnAmount(doc, column, "totalActivo")
  const totalPasivo = columnAmount(doc, column, "totalPasivo")
  const patrimonioNeto = columnAmount(doc, column, "patrimonioNeto")

  let patrimonialStatus = /** @type {BalanceValidationStatus} */ ("green")
  let patrimonialOk = true
  let patrimonialDetail

  if (
    totalActivo !== null &&
    totalPasivo !== null &&
    patrimonioNeto !== null
  ) {
    const { ratio, pasivoMasPn } = computePatrimonialDeviation(
      totalActivo,
      totalPasivo,
      patrimonioNeto
    )

    if (ratio > PATRIMONIAL_ERROR_THRESHOLD) {
      patrimonialStatus = "red"
      patrimonialOk = false
    } else if (ratio > PATRIMONIAL_EXACT_EPSILON) {
      patrimonialStatus = "yellow"
      patrimonialOk = false
    }

    patrimonialDetail = [
      `Activo Total ............ ${formatAmount(totalActivo)}`,
      `Pasivo + PN ............. ${formatAmount(pasivoMasPn)}`,
      `Diferencia .............. ${formatDeviationPercent(ratio)}`,
    ].join("\n")
  } else {
    patrimonialStatus = "red"
    patrimonialOk = false
    patrimonialDetail = "Faltan totales para validar la ecuación patrimonial."
  }

  checklist.unshift({
    id: `ecuacion_${column}`,
    label: `Ecuación patrimonial (${COLUMN_LABELS[column].toLowerCase()})`,
    ok: patrimonialOk,
    status: patrimonialStatus,
    detail: patrimonialDetail,
  })

  if (patrimonioNeto !== null && patrimonioNeto < 0) {
    checklist.push({
      id: `patrimonio_negativo_check_${column}`,
      label: "Patrimonio Neto positivo",
      ok: false,
      status: "yellow",
      detail: `Patrimonio Neto negativo: ${formatAmount(patrimonioNeto)}`,
    })
  }

  return checklist
}

/**
 * @param {BalanceValidationItem[]} items
 */
function resolveOverallStatus(items) {
  const hasError = items.some((item) => item.level === "error")
  if (hasError) {
    return "red"
  }
  const hasWarning = items.some((item) => item.level === "warning")
  if (hasWarning) {
    return "yellow"
  }
  return "green"
}

/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null | undefined} doc
 * @returns {BalanceContableValidationResult}
 */
export function validateBalanceContable(doc) {
  /** @type {BalanceValidationItem[]} */
  const items = []

  if (!doc) {
    return {
      valid: false,
      status: "red",
      canScoreFinancial: false,
      canConfirm: false,
      items: [
        {
          id: "no_balance",
          level: "error",
          message: "Sin balance contable cargado.",
        },
      ],
      checklist: [
        {
          id: "loaded",
          label: "Balance contable cargado",
          ok: false,
          status: "red",
        },
        {
          id: "confirmed",
          label: "Balance confirmado",
          ok: false,
          status: "red",
        },
      ],
      errors: ["Sin balance contable cargado."],
      warnings: [],
    }
  }

  if (!hasConfirmedBalanceContable(doc)) {
    items.push({
      id: "not_confirmed",
      level: "error",
      message:
        "El balance contable debe estar confirmado para calcular el score financiero.",
    })
  }

  for (const column of BALANCE_CONTABLE_COLUMNS) {
    items.push(...validateColumnPatrimonial(doc, column))
    items.push(...validateColumnCompleteness(doc, column))
  }

  items.push(...validateExerciseDates(doc))

  const errors = items
    .filter((item) => item.level === "error")
    .map((item) => item.message)
  const warnings = items
    .filter((item) => item.level === "warning")
    .map((item) => item.message)

  const hasPatrimonialData = REQUIRED_STRUCTURAL_FOR_SCORE.every((field) => {
    return columnAmount(doc, "actual", field) !== null
  })

  /** @type {BalanceValidationChecklistItem[]} */
  const checklist = [
    {
      id: "confirmed",
      label: "Balance confirmado",
      ok: hasConfirmedBalanceContable(doc),
      status: hasConfirmedBalanceContable(doc) ? "green" : "red",
    },
    {
      id: "section_actual",
      label: COLUMN_LABELS.actual,
      ok: true,
      status: "green",
    },
    ...buildFieldChecklistForColumn(doc, "actual"),
    {
      id: "section_anterior",
      label: COLUMN_LABELS.anterior,
      ok: true,
      status: "green",
    },
    ...buildFieldChecklistForColumn(doc, "anterior"),
  ]

  const status = resolveOverallStatus(items)

  const canScoreFinancial =
    hasConfirmedBalanceContable(doc) &&
    hasPatrimonialData &&
    items.filter((item) => item.level === "error").length === 0

  const canConfirm =
    items.filter((item) => item.level === "error" && item.id !== "not_confirmed")
      .length === 0

  return {
    valid: errors.length === 0,
    status,
    canScoreFinancial,
    canConfirm,
    items,
    checklist,
    errors,
    warnings,
  }
}
