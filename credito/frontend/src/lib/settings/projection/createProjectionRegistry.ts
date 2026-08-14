/**
 * ProjectionRegistry — DI de proyectores Ajustes → políticas de motores.
 *
 * Los engines NO importan settings.
 * Los consumidores leen OrganizationSettings y proyectan vía este registry.
 */

import type { SettingsProjectionRegistry } from "@/lib/settings/contracts/projectionContracts"
import { limitSettingsProjector } from "@/lib/settings/projection/projectLimitSettings"
import { policyProfileProjector } from "@/lib/settings/projection/projectPolicyProfile"
import { scoreSettingsProjector } from "@/lib/settings/projection/projectScoreSettings"
import { activeProfileResolver } from "@/lib/settings/projection/resolveActiveProfile"

/**
 * Factory del registro de proyección.
 */
export function createProjectionRegistry(): SettingsProjectionRegistry {
  return {
    score: scoreSettingsProjector,
    limit: limitSettingsProjector,
    profile: policyProfileProjector,
    resolveActive: activeProfileResolver,
  }
}

/** Instancia default (stateless). */
export const projectionRegistry = createProjectionRegistry()
