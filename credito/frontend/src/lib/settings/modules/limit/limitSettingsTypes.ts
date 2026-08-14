/**
 * LimitSettings — módulo Ajustes › Motor de Límite.
 *
 * Editable desde Ajustes. Proyectable a LimitPolicy (futuro).
 * No ejecuta el Limit Engine.
 */

import type { SettingsFindingSeverity } from "@/lib/settings/shared/settingsSharedTypes"

export type LimitBaseMetricKind =
  | "sales_monthly_average"
  | "sales_annual"
  | "custom_metric"

/**
 * Multiplicador / factor por categoría de score.
 * Ej.: AAA → 8 (meses), o factor 1.2 sobre base.
 */
export interface LimitCategoryMultiplierSettings {
  id: string
  categoryCode: string
  label: string | null
  enabled: boolean
  /**
   * Multiplicador sobre la métrica base
   * (ej. 8 = 8 × ventas promedio mensual).
   */
  multiplier: number | null
  /** Límite máximo absoluto de la categoría (opcional). */
  maxLimit: number | null
  /** Techo comercial de categoría (opcional). */
  commercialCeiling: number | null
  /** Plazo sugerido (meses). */
  termMonths: number | null
  maxTermMonths: number | null
  /** Si true, no sugerir límite. */
  deny: boolean
  order: number
}

export interface LimitGuaranteeSettings {
  code: string
  label: string
  required: boolean
  severity: SettingsFindingSeverity
  description: string | null
  /** Categorías donde aplica; null = todas. */
  categoryCodes: string[] | null
}

export interface LimitReviewSettings {
  frequencyDays: number | null
  frequencyLabel: string | null
  mandatory: boolean
  /** Override por categoría (opcional). */
  byCategory: Array<{
    categoryCode: string
    frequencyDays: number | null
    frequencyLabel: string | null
    mandatory: boolean
  }>
}

/**
 * Restricción editable (confidence / cobertura / custom).
 * Se proyectará a LimitRule en el futuro.
 */
export interface LimitRestrictionSettings {
  id: string
  enabled: boolean
  name: string
  description: string | null
  /**
   * stage lógico: confidence | coverage | commercial_ceiling | guarantees | custom
   */
  stage: string
  priority: number
  /** Trigger tipado de forma abierta para no acoplar al engine. */
  trigger: {
    kind: string
    categoryCodes: string[] | null
    confidenceLevel: "high" | "medium" | "low" | null
    confidenceThreshold: number | null
    field: string | null
    operator: string | null
    value: unknown
    valueTo: unknown
  }
  effect: {
    action: string
    reducePercent: number | null
    reduceFactor: number | null
    capAmount: number | null
    ceilingAmount: number | null
    guaranteeCodes: string[]
    decisionCode: string | null
    message: string | null
  }
}

/**
 * Bloque Motor de Límite dentro de un PolicyProfile.
 */
export interface LimitSettings {
  schemaVersion: number
  enabled: boolean
  currency: string

  /** Métrica base (ej. Ventas Promedio Mensual). */
  baseMetric: {
    kind: LimitBaseMetricKind
    /** Path de métrica (ej. "sales.monthlyAverage"). */
    metricKey: string
    label: string
  }

  /**
   * Factor Comercial (%) configurable.
   * Default de producto: 20. No hardcodeado en el engine.
   */
  commercialFactorPercent: number

  /** Techo comercial global (opcional). */
  globalCommercialCeiling: number | null

  /** Multiplicadores por categoría. */
  categoryMultipliers: LimitCategoryMultiplierSettings[]

  /** Restricciones configurables → Limit Rules. */
  restrictions: LimitRestrictionSettings[]

  /** Catálogo de garantías + asignación. */
  guarantees: LimitGuaranteeSettings[]

  /** Frecuencia de revisión. */
  review: LimitReviewSettings

  requireScoreOk: boolean
  extensions: Record<string, unknown>
}
