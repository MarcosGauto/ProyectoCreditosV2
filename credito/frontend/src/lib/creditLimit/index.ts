/**
 * Motor de Límite Sugerido SC-1.0 — cerrado para producción.
 *
 *   LimitPolicy → Limit Rules → LimitEngine → SuggestedLimitResult (+ DecisionTrace)
 *
 * Ver ARCHITECTURE.md
 */

export * from "./shared/limitSharedTypes"
export * from "./commercial/commercialContext"
export * from "./policy/limitPolicyTypes"
export * from "./policy/limitPolicyRevision"
export { createDefaultLimitPolicy } from "./policy/limitPolicyDefaults"
export * from "./rules/limitRuleTypes"
export * from "./engine"
export * from "./result/decisionTraceTypes"
export * from "./result/suggestedLimitTypes"
