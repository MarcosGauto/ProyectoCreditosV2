import { pickBalanceNumericField } from "@/lib/balanceFinancialSummary"
import {
  resolveCreditPolicy,
  getPolicyIndicatorThresholds,
  rateValueWithPolicyThresholds,
} from "@/lib/creditPolicy/resolveCreditPolicy"
import {
  buildPolicyTextVariables,
  renderComentarioBalanceText,
  renderConclusionEvolutivaText,
  renderDictamenPatrimonialText,
  resolveConclusionEvolutivaKey,
} from "@/lib/creditPolicy/creditPolicyTextEngine"
import {
  balanceContableColumnToLegacyDoc,
  fechaCierreFieldForColumn,
  formatFechaCierreForDisplay,
  hasBalanceContableIndicators,
  resolveColumnForHighestFechaCierreBalance,
  resolvePeriodoCierreLabel,
} from "@/lib/balanceContableModel"
import {
  buildPersonaFisicaIngresosConclusion,
  ESTADO_ANALISIS_BALANCE,
  MENSAJE_PERSONA_FISICA_BALANCE,
  MENSAJE_PERSONA_JURIDICA_SIN_BALANCE,
  resolveEstadoAnalisisBalance,
  resolveTipoContribuyente,
} from "@/lib/contribuyenteBalanceContext"

/** @typedef {"good" | "medium" | "risky" | "unknown"} SemaphoreLevel */

/**
 * @typedef {Object} BalanceExerciseMetrics
 * @property {number | null} activoCorriente
 * @property {number | null} pasivoCorriente
 * @property {number | null} activoTotal
 * @property {number | null} pasivoTotal
 * @property {number | null} patrimonioNeto
 * @property {number | null} liquidezCorriente
 * @property {number | null} capitalTrabajo
 * @property {number | null} endeudamiento
 * @property {number | null} solvencia
 * @property {number | null} participacionPatrimonial
 * @property {number | null} coberturaPatrimonial
 * @property {string | null} ejercicio
 */

/**
 * @param {Record<string, unknown>} snapshot
 * @returns {BalanceExerciseMetrics}
 */
export function extractBalanceExerciseMetrics(snapshot) {
  const activoCorriente = pickBalanceNumericField(snapshot, [
    "activoCorriente",
    "activo_corriente",
  ])
  const pasivoCorriente = pickBalanceNumericField(snapshot, [
    "pasivoCorriente",
    "pasivo_corriente",
  ])
  const activoTotal = pickBalanceNumericField(snapshot, [
    "totalActivo",
    "total_activo",
    "activo_total",
  ])
  const pasivoTotal = pickBalanceNumericField(snapshot, [
    "totalPasivo",
    "total_pasivo",
    "pasivo_total",
  ])
  const patrimonioNeto = pickBalanceNumericField(snapshot, [
    "patrimonioNeto",
    "patrimonio_neto",
    "patrimonio",
  ])

  const liquidezCorriente =
    pasivoCorriente && pasivoCorriente > 0 && activoCorriente !== null
      ? activoCorriente / pasivoCorriente
      : null

  const capitalTrabajo =
    activoCorriente !== null && pasivoCorriente !== null
      ? activoCorriente - pasivoCorriente
      : null

  const endeudamiento =
    activoTotal && activoTotal > 0 && pasivoTotal !== null
      ? pasivoTotal / activoTotal
      : null

  const solvencia =
    pasivoTotal && pasivoTotal > 0 && activoTotal !== null
      ? activoTotal / pasivoTotal
      : null

  const participacionPatrimonial =
    activoTotal && activoTotal > 0 && patrimonioNeto !== null
      ? patrimonioNeto / activoTotal
      : null

  const coberturaPatrimonial =
    pasivoTotal && pasivoTotal > 0 && patrimonioNeto !== null
      ? patrimonioNeto / pasivoTotal
      : null

  const ejercicioRaw = snapshot.ejercicio
  const ejercicio =
    ejercicioRaw != null && String(ejercicioRaw).trim() !== ""
      ? String(ejercicioRaw)
      : null

  return {
    activoCorriente,
    pasivoCorriente,
    activoTotal,
    pasivoTotal,
    patrimonioNeto,
    liquidezCorriente,
    capitalTrabajo,
    endeudamiento,
    solvencia,
    participacionPatrimonial,
    coberturaPatrimonial,
    ejercicio,
  }
}

