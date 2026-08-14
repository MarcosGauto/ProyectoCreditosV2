/**
 * LimitOverride SC-1.0 — override manual del límite sugerido.
 *
 * Solo contrato de algoritmo. Sin UI ni persistencia.
 * `at` lo inyecta el servicio de análisis (el motor no genera fechas).
 */

export interface LimitOverride {
  /** Monto manual a aplicar. null = no cambia monto (solo metadata). */
  amount: number | null
  /** Código de motivo (no texto UI). */
  reasonCode: string
  /** Usuario que aplica el override. */
  userId: string | null
  /** ISO 8601 inyectada externamente. */
  at: string | null
  /** Comentario libre opcional (auditoría; no copy de producto). */
  comment: string | null
  /**
   * Si true y amount != null, reemplaza el límite calculado.
   * Si false, el override se registra en traza pero no altera el monto.
   */
  apply: boolean
}

