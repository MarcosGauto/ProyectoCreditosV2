/**
 * Historial SC-1.0 — solo lectura de datos publicados.
 * Fuentes: version.compareIndex.sc1* | version.snapshot?.sc1
 * No ejecuta motores ni recalcula.
 */

import {
  formatSc1Amount,
  formatSc1Number,
} from "@/components/workspace/sc1CockpitPresentation"

/**
 * @param {unknown} value
 * @returns {Record<string, unknown> | null}
 */
function asRecord(value) {
  return value && typeof value === "object"
    ? /** @type {Record<string, unknown>} */ (value)
    : null
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function asFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * @param {Record<string, unknown> | null | undefined} version
 */
function getVersionSnapshotSc1(version) {
  const snapshot = asRecord(version?.snapshot)
  return asRecord(snapshot?.sc1)
}

/**
 * KPIs SC-1.0 para timeline / chips.
 * Preferencia: compareIndex.sc1* → snapshot.sc1 → null
 *
 * @param {Record<string, unknown> | null | undefined} version
 * @returns {{
 *   hasSc1: boolean;
 *   sc1Score: number | null;
 *   sc1Category: string | null;
 *   sc1SuggestedLimit: number | null;
 * } | null}
 */
export function getVersionSc1Metrics(version) {
  if (!version) return null

  const idx = asRecord(version.compareIndex) ?? {}
  const sc1 = getVersionSnapshotSc1(version)

  let sc1Score = asFiniteNumber(idx.sc1Score)
  let sc1Category =
    typeof idx.sc1Category === "string" ? idx.sc1Category : null
  let sc1SuggestedLimit = asFiniteNumber(idx.sc1SuggestedLimit)

  if (sc1) {
    const own = asRecord(sc1.ownCreditScore)
    const finalScore = asRecord(own?.finalScore)
    const limit = asRecord(sc1.suggestedLimit)
    const amount = asRecord(limit?.suggestedLimit)

    if (sc1Score == null) sc1Score = asFiniteNumber(finalScore?.value)
    if (sc1Category == null && typeof finalScore?.categoryCode === "string") {
      sc1Category = finalScore.categoryCode
    }
    if (sc1SuggestedLimit == null) {
      sc1SuggestedLimit = asFiniteNumber(amount?.value)
    }
  }

  const hasSc1 =
    sc1Score != null ||
    sc1Category != null ||
    sc1SuggestedLimit != null ||
    sc1 != null

  if (!hasSc1) return null

  return {
    hasSc1: true,
    sc1Score,
    sc1Category,
    sc1SuggestedLimit,
  }
}

/**
 * Labels listos para la tarjeta de timeline.
 * @param {ReturnType<typeof getVersionSc1Metrics>} metrics
 */
export function formatVersionSc1TimelineLabels(metrics) {
  if (!metrics?.hasSc1) return null

  return {
    scoreLabel:
      metrics.sc1Score != null ? formatSc1Number(metrics.sc1Score) : null,
    categoryLabel: metrics.sc1Category,
    limitLabel:
      metrics.sc1SuggestedLimit != null
        ? formatSc1Amount(metrics.sc1SuggestedLimit)
        : null,
  }
}

/**
 * Shape compatible con Sc1ComparisonBlock a partir de snapshot.sc1.
 * @param {Record<string, unknown> | null | undefined} snapshotSc1
 */
export function toHistorySc1Presentation(snapshotSc1) {
  const sc1 = asRecord(snapshotSc1)
  if (!sc1) return null
  if (!sc1.ownCreditScore && !sc1.suggestedLimit) return null
  return {
    ownCreditScore: sc1.ownCreditScore ?? null,
    suggestedLimit: sc1.suggestedLimit ?? null,
    computedAt: sc1.computedAt ?? null,
    engine: sc1.engineVersions ?? null,
    revisions: sc1.policyRevisions ?? null,
  }
}
