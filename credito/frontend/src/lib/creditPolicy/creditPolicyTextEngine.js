import { DEFAULT_POLICY_TEXTOS } from "@/lib/creditPolicy/defaultPolicyTextos"
import { formatCreditAmount } from "@/lib/creditAnalysisEngine"

/** @typedef {import("./creditPolicyTypes").CreditPolicyTextos} CreditPolicyTextos */

/**
 * @param {string | null | undefined} template
 * @param {Record<string, string | number | null | undefined>} [vars]
 * @returns {string}
 */
export function applyPolicyTextTemplate(template, vars = {}) {
  if (!template || typeof template !== "string") {
    return ""
  }

  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key]
    if (value === null || value === undefined || value === "") {
      return "—"
    }
    return String(value)
  })
}

/**
 * @param {number | null | undefined} ratio
 * @returns {string}
 */
function formatRatioValue(ratio) {
  if (ratio === null || ratio === undefined || !Number.isFinite(Number(ratio))) {
    return "—"
  }
  return Number(ratio).toFixed(2)
}

/**
 * @param {number | null | undefined} ratio
 * @returns {string}
 */
function formatPercentFromRatio(ratio) {
  if (ratio === null || ratio === undefined || !Number.isFinite(Number(ratio))) {
    return "—"
  }
  return (Number(ratio) * 100).toFixed(1)
}

/**
 * @param {{
 *   liquidezCorriente?: number | null;
 *   endeudamiento?: number | null;
 *   solvencia?: number | null;
 *   patrimonioNeto?: number | null;
 *   scoreFinanciero?: number | null;
 *   scoreNosis?: number | null;
 *   capacidadFinanciera?: number | null;
 * }} input
 * @returns {Record<string, string>}
 */
export function buildPolicyTextVariables(input = {}) {
  return {
    liquidez: formatRatioValue(input.liquidezCorriente),
    endeudamiento: formatPercentFromRatio(input.endeudamiento),
    solvencia: formatRatioValue(input.solvencia),
    patrimonio: formatCreditAmount(input.patrimonioNeto ?? null),
    scoreFinanciero:
      input.scoreFinanciero != null && Number.isFinite(Number(input.scoreFinanciero))
        ? String(Math.round(Number(input.scoreFinanciero)))
        : "—",
    scoreNosis:
      input.scoreNosis != null && Number.isFinite(Number(input.scoreNosis))
        ? String(Math.round(Number(input.scoreNosis)))
        : "—",
    capacidadFinanciera: formatCreditAmount(input.capacidadFinanciera ?? null),
  }
}

/**
 * @param {unknown} raw
 * @param {CreditPolicyTextos} defaults
 * @returns {CreditPolicyTextos}
 */
export function normalizePolicyTextos(raw, defaults = DEFAULT_POLICY_TEXTOS) {
  const source =
    raw && typeof raw === "object"
      ? /** @type {Record<string, unknown>} */ (raw)
      : {}

  /** @param {Record<string, string>} fallback */
  const section = (key, fallback) => {
    const block =
      source[key] && typeof source[key] === "object"
        ? /** @type {Record<string, unknown>} */ (source[key])
        : {}
    return Object.fromEntries(
      Object.entries(fallback).map(([field, defaultText]) => [
        field,
        typeof block[field] === "string" && block[field].trim()
          ? String(block[field])
          : defaultText,
      ])
    )
  }

  return {
    dictamenPatrimonial: section("dictamenPatrimonial", defaults.dictamenPatrimonial),
    comentarioBalance: section("comentarioBalance", defaults.comentarioBalance),
    conclusionEvolutiva: section("conclusionEvolutiva", defaults.conclusionEvolutiva),
    resultadoFinal: section("resultadoFinal", defaults.resultadoFinal),
  }
}

/**
 * @param {{
 *   variacionPatrimonio?: number | null;
 *   estadoEvolucionPatrimonial?: string;
 * }} input
 * @returns {"crecimiento" | "estable" | "caida"}
 */
export function resolveConclusionEvolutivaKey(input) {
  const { variacionPatrimonio, estadoEvolucionPatrimonial } = input

  if (
    estadoEvolucionPatrimonial === "risky" ||
    (variacionPatrimonio !== null &&
      Number.isFinite(variacionPatrimonio) &&
      variacionPatrimonio < 0)
  ) {
    return "caida"
  }

  if (
    variacionPatrimonio !== null &&
    Number.isFinite(variacionPatrimonio) &&
    variacionPatrimonio > 0
  ) {
    return "crecimiento"
  }

  return "estable"
}

/**
 * @param {CreditPolicyTextos} textos
 * @param {"bueno" | "medio" | "riesgoso"} key
 * @param {Record<string, string>} vars
 */
export function renderDictamenPatrimonialText(textos, key, vars) {
  const template =
    textos.dictamenPatrimonial[key] ??
    DEFAULT_POLICY_TEXTOS.dictamenPatrimonial[key]
  return applyPolicyTextTemplate(template, vars)
}

/**
 * @param {CreditPolicyTextos} textos
 * @param {"bueno" | "medio" | "riesgoso"} key
 * @param {Record<string, string>} vars
 */
export function renderComentarioBalanceText(textos, key, vars) {
  const template =
    textos.comentarioBalance[key] ?? DEFAULT_POLICY_TEXTOS.comentarioBalance[key]
  return applyPolicyTextTemplate(template, vars)
}

/**
 * @param {CreditPolicyTextos} textos
 * @param {"crecimiento" | "estable" | "caida"} key
 * @param {Record<string, string>} vars
 */
export function renderConclusionEvolutivaText(textos, key, vars) {
  const template =
    textos.conclusionEvolutiva[key] ??
    DEFAULT_POLICY_TEXTOS.conclusionEvolutiva[key]
  return applyPolicyTextTemplate(template, vars)
}

/**
 * @param {CreditPolicyTextos} textos
 * @param {string} key
 * @param {Record<string, string>} vars
 */
export function renderResultadoFinalText(textos, key, vars) {
  const block = textos.resultadoFinal
  const template =
    block[key] ??
    DEFAULT_POLICY_TEXTOS.resultadoFinal[
      /** @type {keyof typeof DEFAULT_POLICY_TEXTOS.resultadoFinal} */ (key)
    ] ??
    ""
  return applyPolicyTextTemplate(template, vars)
}
