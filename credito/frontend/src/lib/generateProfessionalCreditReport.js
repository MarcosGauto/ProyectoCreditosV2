import { SEMAPHORE_STYLES, SHOW_CAPACIDAD_FINANCIERA } from "@/config/creditAnalysis"
import {
  getResultadoCoberturaLabel,
  getResultadoFinalDisplayEmoji,
  RESULTADO_COBERTURA,
} from "@/lib/coverageRequirements"
import {
  CAPACIDAD_FINANCIERA_DESCRIPCION,
  formatCreditAmount,
  formatRatioPercent,
  getCriterioLimitanteCapacidadLabel,
  resolveCriterioLimitanteCapacidadFinanciera,
} from "@/lib/creditAnalysisEngine"
import { buildBalanceEvolutionComment } from "@/lib/balanceAnalysis"
import { buildResultadoFinalNarrative } from "@/lib/creditPolicy/creditPolicyResultadoFinal"

/** @typedef {import("@/lib/loadCreditReportContext").loadCreditReportContext extends (...args: any) => Promise<infer R> ? R : never} CreditReportContext */

const BCRA_SITUACION_LABEL = {
  1: "Normal",
  2: "Riesgo bajo",
  3: "Riesgo medio",
  4: "Riesgo alto",
  5: "Irrecuperable",
}

/**
 * @param {number | null | undefined} situacion
 * @returns {string}
 */
function bcraSituacionLabel(situacion) {
  if (situacion == null || !Number.isFinite(Number(situacion))) {
    return "sin información"
  }
  return BCRA_SITUACION_LABEL[Number(situacion)] ?? `Situación ${situacion}`
}

/**
 * @param {string | null | undefined} estado
 * @returns {string}
 */
function estadoGeneralLabel(estado) {
  const sem = SEMAPHORE_STYLES[/** @type {keyof typeof SEMAPHORE_STYLES} */ (estado ?? "unknown")]
  return sem?.label ?? "Sin dato"
}

/**
 * @param {number | null | undefined} a
 * @param {number | null | undefined} b
 * @returns {number | null}
 */
function pctDiff(a, b) {
  if (
    a == null ||
    b == null ||
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    b === 0
  ) {
    return null
  }
  return ((a - b) / Math.abs(b)) * 100
}

/**
 * @param {CreditReportContext} ctx
 */
