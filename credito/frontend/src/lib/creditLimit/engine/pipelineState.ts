/**
 * Estado inmutable del pipeline del Limit Engine.
 */

import type { CommercialContext } from "@/lib/creditLimit/commercial/commercialContext"
import type { LimitOverride } from "@/lib/creditLimit/engine/limitOverride"
import type {
  GuaranteeRequirement,
  LimitBaseKind,
  LimitCategoryPolicy,
  LimitPolicy,
  ReviewPolicy,
} from "@/lib/creditLimit/policy/limitPolicyTypes"
import type { LimitPolicyRevision } from "@/lib/creditLimit/policy/limitPolicyRevision"
import type {
  AppliedLimitRuleRef,
  DecisionStep,
  DecisionStepCode,
  SkippedLimitRuleRef,
} from "@/lib/creditLimit/result/decisionTraceTypes"
import type {
  LimitDecisionCode,
  LimitJustification,
  LimitOrigin,
  LimitWarning,
  SuggestedLimitStatus,
} from "@/lib/creditLimit/result/suggestedLimitTypes"
import type { OwnCreditScoreResult } from "@/lib/creditScore/result/scoreResultTypes"
import type { LimitPipelineStage } from "@/lib/creditLimit/rules/limitRuleTypes"

export interface LimitPipelineState {
  readonly score: OwnCreditScoreResult
  readonly revision: LimitPolicyRevision
  readonly policy: LimitPolicy
  readonly commercialContext: CommercialContext
  readonly override: LimitOverride | null
  readonly computedAt: string | null

  readonly halted: boolean
  readonly status: SuggestedLimitStatus
  readonly decisionCode: LimitDecisionCode
  readonly requiresManualReview: boolean
  readonly allowLimit: boolean
  readonly limitOrigin: LimitOrigin

  readonly categoryCode: string | null
  readonly category: LimitCategoryPolicy | null

  readonly currentLimit: number | null
  readonly baseValue: number | null
  readonly maxLimit: number | null
  readonly commercialCeilingApplied: number | null
  readonly baseMetricKey: string | null
  readonly baseMetricValue: number | null
  readonly commercialFactorPercent: number | null
  readonly commercialBase: number | null
  readonly categoryMultiplierPercent: number | null
  readonly kind: LimitBaseKind | null
  readonly label: string | null

  readonly guarantees: readonly GuaranteeRequirement[]
  readonly review: ReviewPolicy
  readonly justifications: readonly LimitJustification[]
  readonly warnings: readonly LimitWarning[]
  readonly missing: readonly string[]

  readonly steps: readonly DecisionStep[]
  readonly appliedRules: readonly AppliedLimitRuleRef[]
  readonly skippedRules: readonly SkippedLimitRuleRef[]
  readonly stepOrder: number

  readonly appliedOverride: {
    reasonCode: string
    userId: string | null
    at: string | null
    comment: string | null
    amount: number | null
  } | null
}

export function createInitialPipelineState(input: {
  score: OwnCreditScoreResult
  revision: LimitPolicyRevision
  commercialContext: CommercialContext
  override?: LimitOverride | null
  computedAt?: string | null
}): LimitPipelineState {
  return {
    score: input.score,
    revision: input.revision,
    policy: input.revision.policySnapshot,
    commercialContext: input.commercialContext,
    override: input.override ?? null,
    computedAt: input.computedAt ?? null,
    halted: false,
    status: "ok",
    decisionCode: "approve_suggested",
    requiresManualReview: false,
    allowLimit: true,
    limitOrigin: "ALGORITHM",
    categoryCode: null,
    category: null,
    currentLimit: null,
    baseValue: null,
    maxLimit: null,
    commercialCeilingApplied: null,
    baseMetricKey: null,
    baseMetricValue: null,
    commercialFactorPercent: null,
    commercialBase: null,
    categoryMultiplierPercent: null,
    kind: null,
    label: null,
    guarantees: [],
    review: {
      frequencyDays: null,
      frequencyLabel: null,
      mandatory: false,
    },
    justifications: [],
    warnings: [],
    missing: [],
    steps: [],
    appliedRules: [],
    skippedRules: [],
    stepOrder: 0,
    appliedOverride: null,
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function appendTraceStep(
  state: LimitPipelineState,
  input: {
    id: string
    stage: LimitPipelineStage
    code: DecisionStepCode
    label: string
    previousValue: number | string | null
    newValue: number | string | null
    resultCode: string
    ruleId?: string | null
    changed: boolean
    ruleIds?: string[]
    details?: Record<string, unknown> | null
  }
): LimitPipelineState {
  const order = state.stepOrder + 1
  const step: DecisionStep = {
    id: input.id,
    order,
    stage: input.stage,
    code: input.code,
    label: input.label,
    value: input.newValue,
    unit: null,
    previousValue: input.previousValue,
    newValue: input.newValue,
    resultCode: input.resultCode,
    ruleId: input.ruleId ?? null,
    changed: input.changed,
    ruleIds: input.ruleIds ?? (input.ruleId ? [input.ruleId] : []),
    notes: null,
    details: input.details ?? null,
  }
  return {
    ...state,
    stepOrder: order,
    steps: [...state.steps, step],
  }
}

/** @deprecated Preferir appendTraceStep. */
export function appendStep(
  state: LimitPipelineState,
  step: Omit<DecisionStep, "order" | "newValue" | "resultCode" | "ruleId"> & {
    order?: number
    newValue?: number | string | null
    resultCode?: string
    ruleId?: string | null
  }
): LimitPipelineState {
  const newValue = step.newValue ?? step.value
  const resultCode =
    step.resultCode ??
    (typeof step.details?.result === "string"
      ? step.details.result
      : step.changed
        ? "CHANGED"
        : "OK")
  return appendTraceStep(state, {
    id: step.id,
    stage: step.stage,
    code: step.code,
    label: step.label,
    previousValue: step.previousValue,
    newValue,
    resultCode,
    ruleId: step.ruleId ?? step.ruleIds[0] ?? null,
    changed: step.changed,
    ruleIds: step.ruleIds,
    details: step.details,
  })
}

export function appendJustification(
  state: LimitPipelineState,
  code: string,
  opts?: {
    severity?: LimitJustification["severity"]
    sourceId?: string
    sourceKind?: LimitJustification["sourceKind"]
  }
): LimitPipelineState {
  if (state.justifications.some((j) => j.id === code)) return state
  return {
    ...state,
    justifications: [
      ...state.justifications,
      {
        id: code,
        text: code,
        severity: opts?.severity,
        sourceId: opts?.sourceId,
        sourceKind: opts?.sourceKind ?? "engine",
      },
    ],
  }
}

export function appendWarning(
  state: LimitPipelineState,
  warning: LimitWarning
): LimitPipelineState {
  if (state.warnings.some((w) => w.id === warning.id)) return state
  return {
    ...state,
    warnings: [
      ...state.warnings,
      {
        ...warning,
        text: warning.id,
      },
    ],
  }
}

export function haltAs(
  state: LimitPipelineState,
  status: SuggestedLimitStatus,
  decisionCode: LimitDecisionCode,
  opts?: { allowLimit?: boolean; requiresManualReview?: boolean }
): LimitPipelineState {
  const allowLimit = opts?.allowLimit ?? false
  let currentLimit = state.currentLimit
  if (decisionCode === "deny" || decisionCode === "insufficient_data") {
    currentLimit = null
  }
  return {
    ...state,
    halted: true,
    status,
    decisionCode,
    allowLimit,
    currentLimit,
    requiresManualReview:
      opts?.requiresManualReview ?? state.requiresManualReview,
  }
}