/**
 * @param {number | null} current
 * @param {number | null} previous
 * @returns {number | null}
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
 * @param {number | null} value
 * @param {import("@/lib/creditPolicy/creditPolicyTypes").CreditPolicy} policy
 * @param {string} indicatorId
 * @param {(value: number | null) => SemaphoreLevel} fallback
 * @returns {SemaphoreLevel}
 */
function rateFromPolicyIndicator(value, policy, indicatorId, fallback) {
  const thresholds = getPolicyIndicatorThresholds(policy, indicatorId)
  if (!thresholds) {
    return fallback(value)
  }
  const row = policy.indicadoresFinancieros.find((r) => r.id === indicatorId)
  if (row && !row.activo) {
    return "unknown"
  }
  return rateValueWithPolicyThresholds(value, thresholds.modo, thresholds)
}

/**
 * @param {number | null} value
 * @returns {SemaphoreLevel}
 */
function rateLiquidez(value) {
  if (value === null || !Number.isFinite(value)) {
    return "unknown"
  }
  if (value >= 1.5) {
    return "good"
  }
  if (value >= 1.0) {
    return "medium"
  }
  return "risky"
}

/**
 * @param {number | null} value
 * @returns {SemaphoreLevel}
 */
function rateEndeudamiento(value) {
  if (value === null || !Number.isFinite(value)) {
    return "unknown"
  }
  if (value <= 0.5) {
    return "good"
  }
  if (value <= 0.7) {
    return "medium"
  }
  return "risky"
}

/**
 * @param {number | null} value
 * @returns {SemaphoreLevel}
 */
function rateParticipacionPatrimonial(value) {
  if (value === null || !Number.isFinite(value)) {
    return "unknown"
  }
  if (value >= 0.3) {
    return "good"
  }
  if (value >= 0.15) {
    return "medium"
  }
  return "risky"
}

/**
 * Semáforo crítico para estado balance (sin cambiar umbrales existentes).
 *
 * @param {number | null} pct
 * @returns {SemaphoreLevel}
 */
function rateVariacionPatrimonio(pct) {
  if (pct === null || !Number.isFinite(pct)) {
    return "unknown"
  }
  if (pct > 0) {
    return "good"
  }
  if (pct >= -20) {
    return "medium"
  }
  return "risky"
}

/**
 * Evolución patrimonial — variación % del patrimonio neto entre ejercicios.
 * Bueno: > 50% · Medio: > 30% · Riesgoso: ≤ 30%
 *
 * @param {number | null} pct
 * @returns {SemaphoreLevel}
 */
export function rateEvolucionPatrimonial(pct) {
  if (pct === null || !Number.isFinite(pct)) {
    return "unknown"
  }
  if (pct > 50) {
    return "good"
  }
  if (pct > 30) {
    return "medium"
  }
  return "risky"
}

/**
 * @param {import("@/lib/creditPolicy/creditPolicyTypes").CreditPolicy} policy
 */
export function buildEvolucionPatrimonialEscala(policy) {
  const thresholds = getPolicyIndicatorThresholds(policy, "evolucion_patrimonial", {
    good: 50,
    medium: 30,
    modo: "higher",
  })
  const bueno = thresholds.good
  const medio = thresholds.medium
  return {
    bueno,
    medio,
    lineas: [
      `Bueno > ${bueno}%`,
      `Medio > ${medio}%`,
      `Riesgoso ≤ ${medio}%`,
    ],
  }
}

/**
 * @param {{
 *   variacionActivo: number | null;
 *   variacionPasivo: number | null;
 *   variacionPatrimonio: number | null;
 *   estadoEvolucionPatrimonial: SemaphoreLevel;
 * }} input
 * @returns {string}
 */
