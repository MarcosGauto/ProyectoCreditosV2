/**
 * LimitPolicy default SC-1.0 — semilla alineada al algoritmo:
 * ventas × factor comercial % × multiplicador por categoría %.
 */

import type {
  LimitCategoryPolicy,
  LimitPolicy,
} from "@/lib/creditLimit/policy/limitPolicyTypes"
import type { LimitRule } from "@/lib/creditLimit/rules/limitRuleTypes"

function category(
  partial: Omit<LimitCategoryPolicy, "params" | "warningTemplates"> & {
    warningTemplates?: LimitCategoryPolicy["warningTemplates"]
    params?: LimitCategoryPolicy["params"]
  }
): LimitCategoryPolicy {
  return {
    ...partial,
    warningTemplates: partial.warningTemplates ?? [],
    params: partial.params ?? {},
  }
}

function emptyTrigger() {
  return {
    kind: "always" as const,
    categoryCodes: null,
    confidenceLevel: null,
    confidenceThreshold: null,
    field: null,
    operator: null,
    value: null,
    valueTo: null,
  }
}

function band(input: {
  id: string
  categoryCode: string
  label: string
  multiplierPercent: number
  deny?: boolean
  termMonths: number | null
  maxTermMonths: number | null
  guarantees: LimitCategoryPolicy["guarantees"]
  review: LimitCategoryPolicy["review"]
  justificationTemplate: string
}): LimitCategoryPolicy {
  const deny = input.deny === true || input.multiplierPercent === 0
  return category({
    id: input.id,
    categoryCode: input.categoryCode,
    enabled: true,
    label: input.label,
    deny,
    baseLimit: {
      kind: deny ? "deny" : "percent_of_metric",
      monthsOfSales: null,
      amount: null,
      percent: input.multiplierPercent,
      metricKey: null,
    },
    maxLimit: null,
    commercialCeiling: null,
    termMonths: input.termMonths,
    maxTermMonths: input.maxTermMonths,
    guarantees: input.guarantees,
    review: input.review,
    justificationTemplate: input.justificationTemplate,
    params: { categoryMultiplierPercent: input.multiplierPercent },
  })
}

const CATEGORIES: LimitCategoryPolicy[] = [
  band({
    id: "lim.cat.aaa",
    categoryCode: "AAA",
    label: "Excelente",
    multiplierPercent: 100,
    termMonths: 24,
    maxTermMonths: 24,
    guarantees: [
      {
        code: "none",
        label: "Sin garantía adicional",
        required: false,
        severity: "info",
        description: null,
      },
    ],
    review: {
      frequencyDays: 180,
      frequencyLabel: "Semestral",
      mandatory: false,
    },
    justificationTemplate:
      "Categoría Excelente (AAA): multiplicador 100 % del límite comercial.",
  }),
  band({
    id: "lim.cat.aa",
    categoryCode: "AA",
    label: "Muy Bueno",
    multiplierPercent: 90,
    termMonths: 18,
    maxTermMonths: 18,
    guarantees: [
      {
        code: "none",
        label: "Sin garantía adicional",
        required: false,
        severity: "info",
        description: null,
      },
    ],
    review: {
      frequencyDays: 120,
      frequencyLabel: "Cuatrimestral",
      mandatory: false,
    },
    justificationTemplate:
      "Categoría Muy Bueno (AA): multiplicador 90 % del límite comercial.",
  }),
  band({
    id: "lim.cat.a",
    categoryCode: "A",
    label: "Aceptable",
    multiplierPercent: 70,
    termMonths: 12,
    maxTermMonths: 12,
    guarantees: [
      {
        code: "solidarity",
        label: "Garantía solidaria",
        required: true,
        severity: "warning",
        description: null,
      },
    ],
    review: {
      frequencyDays: 90,
      frequencyLabel: "Trimestral",
      mandatory: true,
    },
    justificationTemplate:
      "Categoría Aceptable (A): multiplicador 70 %; garantía solidaria.",
  }),
  band({
    id: "lim.cat.bbb",
    categoryCode: "BBB",
    label: "Riesgo",
    multiplierPercent: 40,
    termMonths: 6,
    maxTermMonths: 6,
    guarantees: [
      {
        code: "solidarity",
        label: "Garantía solidaria",
        required: true,
        severity: "warning",
        description: null,
      },
    ],
    review: {
      frequencyDays: 60,
      frequencyLabel: "Bimestral",
      mandatory: true,
    },
    justificationTemplate:
      "Categoría Riesgo (BBB): multiplicador 40 % del límite comercial.",
  }),
  band({
    id: "lim.cat.bb",
    categoryCode: "BB",
    label: "Riesgo alto",
    multiplierPercent: 40,
    termMonths: 3,
    maxTermMonths: 3,
    guarantees: [
      {
        code: "real_estate",
        label: "Garantía real",
        required: true,
        severity: "critical",
        description: null,
      },
    ],
    review: {
      frequencyDays: 30,
      frequencyLabel: "Mensual",
      mandatory: true,
    },
    justificationTemplate:
      "Categoría Riesgo alto (BB): multiplicador 40 %; garantía real.",
  }),
  band({
    id: "lim.cat.b",
    categoryCode: "B",
    label: "Crítico",
    multiplierPercent: 0,
    deny: true,
    termMonths: null,
    maxTermMonths: null,
    guarantees: [],
    review: {
      frequencyDays: null,
      frequencyLabel: null,
      mandatory: false,
    },
    justificationTemplate: "Categoría Crítico (B): multiplicador 0 % — no otorgar.",
  }),
]

