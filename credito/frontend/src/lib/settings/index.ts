/**
 * Ajustes SC-1.0 — configuración global SaaS.
 *
 *   OrganizationSettings → PolicyProfile[] → Score | Limit | Alerts | Docs | AI
 *                              │
 *                              ▼ ProjectionRegistry
 *                     CreditPolicyDocument / LimitPolicy
 *                              │
 *                              ▼ freeze (revisiones)
 *                     Score Engine / Limit Engine (consumidores futuros)
 *
 * Persistencia: repositories/ + services/
 * Proyección: projection/
 */

export * from "./shared/settingsSharedTypes"
export * from "./modules/score/scoreSettingsTypes"
export * from "./modules/limit/limitSettingsTypes"
export * from "./modules/alerts/alertsSettingsTypes"
export * from "./modules/ai/aiSettingsTypes"
export * from "./modules/documentation/documentationSettingsTypes"
export * from "./profile/policyProfileTypes"
export * from "./org/organizationSettingsTypes"
export * from "./revision/settingsRevisionTypes"
export * from "./contracts/settingsDocument"
export * from "./contracts/projectionContracts"
export * from "./validation/settingsValidatorTypes"

export { createSettingsValidator } from "./validation/createSettingsValidator"

export {
  POLICY_PROFILE_CATALOG,
  createEmptyScoreSettings,
  createEmptyLimitSettings,
  createEmptyAlertsSettings,
  createEmptyAiSettings,
  createEmptyDocumentationSettings,
  createEmptyPolicyProfile,
  createEmptyOrganizationSettings,
} from "./seeds/createEmptySettings"

export {
  createProductOrganizationSettings,
  createProductScoreSettings,
  createProductLimitSettings,
  createProductAlertsSettings,
  createProductDocumentationSettings,
  createProductAiSettings,
} from "./seeds/createProductOrganizationSettings"

export {
  validateScoreSettings,
  validateLimitSettings,
  validateAlertsSettings,
  validateAiSettings,
  validateDocumentationSettings,
  validatePolicyProfile,
  validateOrganizationSettings,
} from "./validation/createSettingsValidator"

export {
  ORGANIZATION_SETTINGS_COLLECTION,
  DEFAULT_ORGANIZATION_ID,
  getOrganizationSettings,
  createOrganizationSettings,
  updateOrganizationSettings,
  saveOrganizationSettings,
  organizationSettingsRef,
} from "./repositories/organizationSettingsRepository"

export {
  loadOrCreateOrganizationSettings,
  saveOrganizationSettingsDocument,
  buildResetOrganizationSettings,
  buildRestoredOrganizationSettings,
  cloneOrganizationSettings,
  areOrganizationSettingsEqual,
} from "./services/organizationSettingsService"

export {
  createProjectionRegistry,
  projectionRegistry,
  resolveActiveProfile,
  projectScoreSettingsToCreditPolicyDocument,
  projectAndFreezeScorePolicy,
  projectLimitSettingsToLimitPolicy,
  projectAndFreezeLimitPolicy,
  projectPolicyProfileScore,
  projectPolicyProfileLimit,
  projectPolicyProfileRevisions,
} from "./projection"

export {
  loadAndProjectOrganizationSettings,
  projectOrganizationSettings,
  resolveOrganizationActiveProfile,
} from "./services/projectOrganizationSettings"

export type { ProjectedOrganizationRuntime } from "./services/projectOrganizationSettings"
