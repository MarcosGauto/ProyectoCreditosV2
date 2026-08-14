/**
 * Lectura determinística de métricas anidadas (a.b.c).
 */

export function getMetricValue(
  metrics: Record<string, unknown>,
  path: string | null | undefined
): unknown {
  if (!path) return undefined
  const parts = path.split(".").filter(Boolean)
  let cur: unknown = metrics
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

export function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}
