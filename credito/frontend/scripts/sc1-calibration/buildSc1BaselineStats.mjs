/**
 * Baseline estadístico SC-1.0 — solo descriptivo.
 * Sin umbrales de negocio nuevos ni pesos propuestos.
 */

import { SCORE_BUCKETS } from "./aggregateSc1Calibration.mjs"
import { ACTIVE_SCORE_DIMENSION_IDS } from "./extractBaselineCase.mjs"

/**
 * @param {number[]} values
 */
function summarize(values) {
  const nums = values.filter((v) => Number.isFinite(v))
  if (nums.length === 0) {
    return { n: 0, min: null, max: null, mean: null, p50: null, stdev: null }
  }
  const sorted = [...nums].sort((a, b) => a - b)
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length
  const mid = Math.floor(sorted.length / 2)
  const p50 =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]
  const variance =
    sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / sorted.length
  const r = (x) => Math.round(x * 1000) / 1000
  return {
    n: sorted.length,
    min: r(sorted[0]),
    max: r(sorted[sorted.length - 1]),
    mean: r(mean),
    p50: r(p50),
    stdev: r(Math.sqrt(variance)),
  }
}

/**
 * @param {Map<string, number>} map
 * @param {number} total
 */
function dist(map, total) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({
      key,
      count,
      pct: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
    }))
}

/**
 * @param {string | null | undefined} key
 * @param {Map<string, number>} map
 */
function bump(map, key) {
  const k = key && String(key).trim() ? String(key) : "(null)"
  map.set(k, (map.get(k) ?? 0) + 1)
}

/**
 * Histogram with fixed edges [e0,e1), last bin inclusive end.
 * @param {number[]} values
 * @param {number[]} edges
 */
function histogram(values, edges) {
  /** @type {{ label: string, count: number, pct: number }[]} */
  const bins = []
  for (let i = 0; i < edges.length - 1; i += 1) {
    const lo = edges[i]
    const hi = edges[i + 1]
    const last = i === edges.length - 2
    const count = values.filter((v) =>
      last ? v >= lo && v <= hi : v >= lo && v < hi
    ).length
    bins.push({
      label: last ? `[${lo}, ${hi}]` : `[${lo}, ${hi})`,
      count,
      pct: 0,
    })
  }
  const n = values.length
  for (const b of bins) {
    b.pct = n > 0 ? Math.round((b.count / n) * 10000) / 100 : 0
  }
  return { n, bins }
}

/**
 * Pearson correlation; null if insufficient variance / n.
 * @param {number[]} xs
 * @param {number[]} ys
 */
function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return null
  let sx = 0
  let sy = 0
  for (let i = 0; i < n; i += 1) {
    sx += xs[i]
    sy += ys[i]
  }
  const mx = sx / n
  const my = sy / n
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i += 1) {
    const a = xs[i] - mx
    const b = ys[i] - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  if (dx === 0 || dy === 0) return null
  return Math.round((num / Math.sqrt(dx * dy)) * 1000) / 1000
}

/**
 * @param {import('./types.js').Sc1BaselineCase[]} cases
 * @param {{ datasetLabel?: string, dataStatus?: string }} [meta]
 */