const DEFAULT_RULES: LimitRule[] = [
  {
    id: "lim.rule.confidence.low.reduce",
    enabled: true,
    name: "Confidence baja → reducir 40 %",
    description:
      "Configurable. Alternativas deny / review_manual vienen disabled.",
    stage: "confidence",
    priority: 10,
    trigger: {
      ...emptyTrigger(),
      kind: "confidence_level",
      confidenceLevel: "low",
    },
    effect: {
      action: "reduce_factor",
      reducePercent: 40,
      reduceFactor: 0.6,
      capAmount: null,
      ceilingAmount: null,
      guaranteeCodes: [],
      decisionCode: null,
      message: "Confidence baja: se reduce el límite un 40 %.",
    },
    justification: "Confidence baja → reducción del 40 % del límite.",
    warning: {
      id: "lim.warn.confidence.low",
      text: "Límite reducido por confidence baja.",
      severity: "warning",
    },
    params: {},
  },
  {
    id: "lim.rule.confidence.low.deny.alt",
    enabled: false,
    name: "Confidence baja → no vender (alternativa)",
    description: null,
    stage: "confidence",
    priority: 20,
    trigger: {
      ...emptyTrigger(),
      kind: "confidence_level",
      confidenceLevel: "low",
    },
    effect: {
      action: "deny",
      reducePercent: null,
      reduceFactor: null,
      capAmount: null,
      ceilingAmount: null,
      guaranteeCodes: [],
      decisionCode: "deny",
      message: "Confidence baja: no vender.",
    },
    justification: "Confidence baja → denegar límite.",
    warning: null,
    params: {},
  },
  {
    id: "lim.rule.confidence.low.manual.alt",
    enabled: false,
    name: "Confidence baja → revisión manual (alternativa)",
    description: null,
    stage: "confidence",
    priority: 30,
    trigger: {
      ...emptyTrigger(),
      kind: "confidence_level",
      confidenceLevel: "low",
    },
    effect: {
      action: "require_manual",
      reducePercent: null,
      reduceFactor: null,
      capAmount: null,
      ceilingAmount: null,
      guaranteeCodes: [],
      decisionCode: "review_manual",
      message: "Confidence baja: revisión manual.",
    },
    justification: "Confidence baja → revisión manual.",
    warning: {
      id: "lim.warn.confidence.manual",
      text: "Requiere revisión manual por confidence baja.",
      severity: "warning",
    },
    params: {},
  },
  {
    id: "lim.rule.coverage.sin.guarantee",
    enabled: true,
    name: "Cobertura SIN → exigir garantía real",
    description: null,
    stage: "coverage",
    priority: 10,
    trigger: {
      ...emptyTrigger(),
      kind: "field",
      field: "coverage.status",
      operator: "eq",
      value: "SIN",
      categoryCodes: ["A", "BBB", "BB"],
    },
    effect: {
      action: "require_guarantee",
      reducePercent: null,
      reduceFactor: null,
      capAmount: null,
      ceilingAmount: null,
      guaranteeCodes: ["real_estate"],
      decisionCode: null,
      message: "Sin cobertura: exigir garantía real.",
    },
    justification: "Cobertura SIN → garantía real requerida.",
    warning: {
      id: "lim.warn.coverage.sin",
      text: "Cobertura SIN: se exige garantía real.",
      severity: "warning",
    },
    params: {},
  },
  {
    id: "lim.rule.docs.incomplete",
    enabled: true,
    name: "Documentación incompleta → revisión manual",
    description: "Lee status del breakdown de documentation en el score.",
    stage: "coverage",
    priority: 20,
    trigger: {
      ...emptyTrigger(),
      kind: "field",
      field: "dimensions.documentation.status",
      operator: "in",
      value: ["WARNING", "CRITICAL", "UNKNOWN"],
    },
    effect: {
      action: "require_manual",
      reducePercent: null,
      reduceFactor: null,
      capAmount: null,
      ceilingAmount: null,
      guaranteeCodes: [],
      decisionCode: "review_manual",
      message: "Documentación incompleta: revisión manual.",
    },
    justification: "Documentación incompleta → revisión manual.",
    warning: {
      id: "lim.warn.docs.incomplete",
      text: "Documentación incompleta detectada en el score.",
      severity: "warning",
    },
    params: {},
  },
]

