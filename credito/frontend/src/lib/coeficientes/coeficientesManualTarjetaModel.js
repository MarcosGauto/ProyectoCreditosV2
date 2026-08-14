/**
 * Utilidades para tarjetas con carga manual (planes definidos en configuración).
 */

import {
  isCuotaComercialSintetica,
  normalizeCuotaComercialKey,
} from "@/lib/coeficientes/coeficientesComercialCuotasModel"

/**
 * Clave interna del borrador para tarjetas con un solo coeficiente manual (ej. Mercado Pago).
 */
export const MANUAL_COEF_UNIFICADO_KEY = "__unificado__"

/**
 * Débito y 1 cuota usan arancel global; no se cargan en paneles manuales.
 * @param {import("./coeficientesTarjetasModel").ManualPlanDefinition} plan
 */
export function isManualPlanArancelGlobal(plan) {
  return isCuotaComercialSintetica(normalizeCuotaComercialKey(plan.cuotas))
}

/**
 * Planes que el operador debe completar en carga manual.
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta} tarjeta
 */
export function getManualPlanesEditables(tarjeta) {
  return (tarjeta.manualPlanes ?? []).filter(
    (plan) => !isManualPlanArancelGlobal(plan)
  )
}

/**
 * Tarjetas cuyo coeficiente manual es único para todos los planes (Coef. Final directo).
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta} tarjeta
 */
export function isManualCoeficienteUnico(tarjeta) {
  return Boolean(tarjeta?.coefFinalDirecto)
}

/**
 * @param {unknown} cuotas
 */
export function normalizeManualCuotas(cuotas) {
  const raw = String(cuotas ?? "").trim()
  const upper = raw.toUpperCase()
  if (upper === "PLAN Z" || upper === "PLANZ") return "Plan Z"
  if (upper === "1 CUOTA" || raw === "1") return "1 Cuota"
  const n = Number(raw.replace(",", "."))
  if (Number.isFinite(n) && n > 0) return n
  return raw
}

/**
 * @param {unknown} value
 */
export function parseManualCoeficienteBase(value) {
  const n = Number(String(value ?? "").replace(",", ".").trim())
  if (!Number.isFinite(n) || n <= 0) {
    return null
  }
  if (n >= 10 && n <= 100) {
    throw new Error(
      "El valor parece un porcentaje. Ingrese el coeficiente base multiplicador (ej. 10,59% → 1,1059)."
    )
  }
  if (n < 1) {
    throw new Error(
      "El coeficiente base debe ser ≥ 1 (multiplicador, ej. 1,1059 para 10,59% Coef.)."
    )
  }
  return n
}

/**
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta} tarjeta
 * @param {Array<{ cuotas: string | number; coeficienteBase?: number }>} [records]
 */
export function buildManualDraftFromRecords(tarjeta, records = []) {
  if (isManualCoeficienteUnico(tarjeta)) {
    for (const plan of getManualPlanesEditables(tarjeta)) {
      const key = String(plan.cuotas)
      const match = records.find(
        (r) => String(normalizeManualCuotas(r.cuotas)) === key
      )
      const base = match?.coeficienteBase
      if (base != null && Number.isFinite(Number(base)) && Number(base) > 0) {
        return { [MANUAL_COEF_UNIFICADO_KEY]: String(base) }
      }
    }
    return { [MANUAL_COEF_UNIFICADO_KEY]: "" }
  }

  /** @type {Record<string, string>} */
  const byPlan = {}

  for (const plan of getManualPlanesEditables(tarjeta)) {
    const key = String(plan.cuotas)
    const match = records.find(
      (r) => String(normalizeManualCuotas(r.cuotas)) === key
    )
    const base = match?.coeficienteBase
    byPlan[key] =
      base != null && Number.isFinite(Number(base)) && Number(base) > 0
        ? String(base)
        : ""
  }

  return byPlan
}

/**
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta} tarjeta
 * @param {Record<string, string>} draft
 */
export function draftToManualRecords(tarjeta, draft) {
  if (isManualCoeficienteUnico(tarjeta)) {
    const coeficienteBase = parseManualCoeficienteBase(
      draft[MANUAL_COEF_UNIFICADO_KEY]
    )
    if (coeficienteBase == null) {
      throw new Error("Ingrese un coeficiente base válido.")
    }
    return getManualPlanesEditables(tarjeta).map((plan) => ({
      cuotas: plan.cuotas,
      coeficienteBase,
    }))
  }

  /** @type {import("./coeficientesVigentesModel").CoeficienteImportRecord[]} */
  const records = []

  for (const plan of getManualPlanesEditables(tarjeta)) {
    const key = String(plan.cuotas)
    const coeficienteBase = parseManualCoeficienteBase(draft[key])
    if (coeficienteBase == null) {
      throw new Error(
        `Ingrese un coeficiente base válido para "${plan.label}".`
      )
    }
    records.push({ cuotas: plan.cuotas, coeficienteBase })
  }

  return records
}
