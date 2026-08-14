/**
 * Stage 8 — Generate DecisionTrace (pura).
 */

import { LimitTraceCode } from "@/lib/creditLimit/engine/limitTraceCodes"
import {
  appendStep,
  type LimitPipelineState,
} from "@/lib/creditLimit/engine/pipelineState"
import type { DecisionTrace } from "@/lib/creditLimit/result/decisionTraceTypes"

export function stageGenerateDecisionTrace(
  state: LimitPipelineState
): { state: LimitPipelineState; trace: DecisionTrace } {
  let next = state

  if (!next.steps.some((s) => s.code === "final_result")) {
    next = appendStep(next, {
      id: LimitTraceCode.FINAL_RESULT,
      stage: "result",
      code: "final_result",
      label: LimitTraceCode.FINAL_RESULT,
      value: next.allowLimit ? next.currentLimit : null,
      unit: null,
      previousValue: next.baseValue,
      changed: true,
      ruleIds: next.appliedRules.map((r) => r.ruleId),
      notes: null,
      details: {
        decisionCode: next.decisionCode,
        status: next.status,
        allowLimit: next.allowLimit,
        before: next.baseValue,
        after: next.allowLimit ? next.currentLimit : null,
        result: next.decisionCode,
      },
    })
  }

  const trace: DecisionTrace = {
    schemaVersion: 1,
    steps: [...next.steps].sort((a, b) => a.order - b.order),
    appliedRules: [...next.appliedRules],
    skippedRules: [...next.skippedRules],
    warnings: next.warnings.map((w) => ({
      id: w.id,
      text: w.id,
      severity: w.severity,
      sourceId: w.sourceId,
      conditioning: w.conditioning,
    })),
  }

  return { state: next, trace }
}
