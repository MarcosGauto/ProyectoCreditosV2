/**
 * Validador de Ajustes SC-1.0 — reglas estructurales de UI/MVP.
 * No ejecuta Score/Limit Engine.
 */

import type { AlertsSettings } from "@/lib/settings/modules/alerts/alertsSettingsTypes"
import type { AiSettings } from "@/lib/settings/modules/ai/aiSettingsTypes"
import type { DocumentationSettings } from "@/lib/settings/modules/documentation/documentationSettingsTypes"
import type { LimitSettings } from "@/lib/settings/modules/limit/limitSettingsTypes"
import type { ScoreSettings } from "@/lib/settings/modules/score/scoreSettingsTypes"
import type { OrganizationSettings } from "@/lib/settings/org/organizationSettingsTypes"
import type { PolicyProfile } from "@/lib/settings/profile/policyProfileTypes"
import type {
  SettingsValidationIssue,
  SettingsValidationResult,
} from "@/lib/settings/shared/settingsSharedTypes"
import type { SettingsValidator } from "@/lib/settings/validation/settingsValidatorTypes"

const WEIGHT_TOLERANCE = 0.01

function ok(): SettingsValidationResult {
  return { valid: true, errors: [], warnings: [] }
}

function result(
  errors: SettingsValidationIssue[],
  warnings: SettingsValidationIssue[] = []
): SettingsValidationResult {
  return { valid: errors.length === 0, errors, warnings }
}

function issue(
  code: string,
  message: string,
  path: string
): SettingsValidationIssue {
  return { code, message, path }
}

function sumEnabledWeights(score: ScoreSettings): {
  sum: number
  active: NonNullable<ScoreSettings["subProfiles"][0]>
} | null {
  const active =
    score.subProfiles.find((s) => s.id === score.activeSubProfileId) ??
    score.subProfiles.find((s) => s.isDefault) ??
    score.subProfiles[0]
  if (!active) return null
  const sum = active.dimensionWeights
    .filter((d) => d.enabled)
    .reduce((acc, d) => acc + (Number.isFinite(d.weight) ? d.weight : 0), 0)
  return { sum, active }
}

export function validateScoreSettings(input: ScoreSettings): SettingsValidationResult {
  const errors: SettingsValidationIssue[] = []
  const warnings: SettingsValidationIssue[] = []

  if (!input.subProfiles.length || !input.activeSubProfileId) {
    errors.push(
      issue(
        "score.subprofile_missing",
        "Debe existir al menos un sub-perfil de score activo.",
        "score.subProfiles"
      )
    )
    return result(errors, warnings)
  }

  const packed = sumEnabledWeights(input)
  if (!packed) {
    errors.push(
      issue(
        "score.subprofile_missing",
        "No se encontró el sub-perfil activo.",
        "score.activeSubProfileId"
      )
    )
    return result(errors, warnings)
  }

  const { sum, active } = packed
  if (Math.abs(sum - 100) > WEIGHT_TOLERANCE) {
    errors.push(
      issue(
        "score.weights_not_100",
        `La suma de pesos de dimensiones habilitadas debe ser 100 % (actual: ${sum.toFixed(2)} %).`,
        "score.subProfiles.dimensionWeights"
      )
    )
  }

  if (!(active.scoreMax > active.scoreMin)) {
    errors.push(
      issue(
        "score.scale_invalid",
        "La escala del score requiere scoreMax > scoreMin.",
        "score.subProfiles.scoreMax"
      )
    )
  }

  const conf = active.confidence
  if (
    !(conf.confidenceMin >= 0 && conf.confidenceMin <= 1) ||
    !(conf.highThreshold >= 0 && conf.highThreshold <= 1) ||
    !(conf.mediumThreshold >= 0 && conf.mediumThreshold <= 1)
  ) {
    errors.push(
      issue(
        "score.confidence_invalid",
        "Los umbrales de confidence deben estar entre 0 y 1.",
        "score.subProfiles.confidence"
      )
    )
  }

  if (conf.mediumThreshold > conf.highThreshold) {
    errors.push(
      issue(
        "score.confidence_invalid",
        "mediumThreshold no puede ser mayor que highThreshold.",
        "score.subProfiles.confidence"
      )
    )
  }

  const cats = [...active.categories].sort((a, b) => a.order - b.order)
  for (let i = 0; i < cats.length; i++) {
    const c = cats[i]
    if (!(c.max >= c.min)) {
      errors.push(
        issue(
          "score.category_overlap",
          `Categoría ${c.code}: max debe ser ≥ min.`,
          `score.categories.${c.id}`
        )
      )
    }
    if (!c.code.trim() || !c.label.trim()) {
      errors.push(
        issue(
          "score.category_overlap",
          "Cada banda de categoría requiere código y etiqueta.",
          `score.categories.${c.id}`
        )
      )
    }
  }

  if (!active.name.trim()) {
    errors.push(
      issue(
        "score.subprofile_missing",
        "El nombre del perfil de score no puede estar vacío.",
        "score.subProfiles.name"
      )
    )
  }

  return result(errors, warnings)
}

