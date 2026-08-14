/**
 * Política Crediticia SC-1.0 — contratos del producto comercial.
 *
 * Principio: el motor solo ejecuta la política. Cero reglas hardcodeadas.
 * Sin React, UI, Firestore ni algoritmo de cálculo.
 *
 * Paquete: src/lib/creditPolicy/sc1/
 * Legacy JS en ../ permanece hasta migración.
 */

/** Modelo de producto. */
export const CREDIT_POLICY_MODEL_ID = "SC-1.0" as const

export type CreditPolicyModelId = typeof CREDIT_POLICY_MODEL_ID | string

export type CreditPolicyKind = "default" | "custom"

/**
 * Ciclo de vida de la política.
 * `active` en meta.esActive es el flag operativo “esta es la vigente”.
 * `status` permite drafts / archivo sin borrar historial.
 */
export type CreditPolicyStatus = "draft" | "active" | "archived"

/** Dominio de la dimensión: alimenta Score Financiero vs Comercial. */
export type DimensionDomain = "financial" | "commercial" | "cross"

export type CreditPolicyDimensionType =
  | "ratio"
  | "boolean"
  | "ordinal"
  | "score"
  | "count"
  | "currency"
  | "months"
  | "custom"

/**
 * Operadores de regla (condición → puntaje).
 * Extensibles vía string en el futuro sin romper el union tipado.
 */
export type PolicyRuleOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "outside"
  | "in"
  | "not_in"
  | "missing"
  | "present"
  | "truthy"
  | "falsy"

export type BlockingResultStatus =
  | "approved"
  | "observed"
  | "rejected"
  | "blocked"
  | (string & {})

export type LimitRuleKind =
  | "months_of_sales"
  | "fixed_amount"
  | "percent_of_metric"
  | "deny"
  | "custom"

export type FindingSeverity = "info" | "warning" | "critical"

export type ConfidenceLevel = "high" | "medium" | "low"

/* ========================================================================== */
/* 1. Política Crediticia                                                     */
/* ========================================================================== */

export interface CreditPolicyMeta {
  id: string
  organizationId: string | null
  name: string
  description: string | null
  version: number
  /** draft | active | archived */
  status: CreditPolicyStatus
  /**
   * Flag operativo: como máximo una política activa por organización
   * (validado a nivel de servicio, no aquí).
   */
  isActive: boolean
  model: CreditPolicyModelId
  /** Rango global del Score Final. */
  scoreMin: number
  scoreMax: number
  /** Confianza mínima (0–1) para automatismos. */
  confidenceMin: number
  /** Auditoría de producto. */
  createdAt: string | null
  createdBy: string | null
  updatedAt: string | null
  updatedBy: string | null
}

/* ========================================================================== */
/* 2–3. Dimensiones + reglas configurables                                    */
/* ========================================================================== */

/**
 * Regla atómica: condición + operador + valor(es) → puntaje + observación.
 *
 * Ejemplo Liquidez:
 *   field=ratios.liquidityCurrent, op=gte, value=2, points=100
 *   field=..., op=between, value=1, valueTo=2, points=70
 *   field=..., op=lt, value=1, points=20
 */
export interface CreditPolicyDimensionRule {
  id: string
  enabled: boolean
  /** Nombre corto de la condición (UI / auditoría). */
  name: string
  /**
   * Campo de métrica a evaluar.
   * Si null, usa dimension.metricKey.
   */
  field: string | null
  operator: PolicyRuleOperator
  /** Valor principal (número, string, boolean, o lista para in/not_in). */
  value: unknown
  /** Segundo valor para `between` / `outside`. */
  valueTo: unknown
  /** Puntaje obtenido si la regla matchea. */
  points: number
  /** Severidad del finding (opcional; default info en el Rule Engine). */
  severity?: FindingSeverity
  /** Mensaje corto (si falta, se usa observation). */
  message?: string | null
  /** Observación / justificación visible en breakdown. */
  observation: string | null
  /** Menor = se evalúa primero; primera match gana (política de evaluación). */
  priority: number
}

