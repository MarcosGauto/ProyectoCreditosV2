/**
 * Rule Engine SC-1.0 — contratos (sin lógica de evaluación).
 *
 * El motor NO conoce "Liquidez" ni "BCRA".
 * Solo conoce: Dimension → Rules[] → match → score parcial.
 *
 * Flujo:
 *   Dimension + Metrics  →  Rule Engine  →  DimensionEvaluation
 */

import type {
  CreditPolicyDimension,
  CreditPolicyDimensionRule,
  FindingSeverity,
  PolicyRuleOperator,
} from "@/lib/creditPolicy/sc1/creditPolicyTypes"
import type { DimensionEvalStatus } from "@/lib/creditScore/result/scoreResultTypes"

/**
 * Vista canónica de una regla para el Rule Engine.
 * Mapea 1:1 desde CreditPolicyDimensionRule (política).
 */
export interface RuleDefinition {
  id: string
  enabled: boolean
  name: string
  /** Campo a evaluar (o null → metricKey de la dimensión). */
  field: string | null
  operator: PolicyRuleOperator
  /** Threshold principal. */
  threshold: unknown
  /** Threshold superior (between / outside). */
  thresholdTo: unknown
  /** Puntaje si matchea. */
  score: number
  severity: FindingSeverity
  message: string | null
  priority: number
}

/**
 * Dimensión vista por el Rule Engine (agnóstica al nombre de negocio).
 */
export interface RuleEngineDimension {
  id: string
  label: string
  enabled: boolean
  weight: number
  domain: CreditPolicyDimension["domain"]
  metricKey: string | null
  scoreMin: number
  scoreMax: number
  defaultScore: number | null
  rules: RuleDefinition[]
}

/** Métricas de entrada (abiertas). */
export type RuleEngineMetrics = Record<string, unknown>

export interface RuleEngineInput {
  dimension: RuleEngineDimension
  metrics: RuleEngineMetrics
}

/**
 * Resultado de evaluar UNA dimensión (salida del Rule Engine).
 * Todavía no hay agregación financial/commercial/final.
 */
export interface DimensionEvaluation {
  dimensionId: string
  label: string
  domain: CreditPolicyDimension["domain"]
  enabled: boolean
  weight: number
  /** Puntaje parcial de la dimensión. */
  score: number | null
  /** Rango de la dimensión (para normalizar score → 0–1). */
  scoreMin: number
  scoreMax: number
  status: DimensionEvalStatus
  metricKey: string | null
  metricValue: unknown
  matchedRuleId: string | null
  strengths: Array<{ id: string; text: string; severity?: FindingSeverity }>
  weaknesses: Array<{ id: string; text: string; severity?: FindingSeverity }>
  observations: Array<{ id: string; text: string; severity?: FindingSeverity }>
  recommendations: Array<{ id: string; text: string; severity?: FindingSeverity }>
}

/**
 * Contrato del Rule Engine (sin implementación).
 * Una sola función genérica — nunca LiquidezEvaluator, etc.
 */
export interface RuleEngine {
  /**
   * Evalúa una dimensión aplicando sus rules[] en orden de priority.
   * Estrategia prevista: first_match_by_priority (configurable en política).
   */
  evaluateDimension(input: RuleEngineInput): DimensionEvaluation

  /** Evalúa todas las dimensiones enabled de una proyección. */
  evaluateAll(
    dimensions: RuleEngineDimension[],
    metrics: RuleEngineMetrics
  ): DimensionEvaluation[]
}

/** Mapeo política → definición de regla del engine. */
export function toRuleDefinition(
  rule: CreditPolicyDimensionRule
): RuleDefinition {
  return {
    id: rule.id,
    enabled: rule.enabled,
    name: rule.name,
    field: rule.field,
    operator: rule.operator,
    threshold: rule.value,
    thresholdTo: rule.valueTo,
    score: rule.points,
    severity: rule.severity ?? "info",
    message: rule.message ?? rule.observation,
    priority: rule.priority,
  }
}

/** Mapeo política → dimensión del engine. */
export function toRuleEngineDimension(
  dimension: CreditPolicyDimension
): RuleEngineDimension {
  return {
    id: dimension.id,
    label: dimension.label,
    enabled: dimension.enabled,
    weight: dimension.weight,
    domain: dimension.domain,
    metricKey: dimension.metricKey,
    scoreMin: dimension.scoreMin,
    scoreMax: dimension.scoreMax,
    defaultScore: dimension.defaultPoints,
    rules: dimension.rules.map(toRuleDefinition),
  }
}
