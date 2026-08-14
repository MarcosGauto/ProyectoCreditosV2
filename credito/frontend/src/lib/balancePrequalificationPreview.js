import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"
import { formatMoneyWithSymbol, roundMoneyForFirestore } from "@/lib/money"

/** @typedef {"ventas" | "compras" | "costos"} BalancePrequalRubro */

/** @type {BalancePrequalRubro[]} */
export const BALANCE_PREQUAL_RUBROS = ["ventas", "compras", "costos"]

/** @type {Array<{ key: BalancePrequalRubro; label: string; field: string }>} */
export const BALANCE_PREQUAL_RUBRO_CONFIG = [
  { key: "ventas", label: "Ventas contables", field: "ventas" },
  { key: "compras", label: "Compras", field: "compras" },
  { key: "costos", label: "Costos", field: "costos" },
]

/**
 * Excel PROMEDIO.SI(rango; ">0"): promedio de valores estrictamente mayores a 0.
 *
 * @param {Array<number | null | undefined>} values
 * @returns {number}
 */
export function averageExcelPromedioSi(values) {
  const valid = /** @type {number[]} */ ([])

  for (const raw of values) {
    if (raw === null || raw === undefined) {
      continue
    }
    const value = Number(raw)
    if (!Number.isFinite(value) || value <= 0) {
      continue
    }
    valid.push(value)
  }

  if (valid.length === 0) {
    return 0
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

/** @deprecated Use averageExcelPromedioSi */
export const averagePositiveValues = averageExcelPromedioSi

/** Factor Excel sobre promedio de ventas mensuales (IVA). */
export const PREQUALIFICATION_VENTAS_IVA_FACTOR = 1.1575

/**
 * Promedio mensual Excel: valor anual del rubro ÷ 12.
 *
 * @param {number | null | undefined} annualAmount
 * @returns {number}
 */
export function computePromedioMensualFromAnual(annualAmount) {
  const annual = Number(annualAmount)
  if (!Number.isFinite(annual) || annual <= 0) {
    return 0
  }
  return annual / 12
}

/**
 * Factor de actualización persistido en el balance (nunca 0 / null / undefined).
 *
 * @param {Record<string, unknown> | null | undefined} balance
 * @returns {number}
 */
export function getBalanceFactorActualizacion(balance) {
  const inflationData = /** @type {{ factor?: unknown; accumulated?: unknown }} */ (
    balance?.inflationData
  )

  const raw =
    inflationData?.factor ??
    balance?.factorActualizacion ??
    balance?.factorInflacion ??
    balance?.factor_actualizacion

  const factor = Number(raw)
  if (Number.isFinite(factor) && factor > 0) {
    return factor
  }

  if (
    inflationData?.accumulated != null &&
    Number.isFinite(Number(inflationData.accumulated))
  ) {
    const fromAccumulated = Number(inflationData.accumulated) + 1
    if (fromAccumulated > 0) {
      return fromAccumulated
    }
  }

  return 1
}

/**
 * @param {Record<string, unknown> | null | undefined} balance
 * @returns {number}
 */
export function getBalanceInflationAccumulated(balance) {
  const inflationData = /** @type {{ accumulated?: unknown }} */ (
    balance?.inflationData
  )

  if (
    inflationData?.accumulated != null &&
    Number.isFinite(Number(inflationData.accumulated))
  ) {
    return Number(inflationData.accumulated)
  }

  return getBalanceFactorActualizacion(balance) - 1
}

/**
 * Coeficiente IPC multiplicador (Excel), ej. 3,762.
 *
 * @param {number | null | undefined} factor
 * @returns {string}
 */
export function formatCoeficienteIpcDisplay(factor) {
  const safe = getBalanceFactorActualizacion({ factorActualizacion: factor })
  return safe.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })
}

/** @deprecated Use formatCoeficienteIpcDisplay */
export function formatInflationFactorTable(factor) {
  return formatCoeficienteIpcDisplay(factor)
}

/**
 * Motor Excel por balance y rubro (sin promediar entre balances).
 *
 * @param {unknown} annualHistorical valor anual del rubro (ventas/compras/costos)
 * @param {number} factorInflacion coeficiente IPC guardado en el balance
 * @param {number | null | undefined} coeficienteEmpresa
 * @returns {{
 *   promedioMensual: number;
 *   coefInflacion: number;
 *   accumulated: number;
 *   valorActualizado: number;
 *   creditoCalculado: number;
 * }}
 */
