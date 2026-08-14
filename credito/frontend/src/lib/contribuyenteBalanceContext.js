import { hasBalanceContableIndicators } from "@/lib/balanceContableModel"

/** @typedef {"fisica" | "juridica"} TipoContribuyente */

export const ESTADO_ANALISIS_BALANCE = {
  CON_BALANCE: "CON_BALANCE",
  SIN_BALANCE: "SIN_BALANCE",
  BALANCE_PENDIENTE: "BALANCE_PENDIENTE",
}

/** @type {Record<string, string>} */
export const ESTADO_ANALISIS_BALANCE_LABEL = {
  [ESTADO_ANALISIS_BALANCE.CON_BALANCE]: "Con balance",
  [ESTADO_ANALISIS_BALANCE.SIN_BALANCE]: "Sin balance",
  [ESTADO_ANALISIS_BALANCE.BALANCE_PENDIENTE]: "Balance pendiente",
}

export const MENSAJE_PERSONA_FISICA_BALANCE =
  "El cliente es Persona Física. El análisis se realiza utilizando IVA, IIBB, BCRA y antecedentes crediticios, sin requerir balance contable."

export const MENSAJE_PERSONA_JURIDICA_SIN_BALANCE =
  "No se encontró balance contable. Se recomienda solicitar estados contables para completar el análisis."

const CUIT_PREFIX_PERSONA_FISICA = new Set([20, 23, 24, 26, 27])
const CUIT_PREFIX_PERSONA_JURIDICA = new Set([30, 33, 34])

/**
 * @param {unknown} raw
 * @returns {TipoContribuyente | null}
 */
function normalizeTipoContribuyente(raw) {
  if (raw == null || raw === "") {
    return null
  }
  const value = String(raw).trim().toLowerCase()
  if (value === "fisica" || value === "física" || value === "pf") {
    return "fisica"
  }
  if (
    value === "juridica" ||
    value === "jurídica" ||
    value === "pj" ||
    value === "sociedad"
  ) {
    return "juridica"
  }
  return null
}

/**
 * @param {string | null | undefined} cuit
 * @returns {TipoContribuyente | null}
 */
export function inferTipoContribuyenteFromCuit(cuit) {
  const digits = String(cuit ?? "").replace(/\D/g, "")
  if (digits.length < 10) {
    return null
  }
  const prefix = Number.parseInt(digits.slice(0, 2), 10)
  if (CUIT_PREFIX_PERSONA_FISICA.has(prefix)) {
    return "fisica"
  }
  if (CUIT_PREFIX_PERSONA_JURIDICA.has(prefix)) {
    return "juridica"
  }
  return null
}

/**
 * @param {unknown} iva
 * @param {unknown} iibb
 * @returns {boolean}
 */
export function hasDocumentacionFiscal(iva, iibb) {
  const ivaDocs = Array.isArray(iva) ? iva : []
  const iibbDocs = Array.isArray(iibb) ? iibb : []
  return ivaDocs.length > 0 || iibbDocs.length > 0
}

/**
 * Orden de resolución:
 * 1. tipoContribuyente guardado en credit_analysis
 * 2. Balance contable con datos → jurídica
 * 3. Sin balance pero con IVA y/o IIBB → física
 * 4. Inferencia por prefijo de CUIT
 *
 * @param {{
 *   cuit?: string | null;
 *   savedAnalysis?: Record<string, unknown> | null;
 *   balanceContable?: import("@/lib/balanceContableModel").BalanceContableDoc | null;
 *   iva?: unknown;
 *   iibb?: unknown;
 * }} input
 * @returns {TipoContribuyente | null}
 */
export function resolveTipoContribuyente(input) {
  const fromSaved = normalizeTipoContribuyente(input.savedAnalysis?.tipoContribuyente)
  if (fromSaved) {
    return fromSaved
  }

  if (hasBalanceContableParaAnalisis(input.balanceContable)) {
    return "juridica"
  }

  if (
    !hasBalanceContableParaAnalisis(input.balanceContable) &&
    hasDocumentacionFiscal(input.iva, input.iibb)
  ) {
    return "fisica"
  }

  return inferTipoContribuyenteFromCuit(input.cuit)
}

/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null | undefined} balanceContable
 * @returns {boolean}
 */
export function hasBalanceContableParaAnalisis(balanceContable) {
  return hasBalanceContableIndicators(balanceContable)
}

/**
 * @param {{
 *   tipoContribuyente: TipoContribuyente | null;
 *   balanceContable?: import("@/lib/balanceContableModel").BalanceContableDoc | null;
 * }} input
 * @returns {keyof typeof ESTADO_ANALISIS_BALANCE}
 */
export function resolveEstadoAnalisisBalance(input) {
  const hasBalance = hasBalanceContableParaAnalisis(input.balanceContable)

  if (input.tipoContribuyente === "fisica") {
    return ESTADO_ANALISIS_BALANCE.SIN_BALANCE
  }

  if (hasBalance) {
    return ESTADO_ANALISIS_BALANCE.CON_BALANCE
  }

  if (input.tipoContribuyente === "juridica" || input.tipoContribuyente === null) {
    return ESTADO_ANALISIS_BALANCE.BALANCE_PENDIENTE
  }

  return ESTADO_ANALISIS_BALANCE.BALANCE_PENDIENTE
}

/**
 * @param {TipoContribuyente | null} tipoContribuyente
 * @param {string} warning
 * @returns {boolean}
 */
export function shouldSuppressBalanceWarning(tipoContribuyente, warning) {
  if (tipoContribuyente !== "fisica") {
    return false
  }

  const normalized = warning.toLowerCase()
  return (
    normalized.includes("sin balance") ||
    normalized.includes("balance sin") ||
    normalized.includes("balance contable") ||
    normalized.includes("ventas, compras o costos") ||
    normalized.includes("un ejercicio") ||
    normalized.includes("fecha de cierre") ||
    normalized.includes("factor ipc") ||
    normalized.includes("estados contables")
  )
}

/**
 * @param {{
 *   ventasIva?: number | null;
 *   ventasIibb?: number | null;
 *   promedioVentas?: number | null;
 *   peorSituacionBcra?: number | null;
 * }} input
 * @returns {string}
 */
export function buildPersonaFisicaIngresosConclusion(input) {
  const tieneIngresos =
    (input.promedioVentas != null && input.promedioVentas > 0) ||
    (input.ventasIva != null && input.ventasIva > 0) ||
    (input.ventasIibb != null && input.ventasIibb > 0)

  const bcra = input.peorSituacionBcra ?? null
  const bcraElevado = bcra !== null && bcra >= 3

  if (!tieneIngresos && bcraElevado) {
    return "Sin evidencia suficiente de ingresos declarados y con señales adversas en BCRA. Se recomienda un análisis crediticio conservador basado en antecedentes."
  }

  if (!tieneIngresos) {
    return "El análisis se basa en antecedentes crediticios (BCRA y fuentes fiscales disponibles). Se sugiere completar IVA e IIBB para fortalecer la evaluación de capacidad de pago."
  }

  if (bcraElevado) {
    return "Se observa capacidad de generación de ingresos según IVA/IIBB, aunque el comportamiento crediticio en BCRA requiere seguimiento y cautela en la línea a otorgar."
  }

  return "Se observa capacidad de generación de ingresos según declaraciones fiscales (IVA/IIBB) y comportamiento crediticio acorde para un perfil de Persona Física sin balance contable."
}
