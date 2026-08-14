import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"
import { BALANCE_INFLATION_FIELDS } from "@/lib/inflation/constants"
import { fetchIpcOriginDestIndices } from "@/lib/inflation/datosGobArSeries"
import { createClientDatosGobArProvider } from "@/lib/inflation/datosGobArIpcProvider"
import { getDefaultIpcProvider } from "@/lib/inflation/ipcProvider"

import { amountToFormString, roundMoneyForFirestore } from "@/lib/money"

/**
 * @typedef {Object} InflationDataPayload
 * @property {number} factor
 * @property {number} accumulated
 * @property {number | null} ipcOrigen
 * @property {number | null} ipcDestino
 * @property {string} [fechaIPCOrigen]
 * @property {string} [fechaIPCDestino]
 * @property {boolean} [manual]
 * @property {string} [source]
 */

/**
 * @typedef {Object} InflationFactorResult
 * @property {number} factorInflacion
 * @property {number} accumulated
 * @property {string} fechaIPCOrigen
 * @property {string} fechaIPCDestino
 * @property {number} inflacionAcumuladaPct
 * @property {number | null} ipcOrigen
 * @property {number | null} ipcDestino
 * @property {string} sourceId
 * @property {boolean} [fallback]
 * @property {boolean} [apiUnavailable]
 * @property {boolean} [manual]
 * @property {string} [warningMessage]
 */

/**
 * @param {string | Date | null | undefined} dateInput
 * @returns {string | null} YYYY-MM
 */
