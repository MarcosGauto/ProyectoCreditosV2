import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"
import {
  buildInflationAdjustedFirestoreValues,
  buildInflationDataPayload,
} from "@/lib/inflation/balanceInflation"
import { amountToFormString, roundMoneyForFirestore } from "@/lib/money"

/** @typedef {"manual" | "excel" | "pdf"} IndicatorsSource */
/** @typedef {"draft" | "confirmed"} ValidationStatus */

/**
 * @typedef {Object} BalanceIndicatorsFormValues
 * @property {string} ejercicio
 * @property {string} periodo
 * @property {string} fechaCierre
 * @property {string} moneda
 * @property {string} activoCorriente
 * @property {string} activoNoCorriente
 * @property {string} totalActivo
 * @property {string} pasivoCorriente
 * @property {string} pasivoNoCorriente
 * @property {string} totalPasivo
 * @property {string} patrimonioNeto
 * @property {string} ventas
 * @property {string} compras
 * @property {string} costos
 * @property {string} resultadoOperativo
 * @property {string} resultadoNeto
 * @property {string} ebitda
 */

export const DEFAULT_MONEDA = "ARS"

export const EMPTY_BALANCE_INDICATORS = {
  ejercicio: "",
  periodo: "",
  fechaCierre: "",
  moneda: DEFAULT_MONEDA,
  activoCorriente: "",
  activoNoCorriente: "",
  totalActivo: "",
  pasivoCorriente: "",
  pasivoNoCorriente: "",
  totalPasivo: "",
  patrimonioNeto: "",
  ventas: "",
  compras: "",
  costos: "",
  resultadoOperativo: "",
  resultadoNeto: "",
  ebitda: "",
}

export { amountToFormString } from "@/lib/money"

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {BalanceIndicatorsFormValues}
 */
export function balanceDocToFormValues(doc) {
  if (!doc) {
    return { ...EMPTY_BALANCE_INDICATORS }
  }

  const periodoRaw = String(doc.periodo ?? "")
  const ejercicioFromDoc =
    doc.ejercicio != null && doc.ejercicio !== ""
      ? String(doc.ejercicio)
      : periodoRaw.length >= 4
        ? periodoRaw.slice(0, 4)
        : ""

  return {
    ejercicio: ejercicioFromDoc,
    periodo: periodoRaw,
    fechaCierre: String(doc.fechaCierre ?? doc.fecha_cierre ?? ""),
    moneda: String(doc.moneda ?? DEFAULT_MONEDA),
    activoCorriente: amountToFormString(
      doc.activoCorriente ?? doc.activo_corriente
    ),
    activoNoCorriente: amountToFormString(
      doc.activoNoCorriente ?? doc.activo_no_corriente
    ),
    totalActivo: amountToFormString(
      doc.totalActivo ?? doc.total_activo ?? doc.activo_total
    ),
    pasivoCorriente: amountToFormString(
      doc.pasivoCorriente ?? doc.pasivo_corriente
    ),
    pasivoNoCorriente: amountToFormString(
      doc.pasivoNoCorriente ?? doc.pasivo_no_corriente
    ),
    totalPasivo: amountToFormString(
      doc.totalPasivo ?? doc.total_pasivo ?? doc.pasivo_total
    ),
    patrimonioNeto: amountToFormString(
      doc.patrimonioNeto ?? doc.patrimonio_neto ?? doc.patrimonio
    ),
    ventas: amountToFormString(doc.ventas),
    compras: amountToFormString(doc.compras),
    costos: amountToFormString(doc.costos),
    resultadoOperativo: amountToFormString(
      doc.resultadoOperativo ?? doc.resultado_operativo
    ),
    resultadoNeto: amountToFormString(
      doc.resultadoNeto ?? doc.resultado_neto ?? doc.resultado
    ),
    ebitda: amountToFormString(doc.ebitda),
  }
}

/**
 * @param {BalanceIndicatorsFormValues} values
 * @returns {Record<string, number | string | null>}
 */
/**
 * Suma dos importes del formulario; vacío se trata como 0 si el otro tiene valor.
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
function sumFormAmounts(a, b) {
  const hasA = a !== ""
  const hasB = b !== ""
  if (!hasA && !hasB) {
    return ""
  }
  const na = parseBalanceAmount(a) ?? 0
  const nb = parseBalanceAmount(b) ?? 0
  return amountToFormString(na + nb)
}

/**
 * Aplica totales y patrimonio calculados (no modifica campos editables base).
 * @param {BalanceIndicatorsFormValues} values
 * @returns {BalanceIndicatorsFormValues}
 */
export function applyDerivedBalanceFields(values) {
  const totalActivo = sumFormAmounts(
    values.activoCorriente,
    values.activoNoCorriente
  )
  const totalPasivo = sumFormAmounts(
    values.pasivoCorriente,
    values.pasivoNoCorriente
  )

  const activoNum = parseBalanceAmount(totalActivo)
  const pasivoNum = parseBalanceAmount(totalPasivo)

  let patrimonioNeto = ""
  if (activoNum !== null && pasivoNum !== null) {
    patrimonioNeto = amountToFormString(activoNum - pasivoNum)
  } else if (activoNum !== null && totalPasivo === "") {
    patrimonioNeto = amountToFormString(activoNum)
  } else if (pasivoNum !== null && totalActivo === "") {
    patrimonioNeto = amountToFormString(-pasivoNum)
  }

  return {
    ...values,
    totalActivo,
    totalPasivo,
    patrimonioNeto,
  }
}

