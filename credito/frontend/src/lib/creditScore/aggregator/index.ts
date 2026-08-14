/**
 * Aggregator SC-1.0 — contratos + implementación.
 */

export * from "./aggregatorTypes"
export {
  createScoreAggregator,
  aggregateFromRevision,
  aggregateScores,
  categorize,
  buildGlobalFindings,
  buildConfidence,
} from "./createScoreAggregator"
