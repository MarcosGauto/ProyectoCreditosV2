/**
 * Evaluador genérico por métrica numérica + rules[] de la política.
 * Usado por Liquidez, Endeudamiento, Rentabilidad, etc.
 */

import {
  applyDimensionRules,
  buildBaseEvaluation,
} from "@/lib/creditScore/evaluators/applyRules"
import {
  asFiniteNumber,
  getMetricValue,
} from "@/lib/creditScore/evaluators/getMetric"
import type { DimensionEvaluator } from "@/lib/creditScore/evaluators/types"
import type {
  DimensionEvaluation,
  RuleEngineDimension,
  RuleEngineMetrics,
} from "@/lib/creditScore/ruleEngine/ruleEngineTypes"

export function createMetricRuleEvaluator(
  dimensionId: string,
  options?: {
    /** Paths alternativos si metricKey de la dimensión no está. */
    fallbackMetricKeys?: string[]
  }
): DimensionEvaluator {
  return {
    dimensionId,
    evaluate(
      metrics: RuleEngineMetrics,
      dimension: RuleEngineDimension
    ): DimensionEvaluation {
      const keys = [
        dimension.metricKey,
        ...(options?.fallbackMetricKeys ?? []),
      ].filter(Boolean) as string[]

      let metricKey: string | null = dimension.metricKey
      let metricValue: unknown = undefined

      for (const key of keys) {
        const v = getMetricValue(metrics, key)
        if (v !== undefined) {
          metricKey = key
          metricValue = v
          break
        }
      }

      if (!dimension.enabled) {
        return buildBaseEvaluation(dimension, metricKey, metricValue, {
          score: null,
          status: "SKIPPED",
          matchedRule: null,
          strengths: [],
          weaknesses: [],
          observations: [],
          recommendations: [],
        })
      }

      if (metricValue === undefined) {
        return buildBaseEvaluation(dimension, metricKey, null, {
          score: null,
          status: "UNKNOWN",
          matchedRule: null,
          strengths: [],
          weaknesses: [],
          observations: [
            {
              id: `${dimensionId}.metric_missing`,
              text: `Falta la métrica requerida (${keys.join(" | ") || "sin metricKey"}).`,
              severity: "warning",
            },
          ],
          recommendations: [],
        })
      }

      // Si hay rules, aplican sobre el valor (numérico o no según operador).
      const numeric = asFiniteNumber(metricValue)
      const valueForRules = numeric != null ? numeric : metricValue
      const applied = applyDimensionRules(dimension, valueForRules)
      return buildBaseEvaluation(dimension, metricKey, metricValue, applied)
    },
  }
}
