/**
 * @param {{
 *   computed: Record<string, unknown>;
 *   decision: Record<string, unknown>;
 *   publishedBy?: string | null;
 *   compareIndex?: Record<string, unknown>;
 * }} params
 */
export function buildAnalysisSummary(params) {
  const resumen = /** @type {Record<string, unknown>} */ (
    params.computed.resumenEjecutivo ?? {}
  )
  const documentQuality = /** @type {Record<string, unknown>} */ (
    params.computed.documentQuality ?? {}
  )
  const compareIndex = params.compareIndex ?? {}

  return {
    publishedBy: params.publishedBy ?? "desconocido",
    razonSocial: resumen.razonSocial ?? null,
    scoreFinanciero: resumen.scoreFinanciero ?? null,
    scoreNosis:
      /** @type {Record<string, unknown>} */ (params.computed.nosisAnalisis ?? {})
        .scoreNosis ?? null,
    scoreGeneralPonderado: resumen.scoreGeneralPonderado ?? null,
    documentQualityScore: documentQuality.score ?? null,
    preCalificacion:
      /** @type {Record<string, unknown>} */ (params.computed.preCalificacion ?? {})
        .preCalificacion ?? null,
    montoCreditoOtorgado: params.decision.montoCreditoOtorgado ?? null,
    estadoGeneral: resumen.estadoGeneral ?? null,
    resultadoCobertura: params.decision.resultadoCobertura ?? null,
    bcraPeorSituacion: compareIndex.bcraPeorSituacion ?? null,
    label: null,
  }
}
