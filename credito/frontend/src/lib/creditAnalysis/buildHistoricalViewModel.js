import {
  getResultadoCoberturaLabel,
  RESULTADO_COBERTURA_LABELS,
  TIPO_OPERACION,
  TIPO_OPERACION_OPTIONS,
} from "@/lib/coverageRequirements"

/**
 * Arma el estado de visualización histórica exclusivamente desde el snapshot.
 *
 * @param {Record<string, unknown>} historicalVersion
 * @param {string} cuit
 */
export function buildHistoricalViewModel(historicalVersion, cuit) {
  const snapshot = /** @type {Record<string, any>} */ (
    historicalVersion.snapshot ?? {}
  )
  const rendered = snapshot.renderedContext ?? {}
  const decision = snapshot.decision ?? {}
  const computed = snapshot.computed ?? {}
  const inputs = snapshot.inputs ?? {}
  const analistaConfig = inputs.analistaConfig ?? {}

  const coverageDecision = rendered.coverageDecision ?? {
    resultadoCobertura: decision.resultadoCobertura ?? "",
    resultadoCoberturaLabel:
      RESULTADO_COBERTURA_LABELS[decision.resultadoCobertura ?? ""] ??
      getResultadoCoberturaLabel(String(decision.resultadoCobertura ?? "")),
    requisitosCobertura: decision.requisitosCobertura ?? {},
    motivosExclusion: decision.motivosExclusion ?? [],
    checklist: [],
    tipoOperacion: decision.tipoOperacion ?? TIPO_OPERACION.NOMINADO,
  }

  const tipoOperacion =
    decision.tipoOperacion === TIPO_OPERACION.DISCRECIONAL
      ? TIPO_OPERACION.DISCRECIONAL
      : TIPO_OPERACION.NOMINADO

  const tipoOperacionLabel =
    TIPO_OPERACION_OPTIONS.find((option) => option.value === tipoOperacion)
      ?.label ?? tipoOperacion

  return {
    cuit,
    snapshot,
    inputs,
    computed,
    decision,
    rendered,
    policySnapshot: snapshot.policySnapshot ?? null,
    coverageDecision,
    resultadoFinalNarrativa: rendered.resultadoFinalNarrativa ?? null,
    financieroTab: rendered.financieroTab ?? null,
    balanceAnalysis: rendered.balanceAnalysis ?? {},
    asyncPreCal: rendered.asyncPreCal ?? computed.preCalificacion ?? null,
    analisisBalanceIA: snapshot.aiObservations?.analisisBalanceIA ?? null,
    bcraMetrics: rendered.bcraMetrics ?? null,
    nosisAnalysis: rendered.nosisAnalysis ?? computed.nosisAnalisis ?? {},
    tipoEmpresa: String(analistaConfig.tipoEmpresa ?? ""),
    coeficienteEmpresa:
      analistaConfig.coeficienteEmpresa != null
        ? Number(analistaConfig.coeficienteEmpresa)
        : null,
    tipoOperacion,
    tipoOperacionLabel,
    recomendacionAnalista: String(decision.recomendacionAnalista ?? ""),
    montoCreditoOtorgado:
      decision.montoCreditoOtorgado != null &&
      Number.isFinite(Number(decision.montoCreditoOtorgado))
        ? Number(decision.montoCreditoOtorgado)
        : null,
    facturasAlContado:
      decision.facturasAlContado === true || decision.facturasAlContado === false
        ? decision.facturasAlContado
        : null,
    fechaInicioActividad:
      typeof decision.fechaInicioActividad === "string"
        ? decision.fechaInicioActividad
        : null,
    publishedBy: String(historicalVersion.publishedBy ?? ""),
    versionNumber: historicalVersion.versionNumber ?? null,
    publishedAt: historicalVersion.publishedAt ?? null,
    displayWarnings: Array.isArray(computed.warnings) ? computed.warnings : [],
    scoreDebug: computed.scoreDebug ?? null,
    balanceContable: inputs.balanceContable ?? null,
    comportamientoComercial: computed.comportamientoComercial ?? null,
  }
}
