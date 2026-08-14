/**
 * @param {{
 *   computed: Record<string, unknown>;
 *   decision: Record<string, unknown>;
 *   policySnapshot?: { policyVersion?: number; policyHash?: string } | null;
 *   versionNumber: number;
 *   engineVersion: string;
 * }} params
 */
export function buildCompareIndex({
  computed,
  decision,
  policySnapshot,
  versionNumber,
  engineVersion,
}) {
  const resumen = /** @type {Record<string, unknown>} */ (
    computed.resumenEjecutivo ?? {}
  )
  const capacidad = /** @type {Record<string, unknown>} */ (
    computed.capacidadEconomica ?? {}
  )
  const nosis = /** @type {Record<string, unknown>} */ (
    computed.nosisAnalisis ?? {}
  )
  const documentQuality = /** @type {Record<string, unknown>} */ (
    computed.documentQuality ?? {}
  )
  const semaforos = /** @type {Record<string, unknown>} */ (
    capacidad.semaforos ?? {}
  )

  return {
    versionNumber,
    engineVersion,
    scoreFinanciero: resumen.scoreFinanciero ?? null,
    scoreNosis: nosis.scoreNosis ?? null,
    scoreGeneralPonderado: resumen.scoreGeneralPonderado ?? null,
    documentQualityScore: documentQuality.score ?? null,
    documentQualityNormalized: documentQuality.normalized ?? null,
    preCalificacion:
      /** @type {Record<string, unknown>} */ (computed.preCalificacion ?? {})
        .preCalificacion ?? null,
    estadoGeneral: resumen.estadoGeneral ?? null,
    patrimonioNeto: capacidad.patrimonioNeto ?? null,
    activoTotal: capacidad.activoTotal ?? null,
    ventasAnualesEstimadas: capacidad.ventasAnualesEstimadas ?? null,
    ventasPromedioMensuales: capacidad.ventasPromedioMensuales ?? null,
    liquidezCorriente: capacidad.liquidezCorriente ?? null,
    endeudamiento: capacidad.endeudamiento ?? null,
    semaforoLiquidez:
      /** @type {Record<string, unknown>} */ (semaforos.liquidez ?? {}).label ??
      null,
    semaforoEndeudamiento:
      /** @type {Record<string, unknown>} */ (semaforos.endeudamiento ?? {})
        .label ?? null,
    bcraPeorSituacion: null,
    bcraDeudaTotal: null,
    bcraTieneProblemas: null,
    nosisSemaforo: nosis.semaforo ?? null,
    montoCreditoOtorgado: decision.montoCreditoOtorgado ?? null,
    resultadoCobertura: decision.resultadoCobertura ?? null,
    policyVersion: policySnapshot?.policyVersion ?? null,
    policyHash: policySnapshot?.policyHash ?? null,
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} bcraFrozen
 * @param {Record<string, unknown>} compareIndex
 */
export function enrichCompareIndexWithBcra(compareIndex, bcraFrozen) {
  if (!bcraFrozen) {
    return compareIndex
  }

  const metrics = /** @type {Record<string, unknown>} */ (
    bcraFrozen.metrics ?? {}
  )

  return {
    ...compareIndex,
    bcraPeorSituacion: metrics.peorSituacion ?? null,
    bcraDeudaTotal: metrics.deudaTotal ?? null,
    bcraTieneProblemas: metrics.tieneProblemas ?? null,
  }
}
