/**
 * Cheques — métricas:
 *   checks.rejectedCount
 *   checks.recoveredCount
 *   checks.activeRejectedCount (vigentes)
 *
 * Score principal vía rules[] sobre rejectedCount (política).
 */

import { createMetricRuleEvaluator } from "@/lib/creditScore/evaluators/metricRuleEvaluator"
import { asFiniteNumber, getMetricValue } from "@/lib/creditScore/evaluators/getMetric"
import type { DimensionEvaluator } from "@/lib/creditScore/evaluators/types"
import type {
  RuleEngineDimension,
  RuleEngineMetrics,
} from "@/lib/creditScore/ruleEngine/ruleEngineTypes"

const base = createMetricRuleEvaluator("checks", {
  fallbackMetricKeys: ["checks.rejectedCount", "cheques.rechazados"],
})

export const checksEvaluator: DimensionEvaluator = {
  dimensionId: "checks",
  evaluate(metrics: RuleEngineMetrics, dimension: RuleEngineDimension) {
    const result = base.evaluate(metrics, dimension)

    const rejected = asFiniteNumber(
      getMetricValue(metrics, "checks.rejectedCount")
    )
    const recovered = asFiniteNumber(
      getMetricValue(metrics, "checks.recoveredCount")
    )
    const active = asFiniteNumber(
      getMetricValue(metrics, "checks.activeRejectedCount")
    )

    if (rejected != null) {
      result.observations.push({
        id: "checks.rejected",
        text: `Cheques rechazados: ${rejected}`,
        severity: rejected > 0 ? "warning" : "info",
      })
    }
    if (recovered != null) {
      result.observations.push({
        id: "checks.recovered",
        text: `Cheques recuperados: ${recovered}`,
        severity: "info",
      })
    }
    if (active != null) {
      result.observations.push({
        id: "checks.active",
        text: `Cheques rechazados vigentes: ${active}`,
        severity: active > 0 ? "warning" : "info",
      })
      if (active > 0) {
        result.weaknesses.push({
          id: "checks.active.weak",
          text: "Hay cheques rechazados vigentes",
          severity: "warning",
        })
        result.recommendations.push({
          id: "checks.active.rec",
          text: "Regularizar cheques vigentes antes de ampliar línea",
          severity: "warning",
        })
      }
    }

    return result
  },
}
