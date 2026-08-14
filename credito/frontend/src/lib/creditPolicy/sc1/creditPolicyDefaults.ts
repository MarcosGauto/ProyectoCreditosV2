/**
 * Política Default SC-1.0 — esqueleto comercial.
 *
 * Dimensiones y pesos son ilustrativos.
 * Las reglas de ejemplo muestran la FORMA del contrato; no son valores
 * definitivos de negocio (varias dimensiones quedan con rules=[]).
 *
 * No calcula score. No persiste. No es UI.
 */

import {
  CREDIT_POLICY_MODEL_ID,
  type CreditPolicyCategory,
  type CreditPolicyDimension,
  type CreditPolicyDimensionRule,
  type CreditPolicyDocument,
  type CreditPolicyLimitEngine,
} from "./creditPolicyTypes"

export const DEFAULT_CREDIT_POLICY_ID = "default"

function rule(
  partial: Omit<CreditPolicyDimensionRule, "enabled" | "valueTo" | "observation"> &
    Partial<
      Pick<CreditPolicyDimensionRule, "enabled" | "valueTo" | "observation">
    >
): CreditPolicyDimensionRule {
  return {
    enabled: partial.enabled ?? true,
    valueTo: partial.valueTo ?? null,
    observation: partial.observation ?? null,
    ...partial,
  }
}

/**
 * Ejemplo estructural de reglas de Liquidez (NO definitivas).
 * liquidez >= 2 → 100; entre 1 y 2 → 70; < 1 → 20
 */
const LIQUIDITY_RULES_EXAMPLE: CreditPolicyDimensionRule[] = [
  rule({
    id: "liquidity.gte.2",
    name: "Liquidez alta",
    field: null,
    operator: "gte",
    value: 2,
    points: 100,
    priority: 10,
    observation: "Liquidez >= 2",
  }),
  rule({
    id: "liquidity.between.1.2",
    name: "Liquidez media",
    field: null,
    operator: "between",
    value: 1,
    valueTo: 2,
    points: 70,
    priority: 20,
    observation: "Liquidez entre 1 y 2",
  }),
  rule({
    id: "liquidity.lt.1",
    name: "Liquidez baja",
    field: null,
    operator: "lt",
    value: 1,
    points: 20,
    priority: 30,
    observation: "Liquidez < 1",
  }),
]

function dim(
  partial: CreditPolicyDimension
): CreditPolicyDimension {
  return {
    ...partial,
    rules: partial.rules.map((r) => ({ ...r })),
    params: { ...partial.params },
  }
}

