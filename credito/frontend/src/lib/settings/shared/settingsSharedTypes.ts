/**
 * Tipos compartidos del módulo Ajustes (sin dependencias de engines).
 */

export const SETTINGS_MODEL_ID = "AJUSTES-SC-1.0" as const
export type SettingsModelId = typeof SETTINGS_MODEL_ID | string

export type SettingsLifecycleStatus = "draft" | "active" | "archived"

export type SettingsFindingSeverity = "info" | "warning" | "critical"

export interface SettingsAuditMeta {
  createdAt: string | null
  createdBy: string | null
  updatedAt: string | null
  updatedBy: string | null
}

export interface SettingsValidationIssue {
  code: string
  message: string
  path: string
}

export interface SettingsValidationResult {
  valid: boolean
  errors: SettingsValidationIssue[]
  warnings: SettingsValidationIssue[]
}
