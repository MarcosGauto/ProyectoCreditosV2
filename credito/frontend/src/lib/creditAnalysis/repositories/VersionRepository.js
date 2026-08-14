import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
} from "firebase/firestore"
import { db } from "@/service/firebase"

import {
  CREDIT_ANALYSIS_COLLECTION,
  VERSIONS_SUBCOLLECTION,
} from "@/lib/creditAnalysis/constants"

export class VersionRepository {
  /**
   * @param {string} cuit
   */
  static versionsCol(cuit) {
    return collection(
      db,
      "empresas",
      cuit,
      CREDIT_ANALYSIS_COLLECTION,
      VERSIONS_SUBCOLLECTION
    )
  }

  /**
   * @param {string} cuit
   * @param {string} versionId
   */
  static ref(cuit, versionId) {
    return doc(VersionRepository.versionsCol(cuit), versionId)
  }

  /**
   * @param {string} cuit
   * @param {string} versionId
   */
  static async get(cuit, versionId) {
    const snap = await getDoc(VersionRepository.ref(cuit, versionId))
    if (!snap.exists()) {
      return null
    }
    return { versionId: snap.id, ...snap.data() }
  }

  /**
   * @param {string} cuit
   * @param {{
   *   pageSize?: number;
   *   cursorPublishedAt?: unknown;
   *   status?: string | null;
   *   tag?: string | null;
   * }} [options]
   */
  static async listTimeline(cuit, options = {}) {
    const pageSize = options.pageSize ?? 10

    let q = query(
      VersionRepository.versionsCol(cuit),
      orderBy("publishedAt", "desc"),
      limit(pageSize)
    )

    if (options.cursorPublishedAt) {
      q = query(
        VersionRepository.versionsCol(cuit),
        orderBy("publishedAt", "desc"),
        startAfter(options.cursorPublishedAt),
        limit(pageSize)
      )
    }

    const snap = await getDocs(q)
    let rows = snap.docs.map((document) => ({
      versionId: document.id,
      ...document.data(),
    }))

    if (options.status) {
      rows = rows.filter((row) => row.status === options.status)
    }

    if (options.tag) {
      rows = rows.filter((row) =>
        Array.isArray(row.tags) ? row.tags.includes(options.tag) : false
      )
    }

    const lastDoc = snap.docs[snap.docs.length - 1]

    return {
      items: rows,
      nextCursor:
        snap.docs.length === pageSize
          ? lastDoc?.data()?.publishedAt ?? null
          : null,
    }
  }
}
