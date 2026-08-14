import { bcraReportDocToDisplaySource } from "@/lib/bcra/bcraReportsRepository"
import { hashPayload } from "@/lib/creditAnalysis/fingerprints"
import { selectEngineUsedInputs } from "@/lib/creditAnalysis/selectEngineUsedInputs"

/**
 * @param {Record<string, unknown> | null | undefined} empresa
 */
function pickEmpresaSnapshot(empresa) {
  if (!empresa) {
    return null
  }

  return {
    id: empresa.id ?? null,
    cuit: empresa.cuit ?? empresa.id ?? null,
    razonSocial: empresa.razonSocial ?? empresa.nombre ?? null,
    tipoEmpresa: empresa.tipoEmpresa ?? null,
    coeficiente: empresa.coeficiente ?? null,
    paginaWeb: empresa.paginaWeb ?? null,
    tipoContribuyente: empresa.tipoContribuyente ?? null,
  }
}

/**
 * @param {{
 *   empresa?: Record<string, unknown> | null;
 *   balances?: unknown[];
 *   balanceContable?: Record<string, unknown> | null;
 *   iva?: unknown[];
 *   iibb?: unknown[];
 *   nosis?: unknown[];
 *   bcraReports?: unknown[];
 *   bcraReportId?: string | null;
 *   chequesRechazados?: unknown[];
 *   locales?: unknown[];
 *   analistaConfig?: Record<string, unknown>;
 * }} params
 */
export function selectAnalysisInputs(params) {
  const engineUsed = selectEngineUsedInputs({
    empresa: params.empresa,
    balances: params.balances,
    balanceContable: params.balanceContable,
    iva: params.iva,
    iibb: params.iibb,
    nosis: params.nosis,
    bcraReports: params.bcraReports,
    bcraReportId: params.bcraReportId,
    chequesRechazados: params.chequesRechazados,
    analistaConfig: params.analistaConfig,
  })

  const bcraFrozenSource = engineUsed.bcraDoc
    ? bcraReportDocToDisplaySource(engineUsed.bcraDoc)
    : null

  return {
    empresa: pickEmpresaSnapshot(engineUsed.empresa),
    balanceContable: engineUsed.balanceContable,
    balances: engineUsed.usedBalances,
    iva: engineUsed.usedIva,
    iibb: engineUsed.usedIibb,
    chequesRechazados: engineUsed.cheques,
    nosis: engineUsed.latestNosis
      ? {
          reportId: String(engineUsed.latestNosis.id ?? ""),
          frozen: { id: String(engineUsed.latestNosis.id ?? ""), ...engineUsed.latestNosis },
        }
      : null,
    bcra: engineUsed.bcraDoc
      ? {
          reportId: String(engineUsed.bcraDoc.id ?? ""),
          fetchedAt: engineUsed.bcraDoc.fetchedAt ?? null,
          queryOrigin: engineUsed.bcraDoc.queryOrigin ?? null,
          queriedBy: engineUsed.bcraDoc.queriedBy ?? null,
          frozen: {
            ...(bcraFrozenSource ?? {}),
            metrics: engineUsed.bcraDoc.metrics ?? null,
          },
        }
      : null,
    bcraReports: engineUsed.usedBcraReports,
    analistaConfig: engineUsed.analistaConfig,
    inputsSelection: {
      iva: {
        usedIds: engineUsed.usedIva.map((row) =>
          String(/** @type {{ id?: string }} */ (row).id ?? "")
        ),
        totalAvailable: Array.isArray(params.iva) ? params.iva.length : 0,
        criteria: "engine_confirmed_or_all",
      },
      iibb: {
        usedIds: engineUsed.usedIibb.map((row) =>
          String(/** @type {{ id?: string }} */ (row).id ?? "")
        ),
        totalAvailable: Array.isArray(params.iibb) ? params.iibb.length : 0,
        criteria: "engine_confirmed_or_all",
      },
      balances: {
        usedIds: engineUsed.usedBalances.map((row) =>
          String(/** @type {{ id?: string }} */ (row).id ?? "")
        ),
        totalAvailable: Array.isArray(params.balances) ? params.balances.length : 0,
        criteria: "engine_balance_pair_or_latest",
      },
      chequesRechazados: {
        usedIds: engineUsed.cheques.map((row) =>
          String(/** @type {{ id?: string }} */ (row).id ?? "")
        ),
        totalAvailable: Array.isArray(params.chequesRechazados)
          ? params.chequesRechazados.length
          : 0,
        criteria: "all_at_publish",
      },
      locales: {
        usedIds: [],
        totalAvailable: Array.isArray(params.locales) ? params.locales.length : 0,
        criteria: "not_used_by_engine",
      },
    },
  }
}

/**
 * @param {import("@/lib/creditPolicy/creditPolicyTypes").CreditPolicy} policy
 * @param {string | null | undefined} frozenBy
 */
export async function buildPolicySnapshot(policy, frozenBy = null) {
  const incluirNosis = policy.estadoGeneral?.incluirNosisEnCalculo === true
  const finW = incluirNosis
    ? (policy.estadoGeneral?.scoreFinancieroPeso ?? 100) / 100
    : 1
  const nosisW = incluirNosis
    ? (policy.estadoGeneral?.scoreNosisPeso ?? 0) / 100
    : 0

  const data = {
    id: policy.id,
    version: policy.version,
    estadoGeneral: policy.estadoGeneral,
    indicadoresFinancieros: policy.indicadoresFinancieros,
    reglasCobertura: policy.reglasCobertura,
    reglasCredito: policy.reglasCredito,
    configuracionNosis: policy.configuracionNosis,
    scorePropio: policy.scorePropio,
    textos: policy.textos,
    scoringModel: {
      schemaVersion: 1,
      scoreModel: policy.scorePropio?.scoreModel ?? "SC-1.0",
      // MVP: Score Propio = financiero. NOSIS opcional vía incluirNosisEnCalculo.
      generalScoreFormula: incluirNosis ? "weighted_sum" : "financial_only",
      components: {
        financiero: {
          enabled: true,
          weight: finW,
          source: "computed.resumenEjecutivo.scoreFinanciero",
        },
        nosis: {
          enabled: incluirNosis,
          weight: nosisW,
          source: "computed.nosisAnalisis.scoreNosis",
          role: incluirNosis ? "score_factor" : "external_info",
        },
        documentQuality: {
          enabled: false,
          weight: 0,
          maxWeight: 0.15,
          source: "computed.documentQuality.normalized",
        },
      },
    },
  }

  const policyHash = await hashPayload(data)

  return {
    policyId: policy.id ?? "active_policy",
    policyVersion: policy.version ?? 1,
    policyHash,
    frozenAt: new Date().toISOString(),
    frozenBy: frozenBy ?? "desconocido",
    data,
  }
}

/**
 * @param {Record<string, unknown>} snapshot
 */
export function estimateSnapshotSizeBytes(snapshot) {
  try {
    return new TextEncoder().encode(JSON.stringify(snapshot)).length
  } catch {
    return 0
  }
}
