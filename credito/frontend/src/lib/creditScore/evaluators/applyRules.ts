/**
 * Aplicación genérica de rules[] a un valor de métrica.
 * El motor no conoce el nombre de negocio de la dimensión.
 */

import type { PolicyRuleOperator } from "@/lib/creditPolicy/sc1/creditPolicyTypes"
import type {
  DimensionEvaluation,
  RuleDefinition,
  RuleEngineDimension,
} from "@/lib/creditScore/ruleEngine/ruleEngineTypes"
import type { DimensionEvalStatus } from "@/lib/creditScore/result/scoreResultTypes"

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function matchOperator(
  operator: PolicyRuleOperator,
  actual: unknown,
  threshold: unknown,
  thresholdTo: unknown
): boolean {
  switch (operator) {
    case "missing":
      return actual == null || actual === ""
    case "present":
      return actual != null && actual !== ""
    case "truthy":
      return Boolean(actual)
    case "falsy":
      return !actual
    case "eq":
      return actual === threshold || String(actual) === String(threshold)
    case "neq":
      return actual !== threshold && String(actual) !== String(threshold)
    case "in":
      return Array.isArray(threshold) && threshold.some((t) => t === actual || String(t) === String(actual))
    case "not_in":
      return Array.isArray(threshold) && !threshold.some((t) => t === actual || String(t) === String(actual))
    default:
      break
  }

  const a = num(actual)
  const t = num(threshold)
  const t2 = num(thresholdTo)

  if (a == null) return false

  switch (operator) {
    case "gt":
      return t != null && a > t
    case "gte":
      return t != null && a >= t
    case "lt":
      return t != null && a < t
    case "lte":
      return t != null && a <= t
    case "between":
      // [threshold, thresholdTo) — inclusive min, exclusive max if both set
      if (t == null || t2 == null) return false
      return a >= t && a < t2
    case "outside":
      if (t == null || t2 == null) return false
      return a < t || a >= t2
    default:
      return false
  }
}

export function statusFromScore(score: number | null): DimensionEvalStatus {
  if (score == null || !Number.isFinite(score)) return "UNKNOWN"
  if (score >= 90) return "EXCELLENT"
  if (score >= 75) return "GOOD"
  if (score >= 60) return "FAIR"
  if (score >= 40) return "WARNING"
  return "CRITICAL"
}

export function statusFromSeverity(
  severity: RuleDefinition["severity"],
  score: number
): DimensionEvalStatus {
  if (severity === "critical") return "CRITICAL"
  if (severity === "warning") return "WARNING"
  if (score >= 90) return "EXCELLENT"
  if (score >= 75) return "GOOD"
  return "FAIR"
}

function clamp(score: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, score))
}

export interface ApplyRulesResult {
  score: number | null
  status: DimensionEvalStatus
  matchedRule: RuleDefinition | null
  strengths: DimensionEvaluation["strengths"]
  weaknesses: DimensionEvaluation["weaknesses"]
  observations: DimensionEvaluation["observations"]
  recommendations: DimensionEvaluation["recommendations"]
}

/**
 * first_match_by_priority sobre rules enabled.
 */
export function applyDimensionRules(
  dimension: RuleEngineDimension,
  metricValue: unknown
): ApplyRulesResult {
  const enabledRules = [...dimension.rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority)

  if (enabledRules.length === 0) {
    if (dimension.defaultScore != null && Number.isFinite(dimension.defaultScore)) {
      const score = clamp(dimension.defaultScore, dimension.scoreMin, dimension.scoreMax)
      return {
        score,
        status: statusFromScore(score),
        matchedRule: null,
        strengths: [],
        weaknesses: [],
        observations: [
          {
            id: `${dimension.id}.default_score`,
            text: "Sin reglas activas; se usó defaultScore de la dimensión.",
            severity: "info",
          },
        ],
        recommendations: [],
      }
    }
    return {
      score: null,
      status: "UNKNOWN",
      matchedRule: null,
      strengths: [],
      weaknesses: [],
      observations: [
        {
          id: `${dimension.id}.no_rules`,
          text: "Dimensión sin reglas configuradas en la política.",
          severity: "warning",
        },
      ],
      recommendations: [],
    }
  }

  for (const rule of enabledRules) {
    if (!matchOperator(rule.operator, metricValue, rule.threshold, rule.thresholdTo)) {
      continue
    }

    const score = clamp(rule.score, dimension.scoreMin, dimension.scoreMax)
    const status = statusFromSeverity(rule.severity, score)
    const text = rule.message ?? rule.name
    const finding = {
      id: `${dimension.id}.${rule.id}`,
      text,
      severity: rule.severity,
    }

    const strengths: ApplyRulesResult["strengths"] = []
    const weaknesses: ApplyRulesResult["weaknesses"] = []
    const recommendations: ApplyRulesResult["recommendations"] = []

    if (rule.severity === "critical" || rule.severity === "warning" || score < 60) {
      weaknesses.push(finding)
      if (rule.severity === "critical" || score < 40) {
        recommendations.push({
          id: `${finding.id}.rec`,
          text: text,
          severity: rule.severity,
        })
      }
    } else {
      strengths.push(finding)
    }

    return {
      score,
      status,
      matchedRule: rule,
      strengths,
      weaknesses,
      observations: [],
      recommendations,
    }
  }

  if (dimension.defaultScore != null && Number.isFinite(dimension.defaultScore)) {
    const score = clamp(dimension.defaultScore, dimension.scoreMin, dimension.scoreMax)
    return {
      score,
      status: statusFromScore(score),
      matchedRule: null,
      strengths: [],
      weaknesses: [],
      observations: [
        {
          id: `${dimension.id}.no_match_default`,
          text: "Ninguna regla matcheó; se usó defaultScore.",
          severity: "info",
        },
      ],
      recommendations: [],
    }
  }

  return {
    score: null,
    status: "UNKNOWN",
    matchedRule: null,
    strengths: [],
    weaknesses: [],
    observations: [
      {
        id: `${dimension.id}.no_match`,
        text: "Ninguna regla de la dimensión aplicó al valor medido.",
        severity: "warning",
      },
    ],
    recommendations: [],
  }
}

export function buildBaseEvaluation(
  dimension: RuleEngineDimension,
  metricKey: string | null,
  metricValue: unknown,
  applied: ApplyRulesResult
): DimensionEvaluation {
  if (!dimension.enabled) {
    return {
      dimensionId: dimension.id,
      label: dimension.label,
      domain: dimension.domain,
      enabled: false,
      weight: dimension.weight,
      score: null,
      scoreMin: dimension.scoreMin,
      scoreMax: dimension.scoreMax,
      status: "SKIPPED",
      metricKey,
      metricValue,
      matchedRuleId: null,
      strengths: [],
      weaknesses: [],
      observations: [
        {
          id: `${dimension.id}.disabled`,
          text: "Dimensión deshabilitada en la política.",
          severity: "info",
        },
      ],
      recommendations: [],
    }
  }

  return {
    dimensionId: dimension.id,
    label: dimension.label,
    domain: dimension.domain,
    enabled: true,
    weight: dimension.weight,
    score: applied.score,
    scoreMin: dimension.scoreMin,
    scoreMax: dimension.scoreMax,
    status: applied.status,
    metricKey,
    metricValue,
    matchedRuleId: applied.matchedRule?.id ?? null,
    strengths: applied.strengths,
    weaknesses: applied.weaknesses,
    observations: applied.observations,
    recommendations: applied.recommendations,
  }
}
