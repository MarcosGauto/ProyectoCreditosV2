/**
 * ScoreSettings — módulo Ajustes › Score Propio.
 *
 * Editable desde Ajustes. Proyectable a CreditPolicyDocument (futuro).
 * No ejecuta el Score Engine.
 */

import type { SettingsFindingSeverity } from "@/lib/settings/shared/settingsSharedTypes"

export type ScoreDimensionDomain = "financial" | "commercial" | "cross"

/**
 * Peso y metadatos de una dimensión editables en Ajustes.
 */
export interface ScoreDimensionWeightSettings {
  dimensionId: string
  label: string
  enabled: boolean
  /** Peso %; suma de enabled debe = 100 (validación). */
  weight: number
  domain: ScoreDimensionDomain
  description: string | null
  /** Orden de UI en Ajustes. */
  order: number
}

/**
 * Banda de categoría del Score Final (AAA…B u otros códigos).
 */
export interface ScoreCategoryBandSettings {
  id: string
  code: string
  label: string
  min: number
  max: number
  minInclusive: boolean
  maxInclusive: boolean
  order: number
  description: string | null
  colorToken: string | null
}

/**
 * Configuración de confidence del Score.
 */
export interface ScoreConfidenceSettings {
  /** Mínimo 0–1 para automatismos. */
  confidenceMin: number
  /** Umbral high (0–1). */
  highThreshold: number
  /** Umbral medium (0–1). */
  mediumThreshold: number
  labelHigh: string
  labelMedium: string
  labelLow: string
}

/**
 * Perfil de Score (sub-configuración nombrada dentro del Score Propio).
 * Ej.: "Conservador", "Estándar", "Agresivo" — distinto de PolicyProfile de org.
 */
export interface ScoreSubProfileSettings {
  id: string
  code: string
  name: string
  description: string | null
  enabled: boolean
  /** Si true, es el sub-perfil activo dentro de este PolicyProfile. */
  isDefault: boolean
  dimensionWeights: ScoreDimensionWeightSettings[]
  categories: ScoreCategoryBandSettings[]
  confidence: ScoreConfidenceSettings
  scoreMin: number
  scoreMax: number
}

/**
 * Bloque Score Propio dentro de un PolicyProfile.
 */
export interface ScoreSettings {
  schemaVersion: number
  enabled: boolean
  /** Sub-perfiles de score (pesos/bandas/confidence). */
  subProfiles: ScoreSubProfileSettings[]
  /** Id del sub-perfil vigente. */
  activeSubProfileId: string | null
  /**
   * Severidad por defecto de findings cuando no hay regla.
   * Configurable; el motor no hardcodea.
   */
  defaultFindingSeverity: SettingsFindingSeverity
  extensions: Record<string, unknown>
}
