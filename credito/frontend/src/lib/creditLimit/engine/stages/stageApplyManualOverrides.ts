/**
 * Stage 6.5 — Apply Manual Overrides (pura).
 * Sin UI / persistencia: solo aplica LimitOverride inyectado.
 */

import { LimitTraceCode } from "@/lib/creditLimit/engine/limitTraceCodes"
import {
  appendJustification,
  appendTraceStep,
  round2,
  type LimitPipelineState,
} from "@/lib/creditLimit/engine/pipelineState"

export function stageApplyManualOverrides(
  state: LimitPipelineState
): LimitPipelineState {
  const override = state.override

  if (!override) {
    return appendTraceStep(state, {
      id: LimitTraceCode.MANUAL_OVERRIDE_SKIPPED,
      stage: "manual_override",
      code: "manual_override",
      label: LimitTraceCode.MANUAL_OVERRIDE_SKIPPED,
      previousValue: state.currentLimit,
      newValue: state.currentLimit,
      resultCode: "SKIPPED_NO_OVERRIDE",
      ruleId: null,
      changed: false,
      details: { result: "skipped" },
    })
  }

  const before = state.currentLimit

  if (!override.apply || override.amount == null || !Number.isFinite(override.amount)) {
    let next = appendJustification(state, LimitTraceCode.MANUAL_OVERRIDE_SKIPPED, {
      severity: "info",
      sourceKind: "engine",
    })
    next = {
      ...next,
      appliedOverride: {
        reasonCode: override.reasonCode,
        userId: override.userId,
        at: override.at,
        comment: override.comment,
        amount: override.amount,
      },
    }
    return appendTraceStep(next, {
      id: LimitTraceCode.MANUAL_OVERRIDE_SKIPPED,
      stage: "manual_override",
      code: "manual_override",
      label: LimitTraceCode.MANUAL_OVERRIDE_SKIPPED,
      previousValue: before,
      newValue: before,
      resultCode: "SKIPPED_NOT_APPLIED",
      ruleId: null,
      changed: false,
      details: {
        reasonCode: override.reasonCode,
        userId: override.userId,
        at: override.at,
        apply: override.apply,
        amount: override.amount,
        result: "skipped_not_applied",
      },
    })
  }

  const amount = round2(override.amount)
  let next: LimitPipelineState = {
    ...state,
    currentLimit: amount,
    allowLimit: true,
    limitOrigin: "OVERRIDE",
    decisionCode:
      state.decisionCode === "deny" ? "approve_with_conditions" : state.decisionCode,
    halted: false,
    status: state.status === "denied" ? "ok" : state.status,
    appliedOverride: {
      reasonCode: override.reasonCode,
      userId: override.userId,
      at: override.at,
      comment: override.comment,
      amount,
    },
  }

  next = appendJustification(next, LimitTraceCode.APPLY_MANUAL_OVERRIDE, {
    severity: "info",
    sourceKind: "engine",
  })

  return appendTraceStep(next, {
    id: LimitTraceCode.APPLY_MANUAL_OVERRIDE,
    stage: "manual_override",
    code: "manual_override",
    label: LimitTraceCode.APPLY_MANUAL_OVERRIDE,
    previousValue: before,
    newValue: amount,
    resultCode: "OVERRIDE_APPLIED",
    ruleId: null,
    changed: before !== amount,
    details: {
      reasonCode: override.reasonCode,
      userId: override.userId,
      at: override.at,
      comment: override.comment,
      before,
      after: amount,
      limitOrigin: "OVERRIDE",
      result: "applied",
    },
  })
}

