/**
 * Contrato Score Propio SC-1.0 — tipos del motor configurable.
 * Sin React, UI, hooks ni Firestore.
 */

export const SCORE_MODEL_ID = "SC-1.0" as const

export type ScoreModelId = typeof SCORE_MODEL_ID | string

/** Categoría de un score 0–100 (o unknown si no hay valor). */
export type ScoreCategory =
  | "excellent"
  | "very_good"
  | "acceptable"
  | "risk"
  | "critical"
  | "unknown"

export type ConfidenceLevel = "high" | "medium" | "low"

export type FindingSeverity = "info" | "warning" | "critical"

/**
 * IDs de dimensiones conocidas del modelo.
 * El motor acepta cualquier string adicional (extensibilidad).
 */
export type BuiltInScoreDimensionId =
  | "liquidity"
  | "debt"
  | "profitability"
  | "documentation"
  | "bcra"
  | "checks"
  | "seniority"
  | "coverage"

/**
 * Dimensión de scoring: built-in o custom (riesgoActividad, ventas, nosis, etc.).
 * NOSIS puede existir como dimensión futura vía config; no está en el Default.
 */
export type ScoreDimensionId = BuiltInScoreDimensionId | (string & {})

/** Pesos por dimensión (%). Claves extensibles sin cambiar el motor. */
export type ScoreWeightMap = Record<ScoreDimensionId, number>

export type ScoreProfileKind = "default" | "custom"

/** Escalas de clasificación sobre valor 0–100. */
export interface ScoreClassificationScales {
  excelenteMin: number
  muyBuenoMin: number
  aceptableMin: number
  riesgoMin: number
}

export interface ScoreValue {
  value: number | null
  category: ScoreCategory
  categoryLabel: string
}

export interface ScoreConfidence {
  /** 0–1 */
  value: number
  level: ConfidenceLevel
  label: string
  /** Claves de métricas / dimensiones faltantes */
  missing: string[]
}

export interface ScoreFinding {
  id: string
  text: string
  severity?: FindingSeverity
  /** Dimensión asociada, si aplica */
  dimensionId?: ScoreDimensionId
}

/**
 * Desglose por dimensión (preparado para el algoritmo futuro).
 */
export interface ScoreDimensionBreakdown {
  dimensionId: ScoreDimensionId
  weight: number
  /** Aporte 0–100 normalizado o null si aún no calculado */
  contribution: number | null
  /** Score parcial de la dimensión 0–100 */
  score: number | null
  label?: string
  notes?: string[]
}

/**
 * Resultado canónico del Score Propio.
 * NOSIS no forma parte de este contrato (se muestra por separado).
 */
export interface CreditScoreResult {
  scoreModel: ScoreModelId
  schemaVersion: number
  financialScore: ScoreValue
  commercialScore: ScoreValue
  finalScore: ScoreValue
  confidence: ScoreConfidence
  strengths: ScoreFinding[]
  weaknesses: ScoreFinding[]
  observations: ScoreFinding[]
  recommendations: ScoreFinding[]
  breakdown: ScoreDimensionBreakdown[]
  /** ISO o null — el stub no calcula timestamp real */
  computedAt: string | null
}

/**
 * Métricas de entrada al motor.
 * Estructura abierta: el algoritmo futuro mapeará claves a dimensiones.
 */
export type ScoreMetrics = Record<string, unknown>

/**
 * Configuración completa del scoring (perfil Default o Personalizado).
 */
export interface ScoreConfig {
  scoreModel: ScoreModelId
  schemaVersion: number
  profile: {
    kind: ScoreProfileKind
    /** id estable del perfil (ej. "default", "custom:<clientId>") */
    id: string
    /** Nombre legible; null en stub */
    name: string | null
    /** Si es custom, id del perfil base del que se copió */
    basedOn?: string | null
  }
  /** Pesos % — deben sumar 100 (validado por scoreValidator) */
  weights: ScoreWeightMap
  scales: ScoreClassificationScales
  /**
   * Extensiones futuras (umbrales por dimensión, flags, etc.)
   * sin romper el contrato del motor.
   */
  extensions?: Record<string, unknown>
}

export interface ScoreValidationIssue {
  code: string
  message: string
  path?: string
}

export interface ScoreValidationResult {
  valid: boolean
  errors: ScoreValidationIssue[]
  warnings: ScoreValidationIssue[]
  /** Suma de pesos observada (o null si no se pudo calcular) */
  weightTotal: number | null
}

/**
 * Entrada del motor: métricas + configuración.
 */
export interface ScoreEngineInput {
  metrics: ScoreMetrics
  config: ScoreConfig
}
