/**
 * Serie mock de índice IPC (base 100 = dic 2019).
 * Reemplazar por API INDEC o Firestore `ipc_mensual` en producción.
 * @type {Record<string, number>}
 */
export const MOCK_IPC_INDEX_BY_MONTH = buildMockIpcSeries()

/**
 * @param {string} startYearMonth YYYY-MM
 * @param {number} months
 * @param {number} monthlyRate tasa mensual (ej. 0.025 = 2.5%)
 */
function buildMockIpcSeries(
  startYearMonth = "2019-12",
  months = 84,
  monthlyRate = 0.025
) {
  const [startYear, startMonth] = startYearMonth.split("-").map(Number)
  /** @type {Record<string, number>} */
  const series = {}
  let index = 100

  for (let i = 0; i < months; i++) {
    const date = new Date(startYear, startMonth - 1 + i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    if (i > 0) {
      index *= 1 + monthlyRate
    }
    series[key] = Math.round(index * 100) / 100
  }

  return series
}
