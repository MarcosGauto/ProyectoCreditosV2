/**
 * Orquestador SC-1.0 — dual-run paralelo al análisis legacy.
 *
 * No modifica financialScoreEngine / creditAnalysisEngine.
 * No toca contratos de engines ni Settings.
 */

import { runLimitEngine } from "@/lib/creditLimit/engine/runLimitEngine"
import type { CommercialContext } from "@/lib/creditLimit/commercial/commercialContext"
import type { LimitPolicyRevision } from "@/lib/creditLimit/policy/limitPolicyRevision"
import type { SuggestedLimitResult } from "@/lib/creditLimit/result/suggestedLimitTypes"
import type { PolicyRevision } from "@/lib/creditPolicy/sc1/policyRevision"
import { runOwnCreditScore } from "@/lib/creditScore/scoreEngine"
import type { OwnCreditScoreResult } from "@/lib/creditScore/result/scoreResultTypes"
import type { RuleEngineMetrics } from "@/lib/creditScore/ruleEngine/ruleEngineTypes"
import { loadAndProjectOrganizationSettings } from "@/lib/settings"
import { buildCommercialContext } from "@/lib/sc1/buildCommercialContext"
import type { BuildCommercialContextInput } from "@/lib/sc1/buildCommercialContext"
import { buildSc1Metrics } from "@/lib/sc1/buildSc1Metrics"
import type { BuildSc1MetricsInput } from "@/lib/sc1/buildSc1Metrics"

export interface RunSc1AnalysisInput {
  organizationId?: string
  computed: BuildSc1MetricsInput["computed"]
  coverageDecision?: BuildSc1MetricsInput["coverageDecision"]
  bcra?: BuildSc1MetricsInput["bcra"]
  fechaInicioActividad?: string | null
  preCalificacion?: BuildCommercialContextInput["preCalificacion"]
  requestedLimit?: number | null
  currentExposure?: number | null
  currency?: string | null
  /** Actor para loadOrCreate settings (auditoría). */
  createdBy?: string | null
  /** ISO 8601 inyectado a ambos engines. */
  computedAt?: string | null
}

export interface Sc1AnalysisRevisions {
  scoreRevision: PolicyRevision
  limitRevision: LimitPolicyRevision
  organizationId: string
  profileId: string
  profileName: string
}

export interface Sc1AnalysisResult {
  ownCreditScore: OwnCreditScoreResult
  suggestedLimit: SuggestedLimitResult
  commercialContext: CommercialContext
  metrics: RuleEngineMetrics
  revisions: Sc1AnalysisRevisions
  computedAt: string
}

/**
 * Pipeline SC-1.0:
 * 1 loadAndProjectOrganizationSettings
 * 2 buildSc1Metrics
 * 3 runOwnCreditScore
 * 4 buildCommercialContext
 * 5 runLimitEngine
 */
export async function runSc1Analysis(
  input: RunSc1AnalysisInput
): Promise<Sc1AnalysisResult> {
  const computedAt = input.computedAt ?? new Date().toISOString()

  const projected = await loadAndProjectOrganizationSettings({
    organizationId: input.organizationId,
    createdBy: input.createdBy,
  })

  const metrics = buildSc1Metrics({
    computed: input.computed,
    coverageDecision: input.coverageDecision,
    bcra: input.bcra,
    fechaInicioActividad: input.fechaInicioActividad,
    currency: input.currency,
  })

  const ownCreditScore = runOwnCreditScore({
    revision: projected.scoreRevision,
    metrics,
    computedAt,
  })

  const commercialContext = buildCommercialContext({
    preCalificacion: input.preCalificacion,
    requestedLimit: input.requestedLimit,
    currentExposure: input.currentExposure,
    currency:
      input.currency ??
      projected.limitPolicy.meta.currency ??
      "ARS",
  })

  const suggestedLimit = runLimitEngine({
    score: ownCreditScore,
    revision: projected.limitRevision,
    commercialContext,
    computedAt,
  })

  return {
    ownCreditScore,
    suggestedLimit,
    commercialContext,
    metrics,
    revisions: {
      scoreRevision: projected.scoreRevision,
      limitRevision: projected.limitRevision,
      organizationId: projected.organization.meta.organizationId,
      profileId: projected.profile.meta.id,
      profileName: projected.profile.meta.name,
    },
    computedAt,
  }
}

/**
 * Shape liviano para `computed.sc1` (serializable / UI dual).
 */
export function toComputedSc1Block(
  result: Sc1AnalysisResult
): Record<string, unknown> {
  return {
    ownCreditScore: result.ownCreditScore,
    suggestedLimit: result.suggestedLimit,
    commercialContext: result.commercialContext,
    revisions: {
      organizationId: result.revisions.organizationId,
      profileId: result.revisions.profileId,
      profileName: result.revisions.profileName,
      scoreRevisionId: result.revisions.scoreRevision.id,
      scoreRevisionVersion: result.revisions.scoreRevision.version,
      scoreRevisionHash: result.revisions.scoreRevision.hash,
      limitRevisionId: result.revisions.limitRevision.id,
      limitRevisionVersion: result.revisions.limitRevision.version,
      limitRevisionHash: result.revisions.limitRevision.hash,
    },
    computedAt: result.computedAt,
    engine: {
      score: "SC-1.0",
      limit: "SC-1.0",
    },
  }
}
