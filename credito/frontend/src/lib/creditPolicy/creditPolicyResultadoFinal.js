import {
  RESULTADO_COBERTURA,
} from "@/lib/coverageRequirements"
import { resolveCreditPolicy } from "@/lib/creditPolicy/resolveCreditPolicy"
import {
  buildPolicyTextVariables,
  renderResultadoFinalText,
} from "@/lib/creditPolicy/creditPolicyTextEngine"

/**
 * @param {string} resultadoCobertura
 * @returns {keyof import("./creditPolicyTypes").CreditPolicyTextosResultadoFinal}
 */
export function resolveResultadoFinalTextKey(resultadoCobertura) {
  if (resultadoCobertura === RESULTADO_COBERTURA.NOMINADO_CON_COBERTURA) {
    return "nominadoConCobertura"
  }
  if (resultadoCobertura === RESULTADO_COBERTURA.DISCRECIONAL_CON_COBERTURA) {
    return "discrecionalConCobertura"
  }
  return "sinCobertura"
}

/**
 * @param {string | null | undefined} estadoGeneral
 * @returns {"aprobado" | "observado" | "riesgoso" | null}
 */
export function resolveEstadoGeneralTextKey(estadoGeneral) {
  if (estadoGeneral === "good") return "aprobado"
  if (estadoGeneral === "medium") return "observado"
  if (estadoGeneral === "risky") return "riesgoso"
  return null
}

/**
 * @param {unknown} creditPolicy
 * @param {{
 *   resultadoCobertura?: string | null;
 *   estadoGeneral?: string | null;
 *   textVars?: Record<string, string | number | null | undefined>;
 * }} input
 * @returns {string}
 */
export function buildResultadoFinalNarrative(creditPolicy, input = {}) {
  const policy = resolveCreditPolicy(creditPolicy)
  const vars = buildPolicyTextVariables(input.textVars ?? {})

  const coberturaKey = resolveResultadoFinalTextKey(
    String(input.resultadoCobertura ?? RESULTADO_COBERTURA.SIN_COBERTURA)
  )
  const coberturaText = renderResultadoFinalText(
    policy.textos,
    coberturaKey,
    vars
  )

  const estadoKey = resolveEstadoGeneralTextKey(input.estadoGeneral)
  if (!estadoKey) {
    return coberturaText
  }

  const estadoText = renderResultadoFinalText(policy.textos, estadoKey, vars)
  if (!coberturaText) {
    return estadoText
  }
  if (!estadoText || coberturaKey === "sinCobertura") {
    return coberturaText
  }

  return `${coberturaText} ${estadoText}`
}
