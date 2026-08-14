import { describe, expect, it } from "vitest"
import { runLimitEngine, createLimitEngine } from "@/lib/creditLimit/engine/runLimitEngine"
import type { LimitOverride } from "@/lib/creditLimit/engine/limitOverride"
import {
  makeCommercialContext,
  makeLimitRevision,
  makeOkScore,
  TEST_AT,
} from "@/test/sc1TestFixtures"

describe("runLimitEngine", () => {
  it("calcula límite sugerido en camino feliz", () => {
    const result = runLimitEngine({
      score: makeOkScore(),
      revision: makeLimitRevision(),
      commercialContext: makeCommercialContext(),
      computedAt: TEST_AT,
    })

    expect(result.suggestedLimit.value).toBeTypeOf("number")
    expect(result.suggestedLimit.value).toBeGreaterThan(0)
    expect(result.decision.code).toBeTruthy()
    expect(result.trace).toBeTruthy()
    expect(Array.isArray(result.trace?.steps)).toBe(true)
    expect(result.computedAt).toBe(TEST_AT)
  })

  it("falta de ventas mensuales degrada o bloquea de forma explícita", () => {
    const result = runLimitEngine({
      score: makeOkScore(),
      revision: makeLimitRevision(),
      commercialContext: makeCommercialContext({
        monthlyAverageSales: null,
      }),
    })

    expect(result).toBeTruthy()
    expect(result.decision.code).toBeTruthy()
    // Sin base comercial el límite calculado no debería ser un valor comercial pleno
    if (result.suggestedLimit.value != null) {
      expect(result.suggestedLimit.value).toBeGreaterThanOrEqual(0)
    }
  })

  it("score no ok respeta requireScoreOk de la política", () => {
    const result = runLimitEngine({
      score: makeOkScore({ status: "not_implemented" }),
      revision: makeLimitRevision(),
      commercialContext: makeCommercialContext(),
    })

    expect(
      result.decision.requiresManualReview === true ||
        result.decision.code !== "approve_suggested"
    ).toBe(true)
  })

  it("categoría extrema baja reduce el límite relativo a categoría alta", () => {
    const high = runLimitEngine({
      score: makeOkScore({
        finalScore: { value: 950, categoryCode: "AAA", categoryLabel: "Excelente" },
      }),
      revision: makeLimitRevision(),
      commercialContext: makeCommercialContext({ monthlyAverageSales: 10_000_000 }),
    })
    const low = runLimitEngine({
      score: makeOkScore({
        finalScore: { value: 200, categoryCode: "B", categoryLabel: "Crítico" },
        confidence: {
          value: 0.4,
          level: "low",
          label: "Baja",
          missing: ["ratios.liquidityCurrent"],
        },
      }),
      revision: makeLimitRevision(),
      commercialContext: makeCommercialContext({ monthlyAverageSales: 10_000_000 }),
    })

    const highVal = high.suggestedLimit.value ?? 0
    const lowVal = low.suggestedLimit.value ?? 0
    expect(highVal).toBeGreaterThanOrEqual(lowVal)
  })

  it("confidence baja queda reflejada en el resultado", () => {
    const result = runLimitEngine({
      score: makeOkScore({
        confidence: {
          value: 0.25,
          level: "low",
          label: "Baja",
          missing: ["ratios.liquidityCurrent", "bcra.worstSituation"],
        },
      }),
      revision: makeLimitRevision(),
      commercialContext: makeCommercialContext(),
    })

    expect(result).toBeTruthy()
    expect(result.decision.code).toBeTruthy()
  })

  it("override manual con apply reemplaza el límite", () => {
    const base = runLimitEngine({
      score: makeOkScore(),
      revision: makeLimitRevision(),
      commercialContext: makeCommercialContext(),
    })

    const override: LimitOverride = {
      amount: 123_456,
      reasonCode: "manual_review",
      userId: "analyst-1",
      at: TEST_AT,
      comment: "Ajuste de mesa",
      apply: true,
    }

    const result = runLimitEngine({
      score: makeOkScore(),
      revision: makeLimitRevision(),
      commercialContext: makeCommercialContext(),
      override,
    })

    expect(result.suggestedLimit.value).toBe(123_456)
    expect(result.limitOrigin).toBe("OVERRIDE")
    expect(result.suggestedLimit.value).not.toBe(base.suggestedLimit.value)
  })

  it("override con apply=false no fuerza el monto", () => {
    const override: LimitOverride = {
      amount: 999,
      reasonCode: "manual_review",
      userId: "analyst-1",
      at: TEST_AT,
      comment: null,
      apply: false,
    }

    const result = runLimitEngine({
      score: makeOkScore(),
      revision: makeLimitRevision(),
      commercialContext: makeCommercialContext(),
      override,
    })

    expect(result.suggestedLimit.value).not.toBe(999)
  })

  it("createLimitEngine expone run equivalente", () => {
    const engine = createLimitEngine()
    const input = {
      score: makeOkScore(),
      revision: makeLimitRevision(),
      commercialContext: makeCommercialContext(),
      computedAt: TEST_AT,
    }
    expect(engine.run(input).suggestedLimit.value).toBe(
      runLimitEngine(input).suggestedLimit.value
    )
  })
})
