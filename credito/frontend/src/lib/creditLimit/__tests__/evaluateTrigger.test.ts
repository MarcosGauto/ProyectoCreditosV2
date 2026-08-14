import { describe, expect, it } from "vitest"
import { evaluateLimitRuleTrigger } from "@/lib/creditLimit/engine/evaluateTrigger"
import type { LimitRule } from "@/lib/creditLimit/rules/limitRuleTypes"
import { makeOkScore } from "@/lib/sc1/__tests__/sc1TestFixtures"

function baseRule(
  partial: Partial<LimitRule> & { trigger: LimitRule["trigger"] }
): LimitRule {
  return {
    id: "r1",
    name: "rule",
    description: null,
    enabled: true,
    priority: 10,
    stage: "coverage",
    effect: {
      action: "cap",
      reducePercent: null,
      reduceFactor: null,
      capAmount: 1000,
      ceilingAmount: null,
      guaranteeCodes: [],
      decisionCode: null,
      message: null,
    },
    justification: null,
    warning: null,
    params: {},
    ...partial,
  }
}

describe("evaluateLimitRuleTrigger", () => {
  it("always match", () => {
    const rule = baseRule({
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
    })
    expect(
      evaluateLimitRuleTrigger(rule, {
        score: makeOkScore(),
        categoryCode: "AA",
        metrics: {},
      }).matched
    ).toBe(true)
  })

  it("category_in", () => {
    const inRule = baseRule({
      trigger: {
        kind: "category_in",
        categoryCodes: ["AA", "A"],
        confidenceLevel: null,
        confidenceThreshold: null,
        field: null,
        operator: null,
        value: null,
        valueTo: null,
      },
    })
    expect(
      evaluateLimitRuleTrigger(inRule, {
        score: makeOkScore(),
        categoryCode: "AA",
        metrics: {},
      }).matched
    ).toBe(true)
    expect(
      evaluateLimitRuleTrigger(inRule, {
        score: makeOkScore(),
        categoryCode: "B",
        metrics: {},
      }).matched
    ).toBe(false)
  })

  it("confidence_below / confidence_level", () => {
    const score = makeOkScore({
      confidence: { value: 0.2, level: "low", label: "Baja", missing: [] },
    })
    const below = baseRule({
      trigger: {
        kind: "confidence_below",
        categoryCodes: null,
        confidenceLevel: null,
        confidenceThreshold: 0.5,
        field: null,
        operator: null,
        value: null,
        valueTo: null,
      },
    })
    expect(
      evaluateLimitRuleTrigger(below, {
        score,
        categoryCode: "AA",
        metrics: {},
      }).matched
    ).toBe(true)

    const level = baseRule({
      trigger: {
        kind: "confidence_level",
        categoryCodes: null,
        confidenceLevel: "low",
        confidenceThreshold: null,
        field: null,
        operator: null,
        value: null,
        valueTo: null,
      },
    })
    expect(
      evaluateLimitRuleTrigger(level, {
        score,
        categoryCode: "AA",
        metrics: {},
      }).matched
    ).toBe(true)
  })

  it("metric_above", () => {
    const rule = baseRule({
      trigger: {
        kind: "metric_above",
        categoryCodes: null,
        confidenceLevel: null,
        confidenceThreshold: null,
        field: "sales.monthlyAverage",
        operator: null,
        value: 100,
        valueTo: null,
      },
    })
    expect(
      evaluateLimitRuleTrigger(rule, {
        score: makeOkScore(),
        categoryCode: "AA",
        metrics: { "sales.monthlyAverage": 500 },
      }).matched
    ).toBe(true)
  })
})
