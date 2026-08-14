/**
 * Stage 2 — Resolve Category (pura).
 */

import { LimitTraceCode } from "@/lib/creditLimit/engine/limitTraceCodes"
import {
  appendJustification,
  appendStep,
  type LimitPipelineState,
} from "@/lib/creditLimit/engine/pipelineState"

export function stageResolveCategory(
  state: LimitPipelineState
): LimitPipelineState {
  const code = state.score.finalScore.categoryCode
  const label = state.score.finalScore.categoryLabel
  const scoreValue = state.score.finalScore.value

  let next: LimitPipelineState = {
    ...state,
    categoryCode: code,
  }

  next = appendStep(next, {
    id: LimitTraceCode.RESOLVE_CATEGORY,
    stage: "category_base",
    code: "category",
    label: LimitTraceCode.RESOLVE_CATEGORY,
    value: code,
    unit: null,
    previousValue: scoreValue,
    changed: false,
    ruleIds: [],
    notes: null,
    details: {
      finalScore: scoreValue,
      categoryCode: code,
      categoryLabel: label,
      result: code ? "resolved" : "missing",
    },
  })

  if (!code) {
    next = {
      ...next,
      missing: [...next.missing, "finalScore.categoryCode"],
    }
    next = appendJustification(next, LimitTraceCode.CATEGORY_MISSING, {
      severity: "warning",
    })
  }

  return next
}
