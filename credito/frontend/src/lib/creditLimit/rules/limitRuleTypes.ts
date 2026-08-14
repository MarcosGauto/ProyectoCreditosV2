/**
 * Limit Rules SC-1.0 — reglas configurables entre LimitPolicy y LimitEngine.
 */

import type {
  LimitCoverageOperator,
  LimitRestrictionAction,
  LimitWarningTemplate,
} from "@/lib/creditLimit/shared/limitSharedTypes"

/**
 * Etapas del pipeline del Motor de Límite.
 * El Engine las ejecuta en este orden; las Rules se agrupan por stage.
 */
export type LimitPipelineStage =
  | "category_base"
  | "confidence"
  | "coverage"
  | "commercial_ceiling"
  | "guarantees"
  | "policy_rules"
  | "manual_override"
  | "result"

export type LimitRuleTriggerKind =
  | "always"
  | "category_in"
  | "confidence_level"
  | "confidence_below"
  | "confidence_above"
  | "field"
  | "metric_below"
  | "metric_above"

export type LimitConfidenceLevelTrigger = "high" | "medium" | "low"

/**
 * Condición de disparo de una regla (100 % configurable).
 */
export interface LimitRuleTrigger {
  kind: LimitRuleTriggerKind
  /**
   * Si no vacío, la regla solo aplica a estas categorías de score.
   * [] / null = todas.
   */
  categoryCodes: string[] | null
  /** Para kind=confidence_level. */
  confidenceLevel: LimitConfidenceLevelTrigger | null
  /** Para kind=confidence_below / confidence_above (0–1). */
  confidenceThreshold: number | null
  /** Para kind=field / metric_*: path en context.metrics o score. */
  field: string | null
  operator: LimitCoverageOperator | null
  value: unknown
  valueTo: unknown
}

/**
 * Efecto de la regla cuando el trigger matchea.
 */
export interface LimitRuleEffect {
  action: LimitRestrictionAction | "no_op" | "set_decision"
  /**
   * Reducción porcentual del límite actual (ej. 40 = bajar 40 %).
   * Preferido sobre reduceFactor para claridad de negocio.
   */
  reducePercent: number | null
  /**
   * Factor multiplicativo residual (ej. 0.6 = conservar 60 %).
   * Si ambos vienen, precedencia documentada del engine:
   * preferir reducePercent si no null.
   */
  reduceFactor: number | null
  capAmount: number | null
  /** Techo a aplicar (stage commercial_ceiling). */
  ceilingAmount: number | null
  guaranteeCodes: string[]
  /**
   * Si action = set_decision | deny | require_manual:
   * código de decisión a forzar (opcional; deny/require_manual ya implican).
   */
  decisionCode: string | null
  message: string | null
}

/**
 * Regla atómica de límite — vive en LimitPolicy.rules.
 */
export interface LimitRule {
  id: string
  enabled: boolean
  name: string
  description: string | null
  /** Etapa en la que se evalúa. */
  stage: LimitPipelineStage
  /** Menor = primero dentro de la etapa. */
  priority: number
  trigger: LimitRuleTrigger
  effect: LimitRuleEffect
  /** Texto que alimenta LimitJustification / DecisionStep. */
  justification: string | null
  /** Warning plantilla si aplica. */
  warning: LimitWarningTemplate | null
  params: Record<string, unknown>
}

/**
 * Set de reglas expuesto al Engine (snapshot desde LimitPolicyRevision).
 */
export interface LimitRuleSet {
  rules: LimitRule[]
}

/** Filtra reglas enabled de una etapa, ordenadas por priority. */
export function selectRulesForStage(
  rules: LimitRule[],
  stage: LimitPipelineStage
): LimitRule[] {
  return rules
    .filter((r) => r.enabled && r.stage === stage)
    .sort((a, b) => a.priority - b.priority)
}

