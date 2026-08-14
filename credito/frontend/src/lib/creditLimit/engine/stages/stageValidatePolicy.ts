/**
 * Stage 1 — Validate Policy (pura).
 */

import { LimitTraceCode } from "@/lib/creditLimit/engine/limitTraceCodes"
import {
  appendJustification,
  appendStep,
  haltAs,
  type LimitPipelineState,
} from "@/lib/creditLimit/engine/pipelineState"

export function stageValidatePolicy(
  state: LimitPipelineState
): LimitPipelineState {
  const { policy, score, revision } = state

  let next = appendStep(state, {
    id: LimitTraceCode.VALIDATE_POLICY,
    stage: "category_base",
    code: "score",
    label: LimitTraceCode.VALIDATE_POLICY,
    value: revision.id,
    unit: null,
    previousValue: null,
    changed: false,
    ruleIds: [],
    notes: null,
    details: {
      revisionId: revision.id,
      version: revision.version,
      hash: revision.hash,
      policyId: revision.policyId,
      result: "ok",
    },
  })

  if (!revision?.policySnapshot || !policy) {
    next = haltAs(next, "invalid_policy", "invalid_policy")
    next = appendJustification(next, LimitTraceCode.POLICY_INVALID, {
      severity: "critical",
    })
    return appendStep(next, {
      id: `${LimitTraceCode.POLICY_INVALID}.step`,
      stage: "category_base",
      code: "score",
      label: LimitTraceCode.POLICY_INVALID,
      value: null,
      unit: null,
      previousValue: null,
      changed: true,
      ruleIds: [],
      notes: null,
      details: { result: "invalid_policy" },
    })
  }

  if (policy.meta.status === "archived" || policy.meta.isActive === false) {
    next = haltAs(next, "disabled", "disabled")
    next = appendJustification(next, LimitTraceCode.POLICY_DISABLED, {
      severity: "warning",
    })
    return appendStep(next, {
      id: `${LimitTraceCode.POLICY_DISABLED}.step`,
      stage: "category_base",
      code: "score",
      label: LimitTraceCode.POLICY_DISABLED,
      value: null,
      unit: null,
      previousValue: null,
      changed: true,
      ruleIds: [],
      notes: null,
      details: { result: "disabled" },
    })
  }

  if (policy.requireScoreOk && score.status !== "ok") {
    next = haltAs(next, "insufficient_data", "insufficient_data", {
      requiresManualReview: true,
    })
    next = {
      ...next,
      missing: [...next.missing, "score.status"],
    }
    next = appendJustification(next, LimitTraceCode.SCORE_NOT_OK, {
      severity: "warning",
    })
    next = appendStep(next, {
      id: `${LimitTraceCode.SCORE_NOT_OK}.step`,
      stage: "category_base",
      code: "score",
      label: LimitTraceCode.SCORE_NOT_OK,
      value: score.status,
      unit: null,
      previousValue: null,
      changed: true,
      ruleIds: [],
      notes: null,
      details: { scoreStatus: score.status, result: "insufficient_data" },
    })
  }

  return next
}