function buildResumenEjecutivo(ctx) {
  const { computed, savedAnalysis, bcraMetrics, nosisAnalysis } = ctx
  const resumen = computed.resumenEjecutivo ?? {}
  const credito = computed.creditoAsumible ?? {}
  const preCal = computed.preCalificacion ?? {}

  const resultadoFinal = String(savedAnalysis?.resultadoCobertura ?? "")

  const montoOtorgado =
    savedAnalysis?.montoCreditoOtorgado != null &&
    Number.isFinite(Number(savedAnalysis.montoCreditoOtorgado))
      ? Number(savedAnalysis.montoCreditoOtorgado)
      : null

  const kpis = {
    resultadoFinal: `${getResultadoFinalDisplayEmoji(resultadoFinal)} ${getResultadoCoberturaLabel(resultadoFinal)}`,
    nivelRiesgo: estadoGeneralLabel(resumen.estadoGeneral),
    capacidadFinanciera: SHOW_CAPACIDAD_FINANCIERA
      ? formatCreditAmount(credito.creditoSugerido ?? null)
      : null,
    creditoSugerido: SHOW_CAPACIDAD_FINANCIERA
      ? formatCreditAmount(credito.creditoSugerido ?? null)
      : null,
    creditoOtorgado:
      montoOtorgado != null ? formatCreditAmount(montoOtorgado) : null,
    situacionBcra: bcraMetrics?.hasBcra
      ? `${bcraSituacionLabel(bcraMetrics.peorSituacion)} (${bcraMetrics.peorSituacion})`
      : "Sin consulta BCRA",
    scoreFinanciero:
      resumen.scoreFinanciero != null ? `${resumen.scoreFinanciero}/100` : "—",
    scoreNosis:
      nosisAnalysis.scoreNosis != null
        ? `${nosisAnalysis.scoreNosis}/100`
        : "—",
    preCalificacion: formatCreditAmount(
      /** @type {number | null} */ (preCal.preCalificacion ?? null)
    ),
  }

  const chequesRechazados = Number(
    nosisAnalysis.chequesHistorico?.rechazados ??
      nosisAnalysis.indicadores?.chequesRechazadosTotal ??
      0
  )
  const montoPendiente = Number(
    nosisAnalysis.chequesHistorico?.montoPendiente ??
      nosisAnalysis.indicadores?.montoPendiente ??
      0
  )

  const sentences = []

  if (bcraMetrics?.hasBcra && (bcraMetrics.peorSituacion ?? 1) <= 2) {
    sentences.push(
      `El cliente presenta una situación crediticia ${bcraSituacionLabel(bcraMetrics.peorSituacion).toLowerCase()} ante el BCRA.`
    )
  } else if (bcraMetrics?.hasBcra) {
    sentences.push(
      `Se registra clasificación ${bcraSituacionLabel(bcraMetrics.peorSituacion).toLowerCase()} en la Central de Deudores del BCRA.`
    )
  }

  if (chequesRechazados > 0) {
    let chequeFrase = `Registra antecedentes de cheques rechazados (${chequesRechazados} históricos)`
    if (montoPendiente > 0) {
      chequeFrase += ` con saldo pendiente de ${formatCreditAmount(montoPendiente)}`
    }
    sentences.push(`${chequeFrase}.`)
  } else if (nosisAnalysis.confirmado) {
    sentences.push("No se observan antecedentes relevantes de cheques rechazados en NOSIS.")
  }

  if (resumen.estadoGeneral === "good") {
    sentences.push(
      "La capacidad financiera observada respalda una exposición crediticia acorde al perfil analizado."
    )
  } else if (resumen.estadoGeneral === "medium") {
    sentences.push(
      "La capacidad financiera permite recomendar una exposición moderada con seguimiento."
    )
  } else if (resumen.estadoGeneral === "risky") {
    sentences.push(
      "Los indicadores financieros sugieren adoptar un criterio conservador en la exposición."
    )
  }

  const narrativaPolicy = buildResultadoFinalNarrative(ctx.creditPolicy, {
    resultadoCobertura: resultadoFinal,
    estadoGeneral: resumen.estadoGeneral,
    textVars: {
      liquidezCorriente:
        ctx.balanceAnalysis?.indicadores?.liquidezCorriente ??
        computed.capacidadEconomica?.liquidezCorriente ??
        null,
      endeudamiento:
        ctx.balanceAnalysis?.indicadores?.endeudamiento ??
        computed.capacidadEconomica?.endeudamiento ??
        null,
      solvencia: ctx.balanceAnalysis?.indicadores?.solvencia ?? null,
      patrimonioNeto:
        ctx.balanceAnalysis?.comparativo?.patrimonioNetoActual ??
        computed.capacidadEconomica?.patrimonioNeto ??
        null,
      scoreFinanciero: resumen.scoreFinanciero ?? null,
      scoreNosis: nosisAnalysis.scoreNosis ?? null,
      capacidadFinanciera: SHOW_CAPACIDAD_FINANCIERA
        ? credito.creditoSugerido ?? null
        : null,
    },
  })

  const narrativa =
    narrativaPolicy ||
    (sentences.length > 0
      ? sentences.join(" ")
      : "Análisis crediticio en elaboración con la información disponible del expediente.")

  return { kpis, narrativa, resultadoFinal: String(resultadoFinal) }
}

/**
 * @param {CreditReportContext} ctx
 */
