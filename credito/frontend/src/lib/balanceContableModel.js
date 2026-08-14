import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"
import { balanceDocToFormValues } from "@/lib/balanceIndicators"
import {
  BALANCE_COMPUTED_FIELDS,
  BALANCE_RESULTADOS_FIELDS,
  BALANCE_STRUCTURAL_BASE_FIELDS,
} from "@/lib/balanceContableFormConfig"
import { resolveBalancePair, getEjercicioYear } from "@/lib/balancePairModel"
import {
  BALANCE_PREQUAL_RUBROS,
  computeBalanceRubroExcelMetrics,
  computePreCalificacionFromVentasMensuales,
  computePromedioCreditoPorRubroFromTablas,
  computePromedioVentasContablesMensuales,
  getBalanceFactorActualizacion,
} from "@/lib/balancePrequalificationPreview"
import { buildInflationDataPayload } from "@/lib/inflation/balanceInflation"
import { amountToFormString, roundMoneyForFirestore } from "@/lib/money"

/** @typedef {"actual" | "anterior"} BalanceContableColumn */

export const BALANCE_CONTABLE_DOC_ID = "contable"
export const BALANCE_CONTABLE_SCHEMA_VERSION = 2

/** @typedef {"ventas" | "compras" | "costos"} BalanceRubro */

/** @type {BalanceContableColumn[]} */
export const BALANCE_CONTABLE_COLUMNS = ["actual", "anterior"]

/** Columna izquierda en UI (ejercicio más viejo). Lógica interna sin cambios. */
export const BALANCE_UI_LEFT_COLUMN = "anterior"

/** Columna derecha en UI (ejercicio más nuevo). */
export const BALANCE_UI_RIGHT_COLUMN = "actual"

/**
 * Mapeo visual de columnas (izq. = anterior, der. = actual).
 *
 * @param {{ ejercicioActual?: string; ejercicioAnterior?: string }} formValues
 * @returns {{
 *   leftColumn: BalanceContableColumn;
 *   rightColumn: BalanceContableColumn;
 *   leftYear: string;
 *   rightYear: string;
 * }}
 */
export function getBalanceVisualColumns(formValues) {
  const yearActual =
    formValues.ejercicioActual || String(new Date().getFullYear())
  const yearAnterior =
    formValues.ejercicioAnterior || String(new Date().getFullYear() - 1)

  return {
    leftColumn: BALANCE_UI_LEFT_COLUMN,
    rightColumn: BALANCE_UI_RIGHT_COLUMN,
    leftYear: yearAnterior,
    rightYear: yearActual,
  }
}

/** Orden visual de filas en tablas por año (viejo → nuevo). */
export const BALANCE_COLUMN_VISUAL_ORDER = {
  anterior: 0,
  actual: 1,
}

/** @type {Record<BalanceContableColumn, string>} */
export const BALANCE_CONTABLE_COLUMN_LABELS = {
  actual: "Ejercicio actual",
  anterior: "Ejercicio anterior",
}

/**
 * @typedef {Object} BalanceContableInflationData
 * @property {number} [factor]
 * @property {number} [accumulated]
 * @property {boolean} [manual]
 * @property {string} [source]
 */

/**
 * @typedef {Object} BalanceContableDoc
 * @property {string} [id]
 * @property {number} [schemaVersion]
 * @property {number | string} [ejercicioActual]
 * @property {number | string} [ejercicioAnterior]
 * @property {string} [fechaCierreActual]
 * @property {string} [fechaCierreAnterior]
 * @property {string} [moneda]
 * @property {number | null} [ventasActual]
 * @property {number | null} [ventasAnterior]
 * @property {number | null} [comprasActual]
 * @property {number | null} [comprasAnterior]
 * @property {number | null} [costosActual]
 * @property {number | null} [costosAnterior]
 * @property {BalanceContableInflationData | null} [inflationDataActual]
 * @property {BalanceContableInflationData | null} [inflationDataAnterior]
 * @property {string} [validationStatus]
 * @property {string} [indicatorsSource]
 * @property {Record<string, unknown>} [key: string]
 */

/** @type {BalanceRubro[]} */
const RUBRO_FIELDS = ["ventas", "compras", "costos"]

/**
 * @param {BalanceContableColumn} column
 * @returns {"Actual" | "Anterior"}
 */
function columnSuffix(column) {
  return column === "actual" ? "Actual" : "Anterior"
}

/**
 * @param {BalanceRubro} rubro
 * @param {BalanceContableColumn} column
 * @returns {string}
 */
export function rubroFieldForColumn(rubro, column) {
  return `${rubro}${columnSuffix(column)}`
}

/**
 * @param {string} baseField
 * @param {BalanceContableColumn} column
 * @returns {string}
 */
