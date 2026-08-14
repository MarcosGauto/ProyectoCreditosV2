/**
 * buildSc1PublishSlice — única responsabilidad de serializar SC-1.0 en Publish.
 *
 * Fuente única: computed.sc1 (resultado del dual-run).
 * No recalcula score, límite ni políticas. Solo serializa.
 *
 * Si computed.sc1 == null → null (Publish se comporta como legacy).
 */

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
 * @param {Record<string, unknown>} sc1
 */
function buildSnapshotSc1(sc1) {
  const ownCreditScore = sc1.ownCreditScore ?? null
  const suggestedLimit = sc1.suggestedLimit ?? null
  if (!ownCreditScore && !suggestedLimit) return null

  const revisions = asRecord(sc1.revisions) ?? {}
  const engine = asRecord(sc1.engine) ?? {}

  // ownCreditScore + suggestedLimit completos (incluye DecisionTrace en suggestedLimit.trace)
  return {
    ownCreditScore,
    suggestedLimit,
    engineVersions: {
      score: engine.score ?? "SC-1.0",
      limit: engine.limit ?? "SC-1.0",
    },
    policyRevisions: {
      organizationId: revisions.organizationId ?? null,
      profileId: revisions.profileId ?? null,
      profileName: revisions.profileName ?? null,
      scoreRevisionId: revisions.scoreRevisionId ?? null,
      scoreRevisionVersion: revisions.scoreRevisionVersion ?? null,
      scoreRevisionHash: revisions.scoreRevisionHash ?? null,
      limitRevisionId: revisions.limitRevisionId ?? null,
      limitRevisionVersion: revisions.limitRevisionVersion ?? null,
      limitRevisionHash: revisions.limitRevisionHash ?? null,
    },
    computedAt: typeof sc1.computedAt === "string" ? sc1.computedAt : null,
  }
}

/**
 * KPIs livianos para latest.summary — nunca objetos completos.
 * @param {Record<string, unknown>} sc1
 */
function buildSummarySc1Fields(sc1) {
  const score = asRecord(sc1.ownCreditScore)
  const limit = asRecord(sc1.suggestedLimit)
  const finalScore = asRecord(score?.finalScore)
  const confidence = asRecord(score?.confidence)
  const suggestedAmount = asRecord(limit?.suggestedLimit)

  /** @type {Record<string, unknown>} */
  const fields = {}

  const sc1Score = asFiniteNumber(finalScore?.value)
  const sc1Category =
    typeof finalScore?.categoryCode === "string" ? finalScore.categoryCode : null
  const sc1Confidence = asFiniteNumber(confidence?.value)
  const sc1SuggestedLimit = asFiniteNumber(suggestedAmount?.value)
  const sc1LimitOrigin =
    typeof limit?.limitOrigin === "string" ? limit.limitOrigin : null

  // Solo escribir claves con valor (no crear campos vacíos)
  if (sc1Score != null) fields.sc1Score = sc1Score
  if (sc1Category != null) fields.sc1Category = sc1Category
  if (sc1Confidence != null) fields.sc1Confidence = sc1Confidence
  if (sc1SuggestedLimit != null) fields.sc1SuggestedLimit = sc1SuggestedLimit
  if (sc1LimitOrigin != null) fields.sc1LimitOrigin = sc1LimitOrigin

  return Object.keys(fields).length > 0 ? fields : null
}

/**
 * Campos mínimos para comparar versiones — sin objetos grandes.
 * @param {Record<string, unknown>} sc1
 */
function buildCompareIndexSc1Fields(sc1) {
  const score = asRecord(sc1.ownCreditScore)
  const limit = asRecord(sc1.suggestedLimit)
  const finalScore = asRecord(score?.finalScore)
  const suggestedAmount = asRecord(limit?.suggestedLimit)

  /** @type {Record<string, unknown>} */
  const fields = {}

  const sc1Score = asFiniteNumber(finalScore?.value)
  const sc1Category =
    typeof finalScore?.categoryCode === "string" ? finalScore.categoryCode : null
  const sc1SuggestedLimit = asFiniteNumber(suggestedAmount?.value)

  if (sc1Score != null) fields.sc1Score = sc1Score
  if (sc1Category != null) fields.sc1Category = sc1Category
  if (sc1SuggestedLimit != null) fields.sc1SuggestedLimit = sc1SuggestedLimit

  return Object.keys(fields).length > 0 ? fields : null
}

/**
 * Transforma computed.sc1 → artefactos de Publish.
 *
 * @param {Record<string, unknown> | null | undefined} computed
 * @returns {{
 *   snapshot: Record<string, unknown>;
 *   summary: Record<string, unknown> | null;
 *   compareIndex: Record<string, unknown> | null;
 * } | null}
 */
export function buildSc1PublishSlice(computed) {
  const sc1 = asRecord(computed?.sc1)
  if (!sc1) return null

  const snapshot = buildSnapshotSc1(sc1)
  if (!snapshot) return null

  return {
    snapshot,
    summary: buildSummarySc1Fields(sc1),
    compareIndex: buildCompareIndexSc1Fields(sc1),
  }
}