function buildAnalisisFinanciero(ctx) {
  const { computed, balanceAnalysis, asyncPreCal } = ctx
  const capacidad = computed.capacidadEconomica ?? {}
  const indicadores = balanceAnalysis.indicadores ?? {}
  const variaciones = balanceAnalysis.variaciones ?? {}
  const comparativo = balanceAnalysis.comparativo ?? {}

  const liquidez = indicadores.liquidezCorriente ?? capacidad.liquidezCorriente
  const endeudamiento = indicadores.endeudamiento ?? capacidad.endeudamiento
  const capitalTrabajo = indicadores.capitalTrabajo
  const solvencia = indicadores.solvencia

  const ventasBalance =
    asyncPreCal?.ventas?.ventasBalance ??
    asyncPreCal?.indicadores?.ventasBalance ??
    null

  const partes = []

  if (liquidez != null && Number.isFinite(Number(liquidez))) {
    const liq = Number(liquidez)
    if (liq >= 1.5) {
      partes.push(
        `La liquidez corriente (${liq.toLocaleString("es-AR", { maximumFractionDigits: 2 })}) se encuentra en niveles adecuados`
      )
    } else if (liq >= 1) {
      partes.push(
        `La liquidez corriente (${liq.toLocaleString("es-AR", { maximumFractionDigits: 2 })}) es aceptable pero requiere monitoreo`
      )
    } else {
      partes.push(
        `Se observa liquidez corriente reducida (${liq.toLocaleString("es-AR", { maximumFractionDigits: 2 })})`
      )
    }
  }

  if (endeudamiento != null && Number.isFinite(Number(endeudamiento))) {
    partes.push(
      `el endeudamiento sobre activo alcanza ${formatRatioPercent(Number(endeudamiento))}`
    )
  }

  if (capitalTrabajo != null && Number.isFinite(Number(capitalTrabajo))) {
    const cierre = balanceAnalysis.fechaCierreUltimo
    partes.push(
      `el capital de trabajo${cierre ? ` al cierre ${cierre}` : ""} es ${formatCreditAmount(Number(capitalTrabajo))}`
    )
  }

  if (solvencia != null && Number.isFinite(Number(solvencia))) {
    partes.push(
      `la solvencia patrimonial se ubica en ${Number(solvencia).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`
    )
  }

  const evolucionTexto =
    balanceAnalysis.evolucionPatrimonial?.comentarioEvolucion ??
    buildBalanceEvolutionComment(
      {
        variacionActivo: variaciones.variacionActivo ?? null,
        variacionPasivo: variaciones.variacionPasivo ?? null,
        variacionPatrimonio: variaciones.variacionPatrimonio ?? null,
        estadoEvolucionPatrimonial:
          balanceAnalysis.semaforos?.evolucionPatrimonial ?? "unknown",
      },
      ctx.creditPolicy,
      {
        liquidezCorriente: indicadores.liquidezCorriente ?? null,
        endeudamiento: indicadores.endeudamiento ?? null,
        solvencia: indicadores.solvencia ?? null,
        patrimonioNeto: comparativo.patrimonioNetoActual ?? null,
        scoreFinanciero: ctx.computed?.resumenEjecutivo?.scoreFinanciero ?? null,
        scoreNosis: ctx.nosisAnalysis?.scoreNosis ?? null,
        capacidadFinanciera: ctx.computed?.creditoAsumible?.creditoSugerido ?? null,
      }
    )

  if (variaciones.variacionPatrimonio != null) {
    const sign = variaciones.variacionPatrimonio > 0 ? "incremento" : "disminución"
    partes.push(
      `se registra ${sign} del patrimonio neto del ${Math.abs(variaciones.variacionPatrimonio).toLocaleString("es-AR", { maximumFractionDigits: 1 })}% entre ejercicios`
    )
  }

  if (comparativo.activoTotalActual != null && comparativo.activoTotalAnterior != null) {
    const varActivo = pctDiff(
      comparativo.activoTotalActual,
      comparativo.activoTotalAnterior
    )
    if (varActivo != null) {
      partes.push(
        `el activo total ${varActivo >= 0 ? "creció" : "disminuyó"} ${Math.abs(varActivo).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`
      )
    }
  }

  if (ventasBalance != null && Number.isFinite(Number(ventasBalance))) {
    partes.push(
      `las ventas contables estimadas ascienden a ${formatCreditAmount(Number(ventasBalance))}`
    )
  }

  const narrativaBase =
    partes.length > 0
      ? `${partes[0].charAt(0).toUpperCase()}${partes[0].slice(1)}${partes.length > 1 ? `; ${partes.slice(1).join("; ")}` : ""}.`
      : balanceAnalysis.comentarioBalance ??
        "Información contable insuficiente para un análisis financiero detallado."

  const narrativa = `${narrativaBase} ${evolucionTexto}`.trim()

  const analisisIA = ctx.savedAnalysis?.analisisBalanceIA ?? null

  return {
    narrativa,
    analisisIA,
    indicadores: {
      liquidezCorriente:
        liquidez != null
          ? Number(liquidez).toLocaleString("es-AR", { maximumFractionDigits: 2 })
          : "—",
      endeudamiento: formatRatioPercent(
        /** @type {number | null} */ (endeudamiento ?? null)
      ),
      solvencia:
        solvencia != null
          ? Number(solvencia).toLocaleString("es-AR", { maximumFractionDigits: 2 })
          : "—",
      capitalTrabajo: formatCreditAmount(
        /** @type {number | null} */ (capitalTrabajo ?? null)
      ),
      patrimonioNeto: formatCreditAmount(
        /** @type {number | null} */ (comparativo.patrimonioNetoActual ?? capacidad.patrimonioNeto ?? null)
      ),
      activoTotal: formatCreditAmount(
        /** @type {number | null} */ (comparativo.activoTotalActual ?? capacidad.activoTotal ?? null)
      ),
    },
  }
}

