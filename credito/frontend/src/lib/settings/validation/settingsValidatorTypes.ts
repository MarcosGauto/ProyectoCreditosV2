/**
 * Contratos de validación de Ajustes.
 * Sin reglas de negocio hardcodeadas de score/límite.
 */

import type { OrganizationSettings } from "@/lib/settings/org/organizationSettingsTypes"
import type { PolicyProfile } from "@/lib/settings/profile/policyProfileTypes"
import type { ScoreSettings } from "@/lib/settings/modules/score/scoreSettingsTypes"
import type { LimitSettings } from "@/lib/settings/modules/limit/limitSettingsTypes"
import type { AlertsSettings } from "@/lib/settings/modules/alerts/alertsSettingsTypes"
import type { AiSettings } from "@/lib/settings/modules/ai/aiSettingsTypes"
import type { DocumentationSettings } from "@/lib/settings/modules/documentation/documentationSettingsTypes"
import type { SettingsValidationResult } from "@/lib/settings/shared/settingsSharedTypes"

export interface ModuleSettingsValidator<T> {
  validate(input: T): SettingsValidationResult
}

export interface SettingsValidator {
  validateOrganization(doc: OrganizationSettings): SettingsValidationResult
  validateProfile(profile: PolicyProfile): SettingsValidationResult
  score: ModuleSettingsValidator<ScoreSettings>
  limit: ModuleSettingsValidator<LimitSettings>
  alerts: ModuleSettingsValidator<AlertsSettings>
  ai: ModuleSettingsValidator<AiSettings>
  documentation: ModuleSettingsValidator<DocumentationSettings>
}

/**
 * Códigos de error de validación (contrato estable para UI futura).
 */
export type SettingsValidationCode =
  | "org.profile_default_missing"
  | "org.profile_default_multiple"
  | "org.active_profile_missing"
  | "profile.id_duplicate"
  | "score.weights_not_100"
  | "score.subprofile_missing"
  | "score.category_overlap"
  | "limit.commercial_factor_invalid"
  | "limit.multiplier_invalid"
  | "limit.base_metric_missing"
  | "alerts.channel_missing"
  | "alerts.event_channel_ref"
  | "ai.prompt_empty"
  | "documentation.requirement_duplicate"
  | "settings.not_implemented"
