/**
 * CommercialContext SC-1.0 — información comercial independiente.
 *
 * No depende del modelo de análisis ni del Score Engine.
 * Solo datos comerciales (sin balances / BCRA / IVA / documentación).
 */

export interface CommercialContext {
  /** Ventas promedio mensual. */
  monthlyAverageSales: number | null
  /** Límite solicitado (si existe). */
  requestedLimit: number | null
  /** Exposición actual (si existe). */
  currentExposure: number | null
  /** Moneda ISO 4217 del contexto comercial. */
  currency: string
  /** Segmento de cliente (opcional). */
  customerSegment?: string | null
  /** Códigos de garantías comerciales ya conocidas (opcional). */
  guarantees?: string[] | null
}
