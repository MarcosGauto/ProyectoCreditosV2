import { describe, expect, it } from "vitest"
import { evaluateProductDimensions } from "@/lib/creditScore/evaluators"
import { aggregateFromRevision } from "@/lib/creditScore/aggregator"
import {
  makeHealthyMetrics,
  makeScoreRevision,
  makeSparseMetrics,
} from "@/lib/sc1/__tests__/sc1TestFixtures"

describe("Score evaluators + aggregator coverage", () => {
  it("evalúa todas las dimensiones de la policy default", () => {
    const revision = makeScoreRevision()
    const evaluations = evaluateProductDimensions(
      revision.policySnapshot.dimensions,
      makeHealthyMetrics()
    )
    expect(evaluations.length).toBe(revision.policySnapshot.dimensions.length)
    for (const ev of evaluations) {
      expect(ev.dimensionId).toBeTruthy()
      expect(ev.status).toBeTruthy()
    }
  })

  it("aggregator produce breakdown y confidence desde evaluations", () => {
    const revision = makeScoreRevision()
    const evaluations = evaluateProductDimensions(
      revision.policySnapshot.dimensions,
      makeHealthyMetrics()
    )
    const result = aggregateFromRevision(evaluations, revision)
    expect(result.breakdown.length).toBeGreaterThan(0)
    expect(result.confidence).toBeTruthy()
    expect(result.finalScore).toBeTruthy()
  })

  it("con métricas vacías marca missing / statuses UNKNOWN o SKIPPED", () => {
    const revision = makeScoreRevision()
    const evaluations = evaluateProductDimensions(
      revision.policySnapshot.dimensions,
      makeSparseMetrics()
    )
    const result = aggregateFromRevision(evaluations, revision)
    expect(result.confidence.missing.length).toBeGreaterThan(0)
    const unknownOrSkipped = evaluations.filter(
      (e) => e.status === "UNKNOWN" || e.status === "SKIPPED"
    )
    expect(unknownOrSkipped.length).toBeGreaterThan(0)
  })
})
