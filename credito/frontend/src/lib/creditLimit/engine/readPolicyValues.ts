/**
 * Lectura de valores de LimitPolicy sin hardcodes de negocio.
 * Usa solo campos existentes (extensions / baseLimit / params).
 */

import type {
  LimitCategoryPolicy,
  LimitPolicy,
} from "@/lib/creditLimit/policy/limitPolicyTypes"
import { asFiniteNumber } from "@/lib/creditLimit/engine/getMetric"

/**
 * Factor comercial (%) desde LimitPolicy.extensions.commercialFactorPercent.
 * null si no está configurado (el motor no inventa un default).
 */
export function readCommercialFactorPercent(
  policy: LimitPolicy
): number | null {
  return asFiniteNumber(policy.extensions?.commercialFactorPercent)
}

/**
 * Multiplicador de categoría (%):
 * 1) params.categoryMultiplierPercent
 * 2) baseLimit.percent (kind percent_of_metric u otros)
 * 3) null
 */
export function readCategoryMultiplierPercent(
  band: LimitCategoryPolicy
): number | null {
  const fromParams = asFiniteNumber(band.params?.categoryMultiplierPercent)
  if (fromParams != null) return fromParams
  if (band.baseLimit.percent != null && Number.isFinite(band.baseLimit.percent)) {
    return band.baseLimit.percent
  }
  return null
}