/**
 * Dimensión 100% configurable por el cliente.
 * Agregar una dimensión nueva = agregar un objeto; el motor itera la lista.
 */
export interface CreditPolicyDimension {
  id: string
  name: string
  label: string
  description: string | null
  /** Habilitada para el cálculo. */
  enabled: boolean
  /** Peso % entre dimensiones enabled (suma = 100). */
  weight: number
  type: CreditPolicyDimensionType
  /** financial | commercial | cross → agregación de scores. */
  domain: DimensionDomain
  /**
   * Clave de métrica por defecto (ej. "ratios.liquidityCurrent").
   * Abierta: no hay enum cerrado en el motor.
   */
  metricKey: string | null
  /** Piso / techo del puntaje parcial de la dimensión. */
  scoreMin: number
  scoreMax: number
  /** Reglas de conversión indicador → puntaje. */
  rules: CreditPolicyDimensionRule[]
  /** Si ninguna regla matchea. */
  defaultPoints: number | null
  /** Params libres (flags, umbrales auxiliares). */
  params: Record<string, unknown>
}

/* ========================================================================== */
/* 4. Bloqueo (independiente del Score)                                       */
/* ========================================================================== */

export interface CreditPolicyBlockingCondition {
  field: string
  operator: PolicyRuleOperator
  value?: unknown
  valueTo?: unknown
}

export interface CreditPolicyBlockingRule {
  id: string
  enabled: boolean
  name: string
  description: string | null
  conditions: CreditPolicyBlockingCondition[]
  resultStatus: BlockingResultStatus
  priority: number
  message: string | null
}

/* ========================================================================== */
/* 5. Categorías del Score Final                                              */
/* ========================================================================== */

export interface CreditPolicyCategory {
  id: string
  code: string
  label: string
  min: number
  max: number
  minInclusive: boolean
  maxInclusive: boolean
  order: number
  description: string | null
}

/* ========================================================================== */
/* 6. Límite sugerido (contrato)                                              */
/* ========================================================================== */

export interface CreditPolicyLimitRule {
  id: string
  categoryCode: string
  kind: LimitRuleKind
  monthsOfSales: number | null
  amount: number | null
  percent: number | null
  metricKey: string | null
  deny: boolean
  label: string | null
  /** Plazo máximo en meses (opcional). */
  maxTermMonths?: number | null
  /** Frecuencia de revisión en días (opcional). */
  reviewFrequencyDays?: number | null
  params: Record<string, unknown>
}

export interface CreditPolicyLimitEngine {
  enabled: boolean
  baseMetricKey: string
  /** Moneda ISO del motor de límite (ej. ARS). */
  currency?: string | null
  rules: CreditPolicyLimitRule[]
  fallback: CreditPolicyLimitRule | null
  description: string | null
}

/* ========================================================================== */
/* 7. Recomendaciones configurables                                           */
/* ========================================================================== */

export interface CreditPolicyRecommendationTrigger {
  dimensionId: string | null
  field: string | null
  operator: PolicyRuleOperator
  value?: unknown
  valueTo?: unknown
  dimensionScoreBelow: number | null
}

export interface CreditPolicyRecommendationRule {
  id: string
  enabled: boolean
  name: string
  dimensionId: string | null
  trigger: CreditPolicyRecommendationTrigger
  action: string
  severity: FindingSeverity
  priority: number
  message: string | null
}

/* ========================================================================== */
/* Documento completo                                                         */
/* ========================================================================== */

/**
 * Documento canónico editable desde Ajustes (futuro).
 * Una organización puede tener muchas políticas; una isActive=true vigente.
 */
export interface CreditPolicyDocument {
  schemaVersion: number
  kind: CreditPolicyKind
  basedOnPolicyId: string | null
  meta: CreditPolicyMeta
  dimensions: CreditPolicyDimension[]
  blockingRules: CreditPolicyBlockingRule[]
  categories: CreditPolicyCategory[]
  limitEngine: CreditPolicyLimitEngine
  recommendations: CreditPolicyRecommendationRule[]
  extensions: Record<string, unknown>
}

