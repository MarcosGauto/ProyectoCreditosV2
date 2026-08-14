import {
  resolveCreditPolicy,
  rateValueWithPolicyThresholds,
  buildScoreGeneralBreakdown,
} from "@/lib/creditPolicy/resolveCreditPolicy"
import {
  computeScoringWeightTotal,
  getScoringWeightValidation,
  getGeneralScoreWeightValidation,
} from "@/lib/creditPolicy/creditPolicyScoring"
import {
  balanceContableColumnToLegacyDoc,
  balanceContableLatestEjercicioLegacyDoc,
  resolveColumnForHighestFechaCierreBalance,
} from "@/lib/balanceContableModel"
import { extractBalanceExerciseMetrics } from "@/lib/balanceAnalysis"

/** @typedef {import("./creditPolicyTypes").CreditPolicy} CreditPolicy */

/** Puntaje base por semáforo (Bueno / Medio / Riesgoso). */
export const POLICY_ESTADO_PUNTOS = {
  good: 100,
  medium: 50,
  risky: 0,
  unknown: 0,
}

/** @type {Record<string, keyof FinancialScoreMetrics>} */
const INDICATOR_METRIC_KEY = {
  liquidez_corriente: "liquidezCorriente",
  endeudamiento: "endeudamiento",
  capital_trabajo: "capitalTrabajo",
  solvencia: "solvencia",
  participacion_patrimonial: "participacionPatrimonial",
  cobertura_patrimonial: "coberturaPatrimonial",
  evolucion_patrimonial: "variacionPatrimonio",
}

/**
 * @typedef {Object} FinancialScoreMetrics
 * @property {number | null} [liquidezCorriente]
 * @property {number | null} [endeudamiento]
 * @property {number | null} [capitalTrabajo]
 * @property {number | null} [solvencia]
 * @property {number | null} [participacionPatrimonial]
 * @property {number | null} [coberturaPatrimonial]
 * @property {number | null} [variacionPatrimonio]
 */

/**
 * @typedef {Object} FinancialScoreBreakdownRow
 * @property {string} id
 * @property {string} nombre
 * @property {boolean} activo
 * @property {boolean} impactaScore
 * @property {boolean} inScoring
 * @property {number | null} valor
 * @property {string} valorDisplay
 * @property {{ good: number; medium: number; modo: string }} umbrales
 * @property {"good" | "medium" | "risky" | "unknown" | null} estado
 * @property {string} estadoLabel
 * @property {number} peso
 * @property {number} puntajeBase
 * @property {number} aporte
 */

/**
 * @param {"good" | "medium" | "risky" | "unknown" | null} estado
 */
export function financialScoreEstadoLabel(estado) {
  if (estado === "good") return "Bueno"
  if (estado === "medium") return "Medio"
  if (estado === "risky") return "Riesgoso"
  if (estado === "unknown") return "Sin dato"
  return "—"
}

/**
 * @param {number | null | undefined} value
 * @param {number} [digits]
 */
