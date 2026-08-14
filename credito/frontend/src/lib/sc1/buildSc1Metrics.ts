/**
 * Adapter: análisis legacy → RuleEngineMetrics (SC-1.0).
 *
 * Solo mapeo de datos existentes. Sin reglas de negocio ni umbrales.
 */

import type { RuleEngineMetrics } from "@/lib/creditScore/ruleEngine/ruleEngineTypes"

export interface BuildSc1MetricsInput {
  /** Resultado de buildCreditAnalysis (+ preCal merge). */
  computed: Record<string, unknown> | null | undefined
  /** Decisión de cobertura operativa (evaluateCoverageDecision). */
  coverageDecision?: {
    resultadoCobertura?: string | null
  } | null
  /** BCRA del legajo (peorSituacion, etc.). */
  bcra?: {
    peorSituacion?: number | null
    deudaTotal?: number | null
    [key: string]: unknown
  } | null
  /** Fecha de inicio de actividad (ISO / date string). */
  fechaInicioActividad?: string | null
  /** Moneda informativa (no usada por score; queda en metrics.meta). */
  currency?: string | null
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {}
}

/**
 * Antigüedad en años a partir de fecha de inicio (mapeo puro).
 */
export function mapSeniorityYears(
  fechaInicioActividad: string | null | undefined,
  asOf: Date = new Date()
): number | null {
  if (!fechaInicioActividad) return null
  const start = new Date(fechaInicioActividad)
  if (Number.isNaN(start.getTime())) return null
  const ms = asOf.getTime() - start.getTime()
  if (!Number.isFinite(ms) || ms < 0) return 0
  return Math.floor((ms / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10
}

function mapDocumentationFlags(
  computed: Record<string, unknown>
): Record<string, unknown> {
  const dq = asRecord(
    computed.documentQualityScore ?? computed.documentQuality
  )
  const breakdown = Array.isArray(dq.breakdown) ? dq.breakdown : []
  /** @type {Map<string, number>} */
  const pointsById = new Map()
  for (const row of breakdown) {
    const r = asRecord(row)
    if (typeof r.id === "string") {
      pointsById.set(r.id, asFiniteNumber(r.points) ?? 0)
    }
  }

  const balanceValidation = asRecord(computed.balanceValidation)
  const balanceCurrent =
    Boolean(balanceValidation.canScoreFinancial) ||
    (pointsById.get("balance_completo") ?? 0) > 0

  const ivaPresented = (pointsById.get("iva") ?? 0) > 0
  const iibbPresented = (pointsById.get("iibb") ?? 0) > 0
  const qualityScore = asFiniteNumber(dq.score)
  const minimumComplete =
    balanceCurrent && (ivaPresented || iibbPresented)

  return {
    qualityScore,
    balanceCurrent,
    ivaPresented,
    iibbPresented,
    minimumComplete,
  }
}

/**
 * Transforma el análisis actual en métricas tipadas para el Score Engine.
 */
export function buildSc1Metrics(
  input: BuildSc1MetricsInput
): RuleEngineMetrics {
  const computed = asRecord(input.computed)
  const capacidad = asRecord(computed.capacidadEconomica)
  const comportamiento = asRecord(computed.comportamientoComercial)
  const scoreDebug = asRecord(computed.scoreDebug)
  const debugMetrics = asRecord(scoreDebug.metrics)
  const nosis = asRecord(computed.nosisAnalisis)
  const bcra = input.bcra ?? {}

  const liquidityCurrent =
    asFiniteNumber(capacidad.liquidezCorriente) ??
    asFiniteNumber(debugMetrics.liquidezCorriente)

  const debtRatio =
    asFiniteNumber(capacidad.endeudamiento) ??
    asFiniteNumber(debugMetrics.endeudamiento)

  const profitability =
    asFiniteNumber(capacidad.rentabilidad) ??
    asFiniteNumber(debugMetrics.rentabilidad) ??
    asFiniteNumber(debugMetrics.participacionPatrimonial)

  const worstSituation =
    asFiniteNumber(bcra.peorSituacion) ??
    asFiniteNumber(nosis.situacionBcra)

  const rejectedCount =
    asFiniteNumber(comportamiento.cantidadRechazados) ??
    asFiniteNumber(nosis.cantidadCheques) ??
    0

  const behaviorScore = asFiniteNumber(comportamiento.scoreComportamiento)

  const coverageStatus =
    input.coverageDecision?.resultadoCobertura ??
    (typeof computed.resultadoCobertura === "string"
      ? computed.resultadoCobertura
      : null)

  const documentation = mapDocumentationFlags(computed)

  return {
    ratios: {
      liquidityCurrent,
      debtRatio,
      profitability,
    },
    company: {
      seniorityYears: mapSeniorityYears(input.fechaInicioActividad ?? null),
    },
    documentation,
    bcra: {
      worstSituation,
      debtAmount: asFiniteNumber(bcra.deudaTotal),
      riskFlag:
        typeof bcra.riskFlag === "boolean" ? bcra.riskFlag : null,
    },
    checks: {
      rejectedCount,
    },
    coverage: {
      status: coverageStatus,
    },
    activity: {
      riskLevel: null,
    },
    commercial: {
      behaviorScore,
    },
    // Aliases flat (getMetricValue también resuelve path anidado)
    "ratios.liquidityCurrent": liquidityCurrent,
    "ratios.debtRatio": debtRatio,
    "ratios.profitability": profitability,
    "company.seniorityYears": mapSeniorityYears(
      input.fechaInicioActividad ?? null
    ),
    "documentation.qualityScore": documentation.qualityScore,
    "documentation.balanceCurrent": documentation.balanceCurrent,
    "documentation.ivaPresented": documentation.ivaPresented,
    "documentation.iibbPresented": documentation.iibbPresented,
    "documentation.minimumComplete": documentation.minimumComplete,
    "bcra.worstSituation": worstSituation,
    "checks.rejectedCount": rejectedCount,
    "coverage.status": coverageStatus,
    "activity.riskLevel": null,
    "commercial.behaviorScore": behaviorScore,
  }
}