/* ========================================================================== */
/* Validación / catálogo                                                      */
/* ========================================================================== */

export interface CreditPolicyValidationIssue {
  code: string
  message: string
  path?: string
}

export interface CreditPolicyValidationResult {
  valid: boolean
  errors: CreditPolicyValidationIssue[]
  warnings: CreditPolicyValidationIssue[]
  enabledWeightTotal: number | null
}

export interface CreditPolicyDimensionCatalogEntry {
  id: string
  name: string
  label: string
  type: CreditPolicyDimensionType
  domain: DimensionDomain
  description: string | null
  defaultMetricKey: string | null
  builtIn: boolean
}

/**
 * Projection que el Score Engine consumirá (sin bloqueo/límites).
 */
export interface CreditPolicyScoreProjection {
  policyId: string
  policyVersion: number
  policyName: string
  model: CreditPolicyModelId
  scoreMin: number
  scoreMax: number
  confidenceMin: number
  dimensions: CreditPolicyDimension[]
  categories: CreditPolicyCategory[]
}

/* ========================================================================== */
/* Resultado del motor (contrato de salida) — sin algoritmo aún               */
/* ========================================================================== */

export interface OwnScoreValue {
  value: number | null
  /** Código de categoría (AAA…) si aplica. */
  categoryCode: string | null
  categoryLabel: string | null
}

export interface OwnScoreConfidence {
  value: number
  level: ConfidenceLevel
  label: string
  missing: string[]
}

export interface OwnScoreFinding {
  id: string
  text: string
  severity?: FindingSeverity
  dimensionId?: string
  ruleId?: string
}

export interface OwnScoreRuleMatch {
  ruleId: string
  matched: boolean
  points: number | null
  observation: string | null
}

export interface OwnScoreDimensionBreakdown {
  dimensionId: string
  label: string
  domain: DimensionDomain
  enabled: boolean
  weight: number
  scoreMin: number
  scoreMax: number
  /** Puntaje parcial de la dimensión. */
  score: number | null
  /** Aporte ponderado al score agregado. */
  contribution: number | null
  metricKey: string | null
  metricValue: unknown
  matchedRuleId: string | null
  ruleMatches: OwnScoreRuleMatch[]
  observations: string[]
}

/**
 * Resultado canónico del Score Propio.
 * NOSIS no entra aquí.
 */
export interface OwnCreditScoreResult {
  schemaVersion: number
  model: CreditPolicyModelId
  financialScore: OwnScoreValue
  commercialScore: OwnScoreValue
  finalScore: OwnScoreValue
  confidence: OwnScoreConfidence
  breakdown: OwnScoreDimensionBreakdown[]
  strengths: OwnScoreFinding[]
  weaknesses: OwnScoreFinding[]
  observations: OwnScoreFinding[]
  recommendations: OwnScoreFinding[]
  /** Trazabilidad SaaS / Historial. */
  policy: {
    id: string
    name: string
    version: number
    kind: CreditPolicyKind
  }
  computedAt: string | null
  status: "ok" | "invalid_policy" | "insufficient_data" | "not_implemented"
}

/* ========================================================================== */
/* NOSIS — almacenamiento externo (NO es Score Propio)                        */
/* ========================================================================== */

export type NosisExternalStatus =
  | "APROBADO"
  | "OBSERVADO"
  | "RECHAZADO"
  | "SIN_DATO"
  | (string & {})

/**
 * Snapshot de información externa NOSIS.
 * El cliente podrá, más adelante, mapearlo a una dimensión vía política.
 * Por defecto no participa del Score Propio.
 */
export interface NosisExternalRecord {
  score: number | null
  status: NosisExternalStatus
  /** ISO 8601 */
  date: string | null
  provider: string
  rawRef?: string | null
  notes?: string | null
}
