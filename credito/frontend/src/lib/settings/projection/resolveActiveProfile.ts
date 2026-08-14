/**
 * Resuelve el PolicyProfile activo de OrganizationSettings.
 */

import type { OrganizationSettings } from "@/lib/settings/org/organizationSettingsTypes"
import type { PolicyProfile } from "@/lib/settings/profile/policyProfileTypes"
import type { ActiveProfileResolver } from "@/lib/settings/contracts/projectionContracts"

/**
 * Prioridad:
 * 1. opts.profileId (si existe en profiles)
 * 2. organization.activeProfileId
 * 3. perfil isDefault
 * 4. primer perfil
 */
export function resolveActiveProfile(
  organization: OrganizationSettings,
  opts?: { profileId?: string | null }
): PolicyProfile | null {
  const profiles = organization.profiles ?? []
  if (!profiles.length) return null

  const requested = opts?.profileId?.trim() || null
  if (requested) {
    const hit = profiles.find((p) => p.meta.id === requested)
    if (hit) return hit
  }

  if (organization.activeProfileId) {
    const active = profiles.find((p) => p.meta.id === organization.activeProfileId)
    if (active) return active
  }

  const def = profiles.find((p) => p.meta.isDefault)
  if (def) return def

  return profiles[0] ?? null
}

export const activeProfileResolver: ActiveProfileResolver = {
  resolve: resolveActiveProfile,
}
