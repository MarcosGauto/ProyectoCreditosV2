import { describe, expect, it } from "vitest"
import {
  buildSc1PublishSlice,
  stripLiveSc1FromComputed,
} from "@/lib/creditAnalysis/buildSc1PublishSlice"
import { makeOkScore, TEST_AT } from "@/lib/sc1/__tests__/sc1TestFixtures"

function makeComputedSc1() {
  return {
    ownCreditScore: makeOkScore(),
    suggestedLimit: {
      suggestedLimit: { value: 750_000, currency: "ARS" },
      decision: { code: "approve_suggested", label: "Aprobar sugerido" },
      limitOrigin: "ALGORITHM",
      review: { required: false },
      guarantees: [],
      term: { termMonths: 12, maxTermMonths: 24 },
      trace: { steps: [] },
      computedAt: TEST_AT,
    },
    commercialContext: {
      monthlyAverageSales: 3_000_000,
      requestedLimit: 750_000,
      currentExposure: 0,
      currency: "ARS",
    },
    revisions: {
      organizationId: "org_test",
      profileId: "profile_default",
      profileName: "Default",
      scoreRevisionId: "rev-score",
      scoreRevisionVersion: 1,
      scoreRevisionHash: "hash-s",
      limitRevisionId: "rev-limit",
      limitRevisionVersion: 1,
      limitRevisionHash: "hash-l",
    },
    computedAt: TEST_AT,
    engine: { score: "SC-1.0", limit: "SC-1.0" },
  }
}

describe("buildSc1PublishSlice", () => {
  it("serializa snapshot + summary + compareIndex desde computed.sc1", () => {
    const slice = buildSc1PublishSlice({ sc1: makeComputedSc1() })
    expect(slice).toBeTruthy()
    expect(slice?.snapshot.ownCreditScore).toBeTruthy()
    expect(slice?.snapshot.suggestedLimit).toBeTruthy()
    expect(slice?.summary?.sc1Score).toBe(850)
    expect(slice?.summary?.sc1Category).toBe("AA")
    expect(slice?.summary?.sc1SuggestedLimit).toBe(750_000)
    expect(slice?.compareIndex?.sc1Score).toBe(850)
    expect(slice?.compareIndex?.sc1Category).toBe("AA")
  })

  it("retorna null si no hay computed.sc1", () => {
    expect(buildSc1PublishSlice({})).toBeNull()
    expect(buildSc1PublishSlice(null)).toBeNull()
  })

  it("stripLiveSc1FromComputed elimina sc1 y sc1Runtime", () => {
    const cleaned = stripLiveSc1FromComputed({
      resumenEjecutivo: { scoreFinanciero: 70 },
      sc1: makeComputedSc1(),
      sc1Runtime: { ready: true, loading: false, error: null },
    })
    expect(cleaned.sc1).toBeUndefined()
    expect(cleaned.sc1Runtime).toBeUndefined()
    expect(cleaned.resumenEjecutivo).toEqual({ scoreFinanciero: 70 })
  })
})