export function fieldForColumn(baseField, column) {
  return `${baseField}${columnSuffix(column)}`
}

/** @type {string[]} */
const PERSIST_COLUMN_FIELDS = [
  ...BALANCE_STRUCTURAL_BASE_FIELDS,
  ...BALANCE_COMPUTED_FIELDS,
  ...BALANCE_RESULTADOS_FIELDS,
]

/**
 * @param {BalanceContableColumn} column
 * @returns {string}
 */
export function ejercicioFieldForColumn(column) {
  return column === "actual" ? "ejercicioActual" : "ejercicioAnterior"
}

/**
 * @param {BalanceContableColumn} column
 * @returns {string}
 */
export function fechaCierreFieldForColumn(column) {
  return column === "actual" ? "fechaCierreActual" : "fechaCierreAnterior"
}

/**
 * Formato legible DD/MM/YYYY para fechas de cierre del balance.
 *
 * @param {string | null | undefined} fechaCierre
 * @returns {string | null}
 */
export function formatFechaCierreForDisplay(fechaCierre) {
  const raw = String(fechaCierre ?? "").trim()
  if (!raw) {
    return null
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${day}/${month}/${year}`
  }

  const normalized = raw.includes("T") ? raw : `${raw}T12:00:00`
  const time = new Date(normalized).getTime()
  if (!Number.isFinite(time)) {
    return raw
  }

  const date = new Date(time)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Etiqueta de período para evolución patrimonial (fecha de cierre o fallback).
 *
 * @param {BalanceContableDoc | null | undefined} doc
 * @param {BalanceContableColumn} column
 * @param {BalanceContableColumn} columnaMasReciente
 * @returns {string}
 */
export function resolvePeriodoCierreLabel(doc, column, columnaMasReciente) {
  if (!doc) {
    return column === columnaMasReciente ? "Ejercicio actual" : "Ejercicio anterior"
  }

  const fecha = String(doc[fechaCierreFieldForColumn(column)] ?? "").trim()
  const formatted = formatFechaCierreForDisplay(fecha)
  if (formatted) {
    return formatted
  }

  return column === columnaMasReciente ? "Ejercicio actual" : "Ejercicio anterior"
}

/**
 * @param {BalanceContableColumn} column
 * @returns {string}
 */
export function inflationDataFieldForColumn(column) {
  return column === "actual" ? "inflationDataActual" : "inflationDataAnterior"
}

/**
 * @returns {BalanceContableDoc}
 */
export function createEmptyBalanceContable() {
  const year = new Date().getFullYear()
  return {
    schemaVersion: BALANCE_CONTABLE_SCHEMA_VERSION,
    ejercicioActual: year,
    ejercicioAnterior: year - 1,
    fechaCierreActual: "",
    fechaCierreAnterior: "",
    moneda: "ARS",
    ventasActual: null,
    ventasAnterior: null,
    comprasActual: null,
    comprasAnterior: null,
    costosActual: null,
    costosAnterior: null,
    inflationDataActual: null,
    inflationDataAnterior: null,
    validationStatus: "draft",
    indicatorsSource: "manual",
    ...Object.fromEntries(
      PERSIST_COLUMN_FIELDS.flatMap((base) =>
        BALANCE_CONTABLE_COLUMNS.map((column) => [
          fieldForColumn(base, column),
          null,
        ])
      )
    ),
  }
}

/**
 * @param {Record<string, unknown>} doc
 * @returns {boolean}
 */
export function isBalanceContableSchema(doc) {
  if (!doc || typeof doc !== "object") {
    return false
  }
  return (
    doc.schemaVersion === BALANCE_CONTABLE_SCHEMA_VERSION ||
    doc.ventasActual != null ||
    doc.ventasAnterior != null ||
    (doc.ejercicioActual != null && doc.ejercicioAnterior != null)
  )
}

/**
 * @param {Record<string, unknown>} legacyDoc
 * @param {BalanceContableColumn} column
 * @returns {Partial<BalanceContableDoc>}
 */
function legacyDocToColumnSlice(legacyDoc, column) {
  const suffix = columnSuffix(column)
  const ejercicio = getEjercicioYear(legacyDoc)

  /** @type {Partial<BalanceContableDoc>} */
  const slice = {
    [`ejercicio${suffix}`]: ejercicio ?? (column === "actual" ? new Date().getFullYear() : new Date().getFullYear() - 1),
    [`fechaCierre${suffix}`]: String(
      legacyDoc.fechaCierre ?? legacyDoc.fecha_cierre ?? ""
    ),
    [`inflationData${suffix}`]: /** @type {BalanceContableInflationData | null} */ (
      legacyDoc.inflationData ?? null
    ),
  }

  const legacyForm = balanceDocToFormValues(legacyDoc)
  for (const base of PERSIST_COLUMN_FIELDS) {
    const raw = legacyForm[base]
    if (raw === "" || raw == null) {
      slice[fieldForColumn(base, column)] = null
      continue
    }
    slice[fieldForColumn(base, column)] = roundMoneyForFirestore(raw)
  }

  return slice
}

/**
 * Convierte filas legacy (1–2 docs) o doc contable único al modelo de 2 columnas.
 *
 * @param {unknown[]} rows
 * @returns {BalanceContableDoc}
 */
export function normalizeToBalanceContable(rows) {
  const docs = Array.isArray(rows)
    ? rows.filter((item) => item && typeof item === "object")
    : []

  const contableRow = docs.find((doc) =>
    isBalanceContableSchema(/** @type {Record<string, unknown>} */ (doc))
  )

  if (contableRow) {
    const doc = /** @type {Record<string, unknown>} */ (contableRow)
    return {
      ...createEmptyBalanceContable(),
      ...doc,
      id: String(doc.id ?? BALANCE_CONTABLE_DOC_ID),
      schemaVersion: BALANCE_CONTABLE_SCHEMA_VERSION,
    }
  }

  const pair = resolveBalancePair(docs)
  const merged = createEmptyBalanceContable()

  if (pair.actual) {
    Object.assign(
      merged,
      legacyDocToColumnSlice(
        /** @type {Record<string, unknown>} */ (pair.actual),
        "actual"
      )
    )
  }

  if (pair.anterior) {
    Object.assign(
      merged,
      legacyDocToColumnSlice(
        /** @type {Record<string, unknown>} */ (pair.anterior),
        "anterior"
      )
    )
  }

  const firstId =
    pair.actual?.id ?? pair.anterior?.id ?? BALANCE_CONTABLE_DOC_ID
  merged.id = String(firstId === "pending-actual" || firstId === "pending-anterior"
    ? BALANCE_CONTABLE_DOC_ID
    : firstId)

  if (pair.actual?.moneda || pair.anterior?.moneda) {
    merged.moneda = String(
      pair.actual?.moneda ?? pair.anterior?.moneda ?? "ARS"
    )
  }

  merged.validationStatus = String(
    pair.actual?.validationStatus ??
      pair.anterior?.validationStatus ??
      "draft"
  )
  merged.indicatorsSource = String(
    pair.actual?.indicatorsSource ??
      pair.anterior?.indicatorsSource ??
      "manual"
  )

  return merged
}

/**
 * @param {BalanceContableDoc} doc
 * @param {BalanceContableColumn} column
 * @returns {number}
 */
export function getColumnEjercicio(doc, column) {
  const raw = doc[ejercicioFieldForColumn(column)]
  if (raw == null || raw === "") {
    return column === "actual"
      ? new Date().getFullYear()
      : new Date().getFullYear() - 1
  }
  const year = Number(String(raw).slice(0, 4))
  return Number.isFinite(year) ? year : new Date().getFullYear()
}

/**
 * @param {BalanceContableDoc} doc
 * @param {BalanceRubro} rubro
 * @param {BalanceContableColumn} column
 * @returns {number | null}
 */
export function getRubroAnual(doc, rubro, column) {
  const field = rubroFieldForColumn(rubro, column)
  const raw = doc[field]
  if (raw == null || raw === "") {
    return null
  }
  const value = Number(raw)
  return Number.isFinite(value) ? value : parseBalanceAmount(raw)
}

/**
 * @param {string | null | undefined} fechaCierre
 * @returns {number}
 */
function parseFechaCierreToTime(fechaCierre) {
  const raw = String(fechaCierre ?? "").trim()
  if (!raw) {
    return -Infinity
  }

  const normalized = raw.includes("T") ? raw : `${raw}T12:00:00`
  const time = new Date(normalized).getTime()
  return Number.isFinite(time) ? time : -Infinity
}

/**
 * @param {number} candidateTime
 * @param {string | undefined} candidateColumn
 * @param {number} bestTime
 * @param {string | undefined} bestColumn
 * @returns {boolean}
 */
function isBetterFechaCierreCandidate(
  candidateTime,
  candidateColumn,
  bestTime,
  bestColumn
) {
  if (candidateTime > bestTime) {
    return true
  }
  if (candidateTime < bestTime) {
    return false
  }
  return (
    candidateColumn === BALANCE_UI_RIGHT_COLUMN &&
    bestColumn !== BALANCE_UI_RIGHT_COLUMN
  )
}

/**
 * Indica si la columna tiene fecha de cierre cargada.
 *
 * @param {BalanceContableDoc | null | undefined} doc
 * @param {BalanceContableColumn} column
 * @returns {boolean}
 */
export function isColumnEjercicioComplete(doc, column) {
  if (!doc) {
    return false
  }

  return Boolean(
    String(doc[fechaCierreFieldForColumn(column)] ?? "").trim()
  )
}

/**
 * @param {BalanceContableDoc | null | undefined} doc
 * @param {(currentDoc: BalanceContableDoc, column: BalanceContableColumn) => boolean} hasColumnData
 * @returns {BalanceContableColumn}
 */
function resolveColumnForHighestFechaCierre(doc, hasColumnData) {
  /** @type {BalanceContableColumn | null} */
  let bestColumn = null
  let bestCierreTime = -Infinity

  if (!doc) {
    return BALANCE_UI_RIGHT_COLUMN
  }

  for (const column of BALANCE_CONTABLE_COLUMNS) {
    if (!hasColumnData(doc, column)) {
      continue
    }

    const fechaCierre = String(doc[fechaCierreFieldForColumn(column)] ?? "").trim()
    if (!fechaCierre) {
      continue
    }

    const cierreTime = parseFechaCierreToTime(fechaCierre)
    if (
      isBetterFechaCierreCandidate(
        cierreTime,
        column,
        bestCierreTime,
        bestColumn ?? undefined
      )
    ) {
      bestCierreTime = cierreTime
      bestColumn = column
    }
  }

  return bestColumn ?? resolveColumnForLatestEjercicio(doc)
}

/**
 * Columna con ventas y fecha de cierre más reciente.
 * Si ninguna tiene fecha de cierre, cae en {@link resolveColumnForLatestEjercicio}.
 *
 * @param {BalanceContableDoc | null | undefined} doc
 * @returns {BalanceContableColumn}
 */
export function resolveColumnForLastCompleteEjercicio(doc) {
  return resolveColumnForHighestFechaCierre(doc, (currentDoc, column) => {
    const annual = getRubroAnual(currentDoc, "ventas", column)
    return annual != null && annual > 0
  })
}

/**
 * Columna con datos de balance y fecha de cierre más reciente (patrimonio, liquidez, etc.).
 *
 * @param {BalanceContableDoc | null | undefined} doc
 * @returns {BalanceContableColumn}
 */
export function resolveColumnForHighestFechaCierreBalance(doc) {
  return resolveColumnForHighestFechaCierre(doc, (currentDoc, column) =>
    columnHasStructuralData(currentDoc, column) ||
    columnHasRubroData(currentDoc, column)
  )
}

/**
 * Columna del último ejercicio con ventas (año más alto en ejercicioActual / ejercicioAnterior).
 * Si empatan, prioriza la columna derecha del formulario (`actual`).
 *
 * @param {BalanceContableDoc | null | undefined} doc
 * @returns {BalanceContableColumn}
 */
export function resolveColumnForLatestEjercicio(doc) {
  /** @type {BalanceContableColumn | null} */
  let bestColumn = null
  let bestYear = -Infinity

  if (!doc) {
    return BALANCE_UI_RIGHT_COLUMN
  }

  for (const column of BALANCE_CONTABLE_COLUMNS) {
    const year = getColumnEjercicio(doc, column)
    const annual = getRubroAnual(doc, "ventas", column)
    if (annual == null || annual <= 0) {
      continue
    }

    if (
      year > bestYear ||
      (year === bestYear &&
        (bestColumn == null || column === BALANCE_UI_RIGHT_COLUMN))
    ) {
      bestYear = year
      bestColumn = column
    }
  }

  return bestColumn ?? BALANCE_UI_RIGHT_COLUMN
}

/**
 * @param {Array<{ anio?: string; columna?: string; promedioMensual?: number | null; ventasContablesMensuales?: number | null }>} tablasVentas
 * @returns {{ promedioMensual: number; columna?: string; anio?: string } | null}
 */
/**
 * @param {Array<{ anio?: string; columna?: string; promedioMensual?: number | null; ventasContablesMensuales?: number | null; fechaCierre?: string | null }>} tablasVentas
 * @param {boolean} [byFechaCierre]
 */
function pickVentasPromedioMensualRow(tablasVentas, byFechaCierre = false) {
  const rows = tablasVentas ?? []
  if (rows.length === 0) {
    return null
  }

  if (byFechaCierre) {
    const rowsWithCierre = rows.filter((row) =>
      String(row.fechaCierre ?? "").trim()
    )
    const pool = rowsWithCierre.length > 0 ? rowsWithCierre : rows

    /** @type {{ promedioMensual: number; columna?: string; anio?: string; fechaCierre?: string | null } | null} */
    let best = null
    let bestCierreTime = -Infinity

    for (const row of pool) {
      const monthly = Number(
        row.promedioMensual ?? row.ventasContablesMensuales ?? 0
      )
      if (!Number.isFinite(monthly) || monthly <= 0) {
        continue
      }

      const cierreTime = parseFechaCierreToTime(row.fechaCierre)
      if (
        !best ||
        isBetterFechaCierreCandidate(
          cierreTime,
          row.columna,
          bestCierreTime,
          best.columna
        )
      ) {
        bestCierreTime = cierreTime
        best = {
          promedioMensual: monthly,
          columna: row.columna,
          anio: row.anio,
          fechaCierre: row.fechaCierre ?? null,
        }
      }
    }

    return best
  }

  /** @type {{ promedioMensual: number; columna?: string; anio?: string } | null} */
  let best = null
  let bestYear = -Infinity

  for (const row of rows) {
    const monthly = Number(
      row.promedioMensual ?? row.ventasContablesMensuales ?? 0
    )
    if (!Number.isFinite(monthly) || monthly <= 0) {
      continue
    }

    const year = Number(String(row.anio ?? "").slice(0, 4))
    const safeYear = Number.isFinite(year) ? year : -Infinity

    if (
      !best ||
      safeYear > bestYear ||
      (safeYear === bestYear && row.columna === BALANCE_UI_RIGHT_COLUMN)
    ) {
      bestYear = safeYear
      best = {
        promedioMensual: monthly,
        columna: row.columna,
        anio: row.anio,
      }
    }
  }

  return best
}

export function pickVentasPromedioMensualDisplayRow(tablasVentas) {
  return pickVentasPromedioMensualRow(tablasVentas, false)
}

export function pickVentasPromedioMensualCompleteEjercicioRow(tablasVentas) {
  return pickVentasPromedioMensualRow(tablasVentas, true)
}

/**
 * Promedio mensual de ventas del ejercicio con fecha de cierre más reciente (tabla Excel).
 *
 * @param {Record<string, Array<{ promedioMensual?: number | null; ventasContablesMensuales?: number | null; anio?: string; columna?: string; fechaCierre?: string | null }>>} tablas
 * @returns {number | null}
 */
export function getVentasPromedioMensualUltimoPeriodoFromTablas(tablas) {
  const row = pickVentasPromedioMensualCompleteEjercicioRow(tablas?.ventas ?? [])
  if (!row) {
    return null
  }
  const monthly = Number(row.promedioMensual)
  return Number.isFinite(monthly) && monthly > 0 ? monthly : null
}

/**
 * Log temporal para validar selección de Ventas Contable (remover cuando confirme).
 *
 * @param {BalanceContableDoc | null | undefined} doc
 * @param {Record<string, Array<Record<string, unknown>>> | null | undefined} tablas
 * @param {string} [scope]
 */
export function logVentasContableSeleccionDebug(doc, tablas, scope = "Financiero") {
  const ejerciciosDisponibles = BALANCE_CONTABLE_COLUMNS.map((column) => {
    const year = doc ? getColumnEjercicio(doc, column) : null
    const annual = doc ? getRubroAnual(doc, "ventas", column) : null
    const fechaCierre = doc
      ? String(doc[fechaCierreFieldForColumn(column)] ?? "").trim() || null
      : null

    return {
      columna: column,
      anio: year,
      fechaCierre,
      fechaCierreTime: fechaCierre ? parseFechaCierreToTime(fechaCierre) : null,
      tieneFechaCierre: Boolean(fechaCierre),
      ventasAnuales: annual,
      promedioMensual:
        annual != null && annual > 0 ? Number(annual) / 12 : null,
    }
  }).filter((item) => item.ventasAnuales != null && item.ventasAnuales > 0)

  const selectedRow = pickVentasPromedioMensualCompleteEjercicioRow(
    /** @type {Array<Record<string, unknown>>} */ (tablas?.ventas ?? [])
  )
  const selectedColumn = doc
    ? resolveColumnForLastCompleteEjercicio(doc)
    : null
  const columnaBalanceSeleccionada = doc
    ? resolveColumnForHighestFechaCierreBalance(doc)
    : null
  const promedioMensualSeleccionado =
    getVentasPromedioMensualUltimoPeriodoFromTablas(tablas ?? {})

  console.log(`[VENTAS CONTABLE DEBUG ${scope}]`, {
    criterio: "fechaCierre más alta",
    ejercicioSeleccionado: selectedRow?.anio ?? selectedColumn,
    columnaSeleccionada: selectedRow?.columna ?? selectedColumn,
    fechaCierreSeleccionada: selectedRow?.fechaCierre ?? null,
    promedioMensualSeleccionado,
    columnaBalanceSeleccionada,
    ejercicioBalanceSeleccionado: columnaBalanceSeleccionada
      ? getColumnEjercicio(doc, columnaBalanceSeleccionada)
      : null,
    fechaCierreBalanceSeleccionada: columnaBalanceSeleccionada
      ? String(doc[fechaCierreFieldForColumn(columnaBalanceSeleccionada)] ?? "").trim() ||
        null
      : null,
    ejerciciosDisponibles,
    tablasVentas: tablas?.ventas ?? [],
  })
}

/**
 * Promedio mensual de ventas — columna derecha del balance (ejercicio actual en UI).
 *
 * @param {BalanceContableDoc | null | undefined} doc
 * @param {BalanceContableColumn} [column]
 * @returns {number}
 */
export function getVentasPromedioMensualForColumn(
  doc,
  column = BALANCE_UI_RIGHT_COLUMN
) {
  if (!doc) {
    return 0
  }

  const ventasAnuales = getRubroAnual(doc, "ventas", column)
  if (ventasAnuales == null || ventasAnuales <= 0) {
    return 0
  }

  const metrics = computeBalanceRubroExcelMetrics(
    ventasAnuales,
    getColumnInflationFactor(doc, column),
    null
  )

  return metrics.promedioMensual
}

/**
 * @param {BalanceContableDoc | null | undefined} doc
 * @returns {number}
 */
export function getVentasPromedioMensualEjercicioActual(doc) {
  return getVentasPromedioMensualForColumn(
    doc,
    resolveColumnForLastCompleteEjercicio(doc)
  )
}

/**
 * Logs temporales para validar origen de ventas por columna (remover cuando confirme).
 *
 * @param {BalanceContableDoc | null | undefined} doc
 * @param {string} [scope]
 */
export function logBalanceContableVentasDebug(doc, scope = "") {
  const prefix = scope ? `[${scope}] ` : ""
  console.log(`${prefix}ejercicioActual`, doc?.ejercicioActual)
  console.log(`${prefix}ejercicioAnterior`, doc?.ejercicioAnterior)
  console.log(
    `${prefix}ventas actual`,
    doc ? getRubroAnual(doc, "ventas", "actual") : null
  )
  console.log(
    `${prefix}ventas anterior`,
    doc ? getRubroAnual(doc, "ventas", "anterior") : null
  )
  console.log(
    `${prefix}columna último ejercicio`,
    resolveColumnForLatestEjercicio(doc)
  )
}

/**
 * Snapshot legacy del ejercicio con fecha de cierre más reciente (datos estructurales).
 *
 * @param {BalanceContableDoc | null | undefined} doc
 * @returns {Record<string, unknown>}
 */
export function balanceContableLatestEjercicioLegacyDoc(doc) {
  return balanceContableColumnToLegacyDoc(
    doc,
    resolveColumnForHighestFechaCierreBalance(doc)
  )
}

/**
 * @param {BalanceContableDoc} doc
 * @param {BalanceContableColumn} column
 * @returns {number}
 */
export function getColumnInflationFactor(doc, column) {
  const inflation = /** @type {BalanceContableInflationData | null | undefined} */ (
    doc[inflationDataFieldForColumn(column)]
  )
  return getBalanceFactorActualizacion({
    inflationData: inflation,
    factorActualizacion: inflation?.factor,
  })
}

/**
 * @param {BalanceContableDoc | null | undefined} doc
 * @param {BalanceContableColumn} column
 * @returns {boolean}
 */
export function columnHasRubroData(doc, column) {
  if (!doc) {
    return false
  }
  return RUBRO_FIELDS.some((rubro) => {
    const value = getRubroAnual(doc, rubro, column)
    return value != null && value > 0
  })
}

/**
 * Tablas Excel: una fila por columna (año), sin promediar antes del IPC.
 *
 * @param {BalanceContableDoc | null | undefined} doc
 * @param {number | null} coeficienteEmpresa
 * @returns {Record<import("@/lib/balancePrequalificationPreview").BalancePrequalRubro, Array<Record<string, unknown>>>}
 */
export function buildPrequalificationTablasFromContable(
  doc,
  coeficienteEmpresa
) {
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const tablas = {
    ventas: [],
    compras: [],
    costos: [],
  }

  if (!doc) {
    return /** @type {typeof tablas} */ (tablas)
  }

  for (const column of BALANCE_CONTABLE_COLUMNS) {
    if (!columnHasRubroData(doc, column)) {
      continue
    }

    const anio = String(getColumnEjercicio(doc, column))
    const factor = getColumnInflationFactor(doc, column)
    const fechaCierre = String(doc[fechaCierreFieldForColumn(column)] ?? "")

    for (const rubro of BALANCE_PREQUAL_RUBROS) {
      const annual = getRubroAnual(doc, rubro, column)
      if (annual == null || annual <= 0) {
        continue
      }

      const metrics = computeBalanceRubroExcelMetrics(
        annual,
        factor,
        coeficienteEmpresa
      )

      tablas[rubro].push({
        anio,
        balanceId: doc.id ?? BALANCE_CONTABLE_DOC_ID,
        columna: column,
        fechaCierre: fechaCierre || null,
        promedioMensual: metrics.promedioMensual,
        ...(rubro === "ventas"
          ? { ventasContablesMensuales: metrics.promedioMensual }
          : {}),
        ...(rubro === "compras"
          ? { comprasMensuales: metrics.promedioMensual }
          : {}),
        ...(rubro === "costos"
          ? { costosMensuales: metrics.promedioMensual }
          : {}),
        coefInflacion: metrics.coefInflacion,
        accumulated: metrics.accumulated,
        valorActualizado: metrics.valorActualizado,
        ventasActualizadas: metrics.valorActualizado,
        creditoCalculado: metrics.creditoCalculado,
      })
    }
  }

  return /** @type {typeof tablas} */ (tablas)
}

/**
 * @param {BalanceContableDoc | null | undefined} doc
 * @param {number | null} coeficienteEmpresa
 * @param {{ ventasIva?: number | null; ventasIibb?: number | null }} [ventasExternas]
 */
export function computePrequalificationFromContable(
  doc,
  coeficienteEmpresa,
  ventasExternas = {}
) {
  const tablas = buildPrequalificationTablasFromContable(
    doc,
    coeficienteEmpresa
  )
  return {
    tablas,
    promedioPorRubro: computePromedioCreditoPorRubroFromTablas(tablas),
    ventasContablesMensuales:
      computePromedioVentasContablesMensuales(tablas.ventas) ?? 0,
    ventasIvaMensuales: ventasExternas.ventasIva ?? 0,
    ventasIibbMensuales: ventasExternas.ventasIibb ?? 0,
  }
}

/**
 * @param {Record<string, string>} formValues
 * @returns {BalanceContableDoc}
 */
export function balanceContableFormToFirestore(formValues) {
  const base = createEmptyBalanceContable()

  /** @param {string} key */
  const num = (key) => {
    const raw = formValues[key]
    if (raw == null || raw === "") {
      return null
    }
    return roundMoneyForFirestore(raw)
  }

  /** @type {Record<string, number | null>} */
  const columnNumbers = {}
  for (const base of PERSIST_COLUMN_FIELDS) {
    for (const column of BALANCE_CONTABLE_COLUMNS) {
      const key = fieldForColumn(base, column)
      columnNumbers[key] = num(key)
    }
  }

  return {
    ...base,
    ...columnNumbers,
    schemaVersion: BALANCE_CONTABLE_SCHEMA_VERSION,
    ejercicioActual: Number(formValues.ejercicioActual) || base.ejercicioActual,
    ejercicioAnterior:
      Number(formValues.ejercicioAnterior) || base.ejercicioAnterior,
    fechaCierreActual: formValues.fechaCierreActual?.trim() || "",
    fechaCierreAnterior: formValues.fechaCierreAnterior?.trim() || "",
    moneda: formValues.moneda?.trim() || "ARS",
    validationStatus: formValues.validationStatus ?? "draft",
    indicatorsSource: formValues.indicatorsSource ?? "manual",
  }
}

/**
 * @param {BalanceContableDoc | null | undefined} doc
 * @returns {Record<string, string>}
 */
export function balanceContableToFormValues(doc) {
  const empty = createEmptyBalanceContable()
  const source = doc ?? empty

  /** @param {string} key */
  const str = (key) => {
    const raw = source[key]
    if (raw == null || raw === "") {
      return ""
    }
    if (typeof raw === "number") {
      return amountToFormString(raw)
    }
    return String(raw)
  }

  return {
    ejercicioActual: String(
      source.ejercicioActual ?? empty.ejercicioActual ?? ""
    ),
    ejercicioAnterior: String(
      source.ejercicioAnterior ?? empty.ejercicioAnterior ?? ""
    ),
    fechaCierreActual: String(source.fechaCierreActual ?? ""),
    fechaCierreAnterior: String(source.fechaCierreAnterior ?? ""),
    moneda: String(source.moneda ?? "ARS"),
    validationStatus: String(source.validationStatus ?? "draft"),
    indicatorsSource: String(source.indicatorsSource ?? "manual"),
    ...Object.fromEntries(
      PERSIST_COLUMN_FIELDS.flatMap((base) =>
        BALANCE_CONTABLE_COLUMNS.map((column) => {
          const key = fieldForColumn(base, column)
          return [key, str(key)]
        })
      )
    ),
  }
}

/**
 * Totales y patrimonio por columna (misma lógica que applyDerivedBalanceFields).
 *
 * @param {Record<string, string>} formValues
 * @returns {Record<string, string>}
 */
export function applyDerivedContableFormValues(formValues) {
  /** @param {string} a
   * @param {string} b
   */
  const sumPair = (a, b) => {
    const hasA = a !== ""
    const hasB = b !== ""
    if (!hasA && !hasB) {
      return ""
    }
    const na = parseBalanceAmount(a) ?? 0
    const nb = parseBalanceAmount(b) ?? 0
    return amountToFormString(na + nb)
  }

  /** @type {Record<string, string>} */
  const next = { ...formValues }

  for (const column of BALANCE_CONTABLE_COLUMNS) {
    const totalActivo = sumPair(
      next[fieldForColumn("activoCorriente", column)],
      next[fieldForColumn("activoNoCorriente", column)]
    )
    const totalPasivo = sumPair(
      next[fieldForColumn("pasivoCorriente", column)],
      next[fieldForColumn("pasivoNoCorriente", column)]
    )
    next[fieldForColumn("totalActivo", column)] = totalActivo
    next[fieldForColumn("totalPasivo", column)] = totalPasivo

    const activoNum = parseBalanceAmount(totalActivo)
    const pasivoNum = parseBalanceAmount(totalPasivo)

    if (activoNum !== null && pasivoNum !== null) {
      next[fieldForColumn("patrimonioNeto", column)] = amountToFormString(
        activoNum - pasivoNum
      )
    } else if (activoNum !== null && totalPasivo === "") {
      next[fieldForColumn("patrimonioNeto", column)] = amountToFormString(activoNum)
    } else if (pasivoNum !== null && totalActivo === "") {
      next[fieldForColumn("patrimonioNeto", column)] = amountToFormString(-pasivoNum)
    } else {
      next[fieldForColumn("patrimonioNeto", column)] = ""
    }
  }

  return next
}

/**
 * Snapshot de una columna para ratios / resumen.
 *
 * @param {BalanceContableDoc | null | undefined} doc
 * @param {BalanceContableColumn} [column]
 * @returns {Record<string, unknown>}
 */
export function balanceContableColumnToLegacyDoc(
  doc,
  column = "actual"
) {
  if (!doc) {
    return {}
  }

  const suffix = columnSuffix(column)
  const out = {
    id: doc.id ?? BALANCE_CONTABLE_DOC_ID,
    ejercicio: doc[ejercicioFieldForColumn(column)],
    fechaCierre: doc[fechaCierreFieldForColumn(column)],
    moneda: doc.moneda ?? "ARS",
    validationStatus: doc.validationStatus,
    inflationData: doc[inflationDataFieldForColumn(column)],
    factorActualizacion: getColumnInflationFactor(doc, column),
  }

  for (const base of PERSIST_COLUMN_FIELDS) {
    const key = fieldForColumn(base, column)
    if (doc[key] != null) {
      out[base] = doc[key]
    }
  }

  return out
}

/**
 * @param {BalanceContableDoc | null | undefined} doc
 * @param {BalanceContableColumn} column
 * @returns {boolean}
 */
export function columnHasStructuralData(doc, column) {
  if (!doc) {
    return false
  }
  return BALANCE_STRUCTURAL_BASE_FIELDS.some((base) => {
    const value = doc[fieldForColumn(base, column)]
    return value != null && Number(value) !== 0
  })
}

/**
 * @param {BalanceContableDoc | null | undefined} doc
 * @returns {boolean}
 */
export function hasBalanceContableIndicators(doc) {
  if (!doc) {
    return false
  }
  return BALANCE_CONTABLE_COLUMNS.some(
    (column) =>
      columnHasStructuralData(doc, column) || columnHasRubroData(doc, column)
  )
}

/**
 * @param {BalanceContableDoc | null | undefined} doc
 * @returns {boolean}
 */
export function hasConfirmedBalanceContable(doc) {
  if (!doc) {
    return false
  }
  return (
    String(doc.validationStatus ?? "") === "confirmed" &&
    hasBalanceContableIndicators(doc)
  )
}

/**
 * Vista previa / guardado: combina formulario + IPC por columna.
 *
 * @param {Record<string, string>} formValues
 * @param {import("@/lib/inflation/balanceInflation").InflationFactorResult | null} inflationActual
 * @param {import("@/lib/inflation/balanceInflation").InflationFactorResult | null} inflationAnterior
 * @param {string} [docId]
 * @returns {BalanceContableDoc}
 */
export function buildContableDocFromFormState(
  formValues,
  inflationActual,
  inflationAnterior,
  docId
) {
  const base = balanceContableFormToFirestore(formValues)

  return {
    ...base,
    id: docId ?? BALANCE_CONTABLE_DOC_ID,
    inflationDataActual: inflationActual
      ? buildInflationDataPayload(inflationActual)
      : base.inflationDataActual ?? null,
    inflationDataAnterior: inflationAnterior
      ? buildInflationDataPayload(inflationAnterior)
      : base.inflationDataAnterior ?? null,
  }
}
