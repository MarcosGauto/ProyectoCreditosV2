import {
  createDefaultCreditPolicy,
  DEFAULT_FINANCIAL_INDICATORS,
} from "@/lib/creditPolicy/defaultCreditPolicy"
import { normalizePolicyTextos } from "@/lib/creditPolicy/creditPolicyTextEngine"
import { DEFAULT_POLICY_TEXTOS } from "@/lib/creditPolicy/defaultPolicyTextos"

/** @typedef {import("./creditPolicyTypes").CreditPolicy} CreditPolicy */
/** @typedef {import("./creditPolicyTypes").CreditPolicyIndicator} CreditPolicyIndicator */

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function num(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * @param {unknown} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function bool(value, fallback) {
  return typeof value === "boolean" ? value : fallback
}

/**
 * @param {unknown} raw
 * @returns {CreditPolicyIndicator}
 */
function normalizeIndicator(raw, fallback) {
  const row =
    raw && typeof raw === "object"
      ? /** @type {Record<string, unknown>} */ (raw)
      : {}

  return {
    id: String(row.id ?? fallback.id),
    nombre: String(row.nombre ?? fallback.nombre),
    formula: String(row.formula ?? fallback.formula),
    fuente: String(row.fuente ?? fallback.fuente),
    good: num(row.good, fallback.good),
    medium: num(row.medium, fallback.medium),
    peso: num(row.peso, fallback.peso),
    impactaScore: bool(row.impactaScore, fallback.impactaScore),
    activo: bool(row.activo, fallback.activo),
    modo:
      row.modo === "lower" || row.modo === "higher"
        ? row.modo
        : fallback.modo ?? "higher",
  }
}

/**
 * @param {unknown} [raw]
 * @returns {CreditPolicy}
 */
export function resolveCreditPolicy(raw) {
  const defaults = createDefaultCreditPolicy()
  if (!raw || typeof raw !== "object") {
    return defaults
  }

  const doc = /** @type {Record<string, unknown>} */ (raw)
  const estadoRaw =
    doc.estadoGeneral && typeof doc.estadoGeneral === "object"
      ? /** @type {Record<string, unknown>} */ (doc.estadoGeneral)
      : {}

  const coberturaRaw =
    doc.reglasCobertura && typeof doc.reglasCobertura === "object"
      ? /** @type {Record<string, unknown>} */ (doc.reglasCobertura)
      : {}

  const creditoRaw =
    doc.reglasCredito && typeof doc.reglasCredito === "object"
      ? /** @type {Record<string, unknown>} */ (doc.reglasCredito)
      : {}

  const nosisRaw =
    doc.configuracionNosis && typeof doc.configuracionNosis === "object"
      ? /** @type {Record<string, unknown>} */ (doc.configuracionNosis)
      : {}

  const incomingIndicators = Array.isArray(doc.indicadoresFinancieros)
    ? doc.indicadoresFinancieros
    : []

  /** @type {Map<string, unknown>} */
  const byId = new Map()
  for (const item of incomingIndicators) {
    if (item && typeof item === "object" && item.id) {
      byId.set(String(item.id), item)
    }
  }

  const indicadoresFinancieros = DEFAULT_FINANCIAL_INDICATORS.map((fallback) =>
    normalizeIndicator(byId.get(fallback.id), fallback)
  )

  return {
    id: String(doc.id ?? defaults.id),
    version: num(doc.version, defaults.version),
    estadoGeneral: {
      scoreFinancieroPeso: num(
        estadoRaw.scoreFinancieroPeso,
        defaults.estadoGeneral.scoreFinancieroPeso
      ),
      scoreNosisPeso: num(
        estadoRaw.scoreNosisPeso,
        defaults.estadoGeneral.scoreNosisPeso
      ),
    },
    indicadoresFinancieros,
    reglasCobertura: {
      antiguedadMinimaAnios: num(
        coberturaRaw.antiguedadMinimaAnios,
        defaults.reglasCobertura.antiguedadMinimaAnios
      ),
      mesesSinAtrasos: num(
        coberturaRaw.mesesSinAtrasos,
        defaults.reglasCobertura.mesesSinAtrasos
      ),
      facturasContadoMinimas: num(
        coberturaRaw.facturasContadoMinimas,
        defaults.reglasCobertura.facturasContadoMinimas
      ),
      exigirSinChequesRechazados: bool(
        coberturaRaw.exigirSinChequesRechazados,
        defaults.reglasCobertura.exigirSinChequesRechazados
      ),
    },
    reglasCredito: {
      porcentajeCapacidadVentas: num(
        creditoRaw.porcentajeCapacidadVentas,
        defaults.reglasCredito.porcentajeCapacidadVentas
      ),
      porcentajeCapacidadPatrimonio: num(
        creditoRaw.porcentajeCapacidadPatrimonio,
        defaults.reglasCredito.porcentajeCapacidadPatrimonio
      ),
      porcentajeCapacidadFlujoIVA: num(
        creditoRaw.porcentajeCapacidadFlujoIVA,
        defaults.reglasCredito.porcentajeCapacidadFlujoIVA ?? 20
      ),
    },
    configuracionNosis: {
      scoreAprobadoMinimo: num(
        nosisRaw.scoreAprobadoMinimo,
        defaults.configuracionNosis.scoreAprobadoMinimo
      ),
      scoreObservadoMinimo: num(
        nosisRaw.scoreObservadoMinimo,
        defaults.configuracionNosis.scoreObservadoMinimo
      ),
    },
    textos: normalizePolicyTextos(doc.textos, defaults.textos),
    updatedAt:
      typeof doc.updatedAt === "string"
        ? doc.updatedAt
        : doc.updatedAt &&
            typeof doc.updatedAt === "object" &&
            typeof /** @type {{ toDate?: () => Date }} */ (doc.updatedAt).toDate ===
              "function"
          ? /** @type {{ toDate: () => Date }} */ (doc.updatedAt)
              .toDate()
              .toISOString()
          : defaults.updatedAt,
    updatedBy:
      typeof doc.updatedBy === "string" ? doc.updatedBy : defaults.updatedBy,
  }
}

/**
 * @param {CreditPolicy} policy
 * @param {string} id
 * @returns {CreditPolicyIndicator | null}
 */
export function getPolicyIndicator(policy, id) {
  return (
    policy.indicadoresFinancieros.find((row) => row.id === id && row.activo) ??
    null
  )
}

/**
 * Umbrales de un indicador (incluye inactivos; para debug y motores internos).
 *
 * @param {CreditPolicy} policy
 * @param {string} id
 * @param {{ good: number; medium: number; modo?: "higher" | "lower" } | null} [fallback]
 */
export function getPolicyIndicatorThresholds(policy, id, fallback = null) {
  const row = policy.indicadoresFinancieros.find((r) => r.id === id)
  if (!row) {
    return fallback
  }
  return {
    good: row.good,
    medium: row.medium,
    modo: row.modo ?? "higher",
  }
}

/**
 * @param {CreditPolicy} policy
 * @returns {{ porcentajePatrimonio: number; porcentajeFlujoIVA: number; porcentajeVentas: number }}
 */
export function getCreditConfigFromPolicy(policy) {
  return {
    porcentajePatrimonio: policy.reglasCredito.porcentajeCapacidadPatrimonio / 100,
    porcentajeFlujoIVA:
      (policy.reglasCredito.porcentajeCapacidadFlujoIVA ?? 20) / 100,
    porcentajeVentas: policy.reglasCredito.porcentajeCapacidadVentas / 100,
  }
}

/**
 * @param {number | null} value
 * @param {"higher" | "lower"} modo
 * @param {{ good: number; medium: number }} thresholds
 * @returns {"good" | "medium" | "risky" | "unknown"}
 */
export function rateValueWithPolicyThresholds(value, modo, thresholds) {
  if (value === null || !Number.isFinite(value)) {
    return "unknown"
  }

  if (modo === "lower") {
    if (value <= thresholds.good) {
      return "good"
    }
    if (value <= thresholds.medium) {
      return "medium"
    }
    return "risky"
  }

  if (value >= thresholds.good) {
    return "good"
  }
  if (value >= thresholds.medium) {
    return "medium"
  }
  return "risky"
}

/**
 * Score General = (Score Financiero × pesoFin / 100) + (Score NOSIS × pesoNosis / 100)
 *
 * @param {CreditPolicy} policy
 * @param {number | null} scoreFinanciero
 * @param {number | null} scoreNosis
 * @returns {number | null}
 */
export function computeWeightedGeneralScore(
  policy,
  scoreFinanciero,
  scoreNosis
) {
  if (scoreFinanciero == null || !Number.isFinite(scoreFinanciero)) {
    return null
  }

  const finW = policy.estadoGeneral.scoreFinancieroPeso
  const nosisW = policy.estadoGeneral.scoreNosisPeso
  const finPart = (scoreFinanciero * finW) / 100

  if (scoreNosis == null || !Number.isFinite(scoreNosis)) {
    return Math.round(finPart * 100) / 100
  }

  const nosisPart = (scoreNosis * nosisW) / 100
  return Math.round((finPart + nosisPart) * 100) / 100
}

/**
 * @param {CreditPolicy} policy
 * @param {number | null} scoreFinanciero
 * @param {number | null} scoreNosis
 */
export function buildScoreGeneralBreakdown(policy, scoreFinanciero, scoreNosis) {
  const finW = policy.estadoGeneral.scoreFinancieroPeso
  const nosisW = policy.estadoGeneral.scoreNosisPeso
  const finPart =
    scoreFinanciero != null && Number.isFinite(scoreFinanciero)
      ? Math.round(((scoreFinanciero * finW) / 100) * 100) / 100
      : null
  const nosisPart =
    scoreNosis != null && Number.isFinite(scoreNosis)
      ? Math.round(((scoreNosis * nosisW) / 100) * 100) / 100
      : null

  const scoreGeneral =
    finPart != null
      ? Math.round(((finPart ?? 0) + (nosisPart ?? 0)) * 100) / 100
      : null

  const formula =
    "Score General = (Score Financiero × Peso Financiero / 100) + (Score NOSIS × Peso NOSIS / 100)"

  const formulaExpandida =
    scoreFinanciero != null
      ? `(${scoreFinanciero} × ${finW} / 100)${nosisPart != null ? ` + (${scoreNosis} × ${nosisW} / 100)` : ""} = ${finPart ?? "—"}${nosisPart != null ? ` + ${nosisPart}` : ""}${scoreGeneral != null ? ` = ${scoreGeneral}` : ""}`
      : "Sin score financiero calculado."

  return {
    scoreFinanciero,
    scoreNosis,
    pesoFinanciero: finW,
    pesoNosis: nosisW,
    aporteFinanciero: finPart,
    aporteNosis: nosisPart,
    scoreGeneral,
    formula,
    formulaExpandida,
  }
}