export function buildBalanceEvolutionComment(input, creditPolicy, textVars = {}) {
  const { variacionPatrimonio, estadoEvolucionPatrimonial } = input

  if (
    estadoEvolucionPatrimonial === "unknown" &&
    (variacionPatrimonio === null || !Number.isFinite(variacionPatrimonio))
  ) {
    return "No hay datos comparables entre ejercicios para evaluar la evolución patrimonial."
  }

  const policy = resolveCreditPolicy(creditPolicy)
  const key = resolveConclusionEvolutivaKey(input)
  const vars = buildPolicyTextVariables(textVars)
  return renderConclusionEvolutivaText(policy.textos, key, vars)
}

/** @typedef {"favorable" | "intermedio" | "riesgoso"} OpinionPatrimonialNivel */

export const PATRIMONIAL_OPINION_LABEL = {
  favorable: "Favorable",
  intermedio: "Intermedio",
  riesgoso: "Riesgoso",
}

/**
 * Dictamen patrimonial — conclusión analítica para el analista (no altera scoring global).
 *
 * @param {Parameters<typeof buildPatrimonialOpinion>[0]} balanceAnalysis
 * @param {{ creditPolicy?: unknown; textVars?: Record<string, number | null | undefined> }} [options]
 */
export function buildPatrimonialOpinion(balanceAnalysis, options = {}) {
  const estadoBalance = balanceAnalysis.estadoBalance ?? "unknown"
  const estadoEvolucionPatrimonial =
    balanceAnalysis.evolucionPatrimonial?.estadoEvolucionPatrimonial ??
    balanceAnalysis.estadoEvolucionPatrimonial ??
    "unknown"
  const semaforos = balanceAnalysis.semaforos ?? {}
  const variaciones = balanceAnalysis.variaciones ?? {}
  const liquidez = balanceAnalysis.indicadores?.liquidezCorriente ?? null
  const endeudamiento = balanceAnalysis.indicadores?.endeudamiento ?? null
  const variacionPatrimonio = variaciones.variacionPatrimonio ?? null
  const variacionActivo = variaciones.variacionActivo ?? null
  const variacionPasivo = variaciones.variacionPasivo ?? null

  /** @type {OpinionPatrimonialNivel} */
  let opinionPatrimonial = "intermedio"
  /** @type {SemaphoreLevel} */
  let semaforo = "medium"

  if (estadoBalance === "risky" || estadoEvolucionPatrimonial === "risky") {
    opinionPatrimonial = "riesgoso"
    semaforo = "risky"
  } else {
    const hasMedium = [
      estadoBalance,
      estadoEvolucionPatrimonial,
      semaforos.liquidez,
      semaforos.endeudamiento,
      semaforos.participacionPatrimonial,
      semaforos.variacionPatrimonio,
      semaforos.evolucionPatrimonial,
    ].some((level) => level === "medium")

    if (
      estadoBalance === "good" &&
      estadoEvolucionPatrimonial === "good" &&
      !hasMedium
    ) {
      opinionPatrimonial = "favorable"
      semaforo = "good"
    }
  }

  console.log("PATRIMONIAL OPINION DEBUG", {
    estadoBalance,
    estadoEvolucionPatrimonial,
    liquidez,
    endeudamiento,
    variacionPatrimonio,
    variacionActivo,
    variacionPasivo,
    opinionPatrimonial,
  })

  const policy = resolveCreditPolicy(options.creditPolicy)
  /** @type {"bueno" | "medio" | "riesgoso"} */
  const textKey =
    opinionPatrimonial === "favorable"
      ? "bueno"
      : opinionPatrimonial === "intermedio"
        ? "medio"
        : "riesgoso"
  const vars = buildPolicyTextVariables({
    liquidezCorriente: liquidez,
    endeudamiento,
    solvencia: balanceAnalysis.indicadores?.solvencia ?? null,
    patrimonioNeto: balanceAnalysis.comparativo?.patrimonioNetoActual ?? null,
    ...options.textVars,
  })

  return {
    opinionPatrimonial,
    semaforo,
    label: PATRIMONIAL_OPINION_LABEL[opinionPatrimonial],
    texto: renderDictamenPatrimonialText(policy.textos, textKey, vars),
  }
}

