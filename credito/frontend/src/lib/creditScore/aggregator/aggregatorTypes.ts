/**
 * Aggregator SC-1.0 — contratos (sin lógica de cálculo).
 *
 * DimensionEvaluation[]  →  Financial / Commercial / Final
 *                         →  Recommendations
 *                         →  Confidence
 *                         →  OwnCreditScoreResult
 *
 * No conoce nombres de dimensiones. Solo domain + weight + score.
 */

import type { CreditPolicyCategory } from "@/lib/creditPolicy/sc1/creditPolicyTypes"
import type { PolicyRevision } from "@/lib/creditPolicy/sc1/policyRevision"
import type { DimensionEvaluation } from "@/lib/creditScore/ruleEngine/ruleEngineTypes"
import type {
  OwnCreditScoreResult,
  ScoreConfidence,
  ScoreFinding,
  ScoreValue,
} from "@/lib/creditScore/result/scoreResultTypes"

export interface AggregatorInput {
  evaluations: DimensionEvaluation[]
  /**
   * Opcionales: `assemble` toma categorías y rangos desde
   * `revision.policySnapshot` cuando no se pasan.
   */
  categories?: CreditPolicyCategory[]
  scoreMin?: number
  scoreMax?: number
  confidenceMin?: number
  /** Revisión con la que se calculará (auditoría). */
  revision: PolicyRevision
  /**
   * Recommendations de la política (triggers) — el paso Recommendations
   * las interpreta; el Aggregator solo las recibe tipadas.
   */
  policyRecommendations?: unknown[]
}

export interface AggregatedScores {
  financialScore: ScoreValue
  commercialScore: ScoreValue
  finalScore: ScoreValue
}

/**
 * Contrato del Aggregator (sin implementación).
 */
export interface ScoreAggregator {
  /** Pondera evaluations por domain/weight → scores. */
  aggregateScores(
    evaluations: DimensionEvaluation[],
    scoreMin: number,
    scoreMax: number
  ): AggregatedScores

  /** Asigna categoría AAA…B al finalScore. */
  categorize(
    finalScore: ScoreValue,
    categories: CreditPolicyCategory[]
  ): ScoreValue

  /** Fusiona findings de dimensiones + reglas de política. */
  buildRecommendations(
    evaluations: DimensionEvaluation[],
    policyRecommendations?: unknown[]
  ): {
    strengths: ScoreFinding[]
    weaknesses: ScoreFinding[]
    observations: ScoreFinding[]
    recommendations: ScoreFinding[]
  }

  /** Confidence a partir de missing / dims evaluadas. */
  buildConfidence(
    evaluations: DimensionEvaluation[],
    confidenceMin: number
  ): ScoreConfidence

  /** Ensambla el OwnCreditScoreResult final. */
  assemble(input: AggregatorInput): OwnCreditScoreResult
}

/**
 * Orquestación prevista del Score Engine (diseño, no código ejecutable):
 *
 * 1. freezePolicyRevision(policy)           → PolicyRevision
 * 2. project dimensions → RuleEngineDimension[]
 * 3. ruleEngine.evaluateAll(...)            → DimensionEvaluation[]
 * 4. aggregator.assemble(...)               → OwnCreditScoreResult
 *
 * BlockingEngine / LimitEngine quedan FUERA de este pipeline.
 */
export interface ScoreEnginePipeline {
  /** Entrypoint futuro. Hoy: no implementado. */
  run(input: {
    revision: PolicyRevision
    metrics: Record<string, unknown>
  }): OwnCreditScoreResult
}
