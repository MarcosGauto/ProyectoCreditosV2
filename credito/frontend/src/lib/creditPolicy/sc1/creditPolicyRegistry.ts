/**
 * Registry de Política Crediticia SC-1.0.
 * Catálogo ofertable + proyección. Sin Score Engine. Sin algoritmo.
 */

import {
  cloneCreditPolicyForOrganization,
  createDefaultCreditPolicyDocument,
  DEFAULT_CREDIT_POLICY_ID,
} from "./creditPolicyDefaults"
import type {
  CreditPolicyDimensionCatalogEntry,
  CreditPolicyDocument,
  CreditPolicyScoreProjection,
  NosisExternalRecord,
} from "./creditPolicyTypes"
import {
  freezePolicyRevision,
  type PolicyRevision,
} from "./policyRevision"

const BUILT_IN_CATALOG: CreditPolicyDimensionCatalogEntry[] = [
  {
    id: "liquidity",
    name: "Liquidez",
    label: "Liquidez",
    type: "ratio",
    domain: "financial",
    description: "Capacidad de cubrir pasivos de corto plazo.",
    defaultMetricKey: "ratios.liquidityCurrent",
    builtIn: true,
  },
  {
    id: "debt",
    name: "Endeudamiento",
    label: "Endeudamiento",
    type: "ratio",
    domain: "financial",
    description: "Nivel de apalancamiento.",
    defaultMetricKey: "ratios.debtRatio",
    builtIn: true,
  },
  {
    id: "profitability",
    name: "Rentabilidad",
    label: "Rentabilidad",
    type: "ratio",
    domain: "financial",
    description: "Rentabilidad / resultado.",
    defaultMetricKey: "ratios.profitability",
    builtIn: true,
  },
  {
    id: "seniority",
    name: "Antigüedad",
    label: "Antigüedad",
    type: "months",
    domain: "cross",
    description: "Antigüedad de la actividad.",
    defaultMetricKey: "company.seniorityYears",
    builtIn: true,
  },
  {
    id: "documentation",
    name: "Documentación",
    label: "Documentación",
    type: "score",
    domain: "cross",
    description: "Completitud documental.",
    defaultMetricKey: "documentation.qualityScore",
    builtIn: true,
  },
  {
    id: "bcra",
    name: "BCRA",
    label: "BCRA",
    type: "ordinal",
    domain: "commercial",
    description: "Situación BCRA.",
    defaultMetricKey: "bcra.worstSituation",
    builtIn: true,
  },
  {
    id: "checks",
    name: "Cheques",
    label: "Cheques rechazados",
    type: "count",
    domain: "commercial",
    description: "Cheques rechazados.",
    defaultMetricKey: "checks.rejectedCount",
    builtIn: true,
  },
  {
    id: "coverage",
    name: "Cobertura",
    label: "Cobertura",
    type: "ordinal",
    domain: "cross",
    description: "Cobertura operativa.",
    defaultMetricKey: "coverage.status",
    builtIn: true,
  },
  {
    id: "activity",
    name: "Actividad",
    label: "Actividad",
    type: "ordinal",
    domain: "commercial",
    description: "Riesgo / perfil de actividad.",
    defaultMetricKey: "activity.riskLevel",
    builtIn: true,
  },
  {
    id: "commercial_behavior",
    name: "Comportamiento comercial",
    label: "Comportamiento comercial",
    type: "score",
    domain: "commercial",
    description: "Comportamiento comercial histórico.",
    defaultMetricKey: "commercial.behaviorScore",
    builtIn: true,
  },
]