/**
 * @param {{
 *   label: string;
 *   ejercicioAnterior: string | null;
 *   valorAnterior: number | null;
 *   ejercicioActual: string | null;
 *   valorActual: number | null;
 *   variacionPct: number | null;
 * }} row
 */
function buildEvolutionRow(row) {
  return {
    label: row.label,
    ejercicioAnterior: row.ejercicioAnterior ?? "Ejercicio anterior",
    valorAnterior: row.valorAnterior,
    ejercicioActual: row.ejercicioActual ?? "Ejercicio actual",
    valorActual: row.valorActual,
    variacionPct: row.variacionPct,
  }
}

/**
 * @param {{
 *   liquidez: SemaphoreLevel;
 *   endeudamiento: SemaphoreLevel;
 *   participacionPatrimonial: SemaphoreLevel;
 *   variacionPatrimonio: SemaphoreLevel;
 * }} semaforos
 * @returns {SemaphoreLevel}
 */
function computeEstadoBalance(semaforos) {
  const critical = [
    semaforos.endeudamiento,
    semaforos.participacionPatrimonial,
    semaforos.variacionPatrimonio,
  ]

  if (critical.some((level) => level === "risky")) {
    return "risky"
  }

  const all = [
    semaforos.liquidez,
    semaforos.endeudamiento,
    semaforos.participacionPatrimonial,
    semaforos.variacionPatrimonio,
  ]
  const known = all.filter((level) => level !== "unknown")

  if (known.length === 0) {
    return "unknown"
  }

  if (known.every((level) => level === "good")) {
    return "good"
  }

  if (known.some((level) => level === "medium" || level === "risky")) {
    return "medium"
  }

  return "unknown"
}

/**
 * @param {SemaphoreLevel} estadoBalance
 * @param {unknown} [creditPolicy]
 * @param {Record<string, number | null | undefined>} [textVars]
 * @returns {string}
 */
function buildComentarioBalance(estadoBalance, creditPolicy, textVars = {}) {
  if (estadoBalance === "unknown") {
    return "Datos insuficientes en el balance para emitir una conclusión patrimonial automática."
  }

  const policy = resolveCreditPolicy(creditPolicy)
  /** @type {"bueno" | "medio" | "riesgoso"} */
  const key =
    estadoBalance === "good"
      ? "bueno"
      : estadoBalance === "medium"
        ? "medio"
        : "riesgoso"
  const vars = buildPolicyTextVariables(textVars)
  return renderComentarioBalanceText(policy.textos, key, vars)
}

function buildEmptyPatrimonialResult() {
  return {
    columnaActual: null,
    columnaAnterior: null,
    fechaCierreUltimo: null,
    fechaCierreAnterior: null,
    periodoReciente: null,
    periodoAnterior: null,
    ejercicioActual: null,
    ejercicioAnterior: null,
    indicadores: {
      liquidezCorriente: null,
      capitalTrabajo: null,
      endeudamiento: null,
      solvencia: null,
      participacionPatrimonial: null,
      coberturaPatrimonial: null,
    },
    comparativo: {
      activoTotalActual: null,
      activoTotalAnterior: null,
      pasivoTotalActual: null,
      pasivoTotalAnterior: null,
      patrimonioNetoActual: null,
      patrimonioNetoAnterior: null,
    },
    variaciones: {
      variacionActivo: null,
      variacionPasivo: null,
      variacionPatrimonio: null,
    },
    semaforos: {
      liquidez: /** @type {SemaphoreLevel} */ ("unknown"),
      endeudamiento: /** @type {SemaphoreLevel} */ ("unknown"),
      participacionPatrimonial: /** @type {SemaphoreLevel} */ ("unknown"),
      variacionPatrimonio: /** @type {SemaphoreLevel} */ ("unknown"),
      evolucionPatrimonial: /** @type {SemaphoreLevel} */ ("unknown"),
    },
    evolucionPatrimonial: {
      filas: [],
      comentarioEvolucion: buildBalanceEvolutionComment({
        variacionActivo: null,
        variacionPasivo: null,
        variacionPatrimonio: null,
        estadoEvolucionPatrimonial: "unknown",
      }),
      estadoEvolucionPatrimonial: /** @type {SemaphoreLevel} */ ("unknown"),
    },
    resumenPatrimonioNeto: null,
    estadoBalance: /** @type {SemaphoreLevel} */ ("unknown"),
    comentarioBalance: buildComentarioBalance("unknown"),
    dictamenPatrimonial: null,
  }
}

