import { describe, expect, it } from "vitest"
import { applyLimitRuleEffect } from "@/lib/creditLimit/engine/applyRuleEffect"
import { createInitialPipelineState } from "@/lib/creditLimit/engine/pipelineState"
import type { LimitRule } from "@/lib/creditLimit/rules/limitRuleTypes"
import {
  makeCommercialContext,
  makeLimitRevision,
  makeOkScore,
  TEST_AT,
} from "@/lib/sc1/__tests__/sc1TestFixtures"

function stateWithLimit(currentLimit: number) {
  const state = createInitialPipelineState({
    score: makeOkScore(),
    revision: makeLimitRevision(),
    commercialContext: makeCommercialContext(),
    computedAt: TEST_AT,
  })
  return { ...state, currentLimit, categoryCode: "AA" }
}

function rule(
  effect: LimitRule["effect"],
  extras: Partial<LimitRule> = {}
): LimitRule {
  return {
    id: "fx",
    name: "fx",
    description: null,
    enabled: true,
    priority: 1,
    stage: "policy_rules",
    trigger: {
      kind: "always",
      categoryCodes: null,
      confidenceLevel: null,
      confidenceThreshold: null,
      field: null,
      operator: null,
      value: null,
      valueTo: null,
    },
    effect,
    justification: null,
    warning: null,
    params: {},
    ...extras,
  }
}

const emptyEffect = {
  reducePercent: null,
  reduceFactor: null,
  capAmount: null,
  ceilingAmount: null,
  guaranteeCodes: [] as string[],
  decisionCode: null as string | null,
  message: null as string | null,
}

describe("applyLimitRuleEffect", () => {
  it("capAmount reduce el límite", () => {
    const { state } = applyLimitRuleEffect(
      stateWithLimit(1_000_000),
      rule({
        ...emptyEffect,
        action: "cap",
        capAmount: 100_000,
      })
    )
    expect(state.currentLimit).toBe(100_000)
  })

  it("reduceFactor escala el límite", () => {
    const { state } = applyLimitRuleEffect(
      stateWithLimit(1_000_000),
      rule({
        ...emptyEffect,
        action: "no_op",
        reduceFactor: 0.5,
      })
    )
    // no_op returns early before reduce — use reduce on require_manual path
    const { state: scaled } = applyLimitRuleEffect(
      stateWithLimit(1_000_000),
      rule({
        ...emptyEffect,
        action: "set_decision",
        decisionCode: "approve_suggested",
        reduceFactor: 0.5,
      })
    )
    expect(scaled.currentLimit).toBe(500_000)
  })

  it("require_manual marca revisión", () => {
    const { state } = applyLimitRuleEffect(
      stateWithLimit(1_000_000),
      rule({
        ...emptyEffect,
        action: "require_manual",
      })
    )
    expect(state.requiresManualReview).toBe(true)
    expect(state.decisionCode).toBe("review_manual")
  })

  it("deny detiene el pipeline", () => {
    const { state } = applyLimitRuleEffect(
      stateWithLimit(1_000_000),
      rule({
        ...emptyEffect,
        action: "deny",
      })
    )
    expect(state.halted).toBe(true)
  })
})
