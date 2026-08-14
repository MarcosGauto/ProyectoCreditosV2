/**
 * DecisionTrace SC-1.0 — trazabilidad por códigos (sin textos UI).
 */

import type { LimitPipelineStage } from "@/lib/creditLimit/rules/limitRuleTypes"

export interface DecisionTraceWarning {
  id: string
  /** Código (no copy UI). */
  text: string
  severity: "info" | "warning" | "critical"
  sourceId?: string
  conditioning: boolean
}

export type DecisionStepCode =
  | "score"
  | "category"
  | "base_limit"
  | "confidence"
  | "confidence_adjustment"
  | "coverage"
  | "coverage_restriction"
  | "sales_metric"
  | "commercial_ceiling"
  | "guarantees"
  | "conditions"
  | "manual_override"
  | "final_result"

/**
 * Paso de traza — auditoría estructurada.
 */
export interface DecisionStep {
  id: string
  order: number
  stage: LimitPipelineStage
  code: DecisionStepCode
  /** Código de paso (no texto UI). */
  label: string
  /**
   * @deprecated Preferir newValue. Se mantiene por compatibilidad.
   */
  value: number | string | null
  unit: string | null
  previousValue: number | string | null
  /** Valor resultante del paso. */
  newValue: number | string | null
  /** Código de resultado del paso. */
  resultCode: string
  /** Regla aplicada (si hubo). */
  ruleId: string | null
  changed: boolean
  ruleIds: string[]
  notes: string | null
  details: Record<string, unknown> | null
}

export interface AppliedLimitRuleRef {
  ruleId: string
  name: string
  stage: LimitPipelineStage
  effectSummary: string
  message: string | null
}

export interface SkippedLimitRuleRef {
  ruleId: string
  name: string
  stage: LimitPipelineStage
  reason: string
}

export interface DecisionTrace {
  schemaVersion: number
  steps: DecisionStep[]
  appliedRules: AppliedLimitRuleRef[]
  skippedRules: SkippedLimitRuleRef[]
  warnings: DecisionTraceWarning[]
}

export function createEmptyDecisionTrace(): DecisionTrace {
  return {
    schemaVersion: 1,
    steps: [],
    appliedRules: [],
    skippedRules: [],
    warnings: [],
  }
}

