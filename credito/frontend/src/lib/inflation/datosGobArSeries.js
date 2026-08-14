/** Serie IPC nivel general, base dic 2016 (INDEC vía datos.gob.ar). */
export const IPC_SERIES_ID = "103.1_I2N_2016_M_22"

const API_BASE = "https://apis.datos.gob.ar/series/api/series"

/** @type {Map<string, number>} */
const indexCache = new Map()

/** @type {Map<string, Record<string, number>>} */
const rangeCache = new Map()

/**
 * @param {string} yearMonth YYYY-MM
 * @returns {string}
 */
function lastDayOfMonth(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number)
  const day = new Date(year, month, 0).getDate()
  return `${yearMonth}-${String(day).padStart(2, "0")}`
}

/**
 * @param {string} isoDate YYYY-MM-DD
 * @returns {string} YYYY-MM
 */
export function isoDateToYearMonth(isoDate) {
  if (!isoDate) {
    return ""
  }
  const match = String(isoDate).match(/^(\d{4})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}` : ""
}

/**
 * @param {unknown} payload
 * @returns {Record<string, number>}
 */
function parseSeriesPayload(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : []
  /** @type {Record<string, number>} */
  const map = {}

  for (const row of rows) {
    const ym = isoDateToYearMonth(row?.[0])
    const value = Number(row?.[1])
    if (ym && Number.isFinite(value) && value > 0) {
      map[ym] = value
    }
  }

  return map
}

/**
 * Descarga un rango mensual de la API oficial.
 *
 * @param {string} fromYearMonth YYYY-MM
 * @param {string} toYearMonth YYYY-MM
 * @param {string} [seriesId]
 * @returns {Promise<Record<string, number>>}
 */
export async function fetchIpcSeriesMap(
  fromYearMonth,
  toYearMonth,
  seriesId = IPC_SERIES_ID
) {
  if (!fromYearMonth || !toYearMonth) {
    return {}
  }

  const [fromY, fromM] = fromYearMonth.split("-").map(Number)
  const [toY, toM] = toYearMonth.split("-").map(Number)
  const start =
    fromY < toY || (fromY === toY && fromM <= toM) ? fromYearMonth : toYearMonth
  const end =
    fromY < toY || (fromY === toY && fromM <= toM) ? toYearMonth : fromYearMonth

  const cacheKey = `${seriesId}:${start}:${end}`
  if (rangeCache.has(cacheKey)) {
    return rangeCache.get(cacheKey) ?? {}
  }

  const url = new URL(API_BASE)
  url.searchParams.set("ids", seriesId)
  url.searchParams.set("collapse", "month")
  url.searchParams.set("limit", "5000")
  url.searchParams.set("format", "json")
  url.searchParams.set("start_date", `${start}-01`)
  url.searchParams.set("end_date", lastDayOfMonth(end))

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  })

  if (!response.ok) {
    console.warn(
      "[IPC] API datos.gob.ar error",
      response.status,
      seriesId,
      start,
      end
    )
    return {}
  }

  const payload = await response.json()
  const map = parseSeriesPayload(payload)

  rangeCache.set(cacheKey, map)
  for (const [ym, value] of Object.entries(map)) {
    indexCache.set(ym, value)
  }

  return map
}

/**
 * @param {Record<string, number>} series
 * @param {string} yearMonth
 * @returns {number | null}
 */
function resolveIndexAtOrBefore(series, yearMonth) {
  const keys = Object.keys(series).sort()
  let last = null
  for (const key of keys) {
    if (key <= yearMonth) {
      last = series[key]
    } else {
      break
    }
  }
  return last
}

/**
 * Obtiene el índice IPC de un mes desde la API oficial (con caché en memoria).
 *
 * @param {string} yearMonth YYYY-MM
 * @param {string} [seriesId]
 * @returns {Promise<number | null>}
 */
export async function fetchIpcIndexForMonth(yearMonth, seriesId = IPC_SERIES_ID) {
  if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
    return null
  }

  if (indexCache.has(yearMonth)) {
    return indexCache.get(yearMonth) ?? null
  }

  const singleMap = await fetchIpcSeriesMap(yearMonth, yearMonth, seriesId)
  if (singleMap[yearMonth] != null) {
    return singleMap[yearMonth]
  }

  const [y, m] = yearMonth.split("-").map(Number)
  const fromYearMonth = `${y - 3}-${String(m).padStart(2, "0")}`
  const wideMap = await fetchIpcSeriesMap(fromYearMonth, yearMonth, seriesId)

  const resolved =
    wideMap[yearMonth] ?? resolveIndexAtOrBefore(wideMap, yearMonth)

  if (resolved != null) {
    indexCache.set(yearMonth, resolved)
  }

  return resolved ?? null
}

/**
 * IPC origen (cierre) y destino (mes actual) en una sola consulta.
 *
 * @param {string} originYearMonth
 * @param {string} destYearMonth
 * @param {string} [seriesId]
 * @returns {Promise<{ ipcOrigen: number | null; ipcDestino: number | null }>}
 */
export async function fetchIpcOriginDestIndices(
  originYearMonth,
  destYearMonth,
  seriesId = IPC_SERIES_ID
) {
  const map = await fetchIpcSeriesMap(originYearMonth, destYearMonth, seriesId)

  return {
    ipcOrigen: resolveIndexAtOrBefore(map, originYearMonth),
    ipcDestino: resolveIndexAtOrBefore(map, destYearMonth),
  }
}

/**
 * Precarga un rango de meses (útil para tablas con varios balances).
 *
 * @param {string} fromYearMonth
 * @param {string} toYearMonth
 */
export async function prefetchIpcRange(fromYearMonth, toYearMonth) {
  await fetchIpcSeriesMap(fromYearMonth, toYearMonth)
}
