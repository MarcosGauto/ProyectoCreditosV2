import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/service/firebase"
import { getCoeficienteTipoEmpresa } from "@/lib/scoring/prequalification"
import { ensureEmpresaDocument } from "@/lib/uploadFinancialDocument"

const ANALYSIS_DOC_ID = "latest"

/**
 * @param {string} cuit
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function loadCreditAnalysisResult(cuit) {
  if (!cuit) {
    return null
  }

  const snap = await getDoc(
    doc(db, "empresas", cuit, "credit_analysis", ANALYSIS_DOC_ID)
  )

  if (!snap.exists()) {
    return null
  }

  return { id: snap.id, ...snap.data() }
}

/**
 * Persiste tipo de empresa y coeficiente del análisis (sin esperar guardado completo).
 *
 * @param {string} cuit
 * @param {{
 *   tipoEmpresa?: string | null;
 *   coeficienteEmpresa?: number | null;
 *   tipoContribuyente?: string | null;
 * }} config
 */
export async function saveAnalysisEmpresaConfig(cuit, config) {
  if (!cuit) {
    return
  }

  await ensureEmpresaDocument(cuit)

  const tipoEmpresa =
    typeof config.tipoEmpresa === "string" && config.tipoEmpresa.trim()
      ? config.tipoEmpresa.trim()
      : null

  const coeficienteEmpresa =
    config.coeficienteEmpresa != null &&
    Number.isFinite(config.coeficienteEmpresa) &&
    config.coeficienteEmpresa > 0
      ? config.coeficienteEmpresa
      : tipoEmpresa
        ? getCoeficienteTipoEmpresa(tipoEmpresa)
        : null

  const tipoContribuyente =
    typeof config.tipoContribuyente === "string" && config.tipoContribuyente.trim()
      ? config.tipoContribuyente.trim()
      : null

  /** @type {Record<string, unknown>} */
  const payload = {
    cuit,
    tipoEmpresa,
    coeficienteEmpresa,
    updatedAt: serverTimestamp(),
  }

  if (tipoContribuyente) {
    payload.tipoContribuyente = tipoContribuyente
  }

  await setDoc(
    doc(db, "empresas", cuit, "credit_analysis", ANALYSIS_DOC_ID),
    payload,
    { merge: true }
  )
}

/** @deprecated Use saveAnalysisEmpresaConfig */
export const saveAnalysisTipoEmpresa = (cuit, tipoEmpresa) =>
  saveAnalysisEmpresaConfig(cuit, { tipoEmpresa })

/**
 * @param {string} cuit
 * @param {{
 *   tipoEmpresa?: string | null;
 *   coeficienteEmpresa?: number | null;
 *   recomendacionAnalista: string;
 *   montoCreditoOtorgado?: number | null;
 *   tipoOperacion?: string | null;
 *   fechaInicioActividad?: string | null;
 *   resultadoCobertura?: string | null;
 *   requisitosCobertura?: Record<string, boolean> | null;
 *   motivosExclusion?: string[] | null;
 *   facturasAlContado?: boolean | null;
 *   computed: Record<string, unknown>;
 *   analista?: string | null;
 *   analisisBalanceIA?: Record<string, unknown> | null;
 * }} payload
 */
export async function saveCreditAnalysisResult(cuit, payload) {
  await ensureEmpresaDocument(cuit)

  /** @type {Record<string, unknown>} */
  const data = {
    cuit,
    recomendacionAnalista: payload.recomendacionAnalista,
    montoCreditoOtorgado:
      payload.montoCreditoOtorgado != null &&
      Number.isFinite(payload.montoCreditoOtorgado) &&
      payload.montoCreditoOtorgado >= 0
        ? payload.montoCreditoOtorgado
        : null,
    computed: payload.computed,
    analista: payload.analista ?? "desconocido",
    updatedAt: serverTimestamp(),
    schemaVersion: 1,
  }

  if (payload.tipoOperacion != null) {
    data.tipoOperacion = payload.tipoOperacion
  }
  if (typeof payload.fechaInicioActividad === "string") {
    data.fechaInicioActividad = payload.fechaInicioActividad
  }
  if (payload.resultadoCobertura != null) {
    data.resultadoCobertura = payload.resultadoCobertura
  }
  if (
    payload.requisitosCobertura &&
    typeof payload.requisitosCobertura === "object" &&
    !Array.isArray(payload.requisitosCobertura)
  ) {
    data.requisitosCobertura = payload.requisitosCobertura
  }
  if (Array.isArray(payload.motivosExclusion)) {
    data.motivosExclusion = payload.motivosExclusion
  }
  if (payload.facturasAlContado === true || payload.facturasAlContado === false) {
    data.facturasAlContado = payload.facturasAlContado
  }

  if (
    payload.analisisBalanceIA &&
    typeof payload.analisisBalanceIA === "object"
  ) {
    data.analisisBalanceIA = payload.analisisBalanceIA
  }

  if (payload.tipoEmpresa) {
    data.tipoEmpresa = payload.tipoEmpresa
    data.coeficienteEmpresa =
      payload.coeficienteEmpresa != null &&
      Number.isFinite(payload.coeficienteEmpresa)
        ? payload.coeficienteEmpresa
        : getCoeficienteTipoEmpresa(payload.tipoEmpresa)
  }

  await setDoc(
    doc(db, "empresas", cuit, "credit_analysis", ANALYSIS_DOC_ID),
    data,
    { merge: true }
  )

  return {
    ...data,
    updatedAt: new Date().toISOString(),
  }
}
