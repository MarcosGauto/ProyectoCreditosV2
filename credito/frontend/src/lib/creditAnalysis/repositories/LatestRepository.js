import { db } from "@/service/firebase"
import { doc, getDoc } from "firebase/firestore"

import {
  CREDIT_ANALYSIS_COLLECTION,
  LATEST_DOC_ID,
} from "@/lib/creditAnalysis/constants"

/**
 * @typedef {{
 *   currentVersionId: string | null;
 *   versionNumber: number;
 *   updatedAt?: unknown;
 *   publishedAt?: unknown;
 *   summary?: Record<string, unknown>;
 * }} LatestAnalysisDoc
 */

export class LatestRepository {
  /**
   * @param {string} cuit
   */
  static ref(cuit) {
    return doc(db, "empresas", cuit, CREDIT_ANALYSIS_COLLECTION, LATEST_DOC_ID)
  }

  /**
   * @param {string} cuit
   * @returns {Promise<LatestAnalysisDoc | null>}
   */
  static async get(cuit) {
    const snap = await getDoc(LatestRepository.ref(cuit))
    if (!snap.exists()) {
      return null
    }

    const data = snap.data()
    return {
      currentVersionId:
        typeof data.currentVersionId === "string" ? data.currentVersionId : null,
      versionNumber:
        typeof data.versionNumber === "number" ? data.versionNumber : 0,
      updatedAt: data.updatedAt,
      publishedAt: data.publishedAt,
      summary:
        data.summary && typeof data.summary === "object"
          ? /** @type {Record<string, unknown>} */ (data.summary)
          : undefined,
    }
  }
}
