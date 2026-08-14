import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createProjectionRegistry,
} from "@/lib/settings/projection"
import { createProductOrganizationSettings } from "@/lib/settings/seeds/createProductOrganizationSettings"
import { freezeLimitPolicyRevision } from "@/lib/creditLimit/policy/limitPolicyRevision"
import { freezePolicyRevision } from "@/lib/creditPolicy/sc1/policyRevision"
import { TEST_AT } from "@/lib/sc1/__tests__/sc1TestFixtures"

const loadAndProjectOrganizationSettings = vi.fn()

vi.mock("@/lib/settings", () => ({
  loadAndProjectOrganizationSettings: (...args: unknown[]) =>
    loadAndProjectOrganizationSettings(...args),
}))

function makeProjectedRuntime() {
  const org = createProductOrganizationSettings({ organizationId: "org_test" })
  const registry = createProjectionRegistry()
  const profile = registry.resolveActive.resolve(org, {})
  if (!profile) throw new Error("missing profile")
  const creditPolicy = registry.profile.projectScore(profile)
  const limitPolicy = registry.profile.projectLimit(profile)
  return {
    organization: org,
    profile,
    creditPolicy,
    limitPolicy,
    scoreRevision: freezePolicyRevision({
      policy: creditPolicy,
      createdBy: "test",
      createdAt: TEST_AT,
    }),
    limitRevision: freezeLimitPolicyRevision({
      policy: limitPolicy,
      createdBy: "test",
      createdAt: TEST_AT,
    }),
  }
}

describe("runSc1Analysis", () => {
  beforeEach(() => {
    loadAndProjectOrganizationSettings.mockReset()
    loadAndProjectOrganizationSettings.mockResolvedValue(makeProjectedRuntime())
  })

  it("orquesta score + limit sin tocar legacy", async () => {
    const { runSc1Analysis, toComputedSc1Block } = await import(
      "@/lib/sc1/runSc1Analysis"
    )

    const result = await runSc1Analysis({
      organizationId: "org_test",
      computed: {
        capacidadEconomica: {
          liquidezCorriente: 2,
          endeudamiento: 0.4,
          rentabilidad: 0.12,
        },
        comportamientoComercial: {
          cantidadRechazados: 0,
          scoreComportamiento: 70,
        },
        documentQualityScore: { score: 80 },
      },
      coverageDecision: { resultadoCobertura: "CON" },
      bcra: { peorSituacion: 1, deudaTotal: 0 },
      fechaInicioActividad: "2018-01-01",
      preCalificacion: { promedioVentas: 4_000_000 },
      requestedLimit: 800_000,
      currentExposure: 0,
      createdBy: "test",
      computedAt: TEST_AT,
    })

    expect(loadAndProjectOrganizationSettings).toHaveBeenCalledOnce()
    expect(result.ownCreditScore.status).toBe("ok")
    expect(result.suggestedLimit.decision.code).toBeTruthy()
    expect(result.metrics).toBeTruthy()
    expect(result.commercialContext.monthlyAverageSales).toBe(4_000_000)
    expect(result.computedAt).toBe(TEST_AT)

    const block = toComputedSc1Block(result)
    expect(block.ownCreditScore).toBeTruthy()
    expect(block.suggestedLimit).toBeTruthy()
    expect(block.engine).toEqual({ score: "SC-1.0", limit: "SC-1.0" })
  })
})
