/**
 * OrganizationSettings — contenedor SaaS multi-tenant de Ajustes.
 */

import type { AiSettings } from "@/lib/settings/modules/ai/aiSettingsTypes"
import type { PolicyProfile } from "@/lib/settings/profile/policyProfileTypes"
import type {
  SettingsAuditMeta,
  SettingsLifecycleStatus,
  SettingsModelId,
} from "@/lib/settings/shared/settingsSharedTypes"

export interface OrganizationSettingsMeta {
  id: string
  organizationId: string
  name: string
  description: string | null
  model: SettingsModelId
  version: number
  status: SettingsLifecycleStatus
  /** Locale / moneda preferida de la org en Ajustes. */
  locale: string
  currency: string
  audit: SettingsAuditMeta
}

/**
 * Documento raíz de Ajustes por organización.
 */
export interface OrganizationSettings {
  schemaVersion: number
  meta: OrganizationSettingsMeta
  /**
   * Perfiles de política (Default, Retail, …).
   * Exactamente uno debería tener isDefault=true (regla de validación).
   */
  profiles: PolicyProfile[]
  /** Id del perfil activo para análisis nuevos (puede = default). */
  activeProfileId: string | null
  /** IA a nivel organización (fallback). */
  ai: AiSettings
  /**
   * Flags de producto (módulos visibles en Ajustes).
   */
  modulesEnabled: {
    score: boolean
    limit: boolean
    alerts: boolean
    ai: boolean
    documentation: boolean
    profiles: boolean
  }
  extensions: Record<string, unknown>
}