const OPTIONAL_CATALOG: CreditPolicyDimensionCatalogEntry[] = [
  {
    id: "sector_risk",
    name: "Riesgo sectorial",
    label: "Riesgo sectorial",
    type: "ordinal",
    domain: "commercial",
    description: "Riesgo de sector.",
    defaultMetricKey: "sector.riskLevel",
    builtIn: false,
  },
  {
    id: "sales",
    name: "Ventas",
    label: "Ventas",
    type: "currency",
    domain: "financial",
    description: "Nivel / tendencia de ventas.",
    defaultMetricKey: "sales.trendScore",
    builtIn: false,
  },
  {
    id: "esg",
    name: "ESG",
    label: "ESG",
    type: "score",
    domain: "cross",
    description: "Indicadores ESG.",
    defaultMetricKey: "esg.score",
    builtIn: false,
  },
  {
    id: "nosis",
    name: "Score NOSIS",
    label: "Score NOSIS",
    type: "score",
    domain: "commercial",
    description:
      "Opcional. Por defecto NOSIS es externo y NO entra al Score Propio.",
    defaultMetricKey: "nosis.score",
    builtIn: false,
  },
]

const customCatalog = new Map<string, CreditPolicyDimensionCatalogEntry>()

export function listDimensionCatalog(): CreditPolicyDimensionCatalogEntry[] {
  const map = new Map<string, CreditPolicyDimensionCatalogEntry>()
  for (const e of [...BUILT_IN_CATALOG, ...OPTIONAL_CATALOG]) map.set(e.id, e)
  for (const e of customCatalog.values()) map.set(e.id, e)
  return Array.from(map.values())
}

export function getCatalogDimension(
  id: string
): CreditPolicyDimensionCatalogEntry | null {
  return listDimensionCatalog().find((e) => e.id === id) ?? null
}

export function registerCatalogDimension(
  entry: CreditPolicyDimensionCatalogEntry
): void {
  if (!entry?.id) throw new Error("registerCatalogDimension: id obligatorio")
  customCatalog.set(entry.id, { ...entry })
}

export function unregisterCatalogDimension(id: string): boolean {
  return customCatalog.delete(id)
}

export function clearCustomCatalog(): void {
  customCatalog.clear()
}

export function getDefaultCreditPolicy(): CreditPolicyDocument {
  return createDefaultCreditPolicyDocument()
}

export function getDefaultCreditPolicyId(): string {
  return DEFAULT_CREDIT_POLICY_ID
}

export function createOrganizationPolicy(
  organizationId: string,
  options?: {
    id?: string
    name?: string
    base?: CreditPolicyDocument
    createdBy?: string | null
  }
): CreditPolicyDocument {
  return cloneCreditPolicyForOrganization(organizationId, options)
}

/** Projection ligera (preferir PolicyRevision en análisis reales). */
export function projectPolicyForScoreEngine(
  policy: CreditPolicyDocument
): CreditPolicyScoreProjection {
  return {
    policyId: policy.meta.id,
    policyVersion: policy.meta.version,
    policyName: policy.meta.name,
    model: policy.meta.model,
    scoreMin: policy.meta.scoreMin,
    scoreMax: policy.meta.scoreMax,
    confidenceMin: policy.meta.confidenceMin,
    dimensions: policy.dimensions.map((d) => ({
      ...d,
      rules: d.rules.map((r) => ({ ...r })),
      params: { ...d.params },
    })),
    categories: policy.categories.map((c) => ({ ...c })),
  }
}

/**
 * Publica / congela la política vigente como PolicyRevision inmutable.
 * Lo que un análisis debe guardar.
 */
export function publishPolicyRevision(
  policy: CreditPolicyDocument,
  options?: { createdBy?: string | null; createdAt?: string | null }
): PolicyRevision {
  return freezePolicyRevision({
    policy,
    createdBy: options?.createdBy,
    createdAt: options?.createdAt,
  })
}

export function createNosisExternalRecord(
  partial?: Partial<NosisExternalRecord>
): NosisExternalRecord {
  return {
    score: partial?.score ?? null,
    status: partial?.status ?? "SIN_DATO",
    date: partial?.date ?? null,
    provider: partial?.provider ?? "NOSIS",
    rawRef: partial?.rawRef ?? null,
    notes: partial?.notes ?? null,
  }
}

export {
  createDefaultCreditPolicyDocument,
  cloneCreditPolicyForOrganization,
  DEFAULT_CREDIT_POLICY_ID,
} from "./creditPolicyDefaults"

export {
  freezePolicyRevision,
  toAnalysisPolicyBinding,
  bumpPolicyDocumentVersion,
  computePolicyContentHash,
} from "./policyRevision"
