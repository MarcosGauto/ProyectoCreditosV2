import { CREDIT_CONFIG, CREDIT_THRESHOLDS } from "@/config/creditAnalysis"
import {
  resolveCreditPolicy,
  getCreditConfigFromPolicy,
  getPolicyIndicator,
  getPolicyIndicatorThresholds,
  rateValueWithPolicyThresholds,
  computeWeightedGeneralScore,
} from "@/lib/creditPolicy/resolveCreditPolicy"
import {
  formatBalanceSummaryAmount,
  parseBalanceAmount,
  pickBalanceNumericField,
} from "@/lib/balanceFinancialSummary"
import { getLatestDocument } from "@/lib/getLatestDocumentPeriod"
import { getIibbBaseImponibleForCredit } from "@/lib/iibbIndicators"
import { hasConfirmedBalanceIndicators } from "@/lib/balanceIndicators"
import {
  balanceContableLatestEjercicioLegacyDoc,
  resolveColumnForHighestFechaCierreBalance,
} from "@/lib/balanceContableModel"
import { getBalanceVentasForAnalysis } from "@/lib/inflation/balanceInflation"
import {
  averagePromedioIvaConfirmed,
  hasConfirmedIvaIndicators,
} from "@/lib/ivaIndicators"
import {
  calculateExcelPrequalification,
  calculatePrequalification,
  extractPrequalificationVentas,
} from "@/lib/scoring/prequalification"
import { getLatestNosisReport, logNosisReportsOrder } from "@/lib/nosisModel"
import {
  analyzeNosisReport,
} from "@/lib/nosisScore"
import { analyzeComportamientoComercial } from "@/lib/comportamientoComercialScore"
import {
  buildFinancialScoreMetrics,
  computeFinancialScoreFromPolicy,
  buildFinancialScoreDebug,
} from "@/lib/creditPolicy/financialScoreEngine"

export {
  calculateExcelPrequalification,
  calculateExcelPrequalification as calculatePrequalificationAsync,
}

/**
 * @param {import("@/lib/creditPolicy/creditPolicyTypes").CreditPolicy} policy
 */
function liquidezThresholdsFromPolicy(policy) {
  const t = getPolicyIndicatorThresholds(policy, "liquidez_corriente", {
    good: CREDIT_THRESHOLDS.liquidez.goodMin,
    medium: CREDIT_THRESHOLDS.liquidez.mediumMin,
  })
  return { goodMin: t.good, mediumMin: t.medium }
}

/**
 * @param {import("@/lib/creditPolicy/creditPolicyTypes").CreditPolicy} policy
 */
function endeudThresholdsFromPolicy(policy) {
  const t = getPolicyIndicatorThresholds(policy, "endeudamiento", {
    good: CREDIT_THRESHOLDS.endeudamiento.goodMax,
    medium: CREDIT_THRESHOLDS.endeudamiento.mediumMax,
  })
  return { goodMax: t.good, mediumMax: t.medium }
}

/**
 * @typedef {"good" | "medium" | "risky" | "unknown"} SemaphoreLevel
 */

/**
 * Patrimonio, liquidez y endeudamiento del snapshot de último ejercicio (balance contable).
 *
 * @param {Record<string, unknown> | null} latestBalance
 * @param {{ columnaSeleccionada?: string | null; creditPolicy?: unknown }} [debug]
 */
