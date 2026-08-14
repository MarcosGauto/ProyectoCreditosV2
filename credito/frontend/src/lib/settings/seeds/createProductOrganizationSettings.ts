/**
 * Defaults de producto para Ajustes SC-1.0 (MVP).
 *
 * Solo datos tipados de OrganizationSettings.
 * No importa Score/Limit Engine ni CreditPolicy/LimitPolicy.
 */

import type { AlertsSettings } from "@/lib/settings/modules/alerts/alertsSettingsTypes"
import type { AiSettings } from "@/lib/settings/modules/ai/aiSettingsTypes"
import type { DocumentationSettings } from "@/lib/settings/modules/documentation/documentationSettingsTypes"
import type { LimitSettings } from "@/lib/settings/modules/limit/limitSettingsTypes"
import type {
  ScoreSettings,
  ScoreSubProfileSettings,
} from "@/lib/settings/modules/score/scoreSettingsTypes"
import type { OrganizationSettings } from "@/lib/settings/org/organizationSettingsTypes"
import type { PolicyProfile } from "@/lib/settings/profile/policyProfileTypes"
import { SETTINGS_MODEL_ID } from "@/lib/settings/shared/settingsSharedTypes"

const DEFAULT_ORG_ID = "org_local"

function createDefaultScoreSubProfile(): ScoreSubProfileSettings {
  return {
    id: "score_sub_standard",
    code: "standard",
    name: "Estándar",
    description: "Perfil de score propio por defecto.",
    enabled: true,
    isDefault: true,
    dimensionWeights: [
      {
        dimensionId: "liquidity",
        label: "Liquidez",
        enabled: true,
        weight: 15,
        domain: "financial",
        description: "Capacidad de cubrir pasivos de corto plazo.",
        order: 0,
      },
      {
        dimensionId: "debt",
        label: "Endeudamiento",
        enabled: true,
        weight: 12,
        domain: "financial",
        description: "Nivel de apalancamiento.",
        order: 1,
      },
      {
        dimensionId: "profitability",
        label: "Rentabilidad",
        enabled: true,
        weight: 12,
        domain: "financial",
        description: "Resultado / rentabilidad.",
        order: 2,
      },
      {
        dimensionId: "seniority",
        label: "Antigüedad",
        enabled: true,
        weight: 5,
        domain: "cross",
        description: "Antigüedad de la actividad.",
        order: 3,
      },
      {
        dimensionId: "documentation",
        label: "Documentación",
        enabled: true,
        weight: 12,
        domain: "cross",
        description: "Completitud y vigencia documental.",
        order: 4,
      },
      {
        dimensionId: "bcra",
        label: "BCRA",
        enabled: true,
        weight: 10,
        domain: "commercial",
        description: "Peor situación BCRA.",
        order: 5,
      },
      {
        dimensionId: "checks",
        label: "Cheques rechazados",
        enabled: true,
        weight: 10,
        domain: "commercial",
        description: "Historial de cheques rechazados.",
        order: 6,
      },
      {
        dimensionId: "coverage",
        label: "Cobertura",
        enabled: true,
        weight: 8,
        domain: "cross",
        description: "Resultado de cobertura operativa.",
        order: 7,
      },
      {
        dimensionId: "activity",
        label: "Actividad",
        enabled: true,
        weight: 8,
        domain: "commercial",
        description: "Riesgo / perfil de actividad económica.",
        order: 8,
      },
      {
        dimensionId: "commercial_behavior",
        label: "Comportamiento comercial",
        enabled: true,
        weight: 8,
        domain: "commercial",
        description: "Historial y comportamiento comercial.",
        order: 9,
      },
    ],
    categories: [
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
        colorToken: null,
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
        colorToken: null,
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
        colorToken: null,
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
        colorToken: null,
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
        colorToken: null,
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
        colorToken: null,
      },
    ],
    confidence: {
      confidenceMin: 0.4,
      highThreshold: 0.8,
      mediumThreshold: 0.5,
      labelHigh: "Alta",
      labelMedium: "Media",
      labelLow: "Baja",
    },
    scoreMin: 0,
    scoreMax: 1000,
  }
}

export function createProductScoreSettings(): ScoreSettings {
  const sub = createDefaultScoreSubProfile()
  return {
    schemaVersion: 1,
    enabled: true,
    subProfiles: [sub],
    activeSubProfileId: sub.id,
    defaultFindingSeverity: "info",
    extensions: {},
  }
}