const DEFAULT_DIMENSIONS: CreditPolicyDimension[] = [
  dim({
    id: "liquidity",
    name: "Liquidez",
    label: "Liquidez",
    description: "Capacidad de cubrir pasivos de corto plazo.",
    enabled: true,
    weight: 15,
    type: "ratio",
    domain: "financial",
    metricKey: "ratios.liquidityCurrent",
    scoreMin: 0,
    scoreMax: 100,
    rules: LIQUIDITY_RULES_EXAMPLE,
    defaultPoints: null,
    params: {},
  }),
  dim({
    id: "debt",
    name: "Endeudamiento",
    label: "Endeudamiento",
    description: "Nivel de apalancamiento.",
    enabled: true,
    weight: 12,
    type: "ratio",
    domain: "financial",
    metricKey: "ratios.debtRatio",
    scoreMin: 0,
    scoreMax: 100,
    rules: [],
    defaultPoints: null,
    params: {},
  }),
  dim({
    id: "profitability",
    name: "Rentabilidad",
    label: "Rentabilidad",
    description: "Resultado / rentabilidad.",
    enabled: true,
    weight: 12,
    type: "ratio",
    domain: "financial",
    metricKey: "ratios.profitability",
    scoreMin: 0,
    scoreMax: 100,
    rules: [],
    defaultPoints: null,
    params: {},
  }),
  dim({
    id: "seniority",
    name: "Antigüedad",
    label: "Antigüedad",
    description: "Antigüedad de la actividad.",
    enabled: true,
    weight: 5,
    type: "months",
    domain: "cross",
    metricKey: "company.seniorityYears",
    scoreMin: 0,
    scoreMax: 100,
    rules: [],
    defaultPoints: null,
    params: {},
  }),
  dim({
    id: "documentation",
    name: "Documentación",
    label: "Documentación",
    description: "Completitud y vigencia documental.",
    enabled: true,
    weight: 12,
    type: "score",
    domain: "cross",
    metricKey: "documentation.qualityScore",
    scoreMin: 0,
    scoreMax: 100,
    rules: [],
    defaultPoints: null,
    params: {},
  }),
  dim({
    id: "bcra",
    name: "BCRA",
    label: "BCRA",
    description: "Peor situación BCRA.",
    enabled: true,
    weight: 10,
    type: "ordinal",
    domain: "commercial",
    metricKey: "bcra.worstSituation",
    scoreMin: 0,
    scoreMax: 100,
    rules: [],
    defaultPoints: null,
    params: {},
  }),
  dim({
    id: "checks",
    name: "Cheques",
    label: "Cheques rechazados",
    description: "Historial de cheques rechazados.",
    enabled: true,
    weight: 10,
    type: "count",
    domain: "commercial",
    metricKey: "checks.rejectedCount",
    scoreMin: 0,
    scoreMax: 100,
    rules: [],
    defaultPoints: null,
    params: {},
  }),
  dim({
    id: "coverage",
    name: "Cobertura",
    label: "Cobertura",
    description: "Resultado de cobertura operativa.",
    enabled: true,
    weight: 8,
    type: "ordinal",
    domain: "cross",
    metricKey: "coverage.status",
    scoreMin: 0,
    scoreMax: 100,
    rules: [],
    defaultPoints: null,
    params: {},
  }),
  dim({
    id: "activity",
    name: "Actividad",
    label: "Actividad",
    description: "Riesgo / perfil de actividad económica.",
    enabled: true,
    weight: 8,
    type: "ordinal",
    domain: "commercial",
    metricKey: "activity.riskLevel",
    scoreMin: 0,
    scoreMax: 100,
    rules: [],
    defaultPoints: null,
    params: {},
  }),
  dim({
    id: "commercial_behavior",
    name: "Comportamiento comercial",
    label: "Comportamiento comercial",
    description: "Historial y comportamiento de pago / comercial.",
    enabled: true,
    weight: 8,
    type: "score",
    domain: "commercial",
    metricKey: "commercial.behaviorScore",
    scoreMin: 0,
    scoreMax: 100,
    rules: [],
    defaultPoints: null,
    params: {},
  }),
]

/** Pesos: 15+12+12+5+12+10+10+8+8+8 = 100 */

const DEFAULT_CATEGORIES: CreditPolicyCategory[] = [
  {
    id: "cat.aaa",
    code: "AAA",
    label: "Excelente",
    min: 950,
    max: 1000,
    minInclusive: true,
    maxInclusive: true,
    order: 0,
    description: null,
  },
  {
    id: "cat.aa",
    code: "AA",
    label: "Muy Bueno",
    min: 850,
    max: 949,
    minInclusive: true,
    maxInclusive: true,
    order: 1,
    description: null,
  },
  {
    id: "cat.a",
    code: "A",
    label: "Bueno",
    min: 750,
    max: 849,
    minInclusive: true,
    maxInclusive: true,
    order: 2,
    description: null,
  },
  {
    id: "cat.bbb",
    code: "BBB",
    label: "Aceptable",
    min: 650,
    max: 749,
    minInclusive: true,
    maxInclusive: true,
    order: 3,
    description: null,
  },
  {
    id: "cat.bb",
    code: "BB",
    label: "Observado",
    min: 550,
    max: 649,
    minInclusive: true,
    maxInclusive: true,
    order: 4,
    description: null,
  },
  {
    id: "cat.b",
    code: "B",
    label: "Crítico",
    min: 0,
    max: 549,
    minInclusive: true,
    maxInclusive: true,
    order: 5,
    description: null,
  },
]

