/**
 * PolicyProfile → CreditPolicyDocument + LimitPolicy
 */

import type { CreditPolicyDocument } from "@/lib/creditPolicy/sc1/creditPolicyTypes"
import type { LimitPolicy } from "@/lib/creditLimit/policy/limitPolicyTypes"
import type { PolicyRevision } from "@/lib/creditPolicy/sc1/policyRevision"
import type { LimitPolicyRevision } from "@/lib/creditLimit/policy/limitPolicyRevision"
import type { PolicyProfileProjector } from "@/lib/settings/contracts/projectionContracts"
import type { PolicyProfile } from "@/lib/settings/profile/policyProfileTypes"
import {
  projectAndFreezeLimitPolicy,
  projectLimitSettingsToLimitPolicy,
} from "@/lib/settings/projection/projectLimitSettings"
import {
  projectAndFreezeScorePolicy,
  projectScoreSettingsToCreditPolicyDocument,
} from "@/lib/settings/projection/projectScoreSettings"

function profileContext(profile: PolicyProfile) {
  return {
    organizationId: profile.meta.organizationId,
    profileId: profile.meta.id,
    profileName: profile.meta.name,
    version: profile.meta.version,
    status: profile.meta.status,
    isActive: profile.meta.status === "active" || profile.meta.isDefault,
    createdBy: profile.meta.audit.createdBy,
    updatedBy: profile.meta.audit.updatedBy,
  }
}

export function projectPolicyProfileScore(
  profile: PolicyProfile
): CreditPolicyDocument {
  return projectScoreSettingsToCreditPolicyDocument(
    profile.score,
    profileContext(profile)
  )
}

export function projectPolicyProfileLimit(
  profile: PolicyProfile
): LimitPolicy {
  return projectLimitSettingsToLimitPolicy(profile.limit, profileContext(profile))
}

export function projectPolicyProfileRevisions(profile: PolicyProfile): {
  scoreRevision: PolicyRevision
  limitRevision: LimitPolicyRevision
  creditPolicy: CreditPolicyDocument
  limitPolicy: LimitPolicy
} {
  const ctx = profileContext(profile)
  const creditPolicy = projectScoreSettingsToCreditPolicyDocument(
    profile.score,
    ctx
  )
  const limitPolicy = projectLimitSettingsToLimitPolicy(profile.limit, ctx)
  return {
    creditPolicy,
    limitPolicy,
    scoreRevision: projectAndFreezeScorePolicy(profile.score, ctx),
    limitRevision: projectAndFreezeLimitPolicy(profile.limit, ctx),
  }
}

export const policyProfileProjector: PolicyProfileProjector = {
  projectScore: projectPolicyProfileScore,
  projectLimit: projectPolicyProfileLimit,
}