export function computeUltimoEjercicioBalanceRatios(latestBalance, debug = {}) {
  const policy = resolveCreditPolicy(debug.creditPolicy)
  const liquidezThresholds = getPolicyIndicatorThresholds(
    policy,
    "liquidez_corriente",
    {
      good: CREDIT_THRESHOLDS.liquidez.goodMin,
      medium: CREDIT_THRESHOLDS.liquidez.mediumMin,
      modo: "higher",
    }
  )

  const endeudThresholds = getPolicyIndicatorThresholds(policy, "endeudamiento", {
    good: CREDIT_THRESHOLDS.endeudamiento.goodMax,
    medium: CREDIT_THRESHOLDS.endeudamiento.mediumMax,
    modo: "lower",
  })
  if (!latestBalance) {
    console.log("ENDEUDAMIENTO DEBUG", {
      ejercicio: null,
      columnaSeleccionada: debug.columnaSeleccionada ?? null,
      activoTotal: null,
      pasivoTotal: null,
      patrimonioNeto: null,
      endeudamiento: null,
    })
    return {
      patrimonioNeto: null,
      liquidezCorriente: null,
      endeudamiento: null,
      semaforos: {
        liquidez: /** @type {SemaphoreLevel} */ ("unknown"),
        endeudamiento: /** @type {SemaphoreLevel} */ ("unknown"),
      },
    }
  }

  const patrimonioNeto = pickBalanceNumericField(latestBalance, [
    "patrimonioNeto",
    "patrimonio_neto",
    "patrimonio",
  ])

  const activoTotal = pickBalanceNumericField(latestBalance, [
    "totalActivo",
    "total_activo",
    "activo_total",
  ])

  const totalPasivo = pickBalanceNumericField(latestBalance, [
    "totalPasivo",
    "total_pasivo",
    "pasivo_total",
  ])

  const activoCorriente = pickBalanceNumericField(latestBalance, [
    "activoCorriente",
    "activo_corriente",
  ])

  const pasivoCorriente = pickBalanceNumericField(latestBalance, [
    "pasivoCorriente",
    "pasivo_corriente",
  ])

  const endeudamiento =
    activoTotal && activoTotal > 0 && totalPasivo !== null
      ? totalPasivo / activoTotal
      : null

  const liquidezCorriente =
    pasivoCorriente && pasivoCorriente > 0 && activoCorriente !== null
      ? activoCorriente / pasivoCorriente
      : null

  console.log("LIQUIDEZ DEBUG", {
    activoCorriente,
    pasivoCorriente,
    liquidezCorriente,
  })

  console.log("ENDEUDAMIENTO DEBUG", {
    ejercicio: latestBalance.ejercicio ?? null,
    columnaSeleccionada: debug.columnaSeleccionada ?? null,
    activoTotal,
    pasivoTotal: totalPasivo,
    patrimonioNeto,
    endeudamiento,
  })

  return {
    patrimonioNeto,
    liquidezCorriente,
    endeudamiento,
    semaforos: {
      endeudamiento: rateValueWithPolicyThresholds(
        endeudamiento,
        endeudThresholds.modo,
        endeudThresholds
      ),
      liquidez: rateValueWithPolicyThresholds(
        liquidezCorriente,
        liquidezThresholds.modo,
        liquidezThresholds
      ),
    },
  }
}

/**
 * @param {unknown[]} docs
 * @param {(doc: Record<string, unknown>) => number | null} extractor
 * @returns {number | null}
 */
