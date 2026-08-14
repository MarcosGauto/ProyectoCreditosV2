import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"
import { amountToFormString, roundMoneyForFirestore } from "@/lib/money"

/** Alícuota IIBB por defecto (%) cuando el analista no indica otra. */
export const DEFAULT_IIBB_ALICUOTA = 3.5

/**
 * @typedef {Object} IibbIndicatorsFormValues
 * @property {string} periodo
 * @property {string} baseImponible
 * @property {string} impuestoDeterminado
 * @property {string} alicuota
 * @property {string} jurisdiccion
 */

export const EMPTY_IIBB_INDICATORS = {
  periodo: "",
  baseImponible: "",
  impuestoDeterminado: "",
  alicuota: String(DEFAULT_IIBB_ALICUOTA),
  jurisdiccion: "",
}

export { amountToFormString } from "@/lib/money"

/**
 * @param {unknown} value
 * @returns {string}
 */
export function alicuotaToFormString(value) {
  if (value == null || value === "") {
    return ""
  }
  const str = String(value).replace("%", "").trim().replace(",", ".")
  const parsed = parseFloat(str)
  if (!Number.isFinite(parsed)) {
    return str
  }
  return String(parsed)
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseAlicuotaPercent(value) {
  if (value == null || value === "") {
    return null
  }

  const str = String(value).replace("%", "").trim().replace(",", ".")
  const parsed = parseFloat(str)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

/**
 * baseImponible = impuestoDeterminado / (alicuota / 100)
 *
 * @param {unknown} impuestoDeterminado
 * @param {unknown} alicuotaPercent
 * @returns {number | null}
 */
export function calculateBaseImponibleFromIibb(
  impuestoDeterminado,
  alicuotaPercent
) {
  const impuesto = parseBalanceAmount(impuestoDeterminado)
  const alicuota =
    typeof alicuotaPercent === "number"
      ? alicuotaPercent
      : parseAlicuotaPercent(alicuotaPercent)

  if (impuesto === null || alicuota === null || alicuota <= 0) {
    return null
  }

  return roundMoneyForFirestore(impuesto / (alicuota / 100))
}

/**
 * Recalcula base y normaliza alícuota antes de mostrar o persistir.
 *
 * @param {IibbIndicatorsFormValues} values
 * @returns {IibbIndicatorsFormValues}
 */
export function resolveIibbComputedValues(values) {
  const alicuota =
    parseAlicuotaPercent(values.alicuota) ?? DEFAULT_IIBB_ALICUOTA
  const base = calculateBaseImponibleFromIibb(
    values.impuestoDeterminado,
    alicuota
  )

  return {
    ...values,
    alicuota: alicuotaToFormString(alicuota) || String(DEFAULT_IIBB_ALICUOTA),
    baseImponible: base !== null ? amountToFormString(base) : "",
  }
}

/**
 * Base imponible a usar en Crédito Asumible y scoring futuro.
 * Prioriza el valor persistido (recalculado con la alícuota del analista).
 *
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {number | null}
 */
export function getIibbBaseImponibleForCredit(doc) {
  if (!doc) {
    return null
  }

  const storedBase = parseBalanceAmount(
    doc.baseImponible ?? doc.base_imponible
  )
  if (storedBase !== null) {
    return storedBase
  }

  const impuesto = parseBalanceAmount(
    doc.impuestoDeterminado ?? doc.impuesto_determinado
  )
  const alicuota =
    parseAlicuotaPercent(doc.alicuota) ?? DEFAULT_IIBB_ALICUOTA

  return calculateBaseImponibleFromIibb(impuesto, alicuota)
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {IibbIndicatorsFormValues}
 */
export function iibbDocToFormValues(doc) {
  if (!doc) {
    return { ...EMPTY_IIBB_INDICATORS }
  }

  const raw = {
    periodo: String(doc.periodo ?? ""),
    impuestoDeterminado: amountToFormString(
      doc.impuestoDeterminado ?? doc.impuesto_determinado
    ),
    alicuota:
      alicuotaToFormString(doc.alicuota) || String(DEFAULT_IIBB_ALICUOTA),
    jurisdiccion: String(doc.jurisdiccion ?? ""),
    baseImponible: amountToFormString(
      doc.baseImponible ?? doc.base_imponible
    ),
  }

  return resolveIibbComputedValues(raw)
}

/**
 * @param {IibbIndicatorsFormValues} values
 * @returns {Record<string, number | string | null>}
 */
export function formValuesToIibbFirestore(values) {
  const resolved = resolveIibbComputedValues(values)
  const alicuota =
    parseAlicuotaPercent(resolved.alicuota) ?? DEFAULT_IIBB_ALICUOTA
  const baseImponible = calculateBaseImponibleFromIibb(
    resolved.impuestoDeterminado,
    alicuota
  )

  const impuesto = roundMoneyForFirestore(resolved.impuestoDeterminado)
  const baseRounded = baseImponible === null ? null : roundMoneyForFirestore(baseImponible)

  return {
    periodo: resolved.periodo.trim() || null,
    impuestoDeterminado: impuesto,
    alicuota,
    baseImponible: baseRounded,
    jurisdiccion: resolved.jurisdiccion.trim() || null,
    baseImponibleCalculada: baseImponible !== null,
    baseImponibleFormula: "impuestoDeterminado / (alicuota / 100)",
  }
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, unknown>}
 */
export function withIibbScoringAliases(payload) {
  return {
    ...payload,
    base_imponible: payload.baseImponible,
    impuesto_determinado: payload.impuestoDeterminado,
    /** Alias para consumo de Crédito Asumible / scoring. */
    base_imponible_credito: payload.baseImponible,
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {boolean}
 */
export function hasConfirmedIibbIndicators(doc) {
  if (!doc || doc.validationStatus !== "confirmed") {
    return false
  }

  return (
    getIibbBaseImponibleForCredit(doc) !== null ||
    parseBalanceAmount(doc.impuestoDeterminado ?? doc.impuesto_determinado) !==
      null
  )
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {{ label: string; className: string } | null}
 */
export function getIibbValidationBadge(doc) {
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