/**
 * @param {CreditReportContext} ctx
 */
function buildAnalisisComercial(ctx) {
  const { nosisAnalysis } = ctx
  const consultas = nosisAnalysis.consultas
  const total = consultas?.total ?? 0
  const promedio = consultas?.promedio ?? 0

  let narrativa =
    "No se dispone de información de consultas comerciales en el informe NOSIS."

  if (consultas && total > 0) {
    if (total > 40) {
      narrativa =
        "El volumen elevado de consultas comerciales evidencia actividad económica vigente, amplia presencia en el mercado y demanda sostenida de información crediticia por parte de terceros."
    } else if (total >= 15) {
      narrativa =
        "El volumen de consultas comerciales evidencia actividad económica vigente y presencia activa en el mercado, con niveles de consulta acordes a operadores en curso normal de negocios."
    } else {
      narrativa =
        "Las consultas comerciales registradas son limitadas, lo que puede reflejar menor exposición al mercado o actividad reciente reducida; se recomienda contrastar con ventas e ingresos declarados."
    }

    if (promedio > 0) {
      narrativa += ` El promedio mensual de consultas es de ${promedio.toLocaleString("es-AR", { maximumFractionDigits: 1 })}.`
    }
  } else if (nosisAnalysis.consultasComercialComentario) {
    narrativa = nosisAnalysis.consultasComercialComentario + "."
  }

  return {
    narrativa,
    consultasTotal: total > 0 ? String(total) : "—",
    consultasPromedio:
      promedio > 0
        ? promedio.toLocaleString("es-AR", { maximumFractionDigits: 1 })
        : "—",
  }
}

/**
 * @param {CreditReportContext} ctx
 */
function buildAnalisisNosis(ctx) {
  const { nosisAnalysis } = ctx

  if (!nosisAnalysis.disponible) {
    return {
      narrativa:
        "No se dispone de informe NOSIS cargado en el expediente para evaluar el riesgo comercial.",
    }
  }

  if (!nosisAnalysis.confirmado) {
    return {
      narrativa:
        "Existe un informe NOSIS en el legajo, pendiente de confirmación de indicadores por parte del analista.",
    }
  }

  const ch = nosisAnalysis.chequesHistorico ?? {}
  const rechazados = Number(ch.rechazados ?? 0)
  const abonados = Number(ch.abonados ?? 0)
  const pendientes = Number(ch.pendientes ?? 0)
  const montoPendiente = Number(ch.montoPendiente ?? 0)
  const score = nosisAnalysis.scoreNosis

  const partes = []

  if (score != null) {
    partes.push(
      `El score NOSIS es ${score}/100 (${nosisAnalysis.rating ?? "sin rating"})`
    )
  }

  if (rechazados > 10 || montoPendiente > 500000) {
    partes.push(
      "Se detecta una elevada cantidad histórica de cheques rechazados"
    )
    if (montoPendiente > 0) {
      partes.push(
        `manteniéndose actualmente un saldo pendiente de ${formatCreditAmount(montoPendiente)} que constituye un factor de riesgo comercial relevante`
      )
    }
  } else if (rechazados > 0) {
    partes.push(
      `Se registran ${rechazados} cheques rechazados históricos`
    )
    if (abonados > 0) {
      partes.push(`con ${abonados} cheques abonados/recuperados`)
    }
    if (pendientes > 0) {
      partes.push(`y ${pendientes} pendientes`)
    }
  } else {
    partes.push("No se registran antecedentes significativos de cheques rechazados")
  }

  if (nosisAnalysis.juiciosConcursos) {
    partes.push(
      "existen antecedentes de juicios y/o concursos que incrementan el riesgo comercial"
    )
  } else {
    partes.push("sin juicios ni concursos detectados en la información NOSIS")
  }

  const narrativa =
    partes.length > 0
      ? `${partes[0].charAt(0).toUpperCase()}${partes[0].slice(1)}${partes.length > 1 ? `; ${partes.slice(1).join("; ")}` : ""}.`
      : (nosisAnalysis.conclusion ?? "Sin conclusión NOSIS disponible.")

  return {
    narrativa,
    scoreNosis: score != null ? `${score}/100` : "—",
    chequesRechazados: String(rechazados),
    chequesAbonados: String(abonados),
    chequesPendientes: String(pendientes),
    montoPendiente: formatCreditAmount(montoPendiente || null),
    juiciosConcursos: nosisAnalysis.juiciosConcursos ? "Sí" : "No",
  }
}

