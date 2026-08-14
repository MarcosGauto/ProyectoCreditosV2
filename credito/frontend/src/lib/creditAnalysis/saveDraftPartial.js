import { ensureEmpresaDocument } from "@/lib/uploadFinancialDocument"
import { normalizeDraftDelta } from "@/lib/creditAnalysis/draftSchema"
import { DraftRepository } from "@/lib/creditAnalysis/repositories/DraftRepository"

/**
 * Único punto de entrada operativo para persistir borradores.
 *
 * @param {string} cuit
 * @param {Record<string, unknown>} delta
 * @param {{
 *   autosavedBy?: string | null;
 *   expectedRevision?: number | null;
 * }} [options]
 * @returns {Promise<{ draftRevision: number } | null>}
 */
export async function saveDraftPartial(cuit, delta, options = {}) {
  if (!cuit) {
    return null
  }

  const normalized = normalizeDraftDelta(delta)
  if (Object.keys(normalized).length === 0) {
    return null
  }

  await ensureEmpresaDocument(cuit)

  return DraftRepository.saveDraft(cuit, normalized, {
    autosavedBy: options.autosavedBy ?? null,
    expectedRevision: options.expectedRevision ?? null,
  })
}
