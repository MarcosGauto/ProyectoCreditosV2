/**
 * Stage 7 — Apply Restrictions (pura).
 * Techos comerciales + garantías/condiciones estructurales de la banda.
 */

import { applyLimitRuleEffect } from "@/lib/creditLimit/engine/applyRuleEffect"
import { buildRuleEvaluationFacts } from "@/lib/creditLimit/engine/buildRuleEvaluationFacts"
import { evaluateLimitRuleTrigger } from "@/lib/creditLimit/engine/evaluateTrigger"
import { LimitTraceCode } from "@/lib/creditLimit/engine/limitTraceCodes"
import {
  appendJustification,
  appendStep,
  round2,
  type LimitPipelineState,
} from "@/lib/creditLimit/engine/pipelineState"
import { selectRulesForStage } from "@/lib/creditLimit/rules/limitRuleTypes"

function minDefined(values: Array<number | null | undefined>): number | null {
  const nums = values.filter(
    (v): v is number => v != null && Number.isFinite(v)
  )
  if (nums.length === 0) return null
  return Math.min(...nums)
}

export function stageApplyRestrictions(
  state: LimitPipelineState
): LimitPipelineState {
  const facts = buildRuleEvaluationFacts(state.score, state.commercialContext)
  let next = state

  // LimitRules de stage commercial_ceiling
  const ceilingRules = selectRulesForStage(
    state.policy.rules,
    "commercial_ceiling"
  )
  for (const r of state.policy.rules.filter(
    (x) => x.stage === "commercial_ceiling" && !x.enabled
  )) {
    next = {
      ...next,
      skippedRules: [
        ...next.skippedRules,
        {
          ruleId: r.id,
          name: r.name,
          stage: "commercial_ceiling",
          reason: "disabled",
        },
      ],
    }
  }

  for (const rule of ceilingRules) {
    if (next.halted) {
      next = {
        ...next,
        skippedRules: [
          ...next.skippedRules,
          {
            ruleId: rule.id,
            name: rule.name,
            stage: "commercial_ceiling",
            reason: "pipeline_halted",
          },
        ],
      }
      continue
    }
    const ev = evaluateLimitRuleTrigger(rule, {
      score: next.score,
      categoryCode: next.categoryCode,
      metrics: facts,
    })
    if (!ev.matched) {
      next = {
        ...next,
        skippedRules: [
          ...next.skippedRules,
          {
            ruleId: rule.id,
            name: rule.name,
            stage: "commercial_ceiling",
            reason: ev.reason,
          },
        ],
      }
      continue
    }
    const before = next.currentLimit
    const applied = applyLimitRuleEffect(next, rule)
    next = applied.state
    next = appendStep(next, {
      id: `${LimitTraceCode.APPLY_RESTRICTION_CEILING}.${rule.id}`,
      stage: "commercial_ceiling",
      code: "commercial_ceiling",
      label: LimitTraceCode.APPLY_RESTRICTION_CEILING,
      value: next.currentLimit,
      unit: null,
      previousValue: before,
      changed: applied.changed,
      ruleIds: [rule.id],
      notes: null,
      details: {
        ruleId: rule.id,
        reason: ev.reason,
        before,
        after: next.currentLimit,
        result: applied.changed ? "applied" : "matched_no_change",
      },
    })
  }

  const beforeCeiling = next.currentLimit
  const ceiling = minDefined([
    next.policy.globalCommercialCeiling,
    next.category?.commercialCeiling ?? null,
    next.commercialCeilingApplied,
  ])

  next = { ...next, commercialCeilingApplied: ceiling }

  if (
    !next.halted &&
    ceiling != null &&
    next.currentLimit != null &&
    next.currentLimit > ceiling
  ) {
    next = { ...next, currentLimit: round2(ceiling) }
    next = appendJustification(next, LimitTraceCode.APPLY_RESTRICTION_CEILING, {
      severity: "info",
      sourceKind: "commercial_ceiling",
    })
  }

  next = appendStep(next, {
    id: LimitTraceCode.APPLY_RESTRICTION_CEILING,
    stage: "commercial_ceiling",
    code: "commercial_ceiling",
    label: LimitTraceCode.APPLY_RESTRICTION_CEILING,
    value: ceiling,
    unit: null,
    previousValue: beforeCeiling,
    changed: beforeCeiling !== next.currentLimit,
    ruleIds: [],
    notes: null,
    details: {
      effectiveCeiling: ceiling,
      before: beforeCeiling,
      after: next.currentLimit,
      result: ceiling == null ? "no_ceiling" : "applied",
    },
  })

  const required = next.guarantees.filter((g) => g.required)
  if (required.length > 0 && next.decisionCode === "approve_suggested") {
    next = { ...next, decisionCode: "approve_with_conditions" }
  }

  next = appendStep(next, {
    id: LimitTraceCode.APPLY_RESTRICTION_GUARANTEES,
    stage: "guarantees",
    code: "guarantees",
    label: LimitTraceCode.APPLY_RESTRICTION_GUARANTEES,
    value: next.guarantees.map((g) => g.code).join(",") || null,
    unit: null,
    previousValue: null,
    changed: required.length > 0,
    ruleIds: [],
    notes: null,
    details: {
      guaranteeCodes: next.guarantees.map((g) => g.code),
      requiredCodes: required.map((g) => g.code),
      before: null,
      after: next.decisionCode,
      result: required.length > 0 ? "conditions" : "none",
    },
  })

  if (next.category) {
    next = { ...next, review: { ...next.category.review } }
  }

  next = appendStep(next, {
    id: LimitTraceCode.APPLY_RESTRICTION_REVIEW,
    stage: "result",
    code: "conditions",
    label: LimitTraceCode.APPLY_RESTRICTION_REVIEW,
    value: next.review.frequencyDays,
    unit: null,
    previousValue: null,
    changed: false,
    ruleIds: [],
    notes: null,
    details: {
      frequencyDays: next.review.frequencyDays,
      frequencyLabel: next.review.frequencyLabel,
      mandatory: next.review.mandatory,
      result: "resolved",
    },
  })

  return next
}

