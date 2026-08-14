/**
 * Contratos de proyección Ajustes → políticas de motores.
 *
 * Implementación: `@/lib/settings/projection` (createProjectionRegistry).
 * Los engines NO importan settings; settings proyecta hacia ellos.
 */

import type { CreditPolicyDocument } from "@/lib/creditPolicy/sc1/creditPolicyTypes"
import type { LimitPolicy } from "@/lib/creditLimit/policy/limitPolicyTypes"
import type { LimitSettings } from "@/lib/settings/modules/limit/limitSettingsTypes"
import type { ScoreSettings } from "@/lib/settings/modules/score/scoreSettingsTypes"
import type { PolicyProfile } from "@/lib/settings/profile/policyProfileTypes"
import type { OrganizationSettings } from "@/lib/settings/org/organizationSettingsTypes"

/**
 * Proyecta ScoreSettings → CreditPolicyDocument.
 */
export interface ScoreSettingsProjector {
  toCreditPolicyDocument(
    score: ScoreSettings,
    context: {
      organizationId: string
      profileId: string
      profileName: string
    }
  ): CreditPolicyDocument
}

/**
 * Proyecta LimitSettings → LimitPolicy.
 * Incluye factor comercial % y multiplicadores por categoría.
 */
export interface LimitSettingsProjector {
  toLimitPolicy(
    limit: LimitSettings,
    context: {
      organizationId: string
      profileId: string
      profileName: string
    }
  ): LimitPolicy
}

/**
 * Proyección completa de un PolicyProfile hacia artefactos de runtime.
 */
export interface PolicyProfileProjector {
  projectScore(profile: PolicyProfile): CreditPolicyDocument
  projectLimit(profile: PolicyProfile): LimitPolicy
}

/**
 * Resuelve qué perfil usar para un análisis.
 */
export interface ActiveProfileResolver {
  resolve(
    organization: OrganizationSettings,
    opts?: { profileId?: string | null }
  ): PolicyProfile | null
}

/**
 * Registro de proyección (DI).
 * Factory: createProjectionRegistry() / projectionRegistry.
 */
export interface SettingsProjectionRegistry {
  score: ScoreSettingsProjector
  limit: LimitSettingsProjector
  profile: PolicyProfileProjector
  resolveActive: ActiveProfileResolver
}
