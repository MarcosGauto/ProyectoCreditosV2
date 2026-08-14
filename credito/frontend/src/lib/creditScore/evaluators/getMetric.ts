/**
 * Resolución de métricas anidadas (ej. "ratios.liquidityCurrent").
 */

import type { RuleEngineMetrics } from "@/lib/creditScore/ruleEngine/ruleEngineTypes"

export function getMetricValue(
  metrics: RuleEngineMetrics,
  path: string | null | undefined
): unknown {
  if (!path) return undefined
  if (path in metrics) return metrics[path]

  const parts = path.split(".")
  let cur: unknown = metrics
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

export function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (value === 1 || value === "1" || value === "true") return true
  if (value === 0 || value === "0" || value === "false") return false
  return null
}
