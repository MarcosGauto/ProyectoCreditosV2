/**
 * Score Engine SC-1.0 — orquestación del pipeline.
 *
 *   PolicyRevision + metrics → Evaluators → Aggregator → OwnCreditScoreResult
 *
 * El servicio de análisis inyecta `computedAt`; el Aggregator no genera fechas.
 */

import type { PolicyRevision } from "@/lib/creditPolicy/sc1/policyRevision"
import { aggregateFromRevision } from "@/lib/creditScore/aggregator"
import { evaluateProductDimensions } from "@/lib/creditScore/evaluators"
import type { RuleEngineMetrics } from "@/lib/creditScore/ruleEngine/ruleEngineTypes"
import type { OwnCreditScoreResult } from "@/lib/creditScore/result/scoreResultTypes"

export interface RunOwnCreditScoreInput {
  revision: PolicyRevision
  metrics: RuleEngineMetrics
  /** ISO 8601 — lo asigna el servicio de análisis al persistir. */
  computedAt?: string | null
}

/**
 * Ejecuta el pipeline completo del Score Propio SC-1.0.
 * Sin side effects; determinístico salvo `computedAt` inyectado.
 */
export function runOwnCreditScore(input: RunOwnCreditScoreInput): OwnCreditScoreResult {
  const dimensions = input.revision.policySnapshot.dimensions
  const evaluations = evaluateProductDimensions(dimensions, input.metrics)
  const result = aggregateFromRevision(evaluations, input.revision)
  return {
    ...result,
    computedAt: input.computedAt ?? null,
  }
}