export function buildSc1BaselineStats(cases, meta = {}) {
  const n = cases.length
  const scores = cases
    .map((c) => c.sc1Score)
    .filter((v) => v != null && Number.isFinite(v))
  const confidences = cases
    .map((c) => c.sc1Confidence)
    .filter((v) => v != null && Number.isFinite(v))
  const limits = cases
    .map((c) => c.sc1SuggestedLimit)
    .filter((v) => v != null && Number.isFinite(v))

  /** @type {Map<string, number>} */
  const categories = new Map()
  /** @type {Map<string, number>} */
  const confLevels = new Map()
  /** @type {Map<string, number>} */
  const scoreBucketMap = new Map(SCORE_BUCKETS.map((b) => [b.key, 0]))

  for (const c of cases) {
    bump(categories, c.sc1Category)
    bump(confLevels, c.sc1ConfidenceLevel)
    if (c.sc1Score != null) {
      for (const b of SCORE_BUCKETS) {
        if (c.sc1Score >= b.min && c.sc1Score <= b.max) {
          scoreBucketMap.set(b.key, (scoreBucketMap.get(b.key) ?? 0) + 1)
          break
        }
      }
    }
  }

  // UNKNOWN % per dimension (among cases that include the dim in breakdown)
  /** @type {Record<string, { observed: number, unknown: number, unknownPct: number, skipped: number }>} */
  const unknownByDimension = {}
  for (const id of ACTIVE_SCORE_DIMENSION_IDS) {
    unknownByDimension[id] = {
      observed: 0,
      unknown: 0,
      unknownPct: 0,
      skipped: 0,
    }
  }
  for (const c of cases) {
    const byId = new Map(c.breakdown.map((b) => [b.dimensionId, b]))
    for (const id of ACTIVE_SCORE_DIMENSION_IDS) {
      const b = byId.get(id)
      if (!b) continue
      unknownByDimension[id].observed += 1
      if (b.status === "UNKNOWN" || b.score == null) {
        unknownByDimension[id].unknown += 1
      }
      if (b.status === "SKIPPED") unknownByDimension[id].skipped += 1
    }
  }
  for (const id of ACTIVE_SCORE_DIMENSION_IDS) {
    const u = unknownByDimension[id]
    u.unknownPct =
      u.observed > 0
        ? Math.round((u.unknown / u.observed) * 10000) / 100
        : 0
  }

  // Top dimensions by mean |contribution| and mean contribution
  /** @type {Map<string, { sumAbs: number, sum: number, n: number }>} */
  const contrib = new Map()
  for (const c of cases) {
    for (const b of c.breakdown) {
      if (b.contribution == null || !Number.isFinite(b.contribution)) continue
      const cur = contrib.get(b.dimensionId) ?? {
        sumAbs: 0,
        sum: 0,
        n: 0,
      }
      cur.sumAbs += Math.abs(b.contribution)
      cur.sum += b.contribution
      cur.n += 1
      contrib.set(b.dimensionId, cur)
    }
  }
  const topDimensionsByContribution = [...contrib.entries()]
    .map(([dimensionId, v]) => ({
      dimensionId,
      n: v.n,
      meanAbsContribution: Math.round((v.sumAbs / v.n) * 1000) / 1000,
      meanContribution: Math.round((v.sum / v.n) * 1000) / 1000,
    }))
    .sort((a, b) => b.meanAbsContribution - a.meanAbsContribution)

  // Top matched rules
  /** @type {Map<string, number>} */
  const rules = new Map()
  for (const c of cases) {
    for (const b of c.breakdown) {
      if (b.matchedRuleId) bump(rules, b.matchedRuleId)
    }
  }
  const topRulesFired = dist(rules, n).slice(0, 25)

  // Correlation dim score → final score
  /** @type {{ dimensionId: string, n: number, pearson: number | null }[]} */
  const correlationDimToScore = []
  for (const id of ACTIVE_SCORE_DIMENSION_IDS) {
    /** @type {number[]} */
    const xs = []
    /** @type {number[]} */
    const ys = []
    for (const c of cases) {
      if (c.sc1Score == null) continue
      const b = c.breakdown.find((x) => x.dimensionId === id)
      if (!b || b.score == null) continue
      xs.push(b.score)
      ys.push(c.sc1Score)
    }
    correlationDimToScore.push({
      dimensionId: id,
      n: xs.length,
      pearson: pearson(xs, ys),
    })
  }
  correlationDimToScore.sort(
    (a, b) =>
      Math.abs(b.pearson ?? 0) - Math.abs(a.pearson ?? 0) ||
      a.dimensionId.localeCompare(b.dimensionId)
  )

  // Category × decision matrix
  /** @type {Map<string, Map<string, number>>} */
  const matrix = new Map()
  const decisionKeys = new Set()
  for (const c of cases) {
    const cat = c.sc1Category ?? "(null)"
    const dec = c.limitDecisionCode ?? "(null)"
    decisionKeys.add(dec)
    if (!matrix.has(cat)) matrix.set(cat, new Map())
    const row = matrix.get(cat)
    row.set(dec, (row.get(dec) ?? 0) + 1)
  }
  const decisions = [...decisionKeys].sort()
  const categoryDecisionMatrix = [...matrix.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, row]) => {
      /** @type {Record<string, number>} */
      const cells = {}
      let rowTotal = 0
      for (const d of decisions) {
        const v = row.get(d) ?? 0
        cells[d] = v
        rowTotal += v
      }
      return { category, cells, rowTotal }
    })

  // Limit histogram: adaptive edges from data
  let limitEdges = [0, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000]
  if (limits.length > 0) {
    const maxL = Math.max(...limits)
    if (maxL > 0 && maxL < 250_000) {
      limitEdges = [0, 50_000, 100_000, 150_000, 200_000, 250_000, maxL]
    }
  }

  const confidenceEdges = [0, 0.2, 0.4, 0.6, 0.85, 1.0001]

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      datasetLabel: meta.datasetLabel ?? "unpublished-or-fixture",
      dataStatus: meta.dataStatus ?? "PENDING_REAL_EXPORT",
      model:
        "7 dimensions active (ADR-SC1-SCORE-DIMENSION-MODEL); reserved dims excluded",
      caseCount: n,
    },
    scoreDistribution: {
      summary: summarize(/** @type {number[]} */ (scores)),
      byCategoryBand: dist(scoreBucketMap, scores.length || n),
    },
    categoryDistribution: dist(categories, n),
    confidenceDistribution: {
      summary: summarize(/** @type {number[]} */ (confidences)),
      byLevel: dist(confLevels, n),
    },
    unknownByDimension,
    topDimensionsByContribution,
    topRulesFired,
    histograms: {
      score: {
        n: scores.length,
        bins: SCORE_BUCKETS.map((b) => {
          const count = scoreBucketMap.get(b.key) ?? 0
          return {
            label: `${b.key} [${b.min}-${b.max}]`,
            count,
            pct:
              scores.length > 0
                ? Math.round((count / scores.length) * 10000) / 100
                : 0,
          }
        }),
      },
      suggestedLimit: histogram(/** @type {number[]} */ (limits), limitEdges),
      confidence: histogram(
        /** @type {number[]} */ (confidences),
        confidenceEdges
      ),
    },
    correlationDimToScore,
    categoryDecisionMatrix: {
      decisions,
      rows: categoryDecisionMatrix,
    },
  }
}
