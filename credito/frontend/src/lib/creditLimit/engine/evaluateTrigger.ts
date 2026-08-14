/**
 * Evaluación de triggers de LimitRule (determinística, sin hardcodes de negocio).
 */

import type { LimitCoverageOperator } from "@/lib/creditLimit/shared/limitSharedTypes"
import type { LimitRule, LimitRuleTrigger } from "@/lib/creditLimit/rules/limitRuleTypes"
import type { OwnCreditScoreResult } from "@/lib/creditScore/result/scoreResultTypes"
import { asFiniteNumber, getMetricValue } from "@/lib/creditLimit/engine/getMetric"

function compareOp(
  left: unknown,
  operator: LimitCoverageOperator,
  right: unknown,
  rightTo: unknown
): boolean {
  switch (operator) {
    case "exists":
      return left != null && left !== ""
    case "not_exists":
      return left == null || left === ""
    case "eq":
      return left === right
    case "neq":
      return left !== right
    case "in":
      return Array.isArray(right) && right.includes(left as never)
    case "not_in":
      return Array.isArray(right) && !right.includes(left as never)
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const a = asFiniteNumber(left)
      const b = asFiniteNumber(right)
      if (a == null || b == null) return false
      if (operator === "gt") return a > b
      if (operator === "gte") return a >= b
      if (operator === "lt") return a < b
      return a <= b
    }
    default: {
      // between-like via valueTo when operator unused — not in union
      void rightTo
      return false
    }
  }
}

function categoryAllowed(
  trigger: LimitRuleTrigger,
  categoryCode: string | null
): boolean {
  const codes = trigger.categoryCodes
  if (codes == null || codes.length === 0) return true
  if (categoryCode == null) return false
  return codes.includes(categoryCode)
}

export function evaluateLimitRuleTrigger(
  rule: LimitRule,
  input: {
    score: OwnCreditScoreResult
    categoryCode: string | null
    metrics: Record<string, unknown>
  }
): { matched: boolean; reason: string } {
  const t = rule.trigger

  if (!categoryAllowed(t, input.categoryCode)) {
    return {
      matched: false,
      reason: `categoría ${input.categoryCode ?? "null"} fuera de scope`,
    }
  }

  switch (t.kind) {
    case "always":
      return { matched: true, reason: "always" }

    case "category_in":
      return {
        matched: categoryAllowed(t, input.categoryCode),
        reason: categoryAllowed(t, input.categoryCode)
          ? "category_in"
          : "categoría no incluida",
      }

    case "confidence_level": {
      const level = input.score.confidence.level
      const expected = t.confidenceLevel
      if (expected == null) {
        return { matched: false, reason: "confidenceLevel no configurado" }
      }
      return level === expected
        ? { matched: true, reason: `confidence_level=${level}` }
        : {
            matched: false,
            reason: `confidence_level=${level} ≠ ${expected}`,
          }
    }

    case "confidence_below": {
      const th = t.confidenceThreshold
      if (th == null || !Number.isFinite(th)) {
        return { matched: false, reason: "confidenceThreshold inválido" }
      }
      const v = input.score.confidence.value
      return v < th
        ? { matched: true, reason: `confidence ${v} < ${th}` }
        : { matched: false, reason: `confidence ${v} >= ${th}` }
    }

    case "confidence_above": {
      const th = t.confidenceThreshold
      if (th == null || !Number.isFinite(th)) {
        return { matched: false, reason: "confidenceThreshold inválido" }
      }
      const v = input.score.confidence.value
      return v > th
        ? { matched: true, reason: `confidence ${v} > ${th}` }
        : { matched: false, reason: `confidence ${v} <= ${th}` }
    }

    case "field": {
      if (!t.field || !t.operator) {
        return { matched: false, reason: "field/operator incompleto" }
      }
      const left = getMetricValue(input.metrics, t.field)
      const ok = compareOp(left, t.operator, t.value, t.valueTo)
      return ok
        ? { matched: true, reason: `field ${t.field} match` }
        : { matched: false, reason: `field ${t.field} no match` }
    }

    case "metric_below": {
      if (!t.field) return { matched: false, reason: "field requerido" }
      const left = asFiniteNumber(getMetricValue(input.metrics, t.field))
      const right = asFiniteNumber(t.value)
      if (left == null || right == null) {
        return { matched: false, reason: "métrica no numérica" }
      }
      return left < right
        ? { matched: true, reason: `${t.field} ${left} < ${right}` }
        : { matched: false, reason: `${t.field} ${left} >= ${right}` }
    }

    case "metric_above": {
      if (!t.field) return { matched: false, reason: "field requerido" }
      const left = asFiniteNumber(getMetricValue(input.metrics, t.field))
      const right = asFiniteNumber(t.value)
      if (left == null || right == null) {
        return { matched: false, reason: "métrica no numérica" }
      }
      return left > right
        ? { matched: true, reason: `${t.field} ${left} > ${right}` }
        : { matched: false, reason: `${t.field} ${left} <= ${right}` }
    }

    default:
      return { matched: false, reason: "trigger kind desconocido" }
  }
}