export function createProductLimitSettings(): LimitSettings {
  return {
    schemaVersion: 1,
    enabled: true,
    currency: "ARS",
    baseMetric: {
      kind: "sales_monthly_average",
      metricKey: "sales.monthlyAverage",
      label: "Ventas Promedio Mensual",
    },
    commercialFactorPercent: 20,
    globalCommercialCeiling: null,
    categoryMultipliers: [
      {
        id: "lim.cat.aaa",
        categoryCode: "AAA",
        label: "Excelente",
        enabled: true,
        multiplier: 100,
        maxLimit: null,
        commercialCeiling: null,
        termMonths: 24,
        maxTermMonths: 24,
        deny: false,
        order: 0,
      },
      {
        id: "lim.cat.aa",
        categoryCode: "AA",
        label: "Muy Bueno",
        enabled: true,
        multiplier: 90,
        maxLimit: null,
        commercialCeiling: null,
        termMonths: 18,
        maxTermMonths: 18,
        deny: false,
        order: 1,
      },
      {
        id: "lim.cat.a",
        categoryCode: "A",
        label: "Aceptable",
        enabled: true,
        multiplier: 70,
        maxLimit: null,
        commercialCeiling: null,
        termMonths: 12,
        maxTermMonths: 12,
        deny: false,
        order: 2,
      },
      {
        id: "lim.cat.bbb",
        categoryCode: "BBB",
        label: "Riesgo",
        enabled: true,
        multiplier: 40,
        maxLimit: null,
        commercialCeiling: null,
        termMonths: 6,
        maxTermMonths: 6,
        deny: false,
        order: 3,
      },
      {
        id: "lim.cat.bb",
        categoryCode: "BB",
        label: "Riesgo alto",
        enabled: true,
        multiplier: 40,
        maxLimit: null,
        commercialCeiling: null,
        termMonths: 3,
        maxTermMonths: 3,
        deny: false,
        order: 4,
      },
      {
        id: "lim.cat.b",
        categoryCode: "B",
        label: "Crítico",
        enabled: true,
        multiplier: 0,
        maxLimit: null,
        commercialCeiling: null,
        termMonths: null,
        maxTermMonths: null,
        deny: true,
        order: 5,
      },
    ],
    restrictions: [
      {
        id: "lim.rule.confidence.low.reduce",
        enabled: true,
        name: "Confidence baja → reducir 40 %",
        description: "Reduce el límite cuando la confidence es baja.",
        stage: "confidence",
        priority: 10,
        trigger: {
          kind: "confidence_level",
          categoryCodes: null,
          confidenceLevel: "low",
          confidenceThreshold: null,
          field: null,
          operator: null,
          value: null,
          valueTo: null,
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
      },
      {
        id: "lim.rule.coverage.sin.guarantee",
        enabled: true,
        name: "Cobertura SIN → exigir garantía real",
        description: null,
        stage: "coverage",
        priority: 20,
        trigger: {
          kind: "field",
          categoryCodes: null,
          confidenceLevel: null,
          confidenceThreshold: null,
          field: "coverage.status",
          operator: "in",
          value: ["SIN", "SIN_COBERTURA"],
          valueTo: null,
        },
        effect: {
          action: "require_guarantee",
          reducePercent: null,
          reduceFactor: null,
          capAmount: null,
          ceilingAmount: null,
          guaranteeCodes: ["real_estate"],
          decisionCode: null,
          message: "Sin cobertura: se exige garantía real.",
        },
      },
      {
        id: "lim.rule.manual.review.bbb",
        enabled: true,
        name: "Categoría BBB o inferior → revisión manual",
        description: null,
        stage: "custom",
        priority: 30,
        trigger: {
          kind: "category",
          categoryCodes: ["BBB", "BB", "B"],
          confidenceLevel: null,
          confidenceThreshold: null,
          field: null,
          operator: null,
          value: null,
          valueTo: null,
        },
        effect: {
          action: "require_manual",
          reducePercent: null,
          reduceFactor: null,
          capAmount: null,
          ceilingAmount: null,
          guaranteeCodes: [],
          decisionCode: "review_manual",
          message: "Requiere revisión manual por categoría de riesgo.",
        },
      },
    ],
    guarantees: [
      {
        code: "none",
        label: "Sin garantía adicional",
        required: false,
        severity: "info",
        description: null,
        categoryCodes: ["AAA", "AA"],
      },
      {
        code: "solidarity",
        label: "Garantía solidaria",
        required: true,
        severity: "warning",
        description: null,
        categoryCodes: ["A", "BBB"],
      },
      {
        code: "real_estate",
        label: "Garantía real",
        required: true,
        severity: "critical",
        description: null,
        categoryCodes: ["BB", "B"],
      },
    ],
    review: {
      frequencyDays: 90,
      frequencyLabel: "Trimestral",
      mandatory: false,
      byCategory: [
        {
          categoryCode: "AAA",
          frequencyDays: 180,
          frequencyLabel: "Semestral",
          mandatory: false,
        },
        {
          categoryCode: "AA",
          frequencyDays: 120,
          frequencyLabel: "Cuatrimestral",
          mandatory: false,
        },
        {
          categoryCode: "A",
          frequencyDays: 90,
          frequencyLabel: "Trimestral",
          mandatory: true,
        },
        {
          categoryCode: "BBB",
          frequencyDays: 60,
          frequencyLabel: "Bimestral",
          mandatory: true,
        },
        {
          categoryCode: "BB",
          frequencyDays: 30,
          frequencyLabel: "Mensual",
          mandatory: true,
        },
      ],
    },
    requireScoreOk: true,
    extensions: {},
  }
}

export function createProductAlertsSettings(): AlertsSettings {
  return {
    schemaVersion: 1,
    enabled: true,
    channels: [
      {
        id: "ch_in_app",
        kind: "in_app",
        enabled: true,
        label: "In-app",
        config: {},
      },
      {
        id: "ch_email",
        kind: "email",
        enabled: false,
        label: "Email",
        config: { to: "" },
      },
    ],
    events: [
      {
        id: "ev_score_below",
        eventCode: "score_below_threshold",
        enabled: true,
        name: "Score bajo umbral",
        description: "Se dispara cuando el score propio cae bajo el umbral.",
        severity: "warning",
        channelIds: ["ch_in_app"],
        thresholds: { scoreMax: 650 },
        priority: 10,
      },
      {
        id: "ev_limit_denied",
        eventCode: "limit_denied",
        enabled: true,
        name: "Límite denegado",
        description: "El motor de límite sugiere no otorgar.",
        severity: "critical",
        channelIds: ["ch_in_app"],
        thresholds: {},
        priority: 20,
      },
      {
        id: "ev_confidence_low",
        eventCode: "confidence_low",
        enabled: true,
        name: "Confidence baja",
        description: null,
        severity: "warning",
        channelIds: ["ch_in_app"],
        thresholds: { confidenceMax: 0.4 },
        priority: 30,
      },
      {
        id: "ev_docs_incomplete",
        eventCode: "documentation_incomplete",
        enabled: true,
        name: "Documentación incompleta",
        description: null,
        severity: "warning",
        channelIds: ["ch_in_app"],
        thresholds: {},
        priority: 40,
      },
      {
        id: "ev_manual_review",
        eventCode: "manual_review_required",
        enabled: true,
        name: "Revisión manual requerida",
        description: null,
        severity: "info",
        channelIds: ["ch_in_app"],
        thresholds: {},
        priority: 50,
      },
    ],
    extensions: {},
  }
}

export function createProductDocumentationSettings(): DocumentationSettings {
  return {
    schemaVersion: 1,
    enabled: true,
    minimumRequirements: [
      {
        id: "doc_balance",
        code: "balance",
        label: "Balance / EECC",
        description: "Estados contables del último ejercicio.",
        required: true,
        blocking: true,
        order: 0,
      },
      {
        id: "doc_iva",
        code: "iva",
        label: "IVA",
        description: "Declaraciones de IVA recientes.",
        required: true,
        blocking: false,
        order: 1,
      },
      {
        id: "doc_iibb",
        code: "iibb",
        label: "IIBB",
        description: "Ingresos brutos.",
        required: false,
        blocking: false,
        order: 2,
      },
      {
        id: "doc_bcra",
        code: "bcra",
        label: "Informe BCRA",
        description: null,
        required: true,
        blocking: true,
        order: 3,
      },
    ],
    byCompanyType: [
      {
        id: "ctype_sa",
        companyType: "sa",
        label: "S.A.",
        enabled: true,
        requirements: [
          {
            id: "doc_sa_estatuto",
            code: "estatuto",
            label: "Estatuto social",
            description: null,
            required: true,
            blocking: false,
            order: 0,
          },
        ],
      },
      {
        id: "ctype_srl",
        companyType: "srl",
        label: "S.R.L.",
        enabled: true,
        requirements: [
          {
            id: "doc_srl_contrato",
            code: "contrato_social",
            label: "Contrato social",
            description: null,
            required: true,
            blocking: false,
            order: 0,
          },
        ],
      },
      {
        id: "ctype_mono",
        companyType: "monotributo",
        label: "Monotributo",
        enabled: true,
        requirements: [
          {
            id: "doc_mono_constancia",
            code: "constancia_afip",
            label: "Constancia AFIP",
            description: null,
            required: true,
            blocking: true,
            order: 0,
          },
        ],
      },
    ],
    extensions: {},
  }
}

export function createProductAiSettings(): AiSettings {
  return {
    schemaVersion: 1,
    enabled: false,
    explanationLevel: "standard",
    recommendationsEnabled: false,
    recommendationToggles: [
      {
        id: "ai_rec_limit",
        code: "suggest_limit_adjustment",
        label: "Sugerir ajuste de límite",
        enabled: false,
        description: "La IA puede proponer un ajuste (sin auto-aplicar).",
      },
      {
        id: "ai_rec_docs",
        code: "suggest_missing_docs",
        label: "Señalar documentación faltante",
        enabled: true,
        description: null,
      },
      {
        id: "ai_rec_risk",
        code: "highlight_risk_factors",
        label: "Resaltar factores de riesgo",
        enabled: true,
        description: null,
      },
    ],
    prompts: [
      {
        id: "prompt_dictamen",
        code: "dictamen_resumen",
        name: "Dictamen resumido",
        description: "Placeholder — no se ejecuta en esta fase.",
        enabled: true,
        template:
          "Resumí el análisis crediticio de {{razonSocial}} con score {{score}} y categoría {{category}}. Enfoque: {{explanationLevel}}.",
        locale: "es-AR",
        version: 1,
      },
      {
        id: "prompt_riesgos",
        code: "factores_riesgo",
        name: "Factores de riesgo",
        description: "Placeholder.",
        enabled: false,
        template:
          "Listá los principales factores de riesgo del caso {{cuit}} a partir de {{trace}}.",
        locale: "es-AR",
        version: 1,
      },
    ],
    modelRef: null,
    extensions: {},
  }
}

function createProductPolicyProfile(organizationId: string): PolicyProfile {
  return {
    schemaVersion: 1,
    meta: {
      id: `profile_${organizationId}_default`,
      organizationId,
      code: "default",
      name: "Default",
      description: "Perfil estándar de política crediticia SC-1.0.",
      version: 1,
      status: "draft",
      isDefault: true,
      order: 0,
      tags: ["sc1", "product-default"],
      audit: {
        createdAt: null,
        createdBy: null,
        updatedAt: null,
        updatedBy: null,
      },
    },
    score: createProductScoreSettings(),
    limit: createProductLimitSettings(),
    alerts: createProductAlertsSettings(),
    documentation: createProductDocumentationSettings(),
    ai: null,
    extensions: {},
  }
}

/**
 * OrganizationSettings de producto listo para editar en Ajustes MVP.
 */
export function createProductOrganizationSettings(input?: {
  organizationId?: string
  id?: string
  name?: string
}): OrganizationSettings {
  const orgId = input?.organizationId ?? DEFAULT_ORG_ID
  const profile = createProductPolicyProfile(orgId)

  return {
    schemaVersion: 1,
    meta: {
      id: input?.id ?? `settings_${orgId}`,
      organizationId: orgId,
      name: input?.name ?? "Ajustes SC-1.0",
      description:
        "Configuración global de política crediticia (estado local — sin Firestore).",
      model: SETTINGS_MODEL_ID,
      version: 1,
      status: "draft",
      locale: "es-AR",
      currency: "ARS",
      audit: {
        createdAt: null,
        createdBy: null,
        updatedAt: null,
        updatedBy: null,
      },
    },
    profiles: [profile],
    activeProfileId: profile.meta.id,
    ai: createProductAiSettings(),
    modulesEnabled: {
      score: true,
      limit: true,
      alerts: true,
      ai: true,
      documentation: true,
      profiles: true,
    },
    extensions: {},
  }
}