export function formatFinancialMetricValue(value, digits = 4) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—"
  }
  return Number(value).toLocaleString("es-AR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

/**
 * @param {number | null | undefined} score
 */
export function formatFinancialScore(score) {
  if (score == null || !Number.isFinite(Number(score))) {
    return "—"
  }
  const n = Number(score)
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/**
 * @param {import("./creditPolicyTypes").CreditPolicyIndicator} indicator
 * @param {FinancialScoreMetrics} metrics
 */
function resolveIndicatorValue(indicator, metrics) {
  const key = INDICATOR_METRIC_KEY[indicator.id]
  if (!key) {
    return null
  }
  const raw = metrics[key]
  return raw != null && Number.isFinite(Number(raw)) ? Number(raw) : null
}

/**
 * @param {number | null} current
 * @param {number | null} previous
 */
function percentVariation(current, previous) {
  if (
    current === null ||
    previous === null ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return null
  }
  return ((current - previous) / previous) * 100
}

/**
 * Arma métricas de balance para el scoring desde legajo contable.
 *
 * @param {{
 *   balanceContable?: import("@/lib/balanceContableModel").BalanceContableDoc | null;
 *   latestBalance?: Record<string, unknown> | null;
 * }} input
 * @returns {FinancialScoreMetrics}
 */
export function buildFinancialScoreMetrics({ balanceContable, latestBalance }) {
  /** @type {FinancialScoreMetrics} */
  const metrics = {
    liquidezCorriente: null,
    endeudamiento: null,
    capitalTrabajo: null,
    solvencia: null,
    participacionPatrimonial: null,
    coberturaPatrimonial: null,
    variacionPatrimonio: null,
  }

  const snapshot =
    latestBalance ??
    (balanceContable
      ? balanceContableLatestEjercicioLegacyDoc(balanceContable)
      : null)

  if (snapshot) {
    const extracted = extractBalanceExerciseMetrics(snapshot)
    metrics.liquidezCorriente = extracted.liquidezCorriente
    metrics.endeudamiento = extracted.endeudamiento
    metrics.capitalTrabajo = extracted.capitalTrabajo
    metrics.solvencia = extracted.solvencia
    metrics.participacionPatrimonial = extracted.participacionPatrimonial
    metrics.coberturaPatrimonial = extracted.coberturaPatrimonial
  }

  if (balanceContable) {
    const columnaActual = resolveColumnForHighestFechaCierreBalance(balanceContable)
    const columnaAnterior = columnaActual === "actual" ? "anterior" : "actual"
    const actual = extractBalanceExerciseMetrics(
      balanceContableColumnToLegacyDoc(balanceContable, columnaActual)
    )
    const anterior = extractBalanceExerciseMetrics(
      balanceContableColumnToLegacyDoc(balanceContable, columnaAnterior)
    )
    metrics.variacionPatrimonio = percentVariation(
      actual.patrimonioNeto,
      anterior.patrimonioNeto
    )

    if (!snapshot) {
      metrics.liquidezCorriente = actual.liquidezCorriente
      metrics.endeudamiento = actual.endeudamiento
      metrics.capitalTrabajo = actual.capitalTrabajo
      metrics.solvencia = actual.solvencia
      metrics.participacionPatrimonial = actual.participacionPatrimonial
      metrics.coberturaPatrimonial = actual.coberturaPatrimonial
    }
  }

  return metrics
}

/**
 * Calcula el score financiero exclusivamente desde la política activa.
 * Score = Σ (puntajeBase × peso / 100) para indicadores activo + impactaScore.
 *
 * @param {unknown} policy
 * @param {FinancialScoreMetrics} [metrics]
 * @returns {{
 *   scoreFinanciero: number | null;
 *   sumaAportes: number;
 *   breakdown: FinancialScoreBreakdownRow[];
 *   indicadoresEnCalculo: FinancialScoreBreakdownRow[];
 *   formula: string;
 *   formulaExpandida: string;
 *   policy: CreditPolicy;
 *   pesoScoringTotal: number;
 *   weightValidation: ReturnType<typeof getScoringWeightValidation>;
 * }}
 */
export function computeFinancialScoreFromPolicy(policy, metrics = {}) {
  const resolvedPolicy = resolveCreditPolicy(policy)
  const weightValidation = getScoringWeightValidation(
    resolvedPolicy.indicadoresFinancieros
  )
  const pesoScoringTotal = computeScoringWeightTotal(
    resolvedPolicy.indicadoresFinancieros
  )

  /** @type {FinancialScoreBreakdownRow[]} */
  const breakdown = []
  let sumaAportes = 0

  for (const row of resolvedPolicy.indicadoresFinancieros) {
    const inScoring = row.activo && row.impactaScore
    const valor = inScoring ? resolveIndicatorValue(row, metrics) : null
    const umbrales = {
      good: row.good,
      medium: row.medium,
      modo: row.modo ?? "higher",
    }

    let estado = null
    if (inScoring) {
      estado =
        valor != null
          ? rateValueWithPolicyThresholds(valor, umbrales.modo, umbrales)
          : "unknown"
    }

    const puntajeBase =
      inScoring && estado
        ? POLICY_ESTADO_PUNTOS[estado] ?? 0
        : 0
    const peso = inScoring ? Number(row.peso) || 0 : 0
    const aporte = inScoring ? (puntajeBase * peso) / 100 : 0

    if (inScoring) {
      sumaAportes += aporte
    }

    breakdown.push({
      id: row.id,
      nombre: row.nombre,
      activo: row.activo,
      impactaScore: row.impactaScore,
      inScoring,
      valor,
      valorDisplay: formatFinancialMetricValue(valor),
      umbrales,
      estado,
      estadoLabel: estado ? financialScoreEstadoLabel(estado) : "—",
      peso,
      puntajeBase: inScoring ? puntajeBase : 0,
      aporte: inScoring ? aporte : 0,
    })
  }

  const indicadoresEnCalculo = breakdown.filter((row) => row.inScoring)
  const scoreFinanciero =
    indicadoresEnCalculo.length > 0
      ? Math.round(sumaAportes * 100) / 100
      : null

  const formulaTerms = indicadoresEnCalculo
    .filter((row) => row.peso > 0)
    .map(
      (row) =>
        `(${row.peso} × ${row.puntajeBase}) / 100 = ${row.aporte.toFixed(2)} [${row.nombre}]`
    )

  const formula =
    "Score Financiero = Σ (puntajeBase × peso / 100) · Bueno=100, Medio=50, Riesgoso=0, Sin dato=0"

  const formulaExpandida =
    formulaTerms.length > 0
      ? `${formulaTerms.join(" + ")} = ${sumaAportes.toFixed(2)}`
      : "Sin indicadores activos con impacto en score."

  return {
    scoreFinanciero,
    sumaAportes: Math.round(sumaAportes * 100) / 100,
    breakdown,
    indicadoresEnCalculo,
    formula,
    formulaExpandida,
    policy: resolvedPolicy,
    pesoScoringTotal,
    weightValidation,
  }
}

/**
 * @param {{
 *   policy: unknown;
 *   metrics?: FinancialScoreMetrics;
 *   estadoGeneral: "good" | "medium" | "risky" | "unknown";
 *   scoreNosis?: number | null;
 *   semaforoLiquidez?: "good" | "medium" | "risky" | "unknown";
 *   semaforoEndeudamiento?: "good" | "medium" | "risky" | "unknown";
 * }} input
 */
export function buildFinancialScoreDebug({
  policy,
  metrics = {},
  estadoGeneral,
  scoreNosis = null,
  semaforoLiquidez = "unknown",
  semaforoEndeudamiento = "unknown",
}) {
  const result = computeFinancialScoreFromPolicy(policy, metrics)
  const generalWeightValidation = getGeneralScoreWeightValidation(
    result.policy.estadoGeneral
  )
  const scoreGeneralBreakdown = buildScoreGeneralBreakdown(
    result.policy,
    result.scoreFinanciero,
    scoreNosis
  )
  const scoreGeneralPonderado = scoreGeneralBreakdown.scoreGeneral

  const formulaEstadoGeneral =
    "estadoGeneral = semáforos liquidez + endeudamiento (solo textos y UI; no afecta score financiero)"

  /** @type {string[]} */
  const discrepancias = []
  if (!result.weightValidation.isValid) {
    discrepancias.push(result.weightValidation.message)
  }
  if (!generalWeightValidation.isValid) {
    discrepancias.push(generalWeightValidation.message)
  }

  const debug = {
    policy: {
      id: result.policy.id,
      version: result.policy.version,
      updatedAt: result.policy.updatedAt,
      updatedBy: result.policy.updatedBy,
      estadoGeneral: { ...result.policy.estadoGeneral },
      pesoScoringTotal: result.pesoScoringTotal,
      weightValidation: result.weightValidation,
      generalWeightValidation,
    },
    indicadores: result.breakdown,
    indicadoresEnCalculo: result.indicadoresEnCalculo,
    scoreFinanciero: result.scoreFinanciero,
    sumaAportes: result.sumaAportes,
    formula: result.formula,
    formulaExpandida: result.formulaExpandida,
    estadoGeneral: {
      valor: estadoGeneral,
      label: financialScoreEstadoLabel(estadoGeneral),
      formula: formulaEstadoGeneral,
      semaforoLiquidez: financialScoreEstadoLabel(semaforoLiquidez),
      semaforoEndeudamiento: financialScoreEstadoLabel(semaforoEndeudamiento),
    },
    scoreNosis,
    scoreGeneral: scoreGeneralBreakdown,
    scoreGeneralPonderado,
    discrepancias,
  }

  console.groupCollapsed("[SCORE FINANCIERO DEBUG]")
  console.log("Política activa", debug.policy)
  console.table(
    debug.indicadoresEnCalculo.map((row) => ({
      indicador: row.nombre,
      valor: row.valorDisplay,
      estado: row.estadoLabel,
      peso: row.peso,
      puntajeBase: row.puntajeBase,
      aporte: row.aporte,
    }))
  )
  console.log("Suma aportes", debug.sumaAportes)
  console.log("Score financiero", debug.scoreFinanciero)
  console.log("Score NOSIS", debug.scoreNosis)
  console.log("Score general", debug.scoreGeneral)
  console.log("Fórmula financiera", debug.formulaExpandida)
  if (discrepancias.length > 0) {
    console.warn("Advertencias", discrepancias)
  }
  console.groupEnd()

  return debug
}
