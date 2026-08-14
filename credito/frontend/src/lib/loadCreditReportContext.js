import { collection, doc, getDoc, getDocs } from "firebase/firestore"

import { computeBalanceAnalysis } from "@/lib/balanceAnalysis"
import {
  buildCreditAnalysis,
  calculateExcelPrequalification,
} from "@/lib/creditAnalysisEngine"
import { fetchFinancialDocumentation } from "@/lib/fetchAnalysisFirestore"
import { loadBcraData } from "@/lib/bcraStorage"
import { getLatestNosisReport } from "@/lib/nosisModel"
import {
  computeBcraMetrics,
  normalizeBcraReport,
  pickBestBcraSource,
  pickLatestBcraDocument,
} from "@/lib/normalizeBcraReport"
import { analyzeNosisReport } from "@/lib/nosisScore"
import { loadCreditAnalysisResult } from "@/lib/saveCreditAnalysisResult"
import { fetchActiveCreditPolicy } from "@/lib/creditPolicy/creditPolicyService"
import { db } from "@/service/firebase"

/**
 * @param {string} cuit
 * @param {{ analista?: string }} [options]
 */
export async function loadCreditReportContext(cuit, options = {}) {
  const analistaDefault = options.analista ?? "Analista crediticio"

  const [financial, empresaSnap, saved, bcraSnap, creditPolicy] = await Promise.all([
    fetchFinancialDocumentation(cuit),
    getDoc(doc(db, "empresas", cuit)),
    loadCreditAnalysisResult(cuit),
    getDocs(collection(db, "empresas", cuit, "bcra_reports")),
    fetchActiveCreditPolicy(),
  ])

  const empresa = empresaSnap.exists()
    ? { id: empresaSnap.id, ...empresaSnap.data() }
    : null

  const latestBcra = pickLatestBcraDocument(
    bcraSnap.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }))
  )

  const sessionBcra =
    typeof window !== "undefined" ? loadBcraData(cuit) : null

  const bcraSource = pickBestBcraSource(latestBcra, sessionBcra)
  const bcraNormalized = bcraSource ? normalizeBcraReport(bcraSource) : null
  const bcraMetrics = bcraSource
    ? computeBcraMetrics(normalizeBcraReport(bcraSource))
    : null

  const tipoEmpresa = String(
    saved?.tipoEmpresa ?? empresa?.tipoEmpresa ?? ""
  ).trim() || null
  const coeficienteEmpresa =
    typeof empresa?.coeficiente === "number" ? empresa.coeficiente : null

  const asyncPreCal = await calculateExcelPrequalification({
    balanceContable: financial.balanceContable,
    balances: financial.balances,
    iva: financial.iva,
    iibb: financial.iibb,
    tipoEmpresa,
    coeficienteEmpresa,
  })

  const razonSocial =
    bcraNormalized?.denominacion ??
    String(empresa?.razonSocial ?? empresa?.nombre ?? "—")

  const analista = String(saved?.analista ?? analistaDefault)

  const computed = buildCreditAnalysis({
    cuit,
    empresa,
    balances: financial.balances,
    balanceContable: financial.balanceContable,
    iva: financial.iva,
    iibb: financial.iibb,
    nosis: financial.nosis,
    bcra: bcraMetrics?.hasBcra
      ? {
          peorSituacion: bcraMetrics.peorSituacion,
          entidadesConAtraso: bcraMetrics.entidadesConAtraso,
          maxDiasAtraso: bcraMetrics.maxDiasAtraso,
          tieneRefinanciaciones: bcraMetrics.tieneRefinanciaciones,
          tieneJudiciales: bcraMetrics.tieneJudiciales,
        }
      : null,
    razonSocial,
    analista,
    tipoEmpresa,
    creditPolicy,
  })

  computed.preCalificacion = asyncPreCal

  const balanceAnalysis = computeBalanceAnalysis(financial.balanceContable, {
    cuit,
    savedAnalysis: saved,
    iva: financial.iva,
    iibb: financial.iibb,
    ingresos: {
      ventasIva: asyncPreCal?.ventas?.ventasIva ?? null,
      ventasIibb: asyncPreCal?.ventas?.ventasIibb ?? null,
      promedioVentas: asyncPreCal?.promedioVentas ?? null,
      peorSituacionBcra: bcraMetrics?.peorSituacion ?? null,
    },
    creditPolicy,
  })

  const latestNosisDoc = getLatestNosisReport(financial.nosis ?? [])
  const nosisAnalysis = analyzeNosisReport(latestNosisDoc, creditPolicy)

  return {
    cuit,
    empresa,
    razonSocial,
    analista,
    savedAnalysis: saved,
    financial,
    bcraMetrics,
    bcraNormalized,
    computed,
    balanceAnalysis,
    nosisAnalysis,
    tipoEmpresa,
    asyncPreCal,
    creditPolicy,
  }
}