/**
 * @param {CreditReportContext} ctx
 */
function buildAnalisisBcra(ctx) {
  const { bcraMetrics, bcraNormalized } = ctx

  if (!bcraMetrics?.hasBcra) {
    return {
      narrativa:
        "No se dispone de consulta BCRA en el expediente para evaluar la situación ante la Central de Deudores.",
    }
  }

  const situacion = bcraMetrics.peorSituacion ?? 1
  const deuda = formatCreditAmount(bcraMetrics.deudaTotal ?? 0)
  const entidades = bcraMetrics.entidades?.length ?? 0
  const entidadesAtraso = bcraMetrics.entidadesConAtraso ?? 0

  let narrativa

  if (situacion <= 2 && entidadesAtraso === 0) {
    narrativa = `El cliente mantiene clasificación ${bcraSituacionLabel(situacion).toLowerCase()} dentro de la Central de Deudores del BCRA, con deuda total de ${deuda} en ${entidades} entidad${entidades === 1 ? "" : "es"}, sin evidencias de irregularidades vigentes.`
  } else if (situacion <= 3) {
    narrativa = `El cliente registra situación ${bcraSituacionLabel(situacion).toLowerCase()} ante el BCRA, con deuda de ${deuda}. ${entidadesAtraso > 0 ? `Se observan ${entidadesAtraso} entidad${entidadesAtraso === 1 ? "" : "es"} con atraso.` : "No se registran entidades con atraso material."}`
  } else {
    narrativa = `La clasificación BCRA es ${bcraSituacionLabel(situacion).toLowerCase()} (situación ${situacion}), con deuda total de ${deuda}. Esta condición eleva el perfil de riesgo crediticio y requiere análisis conservador.`
  }

  if (bcraMetrics.tieneRefinanciaciones) {
    narrativa += " Se registran refinanciaciones en el historial BCRA."
  }
  if (bcraMetrics.tieneJudiciales) {
    narrativa += " Existen procesos judiciales vinculados a deudas informadas."
  }

  return {
    narrativa,
    situacion: `${bcraSituacionLabel(situacion)} (${situacion})`,
    deudaTotal: deuda,
    entidades: String(entidades),
    entidadesConAtraso: String(entidadesAtraso),
    periodo: bcraNormalized?.periodo ?? "—",
  }
}

/**
 * @param {CreditReportContext} ctx
 */