export function validateLimitSettings(input: LimitSettings): SettingsValidationResult {
  const errors: SettingsValidationIssue[] = []
  const warnings: SettingsValidationIssue[] = []

  if (
    !Number.isFinite(input.commercialFactorPercent) ||
    input.commercialFactorPercent < 0 ||
    input.commercialFactorPercent > 100
  ) {
    errors.push(
      issue(
        "limit.commercial_factor_invalid",
        "El factor comercial debe estar entre 0 y 100 %.",
        "limit.commercialFactorPercent"
      )
    )
  }

  if (!input.baseMetric?.metricKey?.trim() || !input.baseMetric?.label?.trim()) {
    errors.push(
      issue(
        "limit.base_metric_missing",
        "La métrica base es obligatoria.",
        "limit.baseMetric"
      )
    )
  }

  for (const row of input.categoryMultipliers) {
    if (!row.enabled) continue
    if (
      row.multiplier != null &&
      (!Number.isFinite(row.multiplier) || row.multiplier < 0)
    ) {
      errors.push(
        issue(
          "limit.multiplier_invalid",
          `Multiplicador inválido en categoría ${row.categoryCode}.`,
          `limit.categoryMultipliers.${row.id}`
        )
      )
    }
    if (!row.categoryCode.trim()) {
      errors.push(
        issue(
          "limit.multiplier_invalid",
          "Cada multiplicador requiere categoryCode.",
          `limit.categoryMultipliers.${row.id}`
        )
      )
    }
  }

  for (const r of input.restrictions) {
    if (!r.name.trim()) {
      errors.push(
        issue(
          "limit.restriction_invalid",
          "Cada restricción requiere un nombre.",
          `limit.restrictions.${r.id}`
        )
      )
    }
  }

  if (
    input.review.frequencyDays != null &&
    (!Number.isFinite(input.review.frequencyDays) ||
      input.review.frequencyDays < 0)
  ) {
    warnings.push(
      issue(
        "limit.review_invalid",
        "frequencyDays de revisión debería ser ≥ 0.",
        "limit.review.frequencyDays"
      )
    )
  }

  return result(errors, warnings)
}

export function validateAlertsSettings(
  input: AlertsSettings
): SettingsValidationResult {
  const errors: SettingsValidationIssue[] = []
  const warnings: SettingsValidationIssue[] = []
  const channelIds = new Set(input.channels.map((c) => c.id))

  for (const ch of input.channels) {
    if (!ch.label.trim()) {
      errors.push(
        issue(
          "alerts.channel_missing",
          "Cada canal requiere etiqueta.",
          `alerts.channels.${ch.id}`
        )
      )
    }
  }

  for (const ev of input.events) {
    if (!ev.name.trim()) {
      errors.push(
        issue(
          "alerts.event_invalid",
          "Cada evento requiere nombre.",
          `alerts.events.${ev.id}`
        )
      )
    }
    for (const cid of ev.channelIds) {
      if (!channelIds.has(cid)) {
        errors.push(
          issue(
            "alerts.event_channel_ref",
            `El evento «${ev.name}» referencia un canal inexistente (${cid}).`,
            `alerts.events.${ev.id}.channelIds`
          )
        )
      }
    }
  }

  return result(errors, warnings)
}

