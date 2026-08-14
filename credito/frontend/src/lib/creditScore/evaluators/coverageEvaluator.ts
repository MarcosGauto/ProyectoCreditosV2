/**
 * Cobertura — métrica ordinal / status:
 *   coverage.status  (ej. "CON" | "SIN" | "OBSERVADO")
 *   coverage.hasCoverage (boolean opcional)
 *
 * Score vía rules[] de la política (eq / in sobre status).
 */

import { createMetricRuleEvaluator } from "@/lib/creditScore/evaluators/metricRuleEvaluator"
import { asBoolean, getMetricValue } from "@/lib/creditScore/evaluators/getMetric"
import type { DimensionEvaluator } from "@/lib/creditScore/evaluators/types"
import type {
  RuleEngineDimension,
  RuleEngineMetrics,
} from "@/lib/creditScore/ruleEngine/ruleEngineTypes"

const base = createMetricRuleEvaluator("coverage", {
  fallbackMetricKeys: ["coverage.status", "coverage.hasCoverage"],
})

export const coverageEvaluator: DimensionEvaluator = {
  dimensionId: "coverage",
  evaluate(metrics: RuleEngineMetrics, dimension: RuleEngineDimension) {
    const result = base.evaluate(metrics, dimension)

    const status = getMetricValue(metrics, "coverage.status")
    const has = asBoolean(getMetricValue(metrics, "coverage.hasCoverage"))

    if (status != null) {
      result.observations.push({
        id: "coverage.status",
        text: `Estado de cobertura: ${String(status)}`,
        severity: "info",
      })
    }
    if (has === false || String(status).toUpperCase() === "SIN") {
      result.weaknesses.push({
        id: "coverage.sin",
        text: "Sin cobertura operativa",
        severity: "warning",
      })
      result.recommendations.push({
        id: "coverage.sin.rec",
        text: "Completar requisitos de cobertura",
        severity: "warning",
      })
    }

    return result
  },
}