function buildAnalisisFiscal(ctx) {
  const { asyncPreCal, computed } = ctx
  const ventas = asyncPreCal?.ventas ?? asyncPreCal?.indicadores ?? {}
  const ventasBalance = Number(ventas.ventasBalance ?? 0) || null
  const ventasIva = Number(ventas.ventasIva ?? 0) || null
  const ventasIibb = Number(ventas.ventasIibb ?? 0) || null
  const promedio =
    asyncPreCal?.promedioVentas ?? asyncPreCal?.promedioIndicadores ?? null

  const partes = []

  if (ventasIva != null && ventasIva > 0) {
    partes.push(
      `Las ventas mensuales promedio según IVA ascienden a ${formatCreditAmount(ventasIva)}`
    )
  } else {
    partes.push("No se dispone de IVA confirmado para estimar ventas")
  }

  if (ventasIibb != null && ventasIibb > 0) {
    partes.push(
      `la base imponible IIBB promedio es ${formatCreditAmount(ventasIibb)}`
    )
  }

  if (ventasBalance != null && ventasBalance > 0) {
    partes.push(
      `las ventas contables del balance alcanzan ${formatCreditAmount(ventasBalance)}`
    )
  }

  let consistencia = ""
  if (ventasBalance && ventasIva && ventasIva > 0) {
    const diff = pctDiff(ventasBalance, ventasIva * 12)
    if (diff != null && Math.abs(diff) > 25) {
      consistencia =
        ` Se detecta una diferencia relevante (${Math.abs(diff).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%) entre ventas contables y la proyección anual desde IVA, lo que amerita verificación de consistencia fiscal-contable.`
    } else if (diff != null) {
      consistencia =
        " La información fiscal y contable presenta consistencia razonable entre fuentes."
    }
  }

  if (ventasIibb && ventasIva && ventasIva > 0) {
    const diffIibb = pctDiff(ventasIibb, ventasIva)
    if (diffIibb != null && Math.abs(diffIibb) > 30) {
      consistencia +=
        " Existe divergencia entre IVA e IIBB que debe ser considerada en el análisis."
    }
  }

  const capacidad = computed.capacidadEconomica ?? {}
  if (capacidad.ventasAnualesEstimadas) {
    partes.push(
      `la estimación anual consolidada es ${formatCreditAmount(capacidad.ventasAnualesEstimadas)}`
    )
  }

  const narrativa =
    (partes.length > 0
      ? `${partes[0].charAt(0).toUpperCase()}${partes[0].slice(1)}${partes.length > 1 ? `; ${partes.slice(1).join("; ")}` : ""}.`
      : "Sin declaraciones fiscales confirmadas en el expediente.") + consistencia

  return {
    narrativa,
    ventasIva: formatCreditAmount(ventasIva),
    ventasIibb: formatCreditAmount(ventasIibb),
    ventasBalance: formatCreditAmount(ventasBalance),
    promedioVentas: formatCreditAmount(
      /** @type {number | null} */ (promedio)
    ),
  }
}

/**
 * @param {CreditReportContext} ctx
 * @param {ReturnType<typeof buildResumenEjecutivo>} resumen
 */
