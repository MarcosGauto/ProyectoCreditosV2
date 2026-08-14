/**
 * Stage 3 — Resolve Confidence (pura).
 */

import { LimitTraceCode } from "@/lib/creditLimit/engine/limitTraceCodes"
import {
  appendStep,
  type LimitPipelineState,
} from "@/lib/creditLimit/engine/pipelineState"

export function stageResolveConfidence(
  state: LimitPipelineState
): LimitPipelineState {
  const { confidence } = state.score

  return appendStep(state, {
    id: LimitTraceCode.RESOLVE_CONFIDENCE,
    stage: "confidence",
    code: "confidence",
    label: LimitTraceCode.RESOLVE_CONFIDENCE,
    value: confidence.level,
    unit: null,
    previousValue: null,
    changed: false,
    ruleIds: [],
    notes: null,
    details: {
      value: confidence.value,
      level: confidence.level,
      missing: confidence.missing,
      result: "resolved",
    },
  })
}