export function validateAiSettings(input: AiSettings): SettingsValidationResult {
  const errors: SettingsValidationIssue[] = []
  const warnings: SettingsValidationIssue[] = []

  for (const p of input.prompts) {
    if (p.enabled && !p.template.trim()) {
      errors.push(
        issue(
          "ai.prompt_empty",
          `El prompt «${p.name || p.code}» está habilitado pero vacío.`,
          `ai.prompts.${p.id}`
        )
      )
    }
  }

  return result(errors, warnings)
}

export function validateDocumentationSettings(
  input: DocumentationSettings
): SettingsValidationResult {
  const errors: SettingsValidationIssue[] = []
  const warnings: SettingsValidationIssue[] = []
  const codes = new Set<string>()

  for (const req of input.minimumRequirements) {
    if (!req.label.trim() || !req.code.trim()) {
      errors.push(
        issue(
          "documentation.requirement_invalid",
          "Cada requisito mínimo necesita código y etiqueta.",
          `documentation.minimumRequirements.${req.id}`
        )
      )
    }
    if (codes.has(req.code)) {
      errors.push(
        issue(
          "documentation.requirement_duplicate",
          `Código de documento duplicado: ${req.code}.`,
          `documentation.minimumRequirements.${req.id}`
        )
      )
    }
    codes.add(req.code)
  }

  for (const group of input.byCompanyType) {
    if (!group.label.trim()) {
      errors.push(
        issue(
          "documentation.requirement_invalid",
          "Cada tipo de cliente requiere etiqueta.",
          `documentation.byCompanyType.${group.id}`
        )
      )
    }
  }

  return result(errors, warnings)
}

function mergeResults(
  ...parts: SettingsValidationResult[]
): SettingsValidationResult {
  const errors = parts.flatMap((p) => p.errors)
  const warnings = parts.flatMap((p) => p.warnings)
  return result(errors, warnings)
}

export function validatePolicyProfile(
  profile: PolicyProfile
): SettingsValidationResult {
  const errors: SettingsValidationIssue[] = []
  if (!profile.meta.name.trim()) {
    errors.push(
      issue(
        "profile.name_empty",
        "El nombre del perfil no puede estar vacío.",
        "profile.meta.name"
      )
    )
  }

  return mergeResults(
    result(errors),
    validateScoreSettings(profile.score),
    validateLimitSettings(profile.limit),
    validateAlertsSettings(profile.alerts),
    validateDocumentationSettings(profile.documentation),
    profile.ai ? validateAiSettings(profile.ai) : ok()
  )
}

export function validateOrganizationSettings(
  doc: OrganizationSettings
): SettingsValidationResult {
  const errors: SettingsValidationIssue[] = []
  const defaults = doc.profiles.filter((p) => p.meta.isDefault)

  if (defaults.length === 0) {
    errors.push(
      issue(
        "org.profile_default_missing",
        "Debe existir exactamente un perfil por defecto.",
        "organization.profiles"
      )
    )
  } else if (defaults.length > 1) {
    errors.push(
      issue(
        "org.profile_default_multiple",
        "Solo puede haber un perfil marcado como default.",
        "organization.profiles"
      )
    )
  }

  if (
    doc.activeProfileId &&
    !doc.profiles.some((p) => p.meta.id === doc.activeProfileId)
  ) {
    errors.push(
      issue(
        "org.active_profile_missing",
        "activeProfileId no coincide con ningún perfil.",
        "organization.activeProfileId"
      )
    )
  }

  const ids = new Set<string>()
  for (const p of doc.profiles) {
    if (ids.has(p.meta.id)) {
      errors.push(
        issue(
          "profile.id_duplicate",
          `Id de perfil duplicado: ${p.meta.id}.`,
          "organization.profiles"
        )
      )
    }
    ids.add(p.meta.id)
  }

  const profileResults = doc.profiles.map(validatePolicyProfile)
  return mergeResults(result(errors), validateAiSettings(doc.ai), ...profileResults)
}

/**
 * Factory del validador de Ajustes.
 */
export function createSettingsValidator(): SettingsValidator {
  return {
    validateOrganization: validateOrganizationSettings,
    validateProfile: validatePolicyProfile,
    score: { validate: validateScoreSettings },
    limit: { validate: validateLimitSettings },
    alerts: { validate: validateAlertsSettings },
    ai: { validate: validateAiSettings },
    documentation: { validate: validateDocumentationSettings },
  }
}
