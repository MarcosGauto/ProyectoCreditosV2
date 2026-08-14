/**
 * Hechos para LimitRules: OwnCreditScoreResult resumido + CommercialContext.
 */

import type { CommercialContext } from "@/lib/creditLimit/commercial/commercialContext"
import type { OwnCreditScoreResult } from "@/lib/creditScore/result/scoreResultTypes"

function setPath(
  root: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split(".").filter(Boolean)
  if (parts.length === 0) return
  let cur: Record<string, unknown> = root
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i]
    const next = cur[key]
    if (next == null || typeof next !== "object" || Array.isArray(next)) {
      cur[key] = {}
    }
    cur = cur[key] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

export function buildRuleEvaluationFacts(
  score: OwnCreditScoreResult,
  commercialContext: CommercialContext
): Record<string, unknown> {
  const facts: Record<string, unknown> = {
    confidence: {
      value: score.confidence.value,
      level: score.confidence.level,
    },
    score: {
      final: score.finalScore.value,
      categoryCode: score.finalScore.categoryCode,
      categoryLabel: score.finalScore.categoryLabel,
      status: score.status,
    },
    commercial: {
      monthlyAverageSales: commercialContext.monthlyAverageSales,
      currentExposure: commercialContext.currentExposure,
      requestedLimit: commercialContext.requestedLimit,
      currency: commercialContext.currency,
      customerSegment: commercialContext.customerSegment ?? null,
      guarantees: commercialContext.guarantees ?? null,
    },
  }

  for (const b of score.breakdown) {
    setPath(facts, `dimensions.${b.dimensionId}.status`, b.status)
    setPath(facts, `dimensions.${b.dimensionId}.score`, b.score)
    setPath(facts, `dimensions.${b.dimensionId}.enabled`, b.enabled)
    setPath(facts, `dimensions.${b.dimensionId}.metricValue`, b.metricValue)

    if (b.dimensionId === "coverage") {
      const statusFromValue =
        typeof b.metricValue === "string"
          ? b.metricValue
          : b.metricValue != null &&
              typeof b.metricValue === "object" &&
              "status" in (b.metricValue as object)
            ? (b.metricValue as { status: unknown }).status
            : b.status
      setPath(facts, "coverage.status", statusFromValue)
    }
    if (b.dimensionId === "documentation") {
      setPath(facts, "documentation.status", b.status)
      setPath(facts, "dimensions.documentation.status", b.status)
    }
  }

  return facts
}
