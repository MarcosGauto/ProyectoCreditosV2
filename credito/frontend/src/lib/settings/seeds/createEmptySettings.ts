/**
 * Seeds tipados de Ajustes (contratos / defaults de producto).
 * No son algoritmos ni persistencia: solo factories de forma vacía/semilla.
 */

import type { AlertsSettings } from "@/lib/settings/modules/alerts/alertsSettingsTypes"
import type { AiSettings } from "@/lib/settings/modules/ai/aiSettingsTypes"
import type { DocumentationSettings } from "@/lib/settings/modules/documentation/documentationSettingsTypes"
import type { LimitSettings } from "@/lib/settings/modules/limit/limitSettingsTypes"
import type { ScoreSettings } from "@/lib/settings/modules/score/scoreSettingsTypes"
import type { OrganizationSettings } from "@/lib/settings/org/organizationSettingsTypes"
import type {
  PolicyProfile,
  PolicyProfileCatalogEntry,
} from "@/lib/settings/profile/policyProfileTypes"
import { SETTINGS_MODEL_ID } from "@/lib/settings/shared/settingsSharedTypes"

export const POLICY_PROFILE_CATALOG: PolicyProfileCatalogEntry[] = [
  {
    code: "default",
    name: "Default",
    description: "Perfil estándar de la organización.",
    systemSuggested: true,
  },
  {
    code: "mayoristas",
    name: "Mayoristas",
    description: "Política orientada a clientes mayoristas.",
    systemSuggested: true,
  },
  {
    code: "retail",
    name: "Retail",
    description: "Política orientada a retail.",
    systemSuggested: true,
  },
  {
    code: "distribuidores",
    name: "Distribuidores",
    description: "Política orientada a distribuidores.",
    systemSuggested: true,
  },
  {
    code: "gobierno",
    name: "Gobierno",
    description: "Política orientada a sector público / gobierno.",
    systemSuggested: true,
  },
  {
    code: "custom",
    name: "Personalizado",
    description: "Perfil creado por la organización.",
    systemSuggested: false,
  },
]

export function createEmptyScoreSettings(): ScoreSettings {
  return {
    schemaVersion: 1,
    enabled: true,
    subProfiles: [],
    activeSubProfileId: null,
    defaultFindingSeverity: "info",
    extensions: {},
  }
}

export function createEmptyLimitSettings(): LimitSettings {
  return {
    schemaVersion: 1,
    enabled: true,
    currency: "ARS",
    baseMetric: {
      kind: "sales_monthly_average",
      metricKey: "sales.monthlyAverage",
      label: "Ventas Promedio Mensual",
    },
    /** Default de producto documentado: 20 %. Editable en Ajustes. */
    commercialFactorPercent: 20,
    globalCommercialCeiling: null,
    categoryMultipliers: [],
    restrictions: [],
    guarantees: [],
    review: {
      frequencyDays: 90,
      frequencyLabel: "Trimestral",
      mandatory: false,
      byCategory: [],
    },
    requireScoreOk: true,
    extensions: {},
  }
}

export function createEmptyAlertsSettings(): AlertsSettings {
  return {
    schemaVersion: 1,
    enabled: true,
    channels: [],
    events: [],
    extensions: {},
  }
}

export function createEmptyAiSettings(): AiSettings {
  return {
    schemaVersion: 1,
    enabled: false,
    explanationLevel: "standard",
    recommendationsEnabled: false,
    recommendationToggles: [],
    prompts: [],
    modelRef: null,
    extensions: {},
  }
}

export function createEmptyDocumentationSettings(): DocumentationSettings {
  return {
    schemaVersion: 1,
    enabled: true,
    minimumRequirements: [],
    byCompanyType: [],
    extensions: {},
  }
}

export function createEmptyPolicyProfile(input: {
  organizationId: string
  id: string
  code: PolicyProfile["meta"]["code"]
  name: string
  isDefault?: boolean
}): PolicyProfile {
  return {
    schemaVersion: 1,
    meta: {
      id: input.id,
      organizationId: input.organizationId,
      code: input.code,
      name: input.name,
      description: null,
      version: 1,
      status: "draft",
      isDefault: input.isDefault ?? false,
      order: 0,
      tags: [],
      audit: {
        createdAt: null,
        createdBy: null,
        updatedAt: null,
        updatedBy: null,
      },
    },
    score: createEmptyScoreSettings(),
    limit: createEmptyLimitSettings(),
    alerts: createEmptyAlertsSettings(),
    documentation: createEmptyDocumentationSettings(),
    ai: null,
    extensions: {},
  }
}

export function createEmptyOrganizationSettings(input: {
  organizationId: string
  id?: string
  name?: string
}): OrganizationSettings {
  const orgId = input.organizationId
  const defaultProfile = createEmptyPolicyProfile({
    organizationId: orgId,
    id: `profile_${orgId}_default`,
    code: "default",
    name: "Default",
    isDefault: true,
  })

  return {
    schemaVersion: 1,
    meta: {
      id: input.id ?? `settings_${orgId}`,
      organizationId: orgId,
      name: input.name ?? "Ajustes",
      description: "Configuración global de política crediticia (SaaS).",
      model: SETTINGS_MODEL_ID,
      version: 1,
      status: "draft",
      locale: "es-AR",
      currency: "ARS",
      audit: {
        createdAt: null,
        createdBy: null,
        updatedAt: null,
        updatedBy: null,
      },
    },
    profiles: [defaultProfile],
    activeProfileId: defaultProfile.meta.id,
    ai: createEmptyAiSettings(),
    modulesEnabled: {
      score: true,
      limit: true,
      alerts: true,
      ai: true,
      documentation: true,
      profiles: true,
    },
    extensions: {},
  }
}
