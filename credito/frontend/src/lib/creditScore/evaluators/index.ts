/**
 * Registry de Dimension Evaluators (producto).
 *
 * - Liquidez / Endeudamiento / Rentabilidad: métrica + rules[]
 * - Documentación: checklist (no ratios)
 * - BCRA / Cheques / Cobertura: métricas de dominio + rules[]
 *
 * NO calcula Financial / Commercial / Final Score.
 */

import { bcraEvaluator } from "@/lib/creditScore/evaluators/bcraEvaluator"
import { checksEvaluator } from "@/lib/creditScore/evaluators/checksEvaluator"
import { coverageEvaluator } from "@/lib/creditScore/evaluators/coverageEvaluator"
import { documentationEvaluator } from "@/lib/creditScore/evaluators/documentationEvaluator"
import { createMetricRuleEvaluator } from "@/lib/creditScore/evaluators/metricRuleEvaluator"
import type { DimensionEvaluator } from "@/lib/creditScore/evaluators/types"
import type {
  DimensionEvaluation,
  RuleEngineDimension,
  RuleEngineMetrics,
} from "@/lib/creditScore/ruleEngine/ruleEngineTypes"
import { toRuleEngineDimension } from "@/lib/creditScore/ruleEngine/ruleEngineTypes"
import type { CreditPolicyDimension } from "@/lib/creditPolicy/sc1/creditPolicyTypes"

export const liquidityEvaluator = createMetricRuleEvaluator("liquidity", {
  fallbackMetricKeys: ["ratios.liquidityCurrent", "liquidez.corriente"],
})

export const debtEvaluator = createMetricRuleEvaluator("debt", {
  fallbackMetricKeys: ["ratios.debtRatio", "endeudamiento.ratio"],
})

export const profitabilityEvaluator = createMetricRuleEvaluator(
  "profitability",
  {
    fallbackMetricKeys: ["ratios.profitability", "rentabilidad.ratio"],
  }
)

const EVALUATORS: DimensionEvaluator[] = [
  liquidityEvaluator,
  debtEvaluator,
  profitabilityEvaluator,
  documentationEvaluator,
  bcraEvaluator,
  checksEvaluator,
  coverageEvaluator,
]

const byId = new Map(EVALUATORS.map((e) => [e.dimensionId, e]))

export function getDimensionEvaluator(
  dimensionId: string
): DimensionEvaluator | null {
  return byId.get(dimensionId) ?? null
}

export function listDimensionEvaluators(): DimensionEvaluator[] {
  return [...EVALUATORS]
}

/**
 * Evalúa una dimensión: usa evaluator registrado o fallback métrica+rules.
 */
export function evaluateDimension(
  dimension: RuleEngineDimension | CreditPolicyDimension,
  metrics: RuleEngineMetrics
): DimensionEvaluation {
  const engineDim =
    "rules" in dimension && dimension.rules[0] && "threshold" in dimension.rules[0]
      ? (dimension as RuleEngineDimension)
      : toRuleEngineDimension(dimension as CreditPolicyDimension)

  const evaluator =
    getDimensionEvaluator(engineDim.id) ??
    createMetricRuleEvaluator(engineDim.id)

  return evaluator.evaluate(metrics, engineDim)
}

/**
 * Evalúa el set inicial de dimensiones de producto (solo las 7).
 * Ignora Aggregator.
 */
export function evaluateProductDimensions(
  dimensions: Array<RuleEngineDimension | CreditPolicyDimension>,
  metrics: RuleEngineMetrics
): DimensionEvaluation[] {
  const wanted = new Set(EVALUATORS.map((e) => e.dimensionId))
  return dimensions
    .filter((d) => wanted.has(d.id))
    .map((d) => evaluateDimension(d, metrics))
}
