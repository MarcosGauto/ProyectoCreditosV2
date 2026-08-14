/**
 * Documentación — no usa ratios financieros.
 * Métricas esperadas (boolean / present):
 *   documentation.balanceCurrent
 *   documentation.ivaPresented
 *   documentation.iibbPresented
 *   documentation.minimumComplete
 *
 * Si la dimensión tiene rules[], se aplican sobre completeness 0–100.
 * Si no, score = % de ítems OK.
 */

import {
  applyDimensionRules,
  buildBaseEvaluation,
  statusFromScore,
} from "@/lib/creditScore/evaluators/applyRules"
import { asBoolean, getMetricValue } from "@/lib/creditScore/evaluators/getMetric"
import type { DimensionEvaluator } from "@/lib/creditScore/evaluators/types"
import type {
  DimensionEvaluation,
  RuleEngineDimension,
  RuleEngineMetrics,
} from "@/lib/creditScore/ruleEngine/ruleEngineTypes"

const DOC_CHECKS = [
  {
    key: "documentation.balanceCurrent",
    label: "Balance vigente",
  },
  {
    key: "documentation.ivaPresented",
    label: "IVA presentado",
  },
  {
    key: "documentation.iibbPresented",
    label: "IIBB presentado",
  },
  {
    key: "documentation.minimumComplete",
    label: "Documentación mínima",
  },
] as const

function isOk(metrics: RuleEngineMetrics, key: string): boolean {
  const v = getMetricValue(metrics, key)
  const b = asBoolean(v)
  if (b != null) return b
  if (v == null || v === "") return false
  return Boolean(v)
}

export const documentationEvaluator: DimensionEvaluator = {
  dimensionId: "documentation",
  evaluate(
    metrics: RuleEngineMetrics,
    dimension: RuleEngineDimension
  ): DimensionEvaluation {
    const results = DOC_CHECKS.map((c) => ({
      ...c,
      ok: isOk(metrics, c.key),
    }))
    const okCount = results.filter((r) => r.ok).length
    const completeness =
      results.length === 0 ? 0 : (okCount / results.length) * 100

    const strengths = results
      .filter((r) => r.ok)
      .map((r) => ({
        id: `documentation.${r.key}.ok`,
        text: r.label,
        severity: "info" as const,
      }))
    const weaknesses = results
      .filter((r) => !r.ok)
      .map((r) => ({
        id: `documentation.${r.key}.missing`,
        text: `${r.label} pendiente`,
        severity: "warning" as const,
      }))
    const recommendations = weaknesses.map((w) => ({
      id: `${w.id}.rec`,
      text: `Completar: ${w.text.replace(" pendiente", "")}`,
      severity: "warning" as const,
    }))

    if (!dimension.enabled) {
      return buildBaseEvaluation(dimension, "documentation.completeness", completeness, {
        score: null,
        status: "SKIPPED",
        matchedRule: null,
        strengths: [],
        weaknesses: [],
        observations: [],
        recommendations: [],
      })
    }

    if (dimension.rules.some((r) => r.enabled)) {
      const applied = applyDimensionRules(dimension, completeness)
      return buildBaseEvaluation(
        dimension,
        "documentation.completeness",
        completeness,
        {
          ...applied,
          strengths: [...strengths, ...applied.strengths],
          weaknesses: [...weaknesses, ...applied.weaknesses],
          recommendations: [...recommendations, ...applied.recommendations],
        }
      )
    }

    const score = Math.round(completeness)
    return buildBaseEvaluation(dimension, "documentation.completeness", completeness, {
      score,
      status: statusFromScore(score),
      matchedRule: null,
      strengths,
      weaknesses,
      observations: [
        {
          id: "documentation.checklist",
          text: `Completitud documental ${okCount}/${results.length}.`,
          severity: "info",
        },
      ],
      recommendations,
    })
  },
}
