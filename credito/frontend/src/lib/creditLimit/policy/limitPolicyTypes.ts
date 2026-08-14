/**
 * LimitPolicy SC-1.0 — documento configurable del Motor de Límite.
 *
 * Independiente del Score Engine.
 * Lógica ajustable → LimitPolicy.rules (Limit Rules).
 * Bandas estructurales → categories[].
 */

import type { LimitRule } from "@/lib/creditLimit/rules/limitRuleTypes"
import type {
  LimitFindingSeverity,
  LimitWarningTemplate,
} from "@/lib/creditLimit/shared/limitSharedTypes"

export type {
  LimitFindingSeverity,
  LimitRestrictionAction,
  LimitCoverageOperator,
  LimitWarningTemplate,
} from "@/lib/creditLimit/shared/limitSharedTypes"

export type LimitBaseKind =
  | "months_of_sales"
  | "fixed_amount"
  | "percent_of_metric"
  | "deny"
  | "custom"

export interface GuaranteeRequirement {
  code: string
  label: string
  required: boolean
  severity: LimitFindingSeverity
  description: string | null
}

export interface ReviewPolicy {
  frequencyDays: number | null
  frequencyLabel: string | null
  mandatory: boolean
}

export interface LimitBaseConfig {
  kind: LimitBaseKind
  monthsOfSales: number | null
  amount: number | null
  percent: number | null
  metricKey: string | null
}

/**
 * Banda por categoría. Sin rules de confidence/cobertura (van en LimitPolicy.rules).
 */
export interface LimitCategoryPolicy {
  id: string
  categoryCode: string
  enabled: boolean
  label: string | null
  deny: boolean
  baseLimit: LimitBaseConfig
  maxLimit: number | null
  commercialCeiling: number | null
  termMonths: number | null
  maxTermMonths: number | null
  guarantees: GuaranteeRequirement[]
  review: ReviewPolicy
  justificationTemplate: string | null
  warningTemplates: LimitWarningTemplate[]
  params: Record<string, unknown>
}

export interface LimitPolicyMeta {
  id: string
  organizationId: string | null
  name: string
  description: string | null
  version: number
  status: "draft" | "active" | "archived"
  isActive: boolean
  currency: string
  createdAt: string | null
  createdBy: string | null
  updatedAt: string | null
  updatedBy: string | null
}

export interface LimitPolicy {
  schemaVersion: number
  meta: LimitPolicyMeta
  baseMetricKey: string
  requireScoreOk: boolean
  globalCommercialCeiling: number | null
  categories: LimitCategoryPolicy[]
  fallback: LimitCategoryPolicy | null
  /** Limit Rules — capa configurable entre Policy y Engine. */
  rules: LimitRule[]
  extensions: Record<string, unknown>
}