export function createDefaultLimitPolicy(audit?: {
  createdBy?: string | null
  at?: string | null
}): LimitPolicy {
  const at = audit?.at ?? null
  const by = audit?.createdBy ?? null

  return {
    schemaVersion: 1,
    meta: {
      id: "limit_policy_default",
      organizationId: null,
      name: "Política de Límite Default",
      description:
        "LimitPolicy SC-1.0: ventas × factor comercial × multiplicador por categoría + Limit Rules.",
      version: 1,
      status: "active",
      isActive: true,
      currency: "ARS",
      createdAt: at,
      createdBy: by,
      updatedAt: at,
      updatedBy: by,
    },
    baseMetricKey: "sales.monthlyAverage",
    requireScoreOk: true,
    globalCommercialCeiling: null,
    categories: CATEGORIES.map((c) => ({
      ...c,
      guarantees: c.guarantees.map((g) => ({ ...g })),
      warningTemplates: c.warningTemplates.map((w) => ({ ...w })),
      baseLimit: { ...c.baseLimit },
      review: { ...c.review },
      params: { ...c.params },
    })),
    fallback: category({
      id: "lim.cat.fallback",
      categoryCode: "*",
      enabled: true,
      label: "Fallback",
      deny: true,
      baseLimit: {
        kind: "deny",
        monthsOfSales: null,
        amount: null,
        percent: 0,
        metricKey: null,
      },
      maxLimit: null,
      commercialCeiling: null,
      termMonths: null,
      maxTermMonths: null,
      guarantees: [],
      review: {
        frequencyDays: null,
        frequencyLabel: null,
        mandatory: false,
      },
      justificationTemplate: "Sin categoría válida: no sugerir límite.",
      params: { categoryMultiplierPercent: 0 },
    }),
    rules: DEFAULT_RULES.map((r) => ({
      ...r,
      trigger: {
        ...r.trigger,
        categoryCodes: r.trigger.categoryCodes
          ? [...r.trigger.categoryCodes]
          : null,
      },
      effect: {
        ...r.effect,
        guaranteeCodes: [...r.effect.guaranteeCodes],
      },
      warning: r.warning ? { ...r.warning } : null,
      params: { ...r.params },
    })),
    extensions: {
      /** Factor comercial % — único origen; el motor no hardcodea 20. */
      commercialFactorPercent: 20,
    },
  }
}
