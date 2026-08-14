import { describe, expect, it } from "vitest"
import { runOwnCreditScore } from "@/lib/creditScore/scoreEngine"
import {
  makeHealthyMetrics,
  makeScoreRevision,
  makeSparseMetrics,
  TEST_AT,
} from "@/lib/sc1/__tests__/sc1TestFixtures"

describe("runOwnCreditScore", () => {
  it("produce score ok con métricas completas", () => {
    const result = runOwnCreditScore({
      revision: makeScoreRevision(),
      metrics: makeHealthyMetrics(),
      computedAt: TEST_AT,
    })

    expect(result.status).toBe("ok")
    expect(result.computedAt).toBe(TEST_AT)
    expect(result.finalScore.value).toBeTypeOf("number")
    expect(result.finalScore.value).toBeGreaterThan(0)
    expect(result.finalScore.categoryCode).toBeTruthy()
    expect(result.confidence.value).toBeGreaterThan(0)
    expect(["high", "medium", "low"]).toContain(result.confidence.level)
    expect(result.financialScore.value).not.toBeNull()
    expect(result.commercialScore.value).not.toBeNull()
  })

  it("degrada confidence con métricas faltantes", () => {
    const full = runOwnCreditScore({
      revision: makeScoreRevision(),
      metrics: makeHealthyMetrics(),
    })
    const sparse = runOwnCreditScore({
      revision: makeScoreRevision(),
      metrics: makeSparseMetrics(),
    })

    expect(sparse.confidence.value).toBeLessThanOrEqual(
      full.confidence.value ?? 1
    )
    expect(sparse.confidence.missing.length).toBeGreaterThan(0)
  })

  it("métricas extremas negativas producen categoría baja", () => {
    const result = runOwnCreditScore({
      revision: makeScoreRevision(),
      metrics: makeHealthyMetrics({
        "ratios.liquidityCurrent": 0.1,
        "ratios.debtRatio": 5,
        "ratios.profitability": -0.5,
        "bcra.worstSituation": 5,
        "checks.rejectedCount": 20,
        "coverage.status": "SIN",
        "documentation.qualityScore": 5,
        "company.seniorityYears": 0,
        "commercial.behaviorScore": 5,
        ratios: {
          liquidityCurrent: 0.1,
          debtRatio: 5,
          profitability: -0.5,
        },
        bcra: { worstSituation: 5, debtAmount: 9e9, riskFlag: true },
        checks: { rejectedCount: 20 },
        coverage: { status: "SIN" },
        documentation: {
          qualityScore: 5,
          balanceCurrent: false,
          ivaPresented: false,
          iibbPresented: false,
          minimumComplete: false,
        },
        commercial: { behaviorScore: 5 },
      }),
    })

    expect(result.finalScore.value).toBeTypeOf("number")
    expect(result.finalScore.categoryCode).toBeTruthy()
    // Con defaults, peores métricas no deben alcanzar AAA
    expect(result.finalScore.categoryCode).not.toBe("AAA")
  })

  it("métricas excelentes tienden a categorías altas", () => {
    const result = runOwnCreditScore({
      revision: makeScoreRevision(),
      metrics: makeHealthyMetrics({
        "ratios.liquidityCurrent": 4,
        "ratios.debtRatio": 0.1,
        "ratios.profitability": 0.4,
        "bcra.worstSituation": 1,
        "checks.rejectedCount": 0,
        "documentation.qualityScore": 100,
        "company.seniorityYears": 20,
        "commercial.behaviorScore": 100,
        ratios: {
          liquidityCurrent: 4,
          debtRatio: 0.1,
          profitability: 0.4,
        },
      }),
    })

    expect(result.finalScore.value).toBeGreaterThan(500)
    expect(["AAA", "AA", "A", "BBB"]).toContain(
      result.finalScore.categoryCode
    )
  })

  it("computedAt null queda null", () => {
    const result = runOwnCreditScore({
      revision: makeScoreRevision(),
      metrics: makeHealthyMetrics(),
      computedAt: null,
    })
    expect(result.computedAt).toBeNull()
  })

  it("es determinístico para mismos inputs", () => {
    const input = {
      revision: makeScoreRevision(),
      metrics: makeHealthyMetrics(),
      computedAt: TEST_AT,
    }
    const a = runOwnCreditScore(input)
    const b = runOwnCreditScore(input)
    expect(a.finalScore.value).toBe(b.finalScore.value)
    expect(a.finalScore.categoryCode).toBe(b.finalScore.categoryCode)
    expect(a.confidence.value).toBe(b.confidence.value)
  })
})
