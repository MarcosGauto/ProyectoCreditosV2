/**
 * BCRA — métricas:
 *   bcra.worstSituation (1–6 típico)
 *   bcra.debtAmount (opcional)
 *   bcra.riskFlag (opcional)
 *
 * Score vía rules[] de la política sobre worstSituation.
 */

import { createMetricRuleEvaluator } from "@/lib/creditScore/evaluators/metricRuleEvaluator"
import {
  applyDimensionRules,
  buildBaseEvaluation,
} from "@/lib/creditScore/evaluators/applyRules"
import { asBoolean, asFiniteNumber, getMetricValue } from "@/lib/creditScore/evaluators/getMetric"
import type { DimensionEvaluator } from "@/lib/creditScore/evaluators/types"
import type {
  RuleEngineDimension,
  RuleEngineMetrics,
} from "@/lib/creditScore/ruleEngine/ruleEngineTypes"

const base = createMetricRuleEvaluator("bcra", {
  fallbackMetricKeys: ["bcra.worstSituation", "bcra.situacion"],
})

export const bcraEvaluator: DimensionEvaluator = {
  dimensionId: "bcra",
  evaluate(metrics: RuleEngineMetrics, dimension: RuleEngineDimension) {
    const baseEval = base.evaluate(metrics, dimension)

    const debt = asFiniteNumber(getMetricValue(metrics, "bcra.debtAmount"))
    const risk = asBoolean(getMetricValue(metrics, "bcra.riskFlag"))

    const observations = [...baseEval.observations]
    if (debt != null && debt > 0) {
      observations.push({
        id: "bcra.debt",
        text: `Deuda BCRA informada: ${debt}`,
        severity: "info",
      })
    }
    if (risk === true) {
      baseEval.weaknesses.push({
        id: "bcra.risk",
        text: "Flag de riesgo BCRA activo",
        severity: "warning",
      })
      baseEval.recommendations.push({
        id: "bcra.risk.rec",
        text: "Revisar situación BCRA y exposición",
        severity: "warning",
      })
    }

    // Si no hay rules y tenemos situación, no inventamos umbrales de negocio:
    // solo enriquecemos observations; el score queda UNKNOWN salvo defaultScore.
    if (
      baseEval.score == null &&
      dimension.rules.filter((r) => r.enabled).length === 0
    ) {
      const worst = asFiniteNumber(
        getMetricValue(metrics, dimension.metricKey) ??
          getMetricValue(metrics, "bcra.worstSituation")
      )
      if (worst != null) {
        observations.push({
          id: "bcra.situation_raw",
          text: `Situación BCRA = ${worst}. Configurá rules[] en la política para puntuar.`,
          severity: "info",
        })
      }
    }

    return { ...baseEval, observations }
  },
}

/** Re-export helper si se quiere evaluar solo con rules sin extras. */
export function evaluateBcraWithRulesOnly(
  metrics: RuleEngineMetrics,
  dimension: RuleEngineDimension
) {
  const value =
    getMetricValue(metrics, dimension.metricKey) ??
    getMetricValue(metrics, "bcra.worstSituation")
  const applied = applyDimensionRules(dimension, asFiniteNumber(value) ?? value)
  return buildBaseEvaluation(
    dimension,
    dimension.metricKey ?? "bcra.worstSituation",
    value,
    applied
  )
}
