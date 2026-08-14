/**
 * SC-1.0 dual-run — orquestador público.
 * Adapters internos: buildSc1Metrics / buildCommercialContext.
 */

export { runSc1Analysis, toComputedSc1Block } from "./runSc1Analysis"
export type {
  RunSc1AnalysisInput,
  Sc1AnalysisResult,
  Sc1AnalysisRevisions,
} from "./runSc1Analysis"