function buildFortalezasDebilidades(ctx, resumen) {
  /** @type {string[]} */
  const fortalezas = []
  /** @type {string[]} */
  const debilidades = []

  const { bcraMetrics, nosisAnalysis, computed, balanceAnalysis } = ctx
  const capacidad = computed.capacidadEconomica ?? {}
  const sem = capacidad.semaforos ?? {}

  if (bcraMetrics?.hasBcra && (bcraMetrics.peorSituacion ?? 1) <= 2) {
    fortalezas.push("Situación normal o de bajo riesgo en BCRA.")
  }
  if (bcraMetrics?.hasBcra && (bcraMetrics.peorSituacion ?? 1) >= 4) {
    debilidades.push("Clasificación BCRA elevada (riesgo alto o irrecuperable).")
  }

  if (sem.liquidez === "good") {
    fortalezas.push("Liquidez corriente adecuada.")
  } else if (sem.liquidez === "risky") {
    debilidades.push("Liquidez corriente insuficiente.")
  }

  if (sem.endeudamiento === "good") {
    fortalezas.push("Endeudamiento contenido.")
  } else if (sem.endeudamiento === "risky") {
    debilidades.push("Alto endeudamiento patrimonial.")
  }

  const variacionPatrimonio = balanceAnalysis.variaciones?.variacionPatrimonio
  if (variacionPatrimonio != null && variacionPatrimonio > 5) {
    fortalezas.push("Incremento de patrimonio neto entre ejercicios.")
  }
  if (variacionPatrimonio != null && variacionPatrimonio < -15) {
    debilidades.push("Disminución significativa del patrimonio neto.")
  }

  const consultasTotal = nosisAnalysis.consultas?.total ?? 0
  if (consultasTotal >= 15) {
    fortalezas.push("Actividad comercial vigente (consultas NOSIS).")
  } else if (consultasTotal > 0 && consultasTotal < 10) {
    debilidades.push("Consultas comerciales limitadas.")
  }

  const rechazados = Number(nosisAnalysis.chequesHistorico?.rechazados ?? 0)
  if (rechazados === 0 && nosisAnalysis.confirmado) {
    fortalezas.push("Sin cheques rechazados registrados en NOSIS.")
  } else if (rechazados > 5) {
    debilidades.push("Historial de cheques rechazados.")
  }

  const montoPendiente = Number(
    nosisAnalysis.chequesHistorico?.montoPendiente ?? 0
  )
  if (montoPendiente > 100000) {
    debilidades.push(
      `Saldo pendiente de cheques (${formatCreditAmount(montoPendiente)}).`
    )
  }

  if (nosisAnalysis.juiciosConcursos) {
    debilidades.push("Juicios y/o concursos registrados.")
  }

  if (nosisAnalysis.scoreNosis != null && nosisAnalysis.scoreNosis >= 75) {
    fortalezas.push(`Score NOSIS favorable (${nosisAnalysis.scoreNosis}/100).`)
  } else if (nosisAnalysis.scoreNosis != null && nosisAnalysis.scoreNosis < 50) {
    debilidades.push(`Score NOSIS bajo (${nosisAnalysis.scoreNosis}/100).`)
  }

  if (computed.resumenEjecutivo?.estadoGeneral === "good") {
    fortalezas.push("Estado financiero general favorable.")
  } else if (computed.resumenEjecutivo?.estadoGeneral === "risky") {
    debilidades.push("Estado financiero general riesgoso.")
  }

  const preCal = computed.preCalificacion?.preCalificacion
  if (preCal != null && Number(preCal) > 0) {
    fortalezas.push(
      `Precalificación positiva (${formatCreditAmount(Number(preCal))}).`
    )
  }

  if (fortalezas.length === 0) {
    fortalezas.push("Información parcial — completar legajo para fortalezas adicionales.")
  }
  if (debilidades.length === 0) {
    debilidades.push("No se identificaron debilidades materiales con la información disponible.")
  }

  return { fortalezas, debilidades }
}

/**
 * @param {CreditReportContext} ctx
 */
