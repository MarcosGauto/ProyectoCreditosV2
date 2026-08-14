/**
 * Stage 6 — Apply Policy Rules (pura).
 * Evalúa LimitRules de stages confidence / coverage / guarantees.
 */

import { applyLimitRuleEffect } from "@/lib/creditLimit/engine/applyRuleEffect"
import { buildRuleEvaluationFacts } from "@/lib/creditLimit/engine/buildRuleEvaluationFacts"
import { evaluateLimitRuleTrigger } from "@/lib/creditLimit/engine/evaluateTrigger"
import { LimitTraceCode } from "@/lib/creditLimit/engine/limitTraceCodes"
import {
  appendStep,
  type LimitPipelineState,
} from "@/lib/creditLimit/engine/pipelineState"
import {
  selectRulesForStage,
  type LimitPipelineStage,
} from "@/lib/creditLimit/rules/limitRuleTypes"

const POLICY_RULE_STAGES: LimitPipelineStage[] = [
  "confidence",
  "coverage",
  "guarantees",
]

export function stageApplyPolicyRules(
  state: LimitPipelineState
): LimitPipelineState {
  const facts = buildRuleEvaluationFacts(state.score, state.commercialContext)
  let next = state

  for (const stage of POLICY_RULE_STAGES) {
    for (const r of state.policy.rules.filter(
      (x) => x.stage === stage && !x.enabled
    )) {
      next = {
        ...next,
        skippedRules: [
          ...next.skippedRules,
          {
            ruleId: r.id,
            name: r.name,
            stage,
            reason: "disabled",
          },
        ],
      }
    }

    const rules = selectRulesForStage(state.policy.rules, stage)
    for (const rule of rules) {
      if (next.halted) {
        next = {
          ...next,
          skippedRules: [
            ...next.skippedRules,
            {
              ruleId: rule.id,
              name: rule.name,
              stage,
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
              stage,
              reason: ev.reason,
            },
          ],
        }
        next = appendStep(next, {
          id: `${LimitTraceCode.SKIP_POLICY_RULE}.${rule.id}`,
          stage,
          code:
            stage === "confidence"
              ? "confidence_adjustment"
              : "coverage_restriction",
          label: LimitTraceCode.SKIP_POLICY_RULE,
          value: next.currentLimit,
          unit: null,
          previousValue: next.currentLimit,
          changed: false,
          ruleIds: [rule.id],
          notes: null,
          details: {
            ruleId: rule.id,
            reason: ev.reason,
            before: next.currentLimit,
            after: next.currentLimit,
            result: "skipped",
          },
        })
        continue
      }

      const before = next.currentLimit
      const applied = applyLimitRuleEffect(next, rule)
      next = applied.state

      next = appendStep(next, {
        id: `${LimitTraceCode.APPLY_POLICY_RULE}.${rule.id}`,
        stage,
        code:
          stage === "confidence"
            ? "confidence_adjustment"
            : "coverage_restriction",
        label: LimitTraceCode.APPLY_POLICY_RULE,
        value: next.currentLimit,
        unit: null,
        previousValue: before,
        changed: applied.changed,
        ruleIds: [rule.id],
        notes: null,
        details: {
          ruleId: rule.id,
          ruleName: rule.name,
          action: rule.effect.action,
          reason: ev.reason,
          before,
          after: next.currentLimit,
          result: applied.changed ? "applied" : "matched_no_change",
        },
      })
    }
  }

  return next
}

