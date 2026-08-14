import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
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
import {
  ENGINE_VERSION,
  SCHEMA_VERSION,
  CREDIT_ANALYSIS_COLLECTION,
  LATEST_DOC_ID,
  creditAnalysisVersionsCol,
} from "@/lib/creditAnalysis/constants"
import { buildAnalysisFingerprints } from "@/lib/creditAnalysis/fingerprints"
import { LatestRepository } from "@/lib/creditAnalysis/repositories/LatestRepository"
import { VersionRepository } from "@/lib/creditAnalysis/repositories/VersionRepository"
import { fetchActiveCreditPolicy } from "@/lib/creditPolicy/creditPolicyService"
import { fetchFinancialDocumentation } from "@/lib/fetchAnalysisFirestore"
import { fetchChequesRechazadosByCuit } from "@/lib/chequesRechazadosService"
import { pickLatestBcraDocument } from "@/lib/normalizeBcraReport"

/**
 * Migra `credit_analysis/latest` legacy a `versions/v1` + latest liviano.
 * Idempotente: no migra si ya tiene currentVersionId o si existen versiones.
 *
 * @param {string} cuit
 */
export async function migrateLegacyAnalysisIfNeeded(cuit) {
  if (!cuit) {
    return { migrated: false }
  }

  const latestRef = doc(
    db,
    "empresas",
    cuit,
    CREDIT_ANALYSIS_COLLECTION,
    LATEST_DOC_ID
  )
  const latestSnap = await getDoc(latestRef)

  if (!latestSnap.exists()) {
    return { migrated: false, reason: "no_latest" }
  }

  const latestData = latestSnap.data()
  if (typeof latestData.currentVersionId === "string") {
    return { migrated: false, reason: "already_migrated" }
  }

  const existingVersionsSnap = await getDocs(
    query(creditAnalysisVersionsCol(cuit), limit(1))
  )
  if (!existingVersionsSnap.empty) {
    return { migrated: false, reason: "versions_already_exist" }
  }

  const [financial, empresaSnap, bcraSnap, creditPolicy, chequesRechazados] =
    await Promise.all([
      fetchFinancialDocumentation(cuit),
      getDoc(doc(db, "empresas", cuit)),
      getDocs(collection(db, "empresas", cuit, "bcra_reports")),
      fetchActiveCreditPolicy(),
      fetchChequesRechazadosByCuit(cuit),
    ])

  const empresa = empresaSnap.exists()
    ? { id: empresaSnap.id, ...empresaSnap.data() }
    : null

  const bcraReports = bcraSnap.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }))

  const legacyComputed =
    latestData.computed && typeof latestData.computed === "object"
      ? latestData.computed
      : {}

  const decision = {
    recomendacionAnalista: latestData.recomendacionAnalista ?? "",
    montoCreditoOtorgado: latestData.montoCreditoOtorgado ?? null,
    tipoOperacion: latestData.tipoOperacion ?? null,
    fechaInicioActividad: latestData.fechaInicioActividad ?? null,
    resultadoCobertura: latestData.resultadoCobertura ?? null,
    requisitosCobertura: latestData.requisitosCobertura ?? null,
    motivosExclusion: latestData.motivosExclusion ?? null,
    facturasAlContado: latestData.facturasAlContado ?? null,
  }

  const analistaConfig = {
    tipoEmpresa: latestData.tipoEmpresa ?? empresa?.tipoEmpresa ?? null,
    coeficienteEmpresa: latestData.coeficienteEmpresa ?? null,
    tipoContribuyente: latestData.tipoContribuyente ?? null,
  }

  const inputs = selectAnalysisInputs({
    empresa,
    balances: financial.balances,
    balanceContable: financial.balanceContable,
    iva: financial.iva,
    iibb: financial.iibb,
    nosis: financial.nosis,
    bcraReports,
    chequesRechazados,
    analistaConfig,
  })

  const policySnapshot = await buildPolicySnapshot(
    creditPolicy,
    String(latestData.analista ?? "migration")
  )

  const snapshot = {
    inputs,
    policySnapshot,
    computed: legacyComputed,
    decision,
    aiObservations: latestData.analisisBalanceIA
      ? { analisisBalanceIA: latestData.analisisBalanceIA }
      : null,
    renderedContext: null,
  }

  const fingerprints = await buildAnalysisFingerprints({
    inputs,
    policySnapshot,
    computed: legacyComputed,
    decision,
    engineVersion: ENGINE_VERSION,
  })

  const versionId = `migrated_${Date.now()}`
  const versionNumber = 1
  const publishedAt = latestData.updatedAt ?? serverTimestamp()

  let compareIndex = buildCompareIndex({
    computed: legacyComputed,
    decision,
    policySnapshot,
    versionNumber,
    engineVersion: ENGINE_VERSION,
  })
  compareIndex = enrichCompareIndexWithBcra(
    compareIndex,
    inputs.bcra?.frozen ?? null
  )

  const summary = buildAnalysisSummary({
    computed: legacyComputed,
    decision,
    publishedBy: latestData.analista,
    compareIndex,
  })

  const versionRef = doc(creditAnalysisVersionsCol(cuit), versionId)

  const migrated = await runTransaction(db, async (transaction) => {
    const latestTxSnap = await transaction.get(latestRef)
    if (!latestTxSnap.exists()) {
      return false
    }

    const latestTxData = latestTxSnap.data()
    if (typeof latestTxData.currentVersionId === "string") {
      return false
    }

    const versionsQuery = query(creditAnalysisVersionsCol(cuit), limit(1))
    const versionsSnap = await transaction.get(versionsQuery)
    if (!versionsSnap.empty) {
      return false
    }

    transaction.set(versionRef, {
      versionId,
      cuit,
      versionNumber,
      schemaVersion: SCHEMA_VERSION,
      engineVersion: ENGINE_VERSION,
      publishedAt,
      publishedBy: latestData.analista ?? "migration",
      publishSource: "migration",
      status: "published",
      label: null,
      tags: [],
      fidelity: "best_effort",
      migrationNote: "inputs_partial",
      inputsFingerprint: fingerprints.inputsFingerprint,
      policyFingerprint: fingerprints.policyFingerprint,
      analysisFingerprint: fingerprints.analysisFingerprint,
      bcraReportId:
        inputs.bcra?.reportId ??
        pickLatestBcraDocument(bcraReports)?.id ??
        null,
      nosisReportId: inputs.nosis?.reportId ?? null,
      snapshot,
      compareIndex,
      snapshotSizeBytes: estimateSnapshotSizeBytes(snapshot),
    })

    transaction.set(latestRef, {
      currentVersionId: versionId,
      versionNumber,
      updatedAt: publishedAt,
      publishedAt,
      summary,
    })

    return true
  })

  if (!migrated) {
    return { migrated: false, reason: "race_or_already_migrated" }
  }

  return { migrated: true, versionId, versionNumber }
}

/**
 * @param {string} cuit
 */
export async function loadCurrentPublishedAnalysis(cuit) {
  await migrateLegacyAnalysisIfNeeded(cuit)

  const latest = await LatestRepository.get(cuit)
  if (!latest?.currentVersionId) {
    return { latest, version: null }
  }

  const version = await VersionRepository.get(cuit, latest.currentVersionId)
  return { latest, version }
}

/**
 * @param {string} cuit
 * @param {string} versionId
 */
export async function loadPublishedAnalysisVersion(cuit, versionId) {
  const version = await VersionRepository.get(cuit, versionId)
  return version
}
