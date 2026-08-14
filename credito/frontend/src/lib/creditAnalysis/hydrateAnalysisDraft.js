import { loadCurrentPublishedAnalysis } from "@/lib/creditAnalysis/migrateLegacyAnalysis"
import { DraftRepository } from "@/lib/creditAnalysis/repositories/DraftRepository"
import {
  draftPartialDiffersFromPublished,
  pickDraftFields,
} from "@/lib/creditAnalysis/draftSchema"

/**
 * @param {Record<string, unknown> | null | undefined} version
 */
function extractPublishedEditableBaseline(version) {
  if (!version?.snapshot || typeof version.snapshot !== "object") {
    return {}
  }

  const snapshot = /** @type {Record<string, any>} */ (version.snapshot)
  const decision = snapshot.decision ?? {}
  const analistaConfig = snapshot.inputs?.analistaConfig ?? {}

  return pickDraftFields({
    ...analistaConfig,
    ...decision,
    analisisBalanceIA: snapshot.aiObservations?.analisisBalanceIA ?? null,
  })
}

/**
 * @param {string} cuit
 */
export async function hydrateAnalysisDraft(cuit) {
  if (!cuit) {
    return {
      fields: {},
      draftRevision: null,
      autosavedAt: null,
      publishedBaseline: {},
      publishedVersion: null,
      hasDraft: false,
      recoveredFromDraft: false,
    }
  }

  const [draft, published] = await Promise.all([
    DraftRepository.get(cuit),
    loadCurrentPublishedAnalysis(cuit),
  ])

  const publishedBaseline = extractPublishedEditableBaseline(published.version)
  const draftPartial =
    draft?.partial && typeof draft.partial === "object" ? draft.partial : {}
  const fields = {
    ...publishedBaseline,
    ...pickDraftFields(draftPartial),
  }

  const hasDraft = Boolean(draft?.partial)
  const recoveredFromDraft =
    hasDraft && draftPartialDiffersFromPublished(draftPartial, publishedBaseline)

  return {
    fields,
    draftRevision:
      typeof draft?.draftRevision === "number" ? draft.draftRevision : null,
    autosavedAt: draft?.autosavedAt ?? null,
    publishedBaseline,
    publishedVersion: published.version ?? null,
    hasDraft,
    recoveredFromDraft,
  }
}
