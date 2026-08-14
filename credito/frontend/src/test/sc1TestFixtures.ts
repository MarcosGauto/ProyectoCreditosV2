import { createDefaultCreditPolicyDocument } from "@/lib/creditPolicy/sc1/creditPolicyDefaults"
import { freezePolicyRevision } from "@/lib/creditPolicy/sc1/policyRevision"
import { createDefaultLimitPolicy } from "@/lib/creditLimit/policy/limitPolicyDefaults"
import { freezeLimitPolicyRevision } from "@/lib/creditLimit/policy/limitPolicyRevision"
import type { CommercialContext } from "@/lib/creditLimit/commercial/commercialContext"
import { runOwnCreditScore } from "@/lib/creditScore/scoreEngine"
import type { OwnCreditScoreResult } from "@/lib/creditScore/result/scoreResultTypes"
import type { RuleEngineMetrics } from "@/lib/creditScore/ruleEngine/ruleEngineTypes"

export const TEST_AT = "2026-01-15T12:00:00.000Z"

export function makeScoreRevision(createdBy = "test") {
  return freezePolicyRevision({
    policy: createDefaultCreditPolicyDocument({
      createdBy,
      at: TEST_AT,
    }),
    createdBy,
    createdAt: TEST_AT,
  })
}

export function makeLimitRevision(createdBy = "test") {
  return freezeLimitPolicyRevision({
    policy: createDefaultLimitPolicy({
      createdBy,
      at: TEST_AT,
    }),
    createdBy,
    createdAt: TEST_AT,
  })
}

/** Métricas flat + nested usadas por evaluators y buildSc1Metrics. */
export function makeHealthyMetrics(
  overrides: RuleEngineMetrics = {}
): RuleEngineMetrics {
  return {
    ratios: {
      liquidityCurrent: 2.2,
      debtRatio: 0.35,
      profitability: 0.14,
    },
    company: { seniorityYears: 8 },
    documentation: {
      qualityScore: 85,
      balanceCurrent: true,
      ivaPresented: true,
      iibbPresented: true,
      minimumComplete: true,
    },
    bcra: { worstSituation: 1, debtAmount: 0, riskFlag: null },
    checks: { rejectedCount: 0 },
    coverage: { status: "CON" },
    activity: { riskLevel: null },
    commercial: { behaviorScore: 75 },
    "ratios.liquidityCurrent": 2.2,
    "ratios.debtRatio": 0.35,
    "ratios.profitability": 0.14,
    "company.seniorityYears": 8,
    "documentation.qualityScore": 85,
    "bcra.worstSituation": 1,
    "checks.rejectedCount": 0,
    "coverage.status": "CON",
    "commercial.behaviorScore": 75,
    ...overrides,
  }
}

export function makeSparseMetrics(): RuleEngineMetrics {
  return {}
}

export function makeCommercialContext(
  overrides: Partial<CommercialContext> = {}
): CommercialContext {
  return {
    monthlyAverageSales: 5_000_000,
    requestedLimit: 1_000_000,
    currentExposure: 0,
    currency: "ARS",
    customerSegment: null,
    guarantees: null,
    ...overrides,
  }
}

/** Score real del motor + overrides parciales para escenarios de Limit Engine. */
export function makeOkScore(
  overrides: Partial<OwnCreditScoreResult> = {}
): OwnCreditScoreResult {
  const base = runOwnCreditScore({
    revision: makeScoreRevision(),
    metrics: makeHealthyMetrics(),
    computedAt: TEST_AT,
  })
  return {
    ...base,
    ...overrides,
    finalScore: {
      ...base.finalScore,
      ...(overrides.finalScore ?? {}),
    },
    confidence: {
      ...base.confidence,
      ...(overrides.confidence ?? {}),
    },
    financialScore: {
      ...base.financialScore,
      ...(overrides.financialScore ?? {}),
    },
    commercialScore: {
      ...base.commercialScore,
      ...(overrides.commercialScore ?? {}),
    },
  }
}
