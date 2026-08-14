import {
  doc,
  getDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/service/firebase"

import {
  CREDIT_ANALYSIS_COLLECTION,
  DRAFT_DOC_ID,
  DRAFT_SCHEMA_VERSION,
} from "@/lib/creditAnalysis/constants"
import { pickDraftFields } from "@/lib/creditAnalysis/draftSchema"
import { DraftConflictError } from "@/lib/creditAnalysis/DraftConflictError"

export class DraftRepository {
  /**
   * @param {string} cuit
   */
  static ref(cuit) {
    return doc(db, "empresas", cuit, CREDIT_ANALYSIS_COLLECTION, DRAFT_DOC_ID)
  }

  /**
   * @param {string} cuit
   */
  static async get(cuit) {
    const snap = await getDoc(DraftRepository.ref(cuit))
    if (!snap.exists()) {
      return null
    }
    return { id: snap.id, ...snap.data() }
  }

  /**
   * @param {string} cuit
   * @param {Record<string, unknown>} delta
   * @param {{
   *   autosavedBy?: string | null;
   *   expectedRevision?: number | null;
   * }} [options]
   * @returns {Promise<{ draftRevision: number }>}
   */
  static async saveDraft(cuit, delta, options = {}) {
    const expectedRevision = options.expectedRevision ?? null

    return runTransaction(db, async (transaction) => {
      const ref = DraftRepository.ref(cuit)
      const snap = await transaction.get(ref)
      const existing = snap.exists() ? snap.data() : null
      const currentRevision =
        typeof existing?.draftRevision === "number"
          ? existing.draftRevision
          : null

      if (expectedRevision != null) {
        if (currentRevision !== expectedRevision) {
          throw new DraftConflictError(currentRevision)
        }
      } else if (currentRevision != null) {
        throw new DraftConflictError(currentRevision)
      }

      const existingPartial =
        existing?.partial && typeof existing.partial === "object"
          ? existing.partial
          : {}

      // Whitelist only: strip legacy keys (computed, fingerprints, etc.).
      // Full document set (no merge) so Firestore cannot deep-merge old nested keys.
      const mergedPartial = pickDraftFields({
        ...existingPartial,
        ...delta,
      })

      const newRevision = Math.max(currentRevision ?? 0, Date.now()) + 1

      transaction.set(ref, {
        cuit,
        schemaVersion: DRAFT_SCHEMA_VERSION,
        partial: mergedPartial,
        autosavedAt: serverTimestamp(),
        lastInteractionAt: serverTimestamp(),
        autosavedBy: options.autosavedBy ?? "desconocido",
        draftRevision: newRevision,
      })

      return { draftRevision: newRevision }
    })
  }

  /**
   * @param {string} cuit
   */
  static async delete(cuit) {
    await deleteDoc(DraftRepository.ref(cuit))
  }
}
