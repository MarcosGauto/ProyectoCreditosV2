import { MOCK_IPC_INDEX_BY_MONTH } from "@/lib/inflation/ipcMockSeries"
import { FirestoreIpcProvider } from "@/lib/inflation/ipcFirestoreProvider"
import {
  createClientDatosGobArProvider,
  DatosGobArIpcProvider,
} from "@/lib/inflation/datosGobArIpcProvider"

export { createClientDatosGobArProvider }
import { findLatestIndexAtOrBefore } from "@/lib/inflation/ipcSeriesUtils"

/**
 * @typedef {Object} IpcProvider
 * @property {(yearMonth: string) => Promise<number | null>} getIndexForMonth
 * @property {() => string} getSourceId
 */

/**
 * Proveedor mock en memoria (desarrollo / fallback).
 * @implements {IpcProvider}
 */
export class MockIpcProvider {
  /**
   * @param {Record<string, number>} [series]
   */
  constructor(series = MOCK_IPC_INDEX_BY_MONTH) {
    this.series = series
  }

  getSourceId() {
    return "mock"
  }

  /**
   * @param {string} yearMonth
   */
  async getIndexForMonth(yearMonth) {
    if (this.series[yearMonth] != null) {
      return this.series[yearMonth]
    }
    return findLatestIndexAtOrBefore(this.series, yearMonth)
  }
}

let defaultProvider = /** @type {IpcProvider | null} */ (null)

/**
 * @returns {IpcProvider}
 */
export function getDefaultIpcProvider() {
  if (!defaultProvider) {
    const source = process.env.NEXT_PUBLIC_IPC_PROVIDER ?? "datos_gob_ar"
    if (source === "firestore") {
      defaultProvider = new FirestoreIpcProvider()
    } else if (source === "mock") {
      defaultProvider = new MockIpcProvider()
    } else if (typeof window !== "undefined") {
      defaultProvider = createClientDatosGobArProvider()
    } else {
      defaultProvider = new DatosGobArIpcProvider()
    }
  }
  return defaultProvider
}

/**
 * Permite inyectar proveedor en tests o al conectar INDEC.
 * @param {IpcProvider | null} provider
 */
export function setDefaultIpcProvider(provider) {
  defaultProvider = provider
}
