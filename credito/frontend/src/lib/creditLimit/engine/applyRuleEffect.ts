/**
 * Aplicación pura de efectos de LimitRule (sin hardcodes de negocio).
 */

import type { LimitRule } from "@/lib/creditLimit/rules/limitRuleTypes"
import type { LimitDecisionCode } from "@/lib/creditLimit/result/suggestedLimitTypes"
import type { GuaranteeRequirement } from "@/lib/creditLimit/policy/limitPolicyTypes"
import {
  appendJustification,
  appendWarning,
  haltAs,
  round2,
  type LimitPipelineState,
} from "@/lib/creditLimit/engine/pipelineState"

function effectSummary(rule: LimitRule): string {
  const e = rule.effect
  const parts: string[] = [`action=${e.action}`]
  if (e.reducePercent != null) parts.push(`reducePercent=${e.reducePercent}`)
  if (e.reduceFactor != null) parts.push(`reduceFactor=${e.reduceFactor}`)
  if (e.capAmount != null) parts.push(`capAmount=${e.capAmount}`)
  if (e.ceilingAmount != null) parts.push(`ceilingAmount=${e.ceilingAmount}`)
  if (e.guaranteeCodes.length) {
    parts.push(`guarantees=${e.guaranteeCodes.join(",")}`)
  }
  if (e.decisionCode) parts.push(`decision=${e.decisionCode}`)
  return parts.join(";")
}

function asDecisionCode(raw: string | null): LimitDecisionCode | null {
  if (!raw) return null
  const allowed: LimitDecisionCode[] = [
    "approve_suggested",
    "approve_with_conditions",
    "deny",
    "review_manual",
    "insufficient_data",
    "disabled",
    "invalid_policy",
    "not_implemented",
  ]
  return allowed.includes(raw as LimitDecisionCode)
    ? (raw as LimitDecisionCode)
    : null
}

function mergeGuaranteeCodes(
  state: LimitPipelineState,
  codes: string[]
): LimitPipelineState {
  let guarantees = [...state.guarantees]
  for (const code of codes) {
    if (guarantees.some((g) => g.code === code)) continue
    const fromCat = state.category?.guarantees.find((g) => g.code === code)
    const req: GuaranteeRequirement = fromCat
      ? { ...fromCat }
      : {
          code,
          label: code,
          required: true,
          severity: "warning",
          description: null,
        }
    guarantees = [...guarantees, req]
  }
  return { ...state, guarantees }
}

export function applyLimitRuleEffect(
  state: LimitPipelineState,
  rule: LimitRule
): { state: LimitPipelineState; changed: boolean } {
  const e = rule.effect
  let next = state
  let changed = false

  if (e.action === "no_op") {
    next = {
      ...next,
      appliedRules: [
        ...next.appliedRules,
        {
          ruleId: rule.id,
          name: rule.name,
          stage: rule.stage,
          effectSummary: effectSummary(rule),
          message: e.message,
        },
      ],
    }
    return { state: next, changed: false }
  }

  if (e.action === "deny" || e.decisionCode === "deny") {
    next = haltAs(next, "denied", "deny", { allowLimit: false })
    changed = true
  } else if (
    e.action === "require_manual" ||
    e.decisionCode === "review_manual"
  ) {
    next = {
      ...next,
      requiresManualReview: true,
      decisionCode: "review_manual",
      allowLimit: next.currentLimit != null,
    }
    changed = true
  } else if (e.action === "set_decision") {
    const code = asDecisionCode(e.decisionCode)
    if (code) {
      if (code === "deny") {
        next = haltAs(next, "denied", "deny", { allowLimit: false })
      } else if (code === "review_manual") {
        next = {
          ...next,
          decisionCode: code,
          requiresManualReview: true,
        }
      } else if (code === "approve_with_conditions") {
        next = {
          ...next,
          decisionCode: code,
          requiresManualReview: true,
        }
      } else {
        next = { ...next, decisionCode: code }
      }
      changed = true
    }
  }

  if (!next.halted && next.currentLimit != null) {
    let limit = next.currentLimit
    if (e.reducePercent != null && Number.isFinite(e.reducePercent)) {
      limit = round2(limit * (1 - e.reducePercent / 100))
      changed = true
    } else if (e.reduceFactor != null && Number.isFinite(e.reduceFactor)) {
      limit = round2(limit * e.reduceFactor)
      changed = true
    }
    if (e.capAmount != null && Number.isFinite(e.capAmount) && limit > e.capAmount) {
      limit = round2(e.capAmount)
      changed = true
    }
    let commercialCeilingApplied = next.commercialCeilingApplied
    if (e.ceilingAmount != null && Number.isFinite(e.ceilingAmount)) {
      if (
        commercialCeilingApplied == null ||
        e.ceilingAmount < commercialCeilingApplied
      ) {
        commercialCeilingApplied = e.ceilingAmount
      }
      if (limit > e.ceilingAmount) {
        limit = round2(e.ceilingAmount)
        changed = true
      }
    }
    if (e.action === "cap" && e.capAmount != null && limit > e.capAmount) {
      limit = round2(e.capAmount)
      changed = true
    }
    next = {
      ...next,
      currentLimit: limit,
      commercialCeilingApplied,
    }
  }

  if (e.action === "require_guarantee" || e.guaranteeCodes.length > 0) {
    next = mergeGuaranteeCodes(next, e.guaranteeCodes)
    if (e.guaranteeCodes.length > 0) {
      next = {
        ...next,
        decisionCode:
          next.decisionCode === "deny" ? "deny" : "approve_with_conditions",
        requiresManualReview: true,
      }
      changed = true
    }
  }

  // Justificación: código de regla (no texto UI inventado por el engine)
  const justificationCode = rule.justification
    ? `rule.${rule.id}`
    : e.message
      ? `rule.${rule.id}.effect`
      : null
  if (justificationCode) {
    next = appendJustification(next, justificationCode, {
      severity: "info",
      sourceId: rule.id,
      sourceKind: "limit_rule",
    })
  }

  if (rule.warning) {
    next = appendWarning(next, {
      id: rule.warning.id,
      text: rule.warning.id,
      severity: rule.warning.severity,
      sourceId: rule.id,
      sourceKind: "limit_rule",
      conditioning: true,
    })
  }

  next = {
    ...next,
    appliedRules: [
      ...next.appliedRules,
      {
        ruleId: rule.id,
        name: rule.name,
        stage: rule.stage,
        effectSummary: effectSummary(rule),
        message: e.message,
      },
    ],
  }

  return { state: next, changed }
}
