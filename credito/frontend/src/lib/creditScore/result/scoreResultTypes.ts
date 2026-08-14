/**
 * Score Result SC-1.0 — contrato de salida del Score Engine.
 *
 * Separado de Credit Policy (config) y de Rule Engine (evaluación).
 * Cockpit / Cartera / Historial / Alertas consumen SOLO este contrato.
 *
 * NOSIS no forma parte de este resultado.
 */

import type {
  AnalysisPolicyBinding,
  PolicyRevision,
} from "@/lib/creditPolicy/sc1/policyRevision"
import type {
  CreditPolicyKind,
  CreditPolicyModelId,
  DimensionDomain,
  FindingSeverity,
} from "@/lib/creditPolicy/sc1/creditPolicyTypes"

export type ConfidenceLevel = "high" | "medium" | "low"

export type ScoreResultStatus =
  | "ok"
  | "invalid_policy"
  | "insufficient_data"
  | "not_implemented"

export type DimensionEvalStatus =
  | "EXCELLENT"
  | "GOOD"
  | "FAIR"
  | "WARNING"
  | "CRITICAL"
  | "UNKNOWN"
  | "SKIPPED"

export interface ScoreValue {
  value: number | null
  categoryCode: string | null
  categoryLabel: string | null
}

export interface ScoreConfidence {
  /** 0–1 */
  value: number
  level: ConfidenceLevel
  label: string
  missing: string[]
}

export interface ScoreFinding {
  id: string
  text: string
  severity?: FindingSeverity
  dimensionId?: string
  ruleId?: string
}

export interface ScoreRuleMatch {
  ruleId: string
  matched: boolean
  points: number | null
  severity: FindingSeverity | null
  message: string | null
}

/**
 * Breakdown de una dimensión en el resultado final.
 */
export interface ScoreDimensionBreakdown {
  dimensionId: string
  label: string
  domain: DimensionDomain
  enabled: boolean
  weight: number
  scoreMin: number
  scoreMax: number
  score: number | null
  status: DimensionEvalStatus
  contribution: number | null
  metricKey: string | null
  metricValue: unknown
  matchedRuleId: string | null
  ruleMatches: ScoreRuleMatch[]
  strengths: ScoreFinding[]
  weaknesses: ScoreFinding[]
  observations: ScoreFinding[]
  recommendations: ScoreFinding[]
}

/**
 * Resultado canónico del Score Propio.
 * Ligado a PolicyRevision vía `policy` (binding de auditoría).
 */
export interface OwnCreditScoreResult {
  schemaVersion: number
  model: CreditPolicyModelId
  financialScore: ScoreValue
  commercialScore: ScoreValue
  finalScore: ScoreValue
  confidence: ScoreConfidence
  breakdown: ScoreDimensionBreakdown[]
  strengths: ScoreFinding[]
  weaknesses: ScoreFinding[]
  observations: ScoreFinding[]
  recommendations: ScoreFinding[]
  /**
   * Trazabilidad plana (Limit Engine / snapshots).
   * Duplica `policy.revisionId|version|hash` para consumidores legacy.
   */
  policyRevisionId: string
  policyRevisionVersion: number
  policyRevisionHash: string
  /**
   * Trazabilidad: qué revisión se usó.
   * Preferir revisionId + hash; version/name para UI.
   */
  policy: AnalysisPolicyBinding & {
    kind: CreditPolicyKind
  }
  computedAt: string | null
  status: ScoreResultStatus
}

/**
 * Stub de resultado (sin algoritmo).
 */
export function createEmptyOwnCreditScoreResult(input: {
  model: CreditPolicyModelId
  policy: AnalysisPolicyBinding & { kind: CreditPolicyKind }
  breakdown?: ScoreDimensionBreakdown[]
}): OwnCreditScoreResult {
  return {
    schemaVersion: 1,
    model: input.model,
    financialScore: { value: null, categoryCode: null, categoryLabel: null },
    commercialScore: { value: null, categoryCode: null, categoryLabel: null },
    finalScore: { value: null, categoryCode: null, categoryLabel: null },
    confidence: {
      value: 0,
      level: "low",
      label: "Baja",
      missing: ["algorithm_not_implemented"],
    },
    breakdown: input.breakdown ?? [],
    strengths: [],
    weaknesses: [],
    observations: [
      {
        id: "engine.not_implemented",
        text: "Score Engine SC-1.0: contratos listos; algoritmo no implementado.",
        severity: "info",
      },
    ],
    recommendations: [],
    policyRevisionId: input.policy.revisionId,
    policyRevisionVersion: input.policy.version,
    policyRevisionHash: input.policy.hash,
    policy: input.policy,
    computedAt: null,
    status: "not_implemented",
  }
}

/** Arma binding+kind desde una PolicyRevision. */
export function policyBindingFromRevision(revision: PolicyRevision): OwnCreditScoreResult["policy"] {
  return {
    revisionId: revision.id,
    policyId: revision.policyId,
    policyName: revision.policyName,
    version: revision.version,
    hash: revision.hash,
    kind: revision.kind,
  }
}
