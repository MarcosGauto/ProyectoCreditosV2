import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"
import { calculateIvaMetrics } from "@/lib/scoring/calculateIvaMetrics"
import { amountToFormString, roundMoneyForFirestore } from "@/lib/money"

/**
 * @typedef {Object} IvaIndicatorsFormValues
 * @property {string} periodo
 * @property {string} debitoFiscal
 * @property {string} creditoFiscal
 * @property {string} saldoTecnico
 * @property {string} ventas21
 * @property {string} ventas105
 * @property {string} promedioVentas
 * @property {string} creditoAsumible
 */

export const EMPTY_IVA_INDICATORS = {
  periodo: "",
  debitoFiscal: "",
  creditoFiscal: "",
  saldoTecnico: "0.00",
  ventas21: "0.00",
  ventas105: "0.00",
  promedioVentas: "0.00",
  creditoAsumible: "0.00",
}

export { amountToFormString, parseMoneyInput } from "@/lib/money"

/**
 * @param {number} value
 * @returns {string}
 */
function metricToFormString(value) {
  if (!Number.isFinite(value)) {
    return "0.00"
  }
  return amountToFormString(value)
}

/**
 * @param {IvaIndicatorsFormValues} values
 * @param {number | null} [coeficiente]
 * @returns {IvaIndicatorsFormValues}
 */