export function computeBalanceRubroExcelMetrics(
  annualHistorical,
  factorInflacion,
  coeficienteEmpresa
) {
  const annual = parseBalanceAmount(annualHistorical) ?? 0

  const factorSafe = getBalanceFactorActualizacion({
    factorActualizacion: factorInflacion,
  })

  const coef =
    coeficienteEmpresa != null &&
    Number.isFinite(coeficienteEmpresa) &&
    coeficienteEmpresa > 0
      ? coeficienteEmpresa
      : 0

  const annualValue = Number(annual)

  // PROMEDIO MENSUAL = VALOR ANUAL / 12
  const promedioMensualRaw =
    Number.isFinite(annualValue) && annualValue > 0
      ? annualValue / 12
      : 0

  const promedioMensual =
    roundMoneyForFirestore(promedioMensualRaw) ??
    promedioMensualRaw

  // ACTUALIZAR EL PROMEDIO MENSUAL
  const valorActualizado = 
  promedioMensualRaw > 0 ? roundMoneyForFirestore(promedioMensualRaw * factorSafe) ?? 
  promedioMensualRaw * factorSafe :
   0
  const creditoCalculado =
    coef > 0 && valorActualizado > 0
      ? roundMoneyForFirestore(valorActualizado * coef) ?? 0
      : 0

  return {
    promedioMensual,
    coefInflacion: factorSafe,
    accumulated: factorSafe - 1,
    valorActualizado,
    creditoCalculado,
  }
}

/**
 * @typedef {{
 *   creditoCalculado?: number | null;
 *   promedioMensual?: number | null;
 *   ventasContablesMensuales?: number | null;
 * }} PrequalTableRowLike
 */

/**
 * Promedio de créditos calculados de un rubro entre balances (solo créditos > 0).
 *
 * @param {PrequalTableRowLike[]} rows
 * @returns {number}
 */
export function computePromedioCreditoPorRubro(rows) {
  const creditos = (rows ?? [])
    .map((row) => row.creditoCalculado)
    .filter(
      (value) =>
        value != null && Number.isFinite(Number(value)) && Number(value) > 0
    )

  if (creditos.length === 0) {
    return 0
  }

  return (
    creditos.reduce((sum, value) => sum + Number(value), 0) / creditos.length
  )
}

/**
 * Promedio de créditos calculados por rubro (solo visual en tablas).
 *
 * @param {Record<BalancePrequalRubro, PrequalTableRowLike[]>} tablas
 * @returns {Record<BalancePrequalRubro, number>}
 */
export function computePromedioCreditoPorRubroFromTablas(tablas) {
  return {
    ventas: computePromedioCreditoPorRubro(tablas.ventas ?? []),
    compras: computePromedioCreditoPorRubro(tablas.compras ?? []),
    costos: computePromedioCreditoPorRubro(tablas.costos ?? []),
  }
}

/**
 * Promedio Excel (PROMEDIO.SI > 0): suma de fuentes válidas / cantidad de fuentes válidas.
 * Fuentes: ventas contables, IVA, IIBB. Se excluyen valores ≤ 0 o no numéricos.
 *
 * @param {number | null | undefined} ventasContables
 * @param {number | null | undefined} ventasIva
 * @param {number | null | undefined} ventasIibb
 * @returns {number}
 */
export function computePromedioVentasTresFuentesExcel(
  ventasContables,
  ventasIva,
  ventasIibb
) {
  const raw = averageExcelPromedioSi([ventasContables, ventasIva, ventasIibb])
  return roundMoneyForFirestore(raw) ?? raw
}

/**
 * Pre-Calificación (tarjeta resultado): Promedio × coeficiente × 1,1575.
 * Promedio = PROMEDIO.SI de ventas contables, IVA e IIBB mensuales válidas.
 *
 * @param {{
 *   ventasContablesMensuales?: number | null;
 *   ventasIibbMensuales?: number | null;
 *   ventasIvaMensuales?: number | null;
 *   coeficienteEmpresa?: number | null;
 * }} input
 * @returns {{ promedio: number; preCalificacion: number }}
 */