function averageFromDocs(docs, extractor) {
  const values = docs
    .map((doc) => extractor(/** @type {Record<string, unknown>} */ (doc)))
    .filter((value) => value !== null && Number.isFinite(value))

  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * @param {Record<string, unknown> | null | undefined} balance
 */
function pickConfirmedBalance(balance) {
  if (!balance) {
    return null
  }
  if (balance.validationStatus === "confirmed" || hasConfirmedBalanceIndicators(balance)) {
    return balance
  }
  return balance
}

/**
 * @param {unknown[]} ivaDocs
 * @returns {number | null}
 */
function averageIvaVentasMensuales(ivaDocs) {
  if (!Array.isArray(ivaDocs) || ivaDocs.length === 0) {
    return 0
  }
  return averagePromedioIvaConfirmed(ivaDocs)
}

/**
 * @param {{
 *   cuit: string;
 *   empresa?: Record<string, unknown> | null;
 *   balances?: unknown[];
 *   balanceContable?: import("@/lib/balanceContableModel").BalanceContableDoc | null;
 *   iva?: unknown[];
 *   iibb?: unknown[];
 *   bcra?: {
 *     peorSituacion?: number;
 *     entidadesConAtraso?: number;
 *     maxDiasAtraso?: number;
 *     tieneRefinanciaciones?: boolean;
 *     tieneJudiciales?: boolean;
 *   } | null;
 *   razonSocial?: string | null;
 *   analista?: string | null;
 *   tipoEmpresa?: string | null;
 *   nosis?: unknown[];
 *   chequesRechazados?: unknown[];
 * }} input
 */
export function buildCreditAnalysis(input) {
  const warnings = /** @type {string[]} */ ([])
  const policy = resolveCreditPolicy(input.creditPolicy)
  const creditConfig = getCreditConfigFromPolicy(policy)

  const balances = input.balances ?? []
  const ivaDocs = input.iva ?? []
  const iibbDocs = input.iibb ?? []

  const columnaUltimoEjercicio = input.balanceContable
    ? resolveColumnForHighestFechaCierreBalance(input.balanceContable)
    : null

  const latestBalance = pickConfirmedBalance(
    /** @type {Record<string, unknown> | null} */ (
      input.balanceContable
        ? balanceContableLatestEjercicioLegacyDoc(input.balanceContable)
        : getLatestDocument(balances)
    )
  )

  const ventasBalance = latestBalance
    ? getBalanceVentasForAnalysis(latestBalance)
    : null

  const ventasIvaPromedio = averageIvaVentasMensuales(ivaDocs) || 0
  const ventasIibbPromedio = averageFromDocs(iibbDocs, (doc) =>
    getIibbBaseImponibleForCredit(doc)
  )

  let ventasAnualesEstimadas = ventasBalance
  if (ventasAnualesEstimadas === null && ventasIvaPromedio !== null) {
    ventasAnualesEstimadas = ventasIvaPromedio * 12
  }
  if (ventasAnualesEstimadas === null && ventasIibbPromedio !== null) {
    ventasAnualesEstimadas = ventasIibbPromedio * 12
  }

  let ventasPromedioMensuales = null
  if (ventasAnualesEstimadas !== null) {
    ventasPromedioMensuales = ventasAnualesEstimadas / 12
  } else if (ventasIvaPromedio !== null) {
    ventasPromedioMensuales = ventasIvaPromedio
  }

  const {
    patrimonioNeto,
    liquidezCorriente,
    endeudamiento,
    semaforos: { liquidez: semLiquidez, endeudamiento: semEndeudamiento },
  } = computeUltimoEjercicioBalanceRatios(latestBalance, {
    columnaSeleccionada: columnaUltimoEjercicio,
    creditPolicy: policy,
  })

  const activoTotal = latestBalance
    ? pickBalanceNumericField(latestBalance, [
        "totalActivo",
        "total_activo",
        "activo_total",
      ])
    : null

  const creditoPorVentas =
    ventasPromedioMensuales !== null && creditConfig.porcentajeVentas > 0
      ? ventasPromedioMensuales * creditConfig.porcentajeVentas
      : null

  const creditoPorPatrimonio =
    patrimonioNeto !== null
      ? patrimonioNeto * creditConfig.porcentajePatrimonio
      : null

  const creditoPorFlujo =
    ventasIvaPromedio > 0
      ? ventasIvaPromedio * creditConfig.porcentajeFlujoIVA
      : 0

  const creditCandidates = [
    creditoPorVentas,
    creditoPorPatrimonio,
    creditoPorFlujo,
  ].filter((value) => value !== null && Number.isFinite(value))

  const creditoSugerido =
    creditCandidates.length > 0 ? Math.min(...creditCandidates) : null

  if (!latestBalance) {
    warnings.push("Sin balance cargado para patrimonio y activos.")
  } else if (latestBalance.validationStatus !== "confirmed") {
    warnings.push("Balance sin indicadores confirmados.")
  }
  if (ivaDocs.length === 0) {
    warnings.push("Sin declaraciones de IVA para estimar flujo.")
  }
  if (iibbDocs.length === 0) {
    warnings.push("Sin declaraciones de IIBB.")
  }

  const latestNosisDoc = getLatestNosisReport(input.nosis ?? [])
  logNosisReportsOrder(input.nosis ?? [])
  const nosisAnalisis = analyzeNosisReport(latestNosisDoc, policy)
  const comportamientoComercial = analyzeComportamientoComercial(
    input.chequesRechazados ?? []
  )

  if (!nosisAnalisis.confirmado) {
    if (nosisAnalisis.disponible) {
      warnings.push("Informe NOSIS pendiente de confirmación de indicadores.")
    } else {
      warnings.push("Sin informe NOSIS confirmado en el legajo.")
    }
  }

  if (comportamientoComercial.cantidadPendientes > 0) {
    warnings.push(
      `Cheques rechazados pendientes: ${comportamientoComercial.cantidadPendientes} ($${comportamientoComercial.montoTotalPendiente.toLocaleString("es-AR")}).`
    )
  } else if (comportamientoComercial.cantidadRechazados > 0) {
    warnings.push(
      `Historial de cheques rechazados regularizados: ${comportamientoComercial.cantidadAbonados}.`
    )
  }

  const semLevels = [semEndeudamiento, semLiquidez].filter(
    (level) => level !== "unknown"
  )

  let estadoGeneral = /** @type {SemaphoreLevel} */ ("unknown")
  if (semLevels.includes("risky")) {
    estadoGeneral = "risky"
  } else if (semLevels.includes("medium")) {
    estadoGeneral = "medium"
  } else if (semLevels.length > 0 && semLevels.every((level) => level === "good")) {
    estadoGeneral = "good"
  }

  if ((input.bcra?.peorSituacion ?? 1) >= 4) {
    estadoGeneral = "risky"
  }

  console.log("NOSIS ANALYSIS DEBUG", {
    scoreNosis: nosisAnalisis.scoreNosis,
    cantidadCheques: nosisAnalisis.cantidadCheques,
    montoCheques: nosisAnalisis.montoCheques,
    situacionBCRA: nosisAnalisis.situacionBcra,
    estadoNosis: nosisAnalisis.estadoNosis,
    impactoEstadoGeneral: "independiente — no modifica estado general",
  })

  /** @type {string[]} */
  const motivosEstado = []
  if (semLiquidez === "risky") {
    motivosEstado.push("liquidez_corriente (semáforo risky)")
  }
  if (semEndeudamiento === "risky") {
    motivosEstado.push("endeudamiento (semáforo risky)")
  }
  if (semLevels.includes("medium") && estadoGeneral === "medium") {
    if (semLiquidez === "medium") {
      motivosEstado.push("liquidez_corriente (semáforo medium)")
    }
    if (semEndeudamiento === "medium") {
      motivosEstado.push("endeudamiento (semáforo medium)")
    }
  }
  if ((input.bcra?.peorSituacion ?? 1) >= 4) {
    motivosEstado.push(
      `bcra.peorSituacion >= 4 (valor: ${input.bcra?.peorSituacion ?? "default 1"})`
    )
  }
  if (
    estadoGeneral === "good" &&
    semLevels.length > 0 &&
    semLevels.every((level) => level === "good")
  ) {
    motivosEstado.push("liquidez y endeudamiento ambos good")
  }
  if (estadoGeneral === "unknown") {
    motivosEstado.push(
      "sin semáforos conocidos (liquidez/endeudamiento unknown o sin balance)"
    )
  }

  const factoresUtilizados = {
    integranEstadoGeneral: [
      "liquidezCorriente",
      "endeudamiento",
      "bcra.peorSituacion>=4",
    ],
    noIntegranSoloWarnings: [
      "scoreNosis",
      "chequesRechazados (NOSIS)",
      "patrimonioNeto",
      "ventas",
      "antiguedad",
      "bcra.peorSituacion>=3 (solo advertencia)",
    ],
    semaforoLiquidez: semLiquidez,
    semaforoEndeudamiento: semEndeudamiento,
    semLevelsConsiderados: semLevels,
    reglaAgregacion:
      "1) Si algún semáforo (liquidez/endeudamiento conocido) es risky → risky; 2) si no, alguno medium → medium; 3) si no, todos conocidos son good → good; 4) override: BCRA peorSituacion >= 4 → risky",
    liquidezRatio: liquidezCorriente,
    endeudamientoRatio: endeudamiento,
    umbralesLiquidez: liquidezThresholdsFromPolicy(policy),
    umbralesEndeudamiento: endeudThresholdsFromPolicy(policy),
    motivosEstado,
  }

  console.log("ESTADO GENERAL DEBUG", {
    estadoGeneral,
    liquidez: liquidezCorriente,
    endeudamiento,
    scoreNosis: nosisAnalisis.scoreNosis,
    situacionBcra: nosisAnalisis.situacionBcra ?? input.bcra?.peorSituacion ?? null,
    chequesRechazados: nosisAnalisis.cantidadCheques,
    patrimonio: patrimonioNeto,
    ventas: ventasAnualesEstimadas,
    factoresUtilizados,
  })

  const fechaAnalisis = new Date().toISOString()

  const tipoEmpresaResolved = input.tipoEmpresa ?? null

  const ventasPreCalificacion = extractPrequalificationVentas({
    balances,
    iva: ivaDocs,
    iibb: iibbDocs,
  })

  if (!input.bcra?.peorSituacion && input.bcra?.peorSituacion !== 0) {
    warnings.push("Sin consulta BCRA en el legajo.")
  } else if ((input.bcra?.peorSituacion ?? 1) >= 3) {
    warnings.push("BCRA con situación elevada (≥ 3).")
  }

  const preCalificacion = {
    ...calculatePrequalification(ventasPreCalificacion, tipoEmpresaResolved),
    loading: true,
  }

  const financialScoreMetrics = buildFinancialScoreMetrics({
    balanceContable: input.balanceContable ?? null,
    latestBalance,
  })

  const financialScoreResult = computeFinancialScoreFromPolicy(
    policy,
    financialScoreMetrics
  )
  const scoreFinanciero = financialScoreResult.scoreFinanciero
  const scoreGeneralPonderado =
    scoreFinanciero != null
      ? computeWeightedGeneralScore(
          policy,
          scoreFinanciero,
          nosisAnalisis.scoreNosis
        )
      : null

  const scoreDebug = buildFinancialScoreDebug({
    policy,
    metrics: financialScoreMetrics,
    estadoGeneral,
    scoreNosis: nosisAnalisis.scoreNosis,
    semaforoLiquidez: semLiquidez,
    semaforoEndeudamiento: semEndeudamiento,
  })

  return {
    resumenEjecutivo: {
      cuit: input.cuit,
      razonSocial:
        input.razonSocial ??
        String(input.empresa?.razonSocial ?? input.empresa?.nombre ?? "—"),
      fechaAnalisis,
      analista: input.analista ?? "—",
      estadoGeneral,
      scoreFinanciero,
      scoreGeneralPonderado,
    },
    capacidadEconomica: {
      ventasAnualesEstimadas,
      ventasPromedioMensuales,
      patrimonioNeto,
      activoTotal,
      endeudamiento,
      liquidezCorriente,
      semaforos: {
        endeudamiento: semEndeudamiento,
        liquidez: semLiquidez,
      },
    },
    creditoAsumible: {
      creditoPorVentas,
      creditoPorPatrimonio,
      creditoPorFlujo,
      creditoSugerido,
      config: { ...creditConfig },
    },
    preCalificacion,
    nosisAnalisis,
    comportamientoComercial,
    warnings,
    computedAt: fechaAnalisis,
    scoreDebug,
  }
}

/** Texto descriptivo unificado para la UI y reportes. */
export const CAPACIDAD_FINANCIERA_DESCRIPCION =
  "Importe estimado en función de la capacidad económica y financiera de la empresa, calculado mediante criterios conservadores sobre patrimonio y flujo fiscal."

/**
 * @typedef {"patrimonio" | "flujo"} CriterioLimitanteCapacidadKey
 */

/**
 * @param {Record<string, unknown> | null | undefined} creditoAsumible
 * @returns {CriterioLimitanteCapacidadKey | null}
 */
export function resolveCriterioLimitanteCapacidadFinanciera(creditoAsumible) {
  if (!creditoAsumible || typeof creditoAsumible !== "object") {
    return null
  }

  const creditoSugerido = /** @type {number | null} */ (
    creditoAsumible.creditoSugerido ?? null
  )
  if (creditoSugerido === null || !Number.isFinite(creditoSugerido)) {
    return null
  }

  /** @type {{ key: CriterioLimitanteCapacidadKey; value: number | null }[]} */
  const items = [
    {
      key: "patrimonio",
      value: /** @type {number | null} */ (
        creditoAsumible.creditoPorPatrimonio ?? null
      ),
    },
    {
      key: "flujo",
      value: /** @type {number | null} */ (creditoAsumible.creditoPorFlujo ?? null),
    },
  ]

  for (const item of items) {
    if (
      item.value !== null &&
      Number.isFinite(item.value) &&
      item.value === creditoSugerido
    ) {
      return item.key
    }
  }

  for (const item of items) {
    if (
      item.value !== null &&
      Number.isFinite(item.value) &&
      Math.abs(item.value - creditoSugerido) < 0.01
    ) {
      return item.key
    }
  }

  return null
}

/**
 * @param {CriterioLimitanteCapacidadKey | null} key
 * @returns {string | null}
 */
export function getCriterioLimitanteCapacidadLabel(key) {
  if (key === "patrimonio") {
    return "Patrimonio"
  }
  if (key === "flujo") {
    return "Flujo IVA"
  }
  return null
}

/**
 * @param {number | null} amount
 * @returns {string}
 */
export function formatCreditAmount(amount) {
  if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) {
    return formatBalanceSummaryAmount(0)
  }
  return formatBalanceSummaryAmount(amount)
}

/**
 * @param {number | null} ratio
 * @returns {string}
 */
export function formatRatioPercent(ratio) {
  if (ratio === null || !Number.isFinite(ratio)) {
    return "—"
  }
  return `${(ratio * 100).toLocaleString("es-AR", {
    maximumFractionDigits: 1,
  })}%`
}
