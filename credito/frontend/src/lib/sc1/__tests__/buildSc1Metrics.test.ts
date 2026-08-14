import { describe, expect, it } from "vitest"
import { buildSc1Metrics, mapSeniorityYears } from "@/lib/sc1/buildSc1Metrics"

describe("buildSc1Metrics", () => {
  it("mapea computed + coverage + bcra a métricas de motor", () => {
    const metrics = buildSc1Metrics({
      computed: {
        capacidadEconomica: {
          liquidezCorriente: 1.8,
          endeudamiento: 0.5,
          rentabilidad: 0.1,
        },
        comportamientoComercial: {
          cantidadRechazados: 1,
          scoreComportamiento: 60,
        },
        documentQualityScore: { score: 70 },
      },
      coverageDecision: { resultadoCobertura: "CON" },
      bcra: { peorSituacion: 2, deudaTotal: 1000 },
      fechaInicioActividad: "2015-06-01",
    })

    expect(metrics["ratios.liquidityCurrent"]).toBe(1.8)
    expect(metrics["ratios.debtRatio"]).toBe(0.5)
    expect(metrics["bcra.worstSituation"]).toBe(2)
    expect(metrics["coverage.status"]).toBe("CON")
    expect(metrics["checks.rejectedCount"]).toBe(1)
    expect(typeof metrics["company.seniorityYears"]).toBe("number")
  })

  it("tolerates computed vacío (métricas nulas / ausentes)", () => {
    const metrics = buildSc1Metrics({ computed: {} })
    expect(metrics).toBeTruthy()
    expect(metrics["ratios.liquidityCurrent"] == null || Number.isFinite(Number(metrics["ratios.liquidityCurrent"]))).toBe(
      true
    )
  })

  it("mapSeniorityYears calcula años desde fecha ISO", () => {
    expect(mapSeniorityYears(null)).toBeNull()
    expect(mapSeniorityYears("")).toBeNull()
    const years = mapSeniorityYears("2010-01-01")
    expect(years).toBeTypeOf("number")
    expect(years).toBeGreaterThan(5)
  })
})