export function computePreCalificacionFromVentasMensuales(input) {
  const promedio = computePromedioVentasTresFuentesExcel(
    input.ventasContablesMensuales,
    input.ventasIvaMensuales,
    input.ventasIibbMensuales
  )

  const coef =
    input.coeficienteEmpresa != null &&
    Number.isFinite(input.coeficienteEmpresa) &&
    input.coeficienteEmpresa > 0
      ? input.coeficienteEmpresa
      : 0

  const raw =
    promedio > 0 && coef > 0
      ? promedio * coef * PREQUALIFICATION_VENTAS_IVA_FACTOR
      : 0

  const preCalificacion =
    roundMoneyForFirestore(raw) ?? raw

  return { promedio, preCalificacion }
}

/**
 * @deprecated La pre-calificación ya no sale de créditos por rubro.
 * @param {Record<BalancePrequalRubro, PrequalTableRowLike[]>} tablas
 */
export function computeExcelPrequalificationFromTablas(tablas) {
  const promedioPorRubro = computePromedioCreditoPorRubroFromTablas(tablas)
  return { preCalificacion: 0, promedioPorRubro }
}

/** @deprecated Use computePreCalificacionFromVentasMensuales */
export function computePreCalificacionFromRubroTablas(tablas) {
  return computeExcelPrequalificationFromTablas(tablas).preCalificacion
}

/**
 * Vista previa en formulario de un solo balance (misma fórmula que el motor global).
 * Encabezado de año = getFullYear() de fechaCierre (nunca año actual / ejercicio+1).
 *
 * @param {{
 *   ejercicio?: string;
 *   fechaCierre?: string | null;
 *   values: Record<string, string>;
 *   inflationFactor?: number | null;
 *   coeficiente: number | null | undefined;
 * }} input
 */
export function buildBalanceSlotPrequalificationTables(input) {
  const cierreRaw = String(input.fechaCierre ?? "").trim()
  let anio = "—"
  if (cierreRaw) {
    const normalized = cierreRaw.includes("T") ? cierreRaw : `${cierreRaw}T12:00:00`
    const date = new Date(normalized)
    if (!Number.isNaN(date.getTime())) {
      anio = String(date.getFullYear())
    }
  }

  const factor = getBalanceFactorActualizacion({
    factorActualizacion: input.inflationFactor,
  })

  /** @type {Record<BalancePrequalRubro, ReturnType<typeof computeBalanceRubroExcelMetrics> & { anio: string }>} */
  const byRubro = {}

  for (const { key, field } of BALANCE_PREQUAL_RUBRO_CONFIG) {
    const metrics = computeBalanceRubroExcelMetrics(
      input.values[field],
      factor,
      input.coeficiente
    )
    byRubro[key] = { anio, ...metrics }
  }

  const { preCalificacion } = computePreCalificacionFromVentasMensuales({
    ventasContablesMensuales: byRubro.ventas.promedioMensual,
    ventasIibbMensuales: 0,
    ventasIvaMensuales: 0,
    coeficienteEmpresa: input.coeficiente,
  })

  return {
    anio,
    rubros: byRubro,
    preCalificacion,
  }
}

/**
 * Promedio mensual de ventas contables entre filas de la tabla ventas.
 *
 * @param {PrequalTableRowLike[]} ventasRows
 * @returns {number | null}
 */
export function computePromedioVentasContablesMensuales(ventasRows) {
  const mensuales = (ventasRows ?? [])
    .map((row) => row.ventasContablesMensuales ?? row.promedioMensual)
    .filter(
      (value) =>
        value != null && Number.isFinite(Number(value)) && Number(value) > 0
    )

  if (mensuales.length === 0) {
    return null
  }

  return (
    mensuales.reduce((sum, value) => sum + Number(value), 0) / mensuales.length
  )
}

/**
 * @param {number | null | undefined} amount
 * @returns {string}
 */
export function formatPrequalTableMoney(amount) {
  if (amount == null || !Number.isFinite(amount)) {
    return formatMoneyWithSymbol(0)
  }
  return formatMoneyWithSymbol(amount)
}
