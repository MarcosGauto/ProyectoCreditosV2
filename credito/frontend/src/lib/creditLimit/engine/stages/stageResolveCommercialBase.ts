/**
 * Stage 4 — Resolve Commercial Base (pura).
 * monthlyAverageSales × commercialFactorPercent (solo desde LimitPolicy).
 */

import { LimitTraceCode } from "@/lib/creditLimit/engine/limitTraceCodes"
import { readCommercialFactorPercent } from "@/lib/creditLimit/engine/readPolicyValues"
import {
  appendJustification,
  appendTraceStep,
  haltAs,
  round2,
  type LimitPipelineState,
} from "@/lib/creditLimit/engine/pipelineState"

export function stageResolveCommercialBase(
  state: LimitPipelineState
): LimitPipelineState {
  const sales = state.commercialContext.monthlyAverageSales
  const factor = readCommercialFactorPercent(state.policy)

  let next: LimitPipelineState = {
    ...state,
    baseMetricKey: state.policy.baseMetricKey,
    baseMetricValue: sales,
    commercialFactorPercent: factor,
    limitOrigin: "ALGORITHM",
  }

  if (next.halted) {
    return appendTraceStep(next, {
      id: `${LimitTraceCode.RESOLVE_COMMERCIAL_BASE}.skipped`,
      stage: "category_base",
      code: "base_limit",
      label: LimitTraceCode.RESOLVE_COMMERCIAL_BASE,
      previousValue: sales,
      newValue: null,
      resultCode: "SKIPPED",
      changed: false,
      details: {
        commercialFactorPercent: factor,
        monthlyAverageSales: sales,
      },
    })
  }

  if (factor == null) {
    next = haltAs(next, "invalid_policy", "invalid_policy")
    next = {
      ...next,
      missing: [...next.missing, "extensions.commercialFactorPercent"],
    }
    next = appendJustification(next, LimitTraceCode.COMMERCIAL_FACTOR_MISSING, {
      severity: "critical",
    })
    return appendTraceStep(next, {
      id: LimitTraceCode.COMMERCIAL_FACTOR_MISSING,
      stage: "category_base",
      code: "base_limit",
      label: LimitTraceCode.COMMERCIAL_FACTOR_MISSING,
      previousValue: sales,
      newValue: null,
      resultCode: "INVALID_POLICY",
      changed: true,
      details: { commercialFactorPercent: null, monthlyAverageSales: sales },
    })
  }

  if (sales == null || !Number.isFinite(sales)) {
    next = haltAs(next, "insufficient_data", "insufficient_data", {
      requiresManualReview: true,
    })
    next = {
      ...next,
      missing: [...next.missing, "commercialContext.monthlyAverageSales"],
    }
    next = appendJustification(next, LimitTraceCode.SALES_MISSING, {
      severity: "warning",
    })
    return appendTraceStep(next, {
      id: LimitTraceCode.SALES_MISSING,
      stage: "category_base",
      code: "sales_metric",
      label: LimitTraceCode.SALES_MISSING,
      previousValue: null,
      newValue: null,
      resultCode: "INSUFFICIENT_DATA",
      changed: true,
      details: { commercialFactorPercent: factor, monthlyAverageSales: null },
    })
  }

  const commercialBase = round2(sales * (factor / 100))
  next = {
    ...next,
    commercialBase,
    baseValue: commercialBase,
    currentLimit: commercialBase,
    kind: "percent_of_metric",
  }

  next = appendJustification(next, LimitTraceCode.RESOLVE_COMMERCIAL_BASE, {
    severity: "info",
  })

  return appendTraceStep(next, {
    id: LimitTraceCode.RESOLVE_COMMERCIAL_BASE,
    stage: "category_base",
    code: "base_limit",
    label: LimitTraceCode.RESOLVE_COMMERCIAL_BASE,
    previousValue: sales,
    newValue: commercialBase,
    resultCode: "APPLIED",
    changed: true,
    details: {
      monthlyAverageSales: sales,
      commercialFactorPercent: factor,
      formula: "monthlyAverageSales * commercialFactorPercent / 100",
      before: sales,
      after: commercialBase,
    },
  })
}
