/**
 * Projection — Ajustes SC-1.0 → CreditPolicyDocument / LimitPolicy
 */

export { resolveActiveProfile, activeProfileResolver } from "./resolveActiveProfile"

export {
  resolveActiveScoreSubProfile,
  projectScoreSettingsToCreditPolicyDocument,
  projectAndFreezeScorePolicy,
  scoreSettingsProjector,
} from "./projectScoreSettings"

export {
  projectLimitSettingsToLimitPolicy,
  projectAndFreezeLimitPolicy,
  limitSettingsProjector,
} from "./projectLimitSettings"

export {
  projectPolicyProfileScore,
  projectPolicyProfileLimit,
  projectPolicyProfileRevisions,
  policyProfileProjector,
} from "./projectPolicyProfile"

export {
  createProjectionRegistry,
  projectionRegistry,
} from "./createProjectionRegistry"
