/**
 * Stage 5 — Apply Category Multiplier (pura).
 */

import { LimitTraceCode } from "@/lib/creditLimit/engine/limitTraceCodes"
import { readCategoryMultiplierPercent } from "@/lib/creditLimit/engine/readPolicyValues"
import {
  appendJustification,
  appendStep,
  appendWarning,
  haltAs,
  round2,
  type LimitPipelineState,
} from "@/lib/creditLimit/engine/pipelineState"
import type { LimitCategoryPolicy } from "@/lib/creditLimit/policy/limitPolicyTypes"

function findCategoryBand(
  state: LimitPipelineState
): LimitCategoryPolicy | null {
  const code = state.categoryCode
  if (code) {
    const match = state.policy.categories.find(
      (c) => c.enabled && c.categoryCode === code
    )
    if (match) return match
  }
  return state.policy.fallback
}

export function stageApplyCategoryMultiplier(
  state: LimitPipelineState
): LimitPipelineState {
  const band = findCategoryBand(state)
  let next: LimitPipelineState = { ...state, category: band }

  if (!band) {
    if (!next.halted) {
      next = haltAs(next, "invalid_policy", "invalid_policy")
    }
    next = appendJustification(next, LimitTraceCode.CATEGORY_BAND_MISSING, {
      severity: "critical",
    })
    return appendStep(next, {
      id: LimitTraceCode.CATEGORY_BAND_MISSING,
      stage: "category_base",
      code: "category",
      label: LimitTraceCode.CATEGORY_BAND_MISSING,
      value: null,
      unit: null,
      previousValue: state.currentLimit,
      changed: true,
      ruleIds: [],
      notes: null,
      details: {
        categoryCode: state.categoryCode,
        before: state.currentLimit,
        after: null,
        result: "invalid_policy",
      },
    })
  }

  next = {
    ...next,
    label: band.label,
    maxLimit: band.maxLimit,
    review: { ...band.review },
    guarantees: band.guarantees.map((g) => ({ ...g })),
    kind: band.baseLimit.kind,
  }

  // Plantillas de policy: se registran por id (código), no como copy UI del engine
  if (band.justificationTemplate) {
    next = appendJustification(next, `category.${band.id}`, {
      severity: "info",
      sourceId: band.id,
      sourceKind: "category_policy",
    })
  }
  for (const w of band.warningTemplates) {
    next = appendWarning(next, {
      id: w.id,
      text: w.id,
      severity: w.severity,
      sourceId: band.id,
      sourceKind: "category_policy",
      conditioning: false,
    })
  }

  const before = next.currentLimit
  const multiplier = readCategoryMultiplierPercent(band)
  next = { ...next, categoryMultiplierPercent: multiplier }

  if (band.deny || band.baseLimit.kind === "deny" || multiplier === 0) {
    if (!next.halted) {
      next = haltAs(next, "denied", "deny", { allowLimit: false })
    }
    next = appendJustification(next, LimitTraceCode.CATEGORY_DENY, {
      severity: "info",
      sourceId: band.id,
      sourceKind: "category_policy",
    })
    return appendStep(next, {
      id: LimitTraceCode.CATEGORY_DENY,
      stage: "category_base",
      code: "base_limit",
      label: LimitTraceCode.CATEGORY_DENY,
      value: 0,
      unit: null,
      previousValue: before,
      changed: true,
      ruleIds: [],
      notes: null,
      details: {
        categoryPolicyId: band.id,
        categoryCode: band.categoryCode,
        categoryMultiplierPercent: multiplier,
        before,
        after: null,
        result: "deny",
      },
    })
  }

  if (next.halted) {
    return appendStep(next, {
      id: `${LimitTraceCode.APPLY_CATEGORY_MULTIPLIER}.skipped`,
      stage: "category_base",
      code: "base_limit",
      label: LimitTraceCode.APPLY_CATEGORY_MULTIPLIER,
      value: multiplier,
      unit: null,
      previousValue: before,
      changed: false,
      ruleIds: [],
      notes: null,
      details: {
        categoryPolicyId: band.id,
        categoryMultiplierPercent: multiplier,
        result: "skipped",
      },
    })
  }

  if (multiplier == null) {
    next = haltAs(next, "invalid_policy", "invalid_policy")
    next = appendJustification(next, LimitTraceCode.MULTIPLIER_MISSING, {
      severity: "critical",
      sourceId: band.id,
      sourceKind: "category_policy",
    })
    return appendStep(next, {
      id: LimitTraceCode.MULTIPLIER_MISSING,
      stage: "category_base",
      code: "base_limit",
      label: LimitTraceCode.MULTIPLIER_MISSING,
      value: null,
      unit: null,
      previousValue: before,
      changed: true,
      ruleIds: [],
      notes: null,
      details: {
        categoryPolicyId: band.id,
        before,
        after: null,
        result: "invalid_policy",
      },
    })
  }

  if (before == null) {
    next = haltAs(next, "insufficient_data", "insufficient_data", {
      requiresManualReview: true,
    })
    return appendStep(next, {
      id: `${LimitTraceCode.APPLY_CATEGORY_MULTIPLIER}.no_base`,
      stage: "category_base",
      code: "base_limit",
      label: LimitTraceCode.APPLY_CATEGORY_MULTIPLIER,
      value: multiplier,
      unit: null,
      previousValue: null,
      changed: false,
      ruleIds: [],
      notes: null,
      details: {
        categoryPolicyId: band.id,
        categoryMultiplierPercent: multiplier,
        result: "insufficient_data",
      },
    })
  }

  let after = round2(before * (multiplier / 100))
  if (band.maxLimit != null && Number.isFinite(band.maxLimit) && after > band.maxLimit) {
    after = round2(band.maxLimit)
  }

  next = { ...next, currentLimit: after }
  next = appendJustification(next, LimitTraceCode.APPLY_CATEGORY_MULTIPLIER, {
    severity: "info",
    sourceId: band.id,
    sourceKind: "category_policy",
  })

  return appendStep(next, {
    id: LimitTraceCode.APPLY_CATEGORY_MULTIPLIER,
    stage: "category_base",
    code: "base_limit",
    label: LimitTraceCode.APPLY_CATEGORY_MULTIPLIER,
    value: after,
    unit: null,
    previousValue: before,
    changed: before !== after,
    ruleIds: [],
    notes: null,
    details: {
      categoryPolicyId: band.id,
      categoryCode: band.categoryCode,
      categoryMultiplierPercent: multiplier,
      before,
      after,
      maxLimit: band.maxLimit,
      result: "applied",
      ruleApplied: band.id,
    },
  })
}