/**
 * @typedef {import("@/lib/inflation/balanceInflation").InflationFactorResult} InflationFactorResult
 */

/**
 * @param {BalanceIndicatorsFormValues} values
 * @param {InflationFactorResult | null} [inflation]
 * @returns {Record<string, number | string | null>}
 */
export function formValuesToFirestoreNumbers(values, inflation = null) {
  const derived = applyDerivedBalanceFields(values)
  /** @param {string} raw */
  const num = (raw) => roundMoneyForFirestore(raw)

  const ejercicio =
    values.ejercicio.trim().slice(0, 4) ||
    values.periodo.trim().slice(0, 4) ||
    null
  const periodo =
    values.periodo.trim() ||
    (ejercicio ? `${ejercicio}12` : null)

  const base = {
    ejercicio,
    periodo,
    fechaCierre: values.fechaCierre.trim() || null,
    moneda: values.moneda.trim() || DEFAULT_MONEDA,
    activoCorriente: num(derived.activoCorriente),
    activoNoCorriente: num(derived.activoNoCorriente),
    totalActivo: num(derived.totalActivo),
    pasivoCorriente: num(derived.pasivoCorriente),
    pasivoNoCorriente: num(derived.pasivoNoCorriente),
    totalPasivo: num(derived.totalPasivo),
    patrimonioNeto: num(derived.patrimonioNeto),
    ventas: num(derived.ventas),
    compras: num(derived.compras),
    costos: num(derived.costos),
    resultadoOperativo: num(derived.resultadoOperativo),
    resultadoNeto: num(derived.resultadoNeto),
    ebitda: num(derived.ebitda),
  }

  const inflationData = buildInflationDataPayload(inflation)
  const factor = inflationData.factor

  const payload = {
    ...base,
    factorActualizacion: factor,
    inflationData,
  }

  const persistAdjusted =
    inflation?.factorInflacion != null &&
    inflation.factorInflacion > 0 &&
    (inflation.manual || (!inflation.fallback && !inflation.apiUnavailable))

  if (!persistAdjusted) {
    return payload
  }

  return {
    ...payload,
    factorInflacion: factor,
    fechaIPCOrigen: inflation.fechaIPCOrigen,
    fechaIPCDestino: inflation.fechaIPCDestino,
    inflacionAcumuladaPct: inflation.inflacionAcumuladaPct,
    ipcOrigen: inflation.ipcOrigen,
    ipcDestino: inflation.ipcDestino,
    ipcSource: inflation.manual ? "manual" : inflation.sourceId,
    ...buildInflationAdjustedFirestoreValues(derived, inflation),
  }
}

/**
 * @param {Record<string, unknown>} numericPayload
 * @returns {Record<string, unknown>}
 */
export function withScoringFieldAliases(numericPayload) {
  return {
    ...numericPayload,
    activo_total: numericPayload.totalActivo,
    pasivo_total: numericPayload.totalPasivo,
    patrimonio: numericPayload.patrimonioNeto,
    activo_corriente: numericPayload.activoCorriente,
    activo_no_corriente: numericPayload.activoNoCorriente,
    pasivo_corriente: numericPayload.pasivoCorriente,
    pasivo_no_corriente: numericPayload.pasivoNoCorriente,
    resultado_operativo: numericPayload.resultadoOperativo,
    resultado_neto: numericPayload.resultadoNeto,
    fecha_cierre: numericPayload.fechaCierre,
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {boolean}
 */
export function hasConfirmedBalanceIndicators(doc) {
  if (!doc || doc.validationStatus !== "confirmed") {
    return false
  }

  return (
    parseBalanceAmount(doc.totalActivo ?? doc.activo_total) !== null ||
    parseBalanceAmount(doc.patrimonioNeto ?? doc.patrimonio) !== null
  )
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {ValidationStatus}
 */
export function getBalanceValidationStatus(doc) {
  return doc?.validationStatus === "confirmed" ? "confirmed" : "draft"
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {{ label: string; className: string } | null}
 */
export function getValidationStatusBadge(doc) {
  if (!doc) {
    return null
  }

  if (doc.validationStatus === "confirmed") {
    return {
      label: "Confirmado",
      className:
        "border-green-500/30 bg-green-500/10 text-green-400",
    }
  }

  return {
    label: "Borrador",
    className:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {{ label: string; className: string } | null}
 */
export function getIndicatorsSourceBadge(doc) {
  if (!doc || doc.validationStatus !== "confirmed") {
    return null
  }

  const source = String(doc.indicatorsSource ?? "manual")

  if (source === "excel" || source === "pdf") {
    return {
      label: "Extraído automáticamente",
      className: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    }
  }

  return {
    label: "Confirmado manualmente",
    className: "border-slate-500/30 bg-slate-500/10 text-foreground/80",
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {string | null}
 */
export function getBalanceValidationSubtitle(doc) {
  if (!doc) {
    return null
  }

  return hasConfirmedBalanceIndicators(doc)
    ? "Indicadores confirmados"
    : "Pendiente de validación"
}