export function toYearMonth(dateInput) {
  if (dateInput == null || dateInput === "") {
    return null
  }

  const date =
    typeof dateInput === "string"
      ? new Date(
          dateInput.includes("T") ? dateInput : `${dateInput}T12:00:00`
        )
      : dateInput

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

/**
 * factor = ipc(destino) / ipc(origen)
 * @param {number} ipcOrigen
 * @param {number} ipcDestino
 * @returns {Pick<InflationFactorResult, "factorInflacion" | "inflacionAcumuladaPct" | "ipcOrigen" | "ipcDestino"> | null}
 */
export function computeInflationFactorFromIndices(ipcOrigen, ipcDestino) {
  if (
    !Number.isFinite(ipcOrigen) ||
    !Number.isFinite(ipcDestino) ||
    ipcOrigen <= 0
  ) {
    return null
  }

  const factorInflacion = ipcDestino / ipcOrigen
  const accumulated = factorInflacion - 1

  return {
    factorInflacion,
    accumulated,
    inflacionAcumuladaPct: accumulated * 100,
    ipcOrigen,
    ipcDestino,
  }
}

/**
 * @param {number | null | undefined} accumulated decimal (factor - 1)
 * @returns {string}
 */
export function formatAccumulatedInflationPct(accumulated) {
  const value = Number(accumulated)
  if (!Number.isFinite(value)) {
    return "0,00%"
  }
  return `${(value * 100).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}

/**
 * @param {InflationFactorResult | null | undefined} inflation
 * @returns {InflationDataPayload}
 */
export function buildInflationDataPayload(inflation) {
  const factor =
    inflation?.factorInflacion != null &&
    Number.isFinite(inflation.factorInflacion) &&
    inflation.factorInflacion > 0
      ? inflation.factorInflacion
      : 1

  const accumulated =
    inflation?.accumulated != null && Number.isFinite(inflation.accumulated)
      ? inflation.accumulated
      : factor - 1

  const manual = Boolean(inflation?.manual || inflation?.sourceId === "manual")
  const source = manual
    ? "manual"
    : inflation?.fallback || inflation?.apiUnavailable
      ? "fallback"
      : inflation?.sourceId && inflation.sourceId !== "fallback"
        ? inflation.sourceId
        : "automatic"

  return {
    factor,
    accumulated,
    ipcOrigen: inflation?.ipcOrigen ?? null,
    ipcDestino: inflation?.ipcDestino ?? null,
    fechaIPCOrigen: inflation?.fechaIPCOrigen,
    fechaIPCDestino: inflation?.fechaIPCDestino,
    manual,
    source,
  }
}

/**
 * @param {string | null} fechaIPCOrigen
 * @param {string | null} fechaIPCDestino
 * @param {string} [warningMessage]
 * @returns {InflationFactorResult}
 */
export function buildFallbackInflationFactor(
  fechaIPCOrigen,
  fechaIPCDestino,
  warningMessage = "No hay índice IPC disponible para las fechas indicadas."
) {
  return {
    factorInflacion: 1,
    accumulated: 0,
    inflacionAcumuladaPct: 0,
    ipcOrigen: null,
    ipcDestino: null,
    fechaIPCOrigen: fechaIPCOrigen ?? "",
    fechaIPCDestino: fechaIPCDestino ?? "",
    sourceId: "fallback",
    fallback: true,
    apiUnavailable: true,
    manual: false,
    warningMessage,
  }
}

/**
 * @returns {import("@/lib/inflation/ipcProvider").IpcProvider}
 */
export function resolveIpcProvider() {
  if (typeof window !== "undefined") {
    return createClientDatosGobArProvider()
  }
  return getDefaultIpcProvider()
}

/**
 * Calcula factor de actualización monetaria entre fecha de balance y hoy.
 *
 * @param {string | Date} balanceDate fecha de cierre del balance
 * @param {string | Date} [currentDate] por defecto hoy
 * @param {import("@/lib/inflation/ipcProvider").IpcProvider} [provider]
 * @returns {Promise<InflationFactorResult | null>}
 */
export async function calculateInflationFactor(
  balanceDate,
  currentDate = new Date(),
  provider = resolveIpcProvider()
) {
  const fechaIPCOrigen = toYearMonth(balanceDate)
  const fechaIPCDestino = toYearMonth(currentDate)

  if (!fechaIPCOrigen || !fechaIPCDestino) {
    return buildFallbackInflationFactor(
      fechaIPCOrigen,
      fechaIPCDestino,
      "Fecha de cierre inválida para calcular IPC."
    )
  }

  try {
    let ipcOrigen = null
    let ipcDestino = null

    if (
      typeof window !== "undefined" &&
      provider &&
      "fetchOriginDestFromProxy" in provider &&
      typeof provider.fetchOriginDestFromProxy === "function"
    ) {
      const bundle = await provider.fetchOriginDestFromProxy(
        fechaIPCOrigen,
        fechaIPCDestino
      )
      if (bundle) {
        ipcOrigen = bundle.ipcOrigen
        ipcDestino = bundle.ipcDestino
      }
    }

    if (ipcOrigen == null || ipcDestino == null) {
      if (typeof window === "undefined") {
        const indices = await fetchIpcOriginDestIndices(
          fechaIPCOrigen,
          fechaIPCDestino
        )
        ipcOrigen = indices.ipcOrigen
        ipcDestino = indices.ipcDestino
      } else {
        ;[ipcOrigen, ipcDestino] = await Promise.all([
          provider.getIndexForMonth(fechaIPCOrigen),
          provider.getIndexForMonth(fechaIPCDestino),
        ])
      }
    }

    if (ipcOrigen == null || ipcDestino == null) {
      console.warn("[IPC] índices no disponibles", {
        fechaIPCOrigen,
        fechaIPCDestino,
        ipcOrigen,
        ipcDestino,
      })
      return buildFallbackInflationFactor(
        fechaIPCOrigen,
        fechaIPCDestino,
        "No hay índice IPC disponible para las fechas indicadas."
      )
    }

    const core = computeInflationFactorFromIndices(ipcOrigen, ipcDestino)
    if (!core) {
      return buildFallbackInflationFactor(
        fechaIPCOrigen,
        fechaIPCDestino,
        "No se pudo calcular el factor IPC."
      )
    }

    return {
      ...core,
      fechaIPCOrigen,
      fechaIPCDestino,
      sourceId: provider.getSourceId(),
      manual: false,
      apiUnavailable: false,
      fallback: false,
    }
  } catch (error) {
    console.error("[IPC] calculateInflationFactor", error)
    return buildFallbackInflationFactor(
      fechaIPCOrigen,
      fechaIPCDestino,
      "Error al consultar la API de inflación."
    )
  }
}

/**
 * @param {string | number | null | undefined} value
 * @param {number | null | undefined} factor
 * @returns {number | null}
 */
export function updateHistoricalValue(value, factor) {
  return calculateInflationAdjustedValue(value, factor)
}

/**
 * Actualiza un valor histórico por coeficiente de inflación acumulada.
 * Alias semántico usado por pre-calificación y balances.
 *
 * @param {string | number | null | undefined} value
 * @param {number | null | undefined} inflationFactor
 * @returns {number | null}
 */
export function calculateInflationAdjustedValue(value, inflationFactor) {
  if (
    inflationFactor == null ||
    !Number.isFinite(inflationFactor) ||
    inflationFactor <= 0
  ) {
    return null
  }

  const numeric =
    typeof value === "number"
      ? value
      : parseBalanceAmount(String(value ?? ""))

  if (numeric === null) {
    return null
  }

  return roundMoneyForFirestore(numeric * inflationFactor)
}

/**
 * @param {Record<string, string>} formValues
 * @param {InflationFactorResult | null} inflation
 * @returns {Record<string, number | null>}
 */
export function buildInflationAdjustedFirestoreValues(formValues, inflation) {
  if (!inflation?.factorInflacion) {
    return {}
  }

  /** @type {Record<string, number | null>} */
  const out = {}

  for (const { historical, actualizado } of BALANCE_INFLATION_FIELDS) {
    const updated = updateHistoricalValue(
      formValues[historical],
      inflation.factorInflacion
    )
    out[actualizado] = updated
  }

  return out
}

/**
 * @param {Record<string, string>} formValues
 * @param {InflationFactorResult | null} inflation
 * @returns {Record<string, string>}
 */
export function buildInflationAdjustedFormDisplay(formValues, inflation) {
  if (!inflation?.factorInflacion) {
    return {}
  }

  /** @type {Record<string, string>} */
  const out = {}

  for (const { historical, actualizado } of BALANCE_INFLATION_FIELDS) {
    const updated = updateHistoricalValue(
      formValues[historical],
      inflation.factorInflacion
    )
    out[actualizado] = updated === null ? "" : amountToFormString(updated)
  }

  return out
}

/**
 * Ventas del balance para análisis: prioriza valor actualizado por IPC.
 * @param {Record<string, unknown> | null | undefined} balanceDoc
 * @returns {number | null}
 */
export function getBalanceVentasForAnalysis(balanceDoc) {
  if (!balanceDoc) {
    return null
  }

  const inflated = parseBalanceAmount(
    balanceDoc.ventasActualizada ?? balanceDoc.ventas_actualizada
  )
  if (inflated !== null) {
    return inflated
  }

  return parseBalanceAmount(balanceDoc.ventas)
}
