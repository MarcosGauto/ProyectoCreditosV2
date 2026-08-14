import {
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore"
import { db } from "@/service/firebase"

import {
  buildCompareIndex,
  enrichCompareIndexWithBcra,
} from "@/lib/creditAnalysis/buildCompareIndex"
import {
  buildPolicySnapshot,
  estimateSnapshotSizeBytes,
  selectAnalysisInputs,
} from "@/lib/creditAnalysis/buildAnalysisSnapshot"
import { buildAnalysisSummary } from "@/lib/creditAnalysis/buildAnalysisSummary"
import { buildSc1PublishSlice, stripLiveSc1FromComputed } from "@/lib/creditAnalysis/buildSc1PublishSlice"
import {
  ENGINE_VERSION,
  SCHEMA_VERSION,
  SNAPSHOT_SIZE_ALERT_BYTES,
  CREDIT_ANALYSIS_COLLECTION,
  LATEST_DOC_ID,
  VERSIONS_STORE_DOC_ID,
  creditAnalysisVersionsCol,
} from "@/lib/creditAnalysis/constants"
import {
  buildAnalysisFingerprints,
  fingerprintsAreEqual,
} from "@/lib/creditAnalysis/fingerprints"
import {
  DuplicatePublishError,
  isDuplicatePublishError,
} from "@/lib/creditAnalysis/duplicatePublishError"
import { DraftRepository } from "@/lib/creditAnalysis/repositories/DraftRepository"
import { assertPublishReady } from "@/lib/creditAnalysis/validatePublishReadiness"
import { SHOW_SC1_COMPARISON } from "@/lib/featureFlags"

/**
 * @param {string} cuit
 * @param {string} reportId
 * @param {string} versionId
 */
export async function linkBcraReportToVersion(cuit, reportId, versionId) {
  if (!cuit || !reportId || !versionId) {
    return
  }

  try {
    await updateDoc(doc(db, "empresas", cuit, "bcra_reports", reportId), {
      linkedVersionId: versionId,
    })
  } catch (error) {
    console.warn("[linkBcraReportToVersion]", error)
  }
}

/**
 * @param {string} cuit
 * @param {{
 *   empresa?: Record<string, unknown> | null;
 *   balances?: unknown[];
 *   balanceContable?: Record<string, unknown> | null;
 *   iva?: unknown[];
 *   iibb?: unknown[];
 *   nosis?: unknown[];
 *   bcraReports?: unknown[];
 *   chequesRechazados?: unknown[];
 *   locales?: unknown[];
 *   computed: Record<string, unknown>;
 *   decision: Record<string, unknown>;
 *   aiObservations?: Record<string, unknown> | null;
 *   analistaConfig?: Record<string, unknown>;
 *   creditPolicy: import("@/lib/creditPolicy/creditPolicyTypes").CreditPolicy;
 *   publishedBy?: string | null;
 *   status?: string;
 *   label?: string | null;
 *   tags?: string[];
 *   renderedContext?: Record<string, unknown> | null;
 * }} payload
 */
export async function publishCreditAnalysis(cuit, payload) {
  if (!cuit) {
    throw new Error("CUIT requerido para publicar el análisis.")
  }

  assertPublishReady({
    asyncPreCal:
      /** @type {Record<string, unknown> | null} */ (
        payload.renderedContext?.asyncPreCal ?? null
      ),
    renderedContext: payload.renderedContext ?? null,
    sc1Runtime:
      /** @type {{ loading?: boolean; error?: string | null; ready?: boolean } | null} */ (
        payload.computed?.sc1Runtime ?? null
      ),
    requireSc1: SHOW_SC1_COMPARISON,
  })

  const inputs = selectAnalysisInputs({
    empresa: payload.empresa,
    balances: payload.balances,
    balanceContable: payload.balanceContable,
    iva: payload.iva,
    iibb: payload.iibb,
    nosis: payload.nosis,
    bcraReports: payload.bcraReports,
    chequesRechazados: payload.chequesRechazados,
    locales: payload.locales,
    analistaConfig: payload.analistaConfig,
  })

  const policySnapshot = await buildPolicySnapshot(
    payload.creditPolicy,
    payload.publishedBy
  )

  // SC-1.0: serialización única desde computed.sc1 (en memoria).
  // Persistencia canónica: snapshot.sc1 / summary / compareIndex — nunca computed.sc1.
  const sc1Slice = buildSc1PublishSlice(payload.computed)
  const computedForPersist = stripLiveSc1FromComputed(payload.computed)

  if (
    SHOW_SC1_COMPARISON &&
    payload.computed?.sc1Runtime?.ready === true &&
    (sc1Slice == null || !sc1Slice.snapshot)
  ) {
    throw new Error(
      "SC-1.0 listo pero no se pudo serializar el snapshot. No se publica."
    )
  }

  /** @type {Record<string, unknown>} */
  const snapshot = {
    inputs,
    policySnapshot,
    computed: computedForPersist,
    decision: payload.decision,
    aiObservations: payload.aiObservations ?? null,
    renderedContext: payload.renderedContext ?? null,
  }
  if (sc1Slice) {
    snapshot.sc1 = sc1Slice.snapshot
  }

  const fingerprints = await buildAnalysisFingerprints({
    inputs,
    policySnapshot,
    computed: computedForPersist,
    decision: payload.decision,
    engineVersion: ENGINE_VERSION,
  })

  const snapshotSizeBytes = estimateSnapshotSizeBytes(snapshot)
  if (snapshotSizeBytes > SNAPSHOT_SIZE_ALERT_BYTES) {
    console.warn("[publishCreditAnalysis] snapshotSizeBytes alert", {
      cuit,
      snapshotSizeBytes,
    })
  }

  const versionRef = doc(creditAnalysisVersionsCol(cuit))
  const publishedAt = serverTimestamp()

  try {
    const result = await runTransaction(db, async (transaction) => {
      const latestRef = doc(
        db,
        "empresas",
        cuit,
        CREDIT_ANALYSIS_COLLECTION,
        LATEST_DOC_ID
      )
      const latestSnap = await transaction.get(latestRef)
      const latestData = latestSnap.exists() ? latestSnap.data() : null
      const currentVersionId =
        typeof latestData?.currentVersionId === "string"
          ? latestData.currentVersionId
          : null

      if (currentVersionId) {
        const currentVersionRef = doc(
          creditAnalysisVersionsCol(cuit),
          currentVersionId
        )
        const currentVersionSnap = await transaction.get(currentVersionRef)
        if (currentVersionSnap.exists()) {
          const currentVersion = currentVersionSnap.data()
          if (
            fingerprintsAreEqual(
              {
                inputsFingerprint: String(
                  currentVersion.inputsFingerprint ?? ""
                ),
                policyFingerprint: String(
                  currentVersion.policyFingerprint ?? ""
                ),
                analysisFingerprint: String(
                  currentVersion.analysisFingerprint ?? ""
                ),
              },
              fingerprints
            )
          ) {
            throw new DuplicatePublishError(
              currentVersionId,
              typeof currentVersion.versionNumber === "number"
                ? currentVersion.versionNumber
                : typeof latestData?.versionNumber === "number"
                  ? latestData.versionNumber
                  : 0
            )
          }
        }
      }

      const previousVersionNumber =
        latestSnap.exists() &&
        typeof latestSnap.data()?.versionNumber === "number"
          ? latestSnap.data().versionNumber
          : 0
      const versionNumber = previousVersionNumber + 1

      let compareIndex = buildCompareIndex({
        computed: computedForPersist,
        decision: payload.decision,
        policySnapshot,
        versionNumber,
        engineVersion: ENGINE_VERSION,
      })
      compareIndex = enrichCompareIndexWithBcra(
        compareIndex,
        inputs.bcra?.frozen ?? null
      )
      if (sc1Slice?.compareIndex) {
        compareIndex = { ...compareIndex, ...sc1Slice.compareIndex }
      }

      let summary = buildAnalysisSummary({
        computed: computedForPersist,
        decision: payload.decision,
        publishedBy: payload.publishedBy,
        compareIndex,
      })
      if (sc1Slice?.summary) {
        summary = { ...summary, ...sc1Slice.summary }
      }

      const versionDoc = {
        versionId: versionRef.id,
        cuit,
        versionNumber,
        schemaVersion: SCHEMA_VERSION,
        engineVersion: ENGINE_VERSION,
        publishedAt,
        publishedBy: payload.publishedBy ?? "desconocido",
        publishSource: "manual",
        status: payload.status ?? "published",
        label: payload.label ?? null,
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        inputsFingerprint: fingerprints.inputsFingerprint,
        policyFingerprint: fingerprints.policyFingerprint,
        analysisFingerprint: fingerprints.analysisFingerprint,
        bcraReportId: inputs.bcra?.reportId ?? null,
        nosisReportId: inputs.nosis?.reportId ?? null,
        snapshot,
        compareIndex,
        snapshotSizeBytes,
      }

      transaction.set(
        doc(
          db,
          "empresas",
          cuit,
          CREDIT_ANALYSIS_COLLECTION,
          VERSIONS_STORE_DOC_ID
        ),
        { cuit, kind: "versions_store" },
        { merge: true }
      )
      transaction.set(versionRef, versionDoc)
      transaction.set(latestRef, {
        currentVersionId: versionRef.id,
        versionNumber,
        updatedAt: publishedAt,
        publishedAt,
        summary,
      })

      return {
        duplicate: false,
        versionId: versionRef.id,
        versionNumber,
        compareIndex,
        bcraReportId: inputs.bcra?.reportId ?? null,
      }
    })

    if (result.bcraReportId) {
      await linkBcraReportToVersion(cuit, result.bcraReportId, result.versionId)
    }

    try {
      await DraftRepository.delete(cuit)
    } catch (error) {
      console.warn("[publishCreditAnalysis] draft cleanup", error)
    }

    return result
  } catch (error) {
    if (isDuplicatePublishError(error)) {
      return {
        duplicate: true,
        versionId: error.versionId,
        versionNumber: error.versionNumber,
      }
    }
    throw error
  }
}
