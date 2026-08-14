/**
 * CommercialContext desde el análisis legacy (solo datos comerciales).
 */

import type { CommercialContext } from "@/lib/creditLimit/commercial/commercialContext"

export interface BuildCommercialContextInput {
  /** Resultado async de calculateExcelPrequalification / computed.preCalificacion */
  preCalificacion?: {
    promedioVentas?: number | null
    preCalificacion?: number | null
    [key: string]: unknown
  } | null
  /** Monto solicitado / otorgado por el analista (si existe). */
  requestedLimit?: number | null
  /** Exposición actual (cartera / crédito vigente). Opcional en Fase A. */
  currentExposure?: number | null
  currency?: string | null
  customerSegment?: string | null
  guarantees?: string[] | null
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * monthlyAverageSales = promedioVentas (NO preCalificacion, que ya aplica coeficientes).
 */
export function buildCommercialContext(
  input: BuildCommercialContextInput
): CommercialContext {
  const pre = input.preCalificacion ?? {}
  const monthlyAverageSales =
    asFiniteNumber(pre.promedioVentas) ??
    asFiniteNumber(pre.promedioIndicadores) ??
    null

  return {
    monthlyAverageSales,
    requestedLimit: asFiniteNumber(input.requestedLimit),
    currentExposure: asFiniteNumber(input.currentExposure),
    currency: (input.currency?.trim() || "ARS").toUpperCase(),
    customerSegment: input.customerSegment ?? null,
    guarantees: input.guarantees ?? null,
  }
}