/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc} balanceContable
 */
/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc} balanceContable
 * @param {import("@/lib/creditPolicy/creditPolicyTypes").CreditPolicy} [policy]
 * @param {Record<string, number | null | undefined>} [textVars]
 */
function computePatrimonialBalanceMetrics(balanceContable, policy = resolveCreditPolicy(), textVars = {}) {
  const columnaActual = resolveColumnForHighestFechaCierreBalance(balanceContable)
  const columnaAnterior = columnaActual === "actual" ? "anterior" : "actual"
  const fechaCierreUltimoRaw = String(
    balanceContable[fechaCierreFieldForColumn(columnaActual)] ?? ""
  ).trim()
  const fechaCierreAnteriorRaw = String(
    balanceContable[fechaCierreFieldForColumn(columnaAnterior)] ?? ""
  ).trim()
  const fechaCierreUltimo =
    formatFechaCierreForDisplay(fechaCierreUltimoRaw) ||
    (fechaCierreUltimoRaw || null)
  const fechaCierreAnterior =
    formatFechaCierreForDisplay(fechaCierreAnteriorRaw) ||
    (fechaCierreAnteriorRaw || null)

  const periodoReciente = resolvePeriodoCierreLabel(
    balanceContable,
    columnaActual,
    columnaActual
  )
  const periodoAnterior = resolvePeriodoCierreLabel(
    balanceContable,
    columnaAnterior,
    columnaActual
  )

  const metricsActual = extractBalanceExerciseMetrics(
    balanceContableColumnToLegacyDoc(balanceContable, columnaActual)
  )
  const metricsAnterior = extractBalanceExerciseMetrics(
    balanceContableColumnToLegacyDoc(balanceContable, columnaAnterior)
  )

  const variacionActivo = percentVariation(
    metricsActual.activoTotal,
    metricsAnterior.activoTotal
  )
  const variacionPasivo = percentVariation(
    metricsActual.pasivoTotal,
    metricsAnterior.pasivoTotal
  )
  const variacionPatrimonio = percentVariation(
    metricsActual.patrimonioNeto,
    metricsAnterior.patrimonioNeto
  )

  const estadoEvolucionPatrimonial = rateFromPolicyIndicator(
    variacionPatrimonio,
    policy,
    "evolucion_patrimonial",
    rateEvolucionPatrimonial
  )

  const semaforos = {
    liquidez: rateFromPolicyIndicator(
      metricsActual.liquidezCorriente,
      policy,
      "liquidez_corriente",
      rateLiquidez
    ),
    endeudamiento: rateFromPolicyIndicator(
      metricsActual.endeudamiento,
      policy,
      "endeudamiento",
      rateEndeudamiento
    ),
    participacionPatrimonial: rateFromPolicyIndicator(
      metricsActual.participacionPatrimonial,
      policy,
      "participacion_patrimonial",
      rateParticipacionPatrimonial
    ),
    variacionPatrimonio: rateVariacionPatrimonio(variacionPatrimonio),
    evolucionPatrimonial: estadoEvolucionPatrimonial,
  }

  const patrimonialTextVars = {
    liquidezCorriente: metricsActual.liquidezCorriente,
    endeudamiento: metricsActual.endeudamiento,
    solvencia: metricsActual.solvencia,
    patrimonioNeto: metricsActual.patrimonioNeto,
    ...textVars,
  }

  const evolucionPatrimonial = {
    filas: [
      buildEvolutionRow({
        label: "Activo total",
        ejercicioAnterior: periodoAnterior,
        valorAnterior: metricsAnterior.activoTotal,
        ejercicioActual: periodoReciente,
        valorActual: metricsActual.activoTotal,
        variacionPct: variacionActivo,
      }),
      buildEvolutionRow({
        label: "Pasivo total",
        ejercicioAnterior: periodoAnterior,
        valorAnterior: metricsAnterior.pasivoTotal,
        ejercicioActual: periodoReciente,
        valorActual: metricsActual.pasivoTotal,
        variacionPct: variacionPasivo,
      }),
    ],
    comentarioEvolucion: buildBalanceEvolutionComment(
      {
        variacionActivo,
        variacionPasivo,
        variacionPatrimonio,
        estadoEvolucionPatrimonial,
      },
      policy,
      patrimonialTextVars
    ),
    estadoEvolucionPatrimonial,
    resumenPatrimonioNeto: {
      patrimonioActual: metricsActual.patrimonioNeto,
      patrimonioAnterior: metricsAnterior.patrimonioNeto,
      variacionPct: variacionPatrimonio,
      estadoEvolucionPatrimonial,
      escala: buildEvolucionPatrimonialEscala(policy),
    },
  }

  const estadoBalance = computeEstadoBalance(semaforos)
  const comentarioBalance = buildComentarioBalance(
    estadoBalance,
    policy,
    patrimonialTextVars
  )

  const patrimonialPayload = {
    estadoBalance,
    evolucionPatrimonial,
    comparativo: {
      patrimonioNetoActual: metricsActual.patrimonioNeto,
    },
    indicadores: {
      liquidezCorriente: metricsActual.liquidezCorriente,
      endeudamiento: metricsActual.endeudamiento,
      solvencia: metricsActual.solvencia,
    },
    variaciones: {
      variacionActivo,
      variacionPasivo,
      variacionPatrimonio,
    },
    semaforos,
  }

  const dictamenPatrimonial = buildPatrimonialOpinion(patrimonialPayload, {
    creditPolicy: policy,
    textVars: patrimonialTextVars,
  })

  console.log("BALANCE EVOLUTION DEBUG", {
    activoAnterior: metricsAnterior.activoTotal,
    activoActual: metricsActual.activoTotal,
    variacionActivo,
    pasivoAnterior: metricsAnterior.pasivoTotal,
    pasivoActual: metricsActual.pasivoTotal,
    variacionPasivo,
    patrimonioAnterior: metricsAnterior.patrimonioNeto,
    patrimonioActual: metricsActual.patrimonioNeto,
    variacionPatrimonio,
    estadoEvolucionPatrimonial,
  })

  console.log("BALANCE ANALYSIS DEBUG", {
    activoActual: metricsActual.activoTotal,
    pasivoActual: metricsActual.pasivoTotal,
    patrimonioActual: metricsActual.patrimonioNeto,
    activoAnterior: metricsAnterior.activoTotal,
    pasivoAnterior: metricsAnterior.pasivoTotal,
    patrimonioAnterior: metricsAnterior.patrimonioNeto,
    liquidez: metricsActual.liquidezCorriente,
    endeudamiento: metricsActual.endeudamiento,
    solvencia: metricsActual.solvencia,
    participacionPatrimonial: metricsActual.participacionPatrimonial,
    coberturaPatrimonial: metricsActual.coberturaPatrimonial,
    variacionActivo,
    variacionPasivo,
    variacionPatrimonio,
    estadoBalance,
  })

  return {
    columnaActual,
    columnaAnterior,
    fechaCierreUltimo,
    fechaCierreAnterior,
    periodoReciente,
    periodoAnterior,
    ejercicioActual: metricsActual.ejercicio,
    ejercicioAnterior: metricsAnterior.ejercicio,
    indicadores: {
      liquidezCorriente: metricsActual.liquidezCorriente,
      capitalTrabajo: metricsActual.capitalTrabajo,
      endeudamiento: metricsActual.endeudamiento,
      solvencia: metricsActual.solvencia,
      participacionPatrimonial: metricsActual.participacionPatrimonial,
      coberturaPatrimonial: metricsActual.coberturaPatrimonial,
    },
    comparativo: {
      activoTotalActual: metricsActual.activoTotal,
      activoTotalAnterior: metricsAnterior.activoTotal,
      pasivoTotalActual: metricsActual.pasivoTotal,
      pasivoTotalAnterior: metricsAnterior.pasivoTotal,
      patrimonioNetoActual: metricsActual.patrimonioNeto,
      patrimonioNetoAnterior: metricsAnterior.patrimonioNeto,
    },
    variaciones: {
      variacionActivo,
      variacionPasivo,
      variacionPatrimonio,
    },
    evolucionPatrimonial,
    semaforos,
    estadoBalance,
    comentarioBalance,
    dictamenPatrimonial,
  }
}

