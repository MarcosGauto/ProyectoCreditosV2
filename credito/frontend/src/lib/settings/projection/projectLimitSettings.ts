/**
 * LimitSettings → LimitPolicy
 *
 * Incluye factor comercial %, multiplicadores, restricciones, garantías y revisión.
 * No ejecuta el Limit Engine.
 */

import { createDefaultLimitPolicy } from "@/lib/creditLimit/policy/limitPolicyDefaults"
import type {
  GuaranteeRequirement,
  LimitCategoryPolicy,
  LimitPolicy,
} from "@/lib/creditLimit/policy/limitPolicyTypes"
import { freezeLimitPolicyRevision } from "@/lib/creditLimit/policy/limitPolicyRevision"
import type { LimitPolicyRevision } from "@/lib/creditLimit/policy/limitPolicyRevision"
import type {
  LimitPipelineStage,
  LimitRule,
  LimitRuleTrigger,
  LimitRuleTriggerKind,
} from "@/lib/creditLimit/rules/limitRuleTypes"
import type { LimitRestrictionAction } from "@/lib/creditLimit/shared/limitSharedTypes"
import type { LimitSettingsProjector } from "@/lib/settings/contracts/projectionContracts"
import type {
  LimitRestrictionSettings,
  LimitSettings,
} from "@/lib/settings/modules/limit/limitSettingsTypes"

export interface LimitProjectionContext {
  organizationId: string
  profileId: string
  profileName: string
  version?: number
  status?: "draft" | "active" | "archived"
  isActive?: boolean
  createdBy?: string | null
  updatedBy?: string | null
}

function cloneLimitPolicy(policy: LimitPolicy): LimitPolicy {
  return JSON.parse(JSON.stringify(policy)) as LimitPolicy
}

const STAGE_MAP: Record<string, LimitPipelineStage> = {
  category_base: "category_base",
  confidence: "confidence",
  coverage: "coverage",
  commercial_ceiling: "commercial_ceiling",
  guarantees: "guarantees",
  manual_override: "manual_override",
  result: "result",
  custom: "result",
}

const TRIGGER_KIND_MAP: Record<string, LimitRuleTriggerKind> = {
  always: "always",
  category_in: "category_in",
  category: "category_in",
  confidence_level: "confidence_level",
  confidence_below: "confidence_below",
  confidence_above: "confidence_above",
  field: "field",
  metric_below: "metric_below",
  metric_above: "metric_above",
}

const ACTION_SET = new Set<LimitRestrictionAction>([
  "deny",
  "cap",
  "reduce_factor",
  "require_manual",
  "require_guarantee",
])

function mapStage(stage: string): LimitPipelineStage {
  return STAGE_MAP[stage] ?? "result"
}

function mapTrigger(raw: LimitRestrictionSettings["trigger"]): LimitRuleTrigger {
  const kind = TRIGGER_KIND_MAP[raw.kind] ?? "always"
  return {
    kind,
    categoryCodes: raw.categoryCodes,
    confidenceLevel: raw.confidenceLevel,
    confidenceThreshold: raw.confidenceThreshold,
    field: raw.field,
    operator:
      raw.operator === "eq" ||
      raw.operator === "neq" ||
      raw.operator === "gt" ||
      raw.operator === "gte" ||
      raw.operator === "lt" ||
      raw.operator === "lte" ||
      raw.operator === "in" ||
      raw.operator === "not_in" ||
      raw.operator === "exists" ||
      raw.operator === "not_exists"
        ? raw.operator
        : null,
    value: raw.value,
    valueTo: raw.valueTo,
  }
}

function mapRestrictionToRule(r: LimitRestrictionSettings): LimitRule {
  const actionRaw = r.effect.action
  const action: LimitRule["effect"]["action"] = ACTION_SET.has(
    actionRaw as LimitRestrictionAction
  )
    ? (actionRaw as LimitRestrictionAction)
    : actionRaw === "set_decision" || actionRaw === "no_op"
      ? actionRaw
      : "require_manual"

  return {
    id: r.id,
    enabled: r.enabled,
    name: r.name,
    description: r.description,
    stage: mapStage(r.stage),
    priority: r.priority,
    trigger: mapTrigger(r.trigger),
    effect: {
      action,
      reducePercent: r.effect.reducePercent,
      reduceFactor: r.effect.reduceFactor,
      capAmount: r.effect.capAmount,
      ceilingAmount: r.effect.ceilingAmount,
      guaranteeCodes: [...(r.effect.guaranteeCodes ?? [])],
      decisionCode: r.effect.decisionCode,
      message: r.effect.message,
    },
    justification: r.effect.message ?? r.name,
    warning: r.effect.message
      ? {
          id: `warn.${r.id}`,
          text: r.effect.message,
          severity: "warning",
        }
      : null,
    params: {},
  }
}