const DEFAULT_LIMIT_ENGINE: CreditPolicyLimitEngine = {
  enabled: true,
  baseMetricKey: "sales.monthlyAverage",
  description: "Límite sugerido por categoría (contrato; sin motor activo).",
  rules: [
    {
      id: "limit.aaa",
      categoryCode: "AAA",
      kind: "months_of_sales",
      monthsOfSales: 8,
      amount: null,
      percent: null,
      metricKey: null,
      deny: false,
      label: "8 meses de ventas",
      params: {},
    },
    {
      id: "limit.aa",
      categoryCode: "AA",
      kind: "months_of_sales",
      monthsOfSales: 6,
      amount: null,
      percent: null,
      metricKey: null,
      deny: false,
      label: "6 meses de ventas",
      params: {},
    },
    {
      id: "limit.a",
      categoryCode: "A",
      kind: "months_of_sales",
      monthsOfSales: 4,
      amount: null,
      percent: null,
      metricKey: null,
      deny: false,
      label: "4 meses de ventas",
      params: {},
    },
    {
      id: "limit.bbb",
      categoryCode: "BBB",
      kind: "months_of_sales",
      monthsOfSales: 2,
      amount: null,
      percent: null,
      metricKey: null,
      deny: false,
      label: "2 meses de ventas",
      params: {},
    },
    {
      id: "limit.bb",
      categoryCode: "BB",
      kind: "months_of_sales",
      monthsOfSales: 1,
      amount: null,
      percent: null,
      metricKey: null,
      deny: false,
      label: "1 mes de ventas",
      params: {},
    },
    {
      id: "limit.b",
      categoryCode: "B",
      kind: "deny",
      monthsOfSales: null,
      amount: null,
      percent: null,
      metricKey: null,
      deny: true,
      label: "No otorgar",
      params: {},
    },
  ],
  fallback: {
    id: "limit.fallback",
    categoryCode: "*",
    kind: "deny",
    monthsOfSales: null,
    amount: null,
    percent: null,
    metricKey: null,
    deny: true,
    label: "Sin categoría — no otorgar",
    params: {},
  },
}

export function createDefaultCreditPolicyDocument(
  audit?: { createdBy?: string | null; at?: string | null }
): CreditPolicyDocument {
  const at = audit?.at ?? null
  const by = audit?.createdBy ?? null

  return {
    schemaVersion: 1,
    kind: "default",
    basedOnPolicyId: null,
    meta: {
      id: DEFAULT_CREDIT_POLICY_ID,
      organizationId: null,
      name: "Política Default",
      description:
        "Política Crediticia SC-1.0 de producto. Cada empresa puede copiarla y personalizarla desde Ajustes.",
      version: 1,
      status: "active",
      isActive: true,
      model: CREDIT_POLICY_MODEL_ID,
      scoreMin: 0,
      scoreMax: 1000,
      confidenceMin: 0.5,
      createdAt: at,
      createdBy: by,
      updatedAt: at,
      updatedBy: by,
    },
    dimensions: DEFAULT_DIMENSIONS.map((d) => dim(d)),
    blockingRules: [
      {
        id: "block.coverage.sin",
        enabled: false,
        name: "Sin cobertura",
        description: "SI Cobertura = SIN → Observado.",
        conditions: [
          { field: "coverage.status", operator: "eq", value: "SIN" },
        ],
        resultStatus: "observed",
        priority: 20,
        message: "Sin cobertura operativa.",
      },
      {
        id: "block.bcra.high",
        enabled: false,
        name: "BCRA elevado",
        description: "SI BCRA > 3 → Rechazado.",
        conditions: [
          { field: "bcra.worstSituation", operator: "gt", value: 3 },
        ],
        resultStatus: "rejected",
        priority: 10,
        message: "Situación BCRA incompatible.",
      },
    ],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    limitEngine: {
      ...DEFAULT_LIMIT_ENGINE,
      rules: DEFAULT_LIMIT_ENGINE.rules.map((r) => ({
        ...r,
        params: { ...r.params },
      })),
      fallback: DEFAULT_LIMIT_ENGINE.fallback
        ? {
            ...DEFAULT_LIMIT_ENGINE.fallback,
            params: { ...DEFAULT_LIMIT_ENGINE.fallback.params },
          }
        : null,
    },
    recommendations: [
      {
        id: "rec.liquidity.low",
        enabled: false,
        name: "Liquidez baja",
        dimensionId: "liquidity",
        trigger: {
          dimensionId: "liquidity",
          field: null,
          operator: "lt",
          dimensionScoreBelow: 40,
        },
        action: "Solicitar garantía",
        severity: "warning",
        priority: 10,
        message: null,
      },
      {
        id: "rec.documentation.incomplete",
        enabled: false,
        name: "Documentación incompleta",
        dimensionId: "documentation",
        trigger: {
          dimensionId: "documentation",
          field: "documentation.incomplete",
          operator: "truthy",
          dimensionScoreBelow: null,
        },
        action: "Solicitar Balance",
        severity: "warning",
        priority: 20,
        message: null,
      },
      {
        id: "rec.checks.rejected",
        enabled: false,
        name: "Cheques rechazados",
        dimensionId: "checks",
        trigger: {
          dimensionId: "checks",
          field: "checks.rejectedCount",
          operator: "gt",
          value: 0,
          dimensionScoreBelow: null,
        },
        action: "Reducir plazo",
        severity: "critical",
        priority: 5,
        message: null,
      },
    ],
    extensions: {
      nosisInOwnScore: false,
      evaluationStrategy: "first_match_by_priority",
      notes:
        "Reglas de ejemplo solo en Liquidez. Resto pendiente de configuración en Ajustes.",
    },
  }
}