/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null | undefined} balanceContable
 * @param {{
 *   cuit?: string | null;
 *   savedAnalysis?: Record<string, unknown> | null;
 *   iva?: unknown;
 *   iibb?: unknown;
 *   ingresos?: {
 *     ventasIva?: number | null;
 *     ventasIibb?: number | null;
 *     promedioVentas?: number | null;
 *     peorSituacionBcra?: number | null;
 *   };
 *   creditPolicy?: unknown;
 *   textVars?: Record<string, number | null | undefined>;
 * }} [context]
 */
export function computeBalanceAnalysis(balanceContable, context = {}) {
  const policy = resolveCreditPolicy(context.creditPolicy)
  const textVars = context.textVars ?? {}
  const tipoContribuyente = resolveTipoContribuyente({
    cuit: context.cuit,
    savedAnalysis: context.savedAnalysis,
    balanceContable,
    iva: context.iva,
    iibb: context.iibb,
  })

  const estadoAnalisisBalance = resolveEstadoAnalisisBalance({
    tipoContribuyente,
    balanceContable,
  })

  const meta = {
    tipoContribuyente,
    estadoAnalisisBalance,
    mostrarIndicadoresPatrimoniales: false,
    mensajePrincipal: null,
    ingresosResumen: context.ingresos ?? null,
  }

  if (estadoAnalisisBalance === ESTADO_ANALISIS_BALANCE.SIN_BALANCE) {
    return {
      ...buildEmptyPatrimonialResult(),
      ...meta,
      disponible: true,
      mensajePrincipal: MENSAJE_PERSONA_FISICA_BALANCE,
      comentarioBalance: buildPersonaFisicaIngresosConclusion(context.ingresos ?? {}),
    }
  }

  if (estadoAnalisisBalance === ESTADO_ANALISIS_BALANCE.BALANCE_PENDIENTE) {
    return {
      ...buildEmptyPatrimonialResult(),
      ...meta,
      disponible: true,
      mensajePrincipal: MENSAJE_PERSONA_JURIDICA_SIN_BALANCE,
      comentarioBalance: MENSAJE_PERSONA_JURIDICA_SIN_BALANCE,
    }
  }

  if (!balanceContable || !hasBalanceContableIndicators(balanceContable)) {
    return {
      ...buildEmptyPatrimonialResult(),
      ...meta,
      estadoAnalisisBalance: ESTADO_ANALISIS_BALANCE.BALANCE_PENDIENTE,
      disponible: true,
      mensajePrincipal: MENSAJE_PERSONA_JURIDICA_SIN_BALANCE,
      comentarioBalance: MENSAJE_PERSONA_JURIDICA_SIN_BALANCE,
    }
  }

  const patrimonial = computePatrimonialBalanceMetrics(
    balanceContable,
    policy,
    textVars
  )

  return {
    ...patrimonial,
    ...meta,
    disponible: true,
    mostrarIndicadoresPatrimoniales: true,
    estadoAnalisisBalance: ESTADO_ANALISIS_BALANCE.CON_BALANCE,
  }
}

/**
 * @param {number | null} pct
 * @returns {string}
 */
export function formatBalanceVariationPercent(pct) {
  if (pct === null || !Number.isFinite(pct)) {
    return "—"
  }
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`
}

/**
 * @param {number | null} ratio
 * @returns {string}
 */
export function formatBalanceRatio(ratio) {
  if (ratio === null || !Number.isFinite(ratio)) {
    return "—"
  }
  return ratio.toLocaleString("es-AR", { maximumFractionDigits: 2 })
}
