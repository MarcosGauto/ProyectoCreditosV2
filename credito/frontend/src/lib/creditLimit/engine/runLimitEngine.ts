/**
 * Limit Engine SC-1.0 — orquestación de etapas puras (cerrado para producción).
 *
 * Stage 1  Validate Policy
 * Stage 2  Resolve Category
 * Stage 3  Resolve Confidence
 * Stage 4  Resolve Commercial Base
 * Stage 5  Apply Category Multiplier
 * Stage 6  Apply Policy Rules
 * Stage 6.5 Apply Manual Overrides
 * Stage 7  Apply Restrictions
 * Stage 8  Generate DecisionTrace
 * Stage 9  Build SuggestedLimitResult
 */

import type {
  LimitEngine,
  LimitEngineInput,
} from "@/lib/creditLimit/engine/limitEngineTypes"
import { createInitialPipelineState } from "@/lib/creditLimit/engine/pipelineState"
import { stageValidatePolicy } from "@/lib/creditLimit/engine/stages/stageValidatePolicy"
import { stageResolveCategory } from "@/lib/creditLimit/engine/stages/stageResolveCategory"
import { stageResolveConfidence } from "@/lib/creditLimit/engine/stages/stageResolveConfidence"
import { stageResolveCommercialBase } from "@/lib/creditLimit/engine/stages/stageResolveCommercialBase"
import { stageApplyCategoryMultiplier } from "@/lib/creditLimit/engine/stages/stageApplyCategoryMultiplier"
import { stageApplyPolicyRules } from "@/lib/creditLimit/engine/stages/stageApplyPolicyRules"
import { stageApplyManualOverrides } from "@/lib/creditLimit/engine/stages/stageApplyManualOverrides"
import { stageApplyRestrictions } from "@/lib/creditLimit/engine/stages/stageApplyRestrictions"
import { stageGenerateDecisionTrace } from "@/lib/creditLimit/engine/stages/stageGenerateDecisionTrace"
import { stageBuildSuggestedLimitResult } from "@/lib/creditLimit/engine/stages/stageBuildSuggestedLimitResult"
import type { SuggestedLimitResult } from "@/lib/creditLimit/result/suggestedLimitTypes"

export function runLimitEngine(input: LimitEngineInput): SuggestedLimitResult {
  let state = createInitialPipelineState({
    score: input.score,
    revision: input.revision,
    commercialContext: input.commercialContext,
    override: input.override,
    computedAt: input.computedAt,
  })

  state = stageValidatePolicy(state)
  state = stageResolveCategory(state)
  state = stageResolveConfidence(state)
  state = stageResolveCommercialBase(state)
  state = stageApplyCategoryMultiplier(state)
  state = stageApplyPolicyRules(state)
  state = stageApplyManualOverrides(state)
  state = stageApplyRestrictions(state)

  const { state: traced, trace } = stageGenerateDecisionTrace(state)
  return stageBuildSuggestedLimitResult(traced, trace)
}

export function createLimitEngine(): LimitEngine {
  return {
    run: runLimitEngine,
  }
}

