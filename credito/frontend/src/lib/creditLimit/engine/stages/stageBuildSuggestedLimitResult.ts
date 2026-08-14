/**
 * Stage 9 — Build SuggestedLimitResult (pura).
 */

import { toLimitPolicyBinding } from "@/lib/creditLimit/policy/limitPolicyRevision"
import type { DecisionTrace } from "@/lib/creditLimit/result/decisionTraceTypes"
import type {
  LimitDecision,
  SuggestedLimitResult,
} from "@/lib/creditLimit/result/suggestedLimitTypes"
import { scoreSnapshotFromOwnCreditScore } from "@/lib/creditLimit/result/suggestedLimitTypes"
import type { LimitPipelineState } from "@/lib/creditLimit/engine/pipelineState"

function buildDecision(state: LimitPipelineState): LimitDecision {
  const code = state.decisionCode
  const allowLimit =
    state.allowLimit &&
    state.currentLimit != null &&
    code !== "deny" &&
    code !== "disabled" &&
    code !== "invalid_policy" &&
    code !== "insufficient_data"

  return {
    code,
    label: code,
    allowLimit,
    requiresManualReview: state.requiresManualReview || code === "review_manual",
  }
}

export function stageBuildSuggestedLimitResult(
  state: LimitPipelineState,
  trace: DecisionTrace
): SuggestedLimitResult {
  const decision = buildDecision(state)
  const binding = toLimitPolicyBinding(state.revision)
  const scoreSnap = scoreSnapshotFromOwnCreditScore(state.score)

  let status = state.status
  if (decision.code === "deny") status = "denied"
  if (decision.code === "disabled") status = "disabled"
  if (decision.code === "invalid_policy") status = "invalid_policy"
  if (decision.code === "insufficient_data") status = "insufficient_data"
  if (
    decision.allowLimit &&
    (decision.code === "approve_suggested" ||
      decision.code === "approve_with_conditions" ||
      decision.code === "review_manual")
  ) {
    status = "ok"
  }

  const currency =
    state.commercialContext.currency || state.policy.meta.currency

  return {
    schemaVersion: 1,
    status,
    decision,
    suggestedLimit: {
      value: decision.allowLimit ? state.currentLimit : null,
      currency,
      kind: state.kind,
      label: state.label,
      baseValue: state.baseValue,
      maxLimit: state.maxLimit,
      commercialCeiling: state.commercialCeilingApplied,
      baseMetricKey: state.baseMetricKey,
      baseMetricValue: state.baseMetricValue,
    },
    term: {
      termMonths: state.category?.termMonths ?? null,
      maxTermMonths: state.category?.maxTermMonths ?? null,
    },
    guarantees: state.guarantees.map((g) => ({ ...g })),
    review: { ...state.review },
    justifications: [...state.justifications],
    warnings: state.warnings.map((w) => ({
      ...w,
      text: w.id,
    })),
    confidence: {
      value: state.score.confidence.value,
      level: state.score.confidence.level,
      label: state.score.confidence.level,
      missing: [...state.missing],
    },
    limitOrigin: state.limitOrigin,
    appliedOverride: state.appliedOverride,
    trace,
    matchedCategoryPolicyId: state.category?.id ?? null,
    categoryCode: state.categoryCode,
    score: scoreSnap,
    limitPolicyRevisionId: state.revision.id,
    limitPolicyRevisionVersion: state.revision.version,
    limitPolicyRevisionHash: state.revision.hash,
    limitPolicy: binding,
    scorePolicyRevisionId: state.score.policyRevisionId,
    scorePolicyRevisionVersion: state.score.policyRevisionVersion,
    scorePolicyRevisionHash: state.score.policyRevisionHash,
    computedAt: state.computedAt,
  }
}
