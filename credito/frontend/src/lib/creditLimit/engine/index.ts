/**
 * Limit Engine SC-1.0 — exports (cerrado para producción).
 */

export type {
  CommercialContext,
  LimitEngine,
  LimitEngineInput,
  LimitOverride,
  LimitRulesLayer,
  PolicyRevision,
} from "@/lib/creditLimit/engine/limitEngineTypes"

export {
  runLimitEngine,
  createLimitEngine,
} from "@/lib/creditLimit/engine/runLimitEngine"

export { LimitTraceCode } from "@/lib/creditLimit/engine/limitTraceCodes"

export { stageValidatePolicy } from "@/lib/creditLimit/engine/stages/stageValidatePolicy"
export { stageResolveCategory } from "@/lib/creditLimit/engine/stages/stageResolveCategory"
export { stageResolveConfidence } from "@/lib/creditLimit/engine/stages/stageResolveConfidence"
export { stageResolveCommercialBase } from "@/lib/creditLimit/engine/stages/stageResolveCommercialBase"
export { stageApplyCategoryMultiplier } from "@/lib/creditLimit/engine/stages/stageApplyCategoryMultiplier"
export { stageApplyPolicyRules } from "@/lib/creditLimit/engine/stages/stageApplyPolicyRules"
export { stageApplyManualOverrides } from "@/lib/creditLimit/engine/stages/stageApplyManualOverrides"
export { stageApplyRestrictions } from "@/lib/creditLimit/engine/stages/stageApplyRestrictions"
export { stageGenerateDecisionTrace } from "@/lib/creditLimit/engine/stages/stageGenerateDecisionTrace"
export { stageBuildSuggestedLimitResult } from "@/lib/creditLimit/engine/stages/stageBuildSuggestedLimitResult"