function buildCapacidadFinanciera(ctx) {
  const credito = ctx.computed.creditoAsumible ?? {}
  const creditConfig = credito.config ?? {}
  const pctPatrimonio = (
    (creditConfig.porcentajePatrimonio ?? 0.3) * 100
  ).toLocaleString("es-AR")
  const pctFlujo = (
    (creditConfig.porcentajeFlujoIVA ?? 0.2) * 100
  ).toLocaleString("es-AR")
  const criterioLimitante = getCriterioLimitanteCapacidadLabel(
    resolveCriterioLimitanteCapacidadFinanciera(credito)
  )

  return {
    descripcion: CAPACIDAD_FINANCIERA_DESCRIPCION,
    monto: formatCreditAmount(
      /** @type {number | null} */ (credito.creditoSugerido ?? null)
    ),
    porPatrimonio: formatCreditAmount(
      /** @type {number | null} */ (credito.creditoPorPatrimonio ?? null)
    ),
    porFlujo: formatCreditAmount(
      /** @type {number | null} */ (credito.creditoPorFlujo ?? null)
    ),
    formulaPatrimonio: `Patrimonio neto × ${pctPatrimonio}%`,
    formulaFlujo: `Ventas IVA promedio × ${pctFlujo}%`,
    formulaTotal: "Menor valor entre patrimonio y flujo IVA",
    criterioLimitante,
    narrativa: [
      `Capacidad financiera: ${formatCreditAmount(/** @type {number | null} */ (credito.creditoSugerido ?? null))}.`,
      `Capacidad por patrimonio (${formatCreditAmount(/** @type {number | null} */ (credito.creditoPorPatrimonio ?? null))}): Patrimonio neto × ${pctPatrimonio}%.`,
      `Capacidad por flujo IVA (${formatCreditAmount(/** @type {number | null} */ (credito.creditoPorFlujo ?? null))}): Ventas IVA promedio × ${pctFlujo}%.`,
      criterioLimitante
        ? `Criterio limitante: ${criterioLimitante}.`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
  }
}

/**
 * @param {CreditReportContext} ctx
 * @param {ReturnType<typeof buildResumenEjecutivo>} resumen
 * @param {{ fortalezas: string[]; debilidades: string[] }} fd
 */
function buildConclusionFinal(ctx, resumen, fd) {
  const resultadoLabel = resumen.kpis.resultadoFinal
  const capacidadFinanciera =
    resumen.kpis.capacidadFinanciera ?? resumen.kpis.creditoSugerido
  const creditoOtorgado = resumen.kpis.creditoOtorgado
  const recomendacion = String(ctx.savedAnalysis?.recomendacionAnalista ?? "").trim()

  const key = resumen.resultadoFinal
  const motivosExclusion = Array.isArray(ctx.savedAnalysis?.motivosExclusion)
    ? ctx.savedAnalysis.motivosExclusion.map(String)
    : []

  let justificacion = ""

  if (
    key === RESULTADO_COBERTURA.NOMINADO_CON_COBERTURA ||
    key === RESULTADO_COBERTURA.DISCRECIONAL_CON_COBERTURA
  ) {
    justificacion = `Tras evaluar los requisitos de cobertura, el comportamiento comercial y la situación ante el BCRA, corresponde ${resultadoLabel}`
    if (creditoOtorgado) {
      justificacion += ` por un monto de ${creditoOtorgado}`
    } else if (
      SHOW_CAPACIDAD_FINANCIERA &&
      capacidadFinanciera !== formatCreditAmount(0)
    ) {
      justificacion += `, con capacidad financiera estimada de ${capacidadFinanciera}`
    }
    justificacion += "."
  } else {
    const motivosTexto =
      motivosExclusion.length > 0
        ? motivosExclusion.join(", ")
        : fd.debilidades.slice(0, 3).join(" ")
    justificacion = `No aplica cobertura (${resultadoLabel}).`
    if (motivosTexto) {
      justificacion += ` Motivos: ${motivosTexto}.`
    }
  }

  if (recomendacion) {
    justificacion += ` Observaciones del analista: ${recomendacion}`
  }

  return {
    resultado: resultadoLabel,
    narrativa: justificacion,
    recomendacionAnalista: recomendacion || null,
  }
}

/**
 * Genera el informe profesional de análisis crediticio automático.
 *
 * @param {CreditReportContext} context
 */
export function generateProfessionalCreditReport(context) {
  const fecha =
    context.savedAnalysis?.updatedAt ??
    context.computed.computedAt ??
    new Date().toISOString()

  const resumenEjecutivo = buildResumenEjecutivo(context)
  const capacidadFinanciera = SHOW_CAPACIDAD_FINANCIERA
    ? buildCapacidadFinanciera(context)
    : null
  const analisisFinanciero = buildAnalisisFinanciero(context)
  const analisisComercial = buildAnalisisComercial(context)
  const analisisNosis = buildAnalisisNosis(context)
  const analisisBcra = buildAnalisisBcra(context)
  const analisisFiscal = buildAnalisisFiscal(context)
  const { fortalezas, debilidades } = buildFortalezasDebilidades(
    context,
    resumenEjecutivo
  )
  const conclusionFinal = buildConclusionFinal(context, resumenEjecutivo, {
    fortalezas,
    debilidades,
  })

  return {
    meta: {
      titulo: "Informe de Análisis Crediticio",
      cuit: context.cuit,
      razonSocial: context.razonSocial,
      analista: context.analista,
      fecha,
      tipoEmpresa: context.tipoEmpresa ?? "—",
    },
    resumenEjecutivo,
    capacidadFinanciera,
    analisisFinanciero,
    analisisComercial,
    analisisNosis,
    analisisBcra,
    analisisFiscal,
    fortalezas,
    debilidades,
    conclusionFinal,
  }
}
