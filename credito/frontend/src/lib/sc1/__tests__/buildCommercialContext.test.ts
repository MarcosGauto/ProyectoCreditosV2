import { describe, expect, it } from "vitest"
import { buildCommercialContext } from "@/lib/sc1/buildCommercialContext"

describe("buildCommercialContext", () => {
  it("usa promedioVentas como monthlyAverageSales", () => {
    const ctx = buildCommercialContext({
      preCalificacion: { promedioVentas: 2_500_000, preCalificacion: 999 },
      requestedLimit: 500_000,
      currentExposure: 100_000,
      currency: "ARS",
      guarantees: ["cheque"],
    })

    expect(ctx.monthlyAverageSales).toBe(2_500_000)
    expect(ctx.requestedLimit).toBe(500_000)
    expect(ctx.currentExposure).toBe(100_000)
    expect(ctx.currency).toBe("ARS")
    expect(ctx.guarantees).toEqual(["cheque"])
  })

  it("fallback a promedioIndicadores si no hay promedioVentas", () => {
    const ctx = buildCommercialContext({
      preCalificacion: { promedioIndicadores: 1_200_000 },
    })
    expect(ctx.monthlyAverageSales).toBe(1_200_000)
  })

  it("defaults de moneda ARS y nulos seguros", () => {
    const ctx = buildCommercialContext({})
    expect(ctx.currency).toBe("ARS")
    expect(ctx.monthlyAverageSales).toBeNull()
    expect(ctx.requestedLimit).toBeNull()
  })
})
