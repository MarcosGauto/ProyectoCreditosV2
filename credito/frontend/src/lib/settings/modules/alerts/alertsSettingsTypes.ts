/**
 * AlertsSettings — módulo Ajustes › Alertas.
 */

import type { SettingsFindingSeverity } from "@/lib/settings/shared/settingsSharedTypes"

export type AlertChannelKind =
  | "in_app"
  | "email"
  | "webhook"
  | "slack"
  | "custom"

export type AlertEventCode =
  | "score_below_threshold"
  | "score_category_change"
  | "limit_denied"
  | "limit_reduced"
  | "confidence_low"
  | "coverage_missing"
  | "documentation_incomplete"
  | "manual_review_required"
  | "policy_published"
  | (string & {})

export interface AlertChannelSettings {
  id: string
  kind: AlertChannelKind
  enabled: boolean
  label: string
  /** Destino / config (email, url, etc.) — sin secretos en claro en UI futura. */
  config: Record<string, unknown>
}

export interface AlertEventSettings {
  id: string
  eventCode: AlertEventCode
  enabled: boolean
  name: string
  description: string | null
  severity: SettingsFindingSeverity
  /** Canales habilitados para este evento (ids). */
  channelIds: string[]
  /** Umbrales opcionales (ej. score < X). */
  thresholds: Record<string, unknown>
  priority: number
}

/**
 * Bloque Alertas dentro de un PolicyProfile (o org).
 */
export interface AlertsSettings {
  schemaVersion: number
  enabled: boolean
  channels: AlertChannelSettings[]
  events: AlertEventSettings[]
  extensions: Record<string, unknown>
}