function guaranteesForCategory(
  limit: LimitSettings,
  categoryCode: string
): GuaranteeRequirement[] {
  return limit.guarantees
    .filter((g) => {
      if (!g.categoryCodes || g.categoryCodes.length === 0) return true
      return g.categoryCodes.includes(categoryCode)
    })
    .map((g) => ({
      code: g.code,
      label: g.label,
      required: g.required,
      severity: g.severity,
      description: g.description,
    }))
}

function reviewForCategory(
  limit: LimitSettings,
  categoryCode: string
): LimitCategoryPolicy["review"] {
  const override = limit.review.byCategory.find(
    (r) => r.categoryCode === categoryCode
  )
  if (override) {
    return {
      frequencyDays: override.frequencyDays,
      frequencyLabel: override.frequencyLabel,
      mandatory: override.mandatory,
    }
  }
  return {
    frequencyDays: limit.review.frequencyDays,
    frequencyLabel: limit.review.frequencyLabel,
    mandatory: limit.review.mandatory,
  }
}

/**
 * Proyecta LimitSettings a LimitPolicy consumible por freeze + Limit Engine.
 */
export function projectLimitSettingsToLimitPolicy(
  limit: LimitSettings,
  context: LimitProjectionContext
): LimitPolicy {
  const defaults = cloneLimitPolicy(createDefaultLimitPolicy())
  const now = new Date().toISOString()
  const organizationId = context.organizationId
  const policyId = `org:${organizationId}:limit:${context.profileId}`

  const categories: LimitCategoryPolicy[] = [...limit.categoryMultipliers]
    .sort((a, b) => a.order - b.order)
    .map((row) => {
      const multiplier = row.deny ? 0 : (row.multiplier ?? 0)
      return {
        id: row.id,
        categoryCode: row.categoryCode,
        enabled: row.enabled,
        label: row.label,
        deny: row.deny,
        baseLimit: {
          kind: row.deny ? "deny" : "percent_of_metric",
          monthsOfSales: null,
          amount: null,
          percent: multiplier,
          metricKey: null,
        },
        maxLimit: row.maxLimit,
        commercialCeiling: row.commercialCeiling,
        termMonths: row.termMonths,
        maxTermMonths: row.maxTermMonths,
        guarantees: guaranteesForCategory(limit, row.categoryCode),
        review: reviewForCategory(limit, row.categoryCode),
        justificationTemplate: row.deny
          ? `Categoría ${row.categoryCode}: no otorgar.`
          : `Categoría ${row.categoryCode}: multiplicador ${multiplier} % del límite comercial.`,
        warningTemplates: [],
        params: {
          categoryMultiplierPercent: multiplier,
        },
      }
    })

  const rules =
    limit.restrictions.length > 0
      ? limit.restrictions.map(mapRestrictionToRule)
      : defaults.rules.map((r) => ({
          ...r,
          trigger: { ...r.trigger },
          effect: { ...r.effect, guaranteeCodes: [...r.effect.guaranteeCodes] },
          warning: r.warning ? { ...r.warning } : null,
          params: { ...r.params },
        }))

  return {
    schemaVersion: 1,
    meta: {
      id: policyId,
      organizationId,
      name: `${context.profileName} · Límite`,
      description: `LimitPolicy proyectada desde Ajustes (${context.profileName}).`,
      version: context.version ?? 1,
      status: context.status ?? (limit.enabled ? "active" : "draft"),
      isActive: context.isActive ?? limit.enabled,
      currency: limit.currency || defaults.meta.currency,
      createdAt: now,
      createdBy: context.createdBy ?? null,
      updatedAt: now,
      updatedBy: context.updatedBy ?? context.createdBy ?? null,
    },
    baseMetricKey: limit.baseMetric.metricKey || defaults.baseMetricKey,
    requireScoreOk: limit.requireScoreOk,
    globalCommercialCeiling: limit.globalCommercialCeiling,
    categories,
    fallback: defaults.fallback
      ? {
          ...defaults.fallback,
          guarantees: defaults.fallback.guarantees.map((g) => ({ ...g })),
          warningTemplates: defaults.fallback.warningTemplates.map((w) => ({
            ...w,
          })),
          baseLimit: { ...defaults.fallback.baseLimit },
          review: { ...defaults.fallback.review },
          params: { ...defaults.fallback.params },
        }
      : null,
    rules,
    extensions: {
      ...defaults.extensions,
      ...limit.extensions,
      commercialFactorPercent: limit.commercialFactorPercent,
      projectedFrom: "LimitSettings",
      baseMetricLabel: limit.baseMetric.label,
      baseMetricKind: limit.baseMetric.kind,
    },
  }
}

export function projectAndFreezeLimitPolicy(
  limit: LimitSettings,
  context: LimitProjectionContext
): LimitPolicyRevision {
  const policy = projectLimitSettingsToLimitPolicy(limit, context)
  return freezeLimitPolicyRevision({
    policy,
    createdBy: context.createdBy ?? context.updatedBy ?? null,
  })
}

export const limitSettingsProjector: LimitSettingsProjector = {
  toLimitPolicy(limit, context) {
    return projectLimitSettingsToLimitPolicy(limit, context)
  },
}
