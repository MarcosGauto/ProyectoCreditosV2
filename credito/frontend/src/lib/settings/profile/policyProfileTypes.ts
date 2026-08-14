/**
 * PolicyProfile — perfil de política dentro de una organización.
 *
 * Ejemplos de producto: Default, Mayoristas, Retail, Distribuidores, Gobierno, Custom.
 * Cada perfil agrupa Score + Límite + Alertas + Documentación (+ IA opcional).
 */

import type { AlertsSettings } from "@/lib/settings/modules/alerts/alertsSettingsTypes"
import type { AiSettings } from "@/lib/settings/modules/ai/aiSettingsTypes"
import type { DocumentationSettings } from "@/lib/settings/modules/documentation/documentationSettingsTypes"
import type { LimitSettings } from "@/lib/settings/modules/limit/limitSettingsTypes"
import type { ScoreSettings } from "@/lib/settings/modules/score/scoreSettingsTypes"
import type {
  SettingsAuditMeta,
  SettingsLifecycleStatus,
} from "@/lib/settings/shared/settingsSharedTypes"

/**
 * Códigos de perfil de producto (extensibles).
 */
export type PolicyProfileCode =
  | "default"
  | "mayoristas"
  | "retail"
  | "distribuidores"
  | "gobierno"
  | "custom"
  | (string & {})

export interface PolicyProfileMeta {
  id: string
  organizationId: string
  code: PolicyProfileCode
  name: string
  description: string | null
  version: number
  status: SettingsLifecycleStatus
  /** Perfil por defecto de la organización. */
  isDefault: boolean
  /** Orden en UI de Ajustes. */
  order: number
  tags: string[]
  audit: SettingsAuditMeta
}

/**
 * Perfil completo editable desde Ajustes.
 */
export interface PolicyProfile {
  schemaVersion: number
  meta: PolicyProfileMeta
  score: ScoreSettings
  limit: LimitSettings
  alerts: AlertsSettings
  documentation: DocumentationSettings
  /**
   * IA a nivel perfil (override).
   * Si null, se usa OrganizationSettings.ai.
   */
  ai: AiSettings | null
  extensions: Record<string, unknown>
}

/**
 * Catálogo de perfiles sugeridos (solo contrato / seeds tipados).
 */
export interface PolicyProfileCatalogEntry {
  code: PolicyProfileCode
  name: string
  description: string
  systemSuggested: boolean
}
