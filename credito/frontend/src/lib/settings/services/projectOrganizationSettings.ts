/**
 * Carga OrganizationSettings y proyecta al runtime de motores SC-1.0.
 *
 * No ejecuta Score/Limit Engine.
 * No modifica Cockpit.
 */

import { freezePolicyRevision } from "@/lib/creditPolicy/sc1/policyRevision"
import type { CreditPolicyDocument } from "@/lib/creditPolicy/sc1/creditPolicyTypes"
import type { PolicyRevision } from "@/lib/creditPolicy/sc1/policyRevision"
import { freezeLimitPolicyRevision } from "@/lib/creditLimit/policy/limitPolicyRevision"
import type { LimitPolicy } from "@/lib/creditLimit/policy/limitPolicyTypes"
import type { LimitPolicyRevision } from "@/lib/creditLimit/policy/limitPolicyRevision"
import type { OrganizationSettings } from "@/lib/settings/org/organizationSettingsTypes"
import type { PolicyProfile } from "@/lib/settings/profile/policyProfileTypes"
import { DEFAULT_ORGANIZATION_ID } from "@/lib/settings/repositories/organizationSettingsRepository"
import { loadOrCreateOrganizationSettings } from "@/lib/settings/services/organizationSettingsService"
import {
  createProjectionRegistry,
  resolveActiveProfile,
} from "@/lib/settings/projection"

export interface ProjectedOrganizationRuntime {
  organization: OrganizationSettings
  profile: PolicyProfile
  creditPolicy: CreditPolicyDocument
  limitPolicy: LimitPolicy
  scoreRevision: PolicyRevision
  limitRevision: LimitPolicyRevision
}

export interface LoadAndProjectOrganizationSettingsInput {
  organizationId?: string
  profileId?: string | null
  createdBy?: string | null
}

/**
 * loadOrCreate + resolveActiveProfile + project + freeze.
 * API lista para la futura integración con engines.
 */
export async function loadAndProjectOrganizationSettings(
  input: LoadAndProjectOrganizationSettingsInput = {}
): Promise<ProjectedOrganizationRuntime> {
  const organizationId = input.organizationId ?? DEFAULT_ORGANIZATION_ID
  const organization = await loadOrCreateOrganizationSettings({
    organizationId,
    createdBy: input.createdBy,
  })

  return projectOrganizationSettings(organization, {
    profileId: input.profileId,
    createdBy: input.createdBy,
  })
}

/**
 * Proyecta un OrganizationSettings ya cargado (sin I/O).
 * Usa ProjectionRegistry como única vía de proyección.
 */
export function projectOrganizationSettings(
  organization: OrganizationSettings,
  opts?: { profileId?: string | null; createdBy?: string | null }
): ProjectedOrganizationRuntime {
  const registry = createProjectionRegistry()
  const profile = registry.resolveActive.resolve(organization, {
    profileId: opts?.profileId,
  })

  if (!profile) {
    throw new Error(
      `OrganizationSettings ${organization.meta.organizationId}: no hay PolicyProfile resoluble`
    )
  }

  const creditPolicy = registry.profile.projectScore(profile)
  const limitPolicy = registry.profile.projectLimit(profile)
  const createdBy =
    opts?.createdBy ??
    profile.meta.audit.updatedBy ??
    profile.meta.audit.createdBy ??
    null

  return {
    organization,
    profile,
    creditPolicy,
    limitPolicy,
    scoreRevision: freezePolicyRevision({ policy: creditPolicy, createdBy }),
    limitRevision: freezeLimitPolicyRevision({ policy: limitPolicy, createdBy }),
  }
}

/**
 * Atajo tipado: solo el perfil activo.
 */
export function resolveOrganizationActiveProfile(
  organization: OrganizationSettings,
  opts?: { profileId?: string | null }
): PolicyProfile | null {
  return resolveActiveProfile(organization, opts)
}