export function cloneCreditPolicyForOrganization(
  organizationId: string,
  options?: {
    id?: string
    name?: string
    base?: CreditPolicyDocument
    createdBy?: string | null
    at?: string | null
  }
): CreditPolicyDocument {
  const base = options?.base ?? createDefaultCreditPolicyDocument()
  const at = options?.at ?? new Date().toISOString()
  const by = options?.createdBy ?? null
  const id = options?.id ?? `org:${organizationId}:policy`

  const cloned = structuredClone(base)
  cloned.kind = "custom"
  cloned.basedOnPolicyId = base.meta.id
  cloned.meta = {
    ...cloned.meta,
    id,
    organizationId,
    name: options?.name ?? `Política ${organizationId}`,
    version: 1,
    status: "draft",
    isActive: false,
    createdAt: at,
    createdBy: by,
    updatedAt: at,
    updatedBy: by,
  }
  return cloned
}

/** Resultado vacío tipado (sin algoritmo). */
export function createEmptyOwnCreditScoreResult(
  policy: CreditPolicyDocument
): import("./creditPolicyTypes").OwnCreditScoreResult {
  return {
    schemaVersion: 1,
    model: policy.meta.model,
    financialScore: { value: null, categoryCode: null, categoryLabel: null },
    commercialScore: { value: null, categoryCode: null, categoryLabel: null },
    finalScore: { value: null, categoryCode: null, categoryLabel: null },
    confidence: {
      value: 0,
      level: "low",
      label: "Baja",
      missing: ["algorithm_not_implemented"],
    },
    breakdown: policy.dimensions.map((d) => ({
      dimensionId: d.id,
      label: d.label,
      domain: d.domain,
      enabled: d.enabled,
      weight: d.weight,
      scoreMin: d.scoreMin,
      scoreMax: d.scoreMax,
      score: null,
      contribution: null,
      metricKey: d.metricKey,
      metricValue: null,
      matchedRuleId: null,
      ruleMatches: [],
      observations: [],
    })),
    strengths: [],
    weaknesses: [],
    observations: [
      {
        id: "design.stub",
        text: "Contrato de resultado SC-1.0 listo; algoritmo no implementado.",
        severity: "info",
      },
      {
        id: "nosis.external",
        text: "NOSIS no forma parte del Score Propio; se almacena por separado.",
        severity: "info",
      },
    ],
    recommendations: [],
    policy: {
      id: policy.meta.id,
      name: policy.meta.name,
      version: policy.meta.version,
      kind: policy.kind,
    },
    computedAt: null,
    status: "not_implemented",
  }
}
