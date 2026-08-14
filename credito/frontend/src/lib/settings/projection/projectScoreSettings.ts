/**
 * ScoreSettings → CreditPolicyDocument
 *
 * Merge: base product document (rules/metricKeys) + pesos/bandas/confidence de Ajustes.
 * No ejecuta el Score Engine.
 */

import { createDefaultCreditPolicyDocument } from "@/lib/creditPolicy/sc1/creditPolicyDefaults"
import { CREDIT_POLICY_MODEL_ID } from "@/lib/creditPolicy/sc1/creditPolicyTypes"
import type {
  CreditPolicyCategory,
  CreditPolicyDocument,
  CreditPolicyStatus,
} from "@/lib/creditPolicy/sc1/creditPolicyTypes"
import { freezePolicyRevision } from "@/lib/creditPolicy/sc1/policyRevision"
import type { PolicyRevision } from "@/lib/creditPolicy/sc1/policyRevision"
import type { ScoreSettingsProjector } from "@/lib/settings/contracts/projectionContracts"
import type {
  ScoreSettings,
  ScoreSubProfileSettings,
} from "@/lib/settings/modules/score/scoreSettingsTypes"

export interface ScoreProjectionContext {
  organizationId: string
  profileId: string
  profileName: string
  version?: number
  status?: CreditPolicyStatus
  isActive?: boolean
  createdBy?: string | null
  updatedBy?: string | null
  /** Si se omite, se usa createDefaultCreditPolicyDocument(). */
  baseDocument?: CreditPolicyDocument
}

export function resolveActiveScoreSubProfile(
  score: ScoreSettings
): ScoreSubProfileSettings | null {
  if (!score.subProfiles.length) return null
  return (
    score.subProfiles.find((s) => s.id === score.activeSubProfileId) ??
    score.subProfiles.find((s) => s.isDefault) ??
    score.subProfiles[0] ??
    null
  )
}

function clonePolicy(doc: CreditPolicyDocument): CreditPolicyDocument {
  return (
    typeof structuredClone === "function"
      ? structuredClone(doc)
      : JSON.parse(JSON.stringify(doc))
  ) as CreditPolicyDocument
}

/**
 * Proyecta ScoreSettings a CreditPolicyDocument consumible por freeze + Score Engine.
 */
export function projectScoreSettingsToCreditPolicyDocument(
  score: ScoreSettings,
  context: ScoreProjectionContext
): CreditPolicyDocument {
  const sub = resolveActiveScoreSubProfile(score)
  if (!sub) {
    throw new Error(
      "ScoreSettings sin sub-perfil activo: no se puede proyectar a CreditPolicyDocument"
    )
  }

  const base = clonePolicy(
    context.baseDocument ?? createDefaultCreditPolicyDocument()
  )
  const now = new Date().toISOString()
  const organizationId = context.organizationId
  const policyId = `org:${organizationId}:score:${context.profileId}`

  const weightById = new Map(
    sub.dimensionWeights.map((w) => [w.dimensionId, w] as const)
  )

  const dimensions = base.dimensions.map((dim) => {
    const w = weightById.get(dim.id)
    if (!w) {
      return {
        ...dim,
        enabled: false,
      }
    }
    return {
      ...dim,
      label: w.label || dim.label,
      name: w.label || dim.name,
      description: w.description ?? dim.description,
      enabled: w.enabled,
      weight: w.weight,
      domain: w.domain,
    }
  })

  // Dimensiones nuevas en settings que no existen en base: se omiten
  // (sin rules/metricKey no son ejecutables). Quedan en extensions.
  const knownIds = new Set(base.dimensions.map((d) => d.id))
  const unknownWeights = sub.dimensionWeights.filter(
    (w) => !knownIds.has(w.dimensionId)
  )

  const categories: CreditPolicyCategory[] = [...sub.categories]
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      id: c.id,
      code: c.code,
      label: c.label,
      min: c.min,
      max: c.max,
      minInclusive: c.minInclusive,
      maxInclusive: c.maxInclusive,
      order: c.order,
      description: c.description,
    }))

  base.kind = "custom"
  base.basedOnPolicyId = base.meta.id === "default" ? "default" : base.basedOnPolicyId
  base.meta = {
    ...base.meta,
    id: policyId,
    organizationId,
    name: `${context.profileName} · ${sub.name}`,
    description: sub.description ?? base.meta.description,
    version: context.version ?? base.meta.version,
    status: context.status ?? "active",
    isActive: context.isActive ?? score.enabled,
    model: CREDIT_POLICY_MODEL_ID,
    scoreMin: sub.scoreMin,
    scoreMax: sub.scoreMax,
    confidenceMin: sub.confidence.confidenceMin,
    updatedAt: now,
    updatedBy: context.updatedBy ?? context.createdBy ?? base.meta.updatedBy,
    createdAt: base.meta.createdAt ?? now,
    createdBy: context.createdBy ?? base.meta.createdBy,
  }

  base.dimensions = dimensions
  base.categories = categories
  base.extensions = {
    ...base.extensions,
    projectedFrom: "ScoreSettings",
    scoreSubProfileId: sub.id,
    scoreSubProfileCode: sub.code,
    defaultFindingSeverity: score.defaultFindingSeverity,
    confidenceBands: {
      highThreshold: sub.confidence.highThreshold,
      mediumThreshold: sub.confidence.mediumThreshold,
      labelHigh: sub.confidence.labelHigh,
      labelMedium: sub.confidence.labelMedium,
      labelLow: sub.confidence.labelLow,
    },
    unknownDimensionWeights: unknownWeights,
  }

  return base
}

export function projectAndFreezeScorePolicy(
  score: ScoreSettings,
  context: ScoreProjectionContext
): PolicyRevision {
  const policy = projectScoreSettingsToCreditPolicyDocument(score, context)
  return freezePolicyRevision({
    policy,
    createdBy: context.createdBy ?? context.updatedBy ?? null,
  })
}

export const scoreSettingsProjector: ScoreSettingsProjector = {
  toCreditPolicyDocument(score, context) {
    return projectScoreSettingsToCreditPolicyDocument(score, context)
  },
}
