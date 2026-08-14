/**
 * @param {Record<string, number>} series
 * @param {string} yearMonth
 * @returns {number | null}
 */
export function findLatestIndexAtOrBefore(series, yearMonth) {
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