export function applyDerivedIvaFields(values, coeficiente = null) {
  const metrics = calculateIvaMetrics({
    debitoFiscal: values.debitoFiscal,
    creditoFiscal: values.creditoFiscal,
    coeficiente,
  })

  return {
    ...values,
    saldoTecnico: metricToFormString(metrics.saldoTecnico),
    ventas21: metricToFormString(metrics.ventasIVA21),
    ventas105: metricToFormString(metrics.ventasIVA105),
    promedioVentas: metricToFormString(metrics.promedioIVA),
    creditoAsumible: metricToFormString(metrics.creditoAsumibleIVA),
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @param {number | null} [coeficiente]
 * @returns {number}
 */
export function getPromedioIVAFromDoc(doc, coeficiente = null) {
  if (!doc) {
    return 0
  }

  const stored = parseBalanceAmount(
    doc.promedioIVA ??
      doc.promedio_iva ??
      doc.promedioVentas ??
      doc.promedioVentasIva ??
      doc.promedio_ventas
  )
  if (stored !== null) {
    return stored
  }

  const metrics = calculateIvaMetrics({
    debitoFiscal: doc.debitoFiscal ?? doc.debito_fiscal,
    creditoFiscal: doc.creditoFiscal ?? doc.credito_fiscal,
    coeficiente,
  })

  return metrics.promedioIVA
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {IvaIndicatorsFormValues}
 */
export function ivaDocToFormValues(doc) {
  if (!doc) {
    return { ...EMPTY_IVA_INDICATORS }
  }

  const base = {
    periodo: String(doc.periodo ?? ""),
    debitoFiscal: amountToFormString(doc.debitoFiscal ?? doc.debito_fiscal),
    creditoFiscal: amountToFormString(doc.creditoFiscal ?? doc.credito_fiscal),
    saldoTecnico: amountToFormString(doc.saldoTecnico ?? doc.saldo_tecnico),
    ventas21: amountToFormString(
      doc.ventasIVA21 ?? doc.ventas_iva_21 ?? doc.ventas21 ?? doc.ventas_21
    ),
    ventas105: amountToFormString(
      doc.ventasIVA105 ?? doc.ventas_iva_105 ?? doc.ventas105 ?? doc.ventas_105
    ),
    promedioVentas: amountToFormString(
      doc.promedioIVA ??
        doc.promedio_iva ??
        doc.promedioVentas ??
        doc.promedio_ventas ??
        doc.promedioVentasIva
    ),
    creditoAsumible: amountToFormString(
      doc.creditoAsumibleIVA ??
        doc.credito_asumible_iva ??
        doc.creditoAsumible ??
        doc.credito_asumible
    ),
  }

  return applyDerivedIvaFields(base)
}

/**
 * @param {IvaIndicatorsFormValues} values
 * @param {number | null} [coeficiente]
 * @returns {Record<string, number | string | null>}
 */
export function formValuesToIvaFirestore(values, coeficiente = null) {
  const derived = applyDerivedIvaFields(values, coeficiente)
  const metrics = calculateIvaMetrics({
    debitoFiscal: derived.debitoFiscal,
    creditoFiscal: derived.creditoFiscal,
    coeficiente,
  })

  const num = (raw) => roundMoneyForFirestore(raw) ?? 0

  return {
    periodo: derived.periodo.trim() || null,
    debitoFiscal: num(derived.debitoFiscal),
    creditoFiscal: num(derived.creditoFiscal),
    saldoTecnico: metrics.saldoTecnico,
    ventasIVA21: metrics.ventasIVA21,
    ventasIVA105: metrics.ventasIVA105,
    promedioIVA: metrics.promedioIVA,
    creditoAsumibleIVA: metrics.creditoAsumibleIVA,
    ventas21: metrics.ventasIVA21,
    ventas105: metrics.ventasIVA105,
    promedioVentas: metrics.promedioIVA,
    promedioVentasIva: metrics.promedioIVA,
    creditoAsumible: metrics.creditoAsumibleIVA,
    ventasDeclaradas: metrics.promedioIVA,
  }
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, unknown>}
 */
export function withIvaScoringAliases(payload) {
  return {
    ...payload,
    debito_fiscal: payload.debitoFiscal,
    credito_fiscal: payload.creditoFiscal,
    saldo_tecnico: payload.saldoTecnico,
    ventas_iva_21: payload.ventasIVA21,
    ventas_iva_105: payload.ventasIVA105,
    ventas_21: payload.ventasIVA21,
    ventas_105: payload.ventasIVA105,
    promedio_iva: payload.promedioIVA,
    promedio_ventas: payload.promedioIVA,
    promedio_ventas_iva: payload.promedioIVA,
    ventas_declaradas: payload.promedioIVA,
    credito_asumible_iva: payload.creditoAsumibleIVA,
    credito_asumible: payload.creditoAsumibleIVA,
  }
}

/**
 * PROMEDIO de promedioIVA de declaraciones confirmadas.
 * @param {unknown[]} ivaDocs
 * @returns {number}
 */
export function averagePromedioIvaConfirmed(ivaDocs) {
  if (!Array.isArray(ivaDocs) || ivaDocs.length === 0) {
    return 0
  }

  const confirmed = ivaDocs.filter(
    (doc) =>
      /** @type {Record<string, unknown>} */ (doc).validationStatus ===
      "confirmed"
  )

  const source = confirmed.length > 0 ? confirmed : ivaDocs

  const values = source
    .map((doc) =>
      getPromedioIVAFromDoc(/** @type {Record<string, unknown>} */ (doc))
    )
    .filter((value) => Number.isFinite(value))

  if (values.length === 0) {
    return 0
  }

  const sum = values.reduce((acc, value) => acc + value, 0)
  return roundMoneyForFirestore(sum / values.length) ?? 0
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {number}
 */
export function getIvaPromedioVentasForCredit(doc) {
  return getPromedioIVAFromDoc(doc)
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {boolean}
 */
export function hasConfirmedIvaIndicators(doc) {
  if (!doc || doc.validationStatus !== "confirmed") {
    return false
  }

  return (
    parseBalanceAmount(doc.debitoFiscal ?? doc.debito_fiscal) !== null ||
    getPromedioIVAFromDoc(doc) > 0
  )
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {{ label: string; className: string } | null}
 */
export function getIvaValidationBadge(doc) {
  if (!doc) {
    return null
  }

  if (doc.validationStatus === "confirmed") {
    return {
      label: "Confirmado",
      className: "border-green-500/30 bg-green-500/10 text-green-400",
    }
  }

  return {
    label: "Borrador",
    className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  }
}
