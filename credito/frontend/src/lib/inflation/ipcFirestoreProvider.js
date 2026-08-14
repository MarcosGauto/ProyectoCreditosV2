import { doc, getDoc } from "firebase/firestore"
import { db } from "@/service/firebase"
import { FIRESTORE_IPC_COLLECTION } from "@/lib/inflation/constants"
import { MockIpcProvider } from "@/lib/inflation/ipcProvider"
import { MOCK_IPC_INDEX_BY_MONTH } from "@/lib/inflation/ipcMockSeries"

/**
 * Lee IPC mensual desde Firestore: `ipc_mensual/{YYYY-MM}` campo `indice`.
 * Si no existe el documento, usa el índice mock como respaldo (transición).
 *
 * @implements {import("@/lib/inflation/ipcProvider").IpcProvider}
 */
export class FirestoreIpcProvider {
  constructor() {
    this.fallback = new MockIpcProvider(MOCK_IPC_INDEX_BY_MONTH)
  }

  getSourceId() {
    return "firestore"
  }

  /**
   * @param {string} yearMonth
   */
  async getIndexForMonth(yearMonth) {
    try {
      const ref = doc(db, FIRESTORE_IPC_COLLECTION, yearMonth)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        const indice = Number(data.indice ?? data.index ?? data.valor)
        if (Number.isFinite(indice) && indice > 0) {
          return indice
        }
      }
    } catch (error) {
      console.warn("[FirestoreIpcProvider] fallback a mock:", error)
    }

    return this.fallback.getIndexForMonth(yearMonth)
  }
}
