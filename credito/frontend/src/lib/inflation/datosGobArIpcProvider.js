import {
  fetchIpcIndexForMonth,
  isoDateToYearMonth,
} from "@/lib/inflation/datosGobArSeries"
import { findLatestIndexAtOrBefore } from "@/lib/inflation/ipcSeriesUtils"

/**
 * Proveedor IPC usando API oficial datos.gob.ar (INDEC).
 * @implements {import("@/lib/inflation/ipcProvider").IpcProvider}
 */
export class DatosGobArIpcProvider {
  /**
   * @param {string} [baseUrl] ruta relativa del proxy Next (cliente) o URL directa (servidor)
   */
  constructor(baseUrl = "") {
    this.baseUrl = baseUrl
    /** @type {Record<string, number>} */
    this.localSeries = {}
  }

  getSourceId() {
    return "datos_gob_ar"
  }

  /**
   * @param {string} yearMonth
   */
  async getIndexForMonth(yearMonth) {
    if (this.localSeries[yearMonth] != null) {
      return this.localSeries[yearMonth]
    }

    if (this.baseUrl) {
      const fromProxy = await this.fetchFromProxy(yearMonth)
      if (fromProxy != null) {
        this.localSeries[yearMonth] = fromProxy
        return fromProxy
      }
    }

    const direct = await fetchIpcIndexForMonth(yearMonth)
    if (direct != null) {
      this.localSeries[yearMonth] = direct
      return direct
    }

    return findLatestIndexAtOrBefore(this.localSeries, yearMonth)
  }

  /**
   * @param {string} yearMonth
   */
  async fetchFromProxy(yearMonth) {
    try {
      const url = `${this.baseUrl}?month=${encodeURIComponent(yearMonth)}`
      const res = await fetch(url)
      if (!res.ok) {
        return null
      }
      const body = await res.json()
      const index = Number(body?.index)
      return Number.isFinite(index) ? index : null
    } catch {
      return null
    }
  }

  /**
   * @param {string} originYearMonth
   * @param {string} destYearMonth
   * @returns {Promise<{ ipcOrigen: number | null; ipcDestino: number | null; factor?: number } | null>}
   */
  async fetchOriginDestFromProxy(originYearMonth, destYearMonth) {
    if (!this.baseUrl) {
      return null
    }
    try {
      const url = `${this.baseUrl}?origin=${encodeURIComponent(originYearMonth)}&dest=${encodeURIComponent(destYearMonth)}`
      const res = await fetch(url)
      if (!res.ok) {
        return null
      }
      const body = await res.json()
      const ipcOrigen = Number(body?.ipcOrigen)
      const ipcDestino = Number(body?.ipcDestino)
      return {
        ipcOrigen: Number.isFinite(ipcOrigen) ? ipcOrigen : null,
        ipcDestino: Number.isFinite(ipcDestino) ? ipcDestino : null,
        factor: Number(body?.factor),
      }
    } catch {
      return null
    }
  }
}

/**
 * Proveedor para el navegador (usa route handler de Next).
 */
export function createClientDatosGobArProvider() {
  return new DatosGobArIpcProvider("/api/inflation/ipc")
}
