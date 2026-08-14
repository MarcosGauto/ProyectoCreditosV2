/**
 * Dimension Evaluators — contrato.
 * Cada evaluador recibe métricas + definición de dimensión (con rules[])
 * y devuelve DimensionEvaluation. Sin Aggregator / Final Score.
 */

import type {
  DimensionEvaluation,
  RuleEngineDimension,
  RuleEngineMetrics,
} from "@/lib/creditScore/ruleEngine/ruleEngineTypes"

export interface DimensionEvaluator {
  /** Id de dimensión en la política (liquidity, debt, …). */
  dimensionId: string
  evaluate(
    metrics: RuleEngineMetrics,
    dimension: RuleEngineDimension
  ): DimensionEvaluation
}

export type DimensionEvaluatorId =
  | "liquidity"
  | "debt"
  | "profitability"
  | "documentation"
  | "bcra"
  | "checks"
  | "coverage"
