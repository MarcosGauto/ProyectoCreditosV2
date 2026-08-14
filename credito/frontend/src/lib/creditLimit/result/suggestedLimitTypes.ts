/**
 * SuggestedLimitResult SC-1.0 — decisión comercial + DecisionTrace.
 *
 * Contratos estables: el algoritmo futuro los llena; no los modifica.
 */

import type {
  GuaranteeRequirement,
  LimitBaseKind,
  LimitFindingSeverity,
  ReviewPolicy,
} from "@/lib/creditLimit/policy/limitPolicyTypes"
import type { LimitPolicyBinding } from "@/lib/creditLimit/policy/limitPolicyRevision"
import type {
  DecisionTrace,
} from "@/lib/creditLimit/result/decisionTraceTypes"
import { createEmptyDecisionTrace } from "@/lib/creditLimit/result/decisionTraceTypes"
import type {
  ConfidenceLevel,
  OwnCreditScoreResult,
} from "@/lib/creditScore/result/scoreResultTypes"

export type LimitDecisionCode =
  | "approve_suggested"
  | "approve_with_conditions"
  | "deny"
  | "review_manual"
  | "insufficient_data"
  | "disabled"
  | "invalid_policy"
  | "not_implemented"

export interface LimitDecision {
  code: LimitDecisionCode
  label: string
  allowLimit: boolean
  requiresManualReview: boolean
}

export interface LimitJustification {
  id: string
  text: string
  severity?: LimitFindingSeverity
  sourceId?: string
  sourceKind?:
    | "category_policy"
    | "limit_rule"
    | "commercial_ceiling"
    | "engine"
    | "decision_step"
}

export interface LimitWarning {
  id: string
  text: string
  severity: LimitFindingSeverity
  sourceId?: string
  sourceKind?: LimitJustification["sourceKind"]
  conditioning: boolean
}

export interface SuggestedLimitAmount {
  value: number | null
  currency: string
  kind: LimitBaseKind | null
  label: string | null
  baseValue: number | null
  maxLimit: number | null
  commercialCeiling: number | null
  baseMetricKey: string | null
  baseMetricValue: number | null
}

export interface SuggestedLimitTerm {
  termMonths: number | null
  maxTermMonths: number | null
}

export interface SuggestedLimitScoreSnapshot {
  finalScore: number | null
  categoryCode: string | null
  categoryLabel: string | null
  scoreStatus: OwnCreditScoreResult["status"]
  scoreConfidence: number
  scoreConfidenceLevel: ConfidenceLevel
}

export type SuggestedLimitStatus =
  | "ok"
  | "denied"
  | "insufficient_data"
  | "disabled"
  | "invalid_policy"
  | "not_implemented"

/** Origen del límite sugerido (algoritmo vs override manual). */
export type LimitOrigin = "ALGORITHM" | "OVERRIDE"

export interface SuggestedLimitConfidence {
  value: number
  level: ConfidenceLevel
  label: string
  missing: string[]
}

/**
 * Resultado canónico del Motor de Límite.
 * Incluye DecisionTrace para Cockpit / IA / PDF / Historial.
 */
export interface SuggestedLimitResult {
  schemaVersion: number
  status: SuggestedLimitStatus

  decision: LimitDecision
  suggestedLimit: SuggestedLimitAmount
  term: SuggestedLimitTerm
  guarantees: GuaranteeRequirement[]
  review: ReviewPolicy
  justifications: LimitJustification[]
  warnings: LimitWarning[]
  confidence: SuggestedLimitConfidence
  limitOrigin: LimitOrigin
  /** Override manual aplicado (si hubo). */
  appliedOverride: {
    reasonCode: string
    userId: string | null
    at: string | null
    comment: string | null
    amount: number | null
  } | null

  /**
   * Traza explicable completa (Decision Steps + reglas aplicadas/omitidas).
   * No requiere recalcular para narrar la decisión.
   */
  trace: DecisionTrace

  matchedCategoryPolicyId: string | null
  categoryCode: string | null
  score: SuggestedLimitScoreSnapshot

  limitPolicyRevisionId: string
  limitPolicyRevisionVersion: number
  limitPolicyRevisionHash: string
  limitPolicy: LimitPolicyBinding

  scorePolicyRevisionId: string
  scorePolicyRevisionVersion: number
  scorePolicyRevisionHash: string

  computedAt: string | null
}

export function createNotImplementedLimitDecision(): LimitDecision {
  return {
    code: "not_implemented",
    label: "Algoritmo no implementado",
    allowLimit: false,
    requiresManualReview: true,
  }
}

export function createEmptySuggestedLimitResult(input: {
  limitPolicy: LimitPolicyBinding
  score?: SuggestedLimitScoreSnapshot | null
  scorePolicyRevisionId?: string
  scorePolicyRevisionVersion?: number
  scorePolicyRevisionHash?: string
  currency?: string
}): SuggestedLimitResult {
  const emptyReview: ReviewPolicy = {
    frequencyDays: null,
    frequencyLabel: null,
    mandatory: false,
  }

  return {
    schemaVersion: 1,
    status: "not_implemented",
    decision: createNotImplementedLimitDecision(),
    suggestedLimit: {
      value: null,
      currency: input.currency ?? "ARS",
      kind: null,
      label: null,
      baseValue: null,
      maxLimit: null,
      commercialCeiling: null,
      baseMetricKey: null,
      baseMetricValue: null,
    },
    term: { termMonths: null, maxTermMonths: null },
    guarantees: [],
    review: emptyReview,
    justifications: [
      {
        id: "limit.not_implemented",
        text: "Motor de Límite SC-1.0: contratos listos; algoritmo no implementado.",
        severity: "info",
        sourceKind: "engine",
      },
    ],
    warnings: [],
    confidence: {
      value: 0,
      level: "low",
      label: "Baja",
      missing: ["limit_engine_not_implemented"],
    },
    limitOrigin: "ALGORITHM",
    appliedOverride: null,
    trace: createEmptyDecisionTrace(),
    matchedCategoryPolicyId: null,
    categoryCode: input.score?.categoryCode ?? null,
    score: input.score ?? {
      finalScore: null,
      categoryCode: null,
      categoryLabel: null,
      scoreStatus: "not_implemented",
      scoreConfidence: 0,
      scoreConfidenceLevel: "low",
    },
    limitPolicyRevisionId: input.limitPolicy.revisionId,
    limitPolicyRevisionVersion: input.limitPolicy.version,
    limitPolicyRevisionHash: input.limitPolicy.hash,
    limitPolicy: input.limitPolicy,
    scorePolicyRevisionId: input.scorePolicyRevisionId ?? "",
    scorePolicyRevisionVersion: input.scorePolicyRevisionVersion ?? 0,
    scorePolicyRevisionHash: input.scorePolicyRevisionHash ?? "",
    computedAt: null,
  }
}

export function scoreSnapshotFromOwnCreditScore(
  score: OwnCreditScoreResult
): SuggestedLimitScoreSnapshot {
  return {
    finalScore: score.finalScore.value,
    categoryCode: score.finalScore.categoryCode,
    categoryLabel: score.finalScore.categoryLabel,
    scoreStatus: score.status,
    scoreConfidence: score.confidence.value,
    scoreConfidenceLevel: score.confidence.level,
  }
}

