import {
  nosisDocToIndicators,
  nosisParsedDataFromDoc,
  nosisAnalisisFromDoc,
  parseNosisNumber,
  hasConfirmedNosisIndicators,
  hasNosisDownloadUrl,
  isNosisStorageDisabled,
  isNosisReportPresent,
  getNosisPdfDisplayLabel,
  normalizeConsultasUltimos4Meses,
  formatNosisFechaCarga,
  getNosisScoreSourceLabel,
  estadoComercialToSemaphore,
} from "@/lib/nosisModel"
import { resolveCreditPolicy } from "@/lib/creditPolicy/resolveCreditPolicy"
import { USE_FIREBASE_STORAGE } from "@/lib/storageConfig"

/** @typedef {"good" | "medium" | "risky" | "unknown"} NosisSemaphore */
/** @typedef {"informe" | "calculo_interno"} NosisScoreSource */

/**
 * @param {Record<string, unknown> | null | undefined} nosisDoc
 * @param {import("@/lib/nosisModel").NosisIndicators} indicadores
 * @param {import("@/lib/nosisFullReport").NosisFullReport | null} parsedData
 * @returns {{
 *   scoreNosis: number;
 *   scoreSource: NosisScoreSource;
 *   nosisAnalisis: import("@/lib/nosisOfficialAnalysis").NosisAnalisis | null;
 * }}
 */
export function resolveNosisScore(nosisDoc, indicadores, parsedData) {
  const fromDoc = nosisAnalisisFromDoc(nosisDoc)
  const fromParsed = parsedData?.analisis ?? null
  const official = fromDoc ?? fromParsed

  if (official?.score != null && Number.isFinite(official.score)) {
    return {
      scoreNosis: Math.round(official.score),
      scoreSource: "informe",
      nosisAnalisis: official,
    }
  }

  return {
    scoreNosis: calculateNosisScore(indicadores),
    scoreSource: "calculo_interno",
    nosisAnalisis: official,
  }
}

/**
 * @param {number} score
 * @returns {string}
 */
export function getNosisRatingLabel(score) {
  if (score >= 90) return "Excelente"
  if (score >= 75) return "Bueno"
  if (score >= 60) return "Medio"
  if (score >= 40) return "Riesgoso"
  return "Crítico"
}

/**
 * @param {number} score
 * @param {{ scoreAprobadoMinimo?: number; scoreObservadoMinimo?: number } | null} [nosisConfig]
 * @returns {NosisSemaphore}
 */
export function getNosisSemaphore(score, nosisConfig = null) {
  const aprobadoMin = nosisConfig?.scoreAprobadoMinimo ?? 70
  const observadoMin = nosisConfig?.scoreObservadoMinimo ?? 40
  if (score >= aprobadoMin) return "good"
  if (score >= observadoMin) return "medium"
  return "risky"
}

/**
 * @param {import("@/lib/nosisModel").NosisIndicators} indicators
 * @returns {number}
 */
export function calculateNosisScore(indicators) {
  let score = 100

  const situacion = parseNosisNumber(indicators.situacionBcra)
  if (situacion >= 5) score -= 35
  else if (situacion >= 4) score -= 25
  else if (situacion >= 3) score -= 15
  else if (situacion >= 2) score -= 5

  if (indicators.moraVigente) {
    score -= 10
  }

  const cantidadCheques = parseNosisNumber(indicators.cantidadCheques)
  if (cantidadCheques > 0) {
    score -= Math.min(30, Math.ceil(cantidadCheques / 10) * 5)
  }

  const montoCheques = parseNosisNumber(indicators.montoCheques)
  if (montoCheques >= 500_000_000) {
    score -= 20
  } else if (montoCheques >= 50_000_000) {
    score -= 12
  } else if (montoCheques > 0) {
    score -= 6
  }

  const chequesImpagos = parseNosisNumber(indicators.chequesImpagos)
  if (chequesImpagos > 0) {
    score -= Math.min(20, chequesImpagos * 2)
  }

  if (indicators.juiciosConcursos) {
    score -= 20
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * @param {import("@/lib/nosisModel").NosisIndicators} indicators
 * @returns {string[]}
 */
export function buildNosisAlertas(indicators) {
  /** @type {string[]} */
  const alertas = []

  const situacion = parseNosisNumber(indicators.situacionBcra)
  if (situacion >= 3) {
    alertas.push(`Situación BCRA elevada (${situacion}).`)
  }
  if (indicators.moraVigente) {
    alertas.push("Mora vigente detectada.")
  }

  const cantidadCheques = parseNosisNumber(indicators.cantidadCheques)
  const montoCheques = parseNosisNumber(indicators.montoCheques)
  const chequesPendientes = parseNosisNumber(indicators.chequesPendientes)
  const montoPendiente = parseNosisNumber(indicators.montoPendiente)
  const qtyRiesgo = chequesPendientes > 0 ? chequesPendientes : cantidadCheques
  const montoRiesgo = montoPendiente > 0 ? montoPendiente : montoCheques

  if (qtyRiesgo > 0) {
    const etiqueta = indicators.chequesHistoricoParsed
      ? "cheques sin recuperar"
      : "cheques rechazados"
    alertas.push(
      `${qtyRiesgo.toLocaleString("es-AR")} ${etiqueta}${
        montoRiesgo > 0
          ? ` por $${montoRiesgo.toLocaleString("es-AR")}`
          : ""
      }.`
    )
  }

  const impagos = parseNosisNumber(indicators.chequesImpagos)
  if (impagos > 0) {
    alertas.push(`${impagos.toLocaleString("es-AR")} cheques impagos / multas.`)
  }

  if (indicators.juiciosConcursos) {
    alertas.push("Antecedentes de juicios o concursos.")
  }

  return alertas
}

/**
 * @param {import("@/lib/nosisModel").NosisIndicators} indicators
 * @param {number} score
 * @returns {string}
 */
export function buildNosisConclusion(indicators, score) {
  const cantidadCheques = parseNosisNumber(indicators.cantidadCheques)
  const montoCheques = parseNosisNumber(indicators.montoCheques)
  const chequesPendientes = parseNosisNumber(indicators.chequesPendientes)
  const montoPendiente = parseNosisNumber(indicators.montoPendiente)
  const qtyRiesgo = chequesPendientes > 0 ? chequesPendientes : cantidadCheques
  const montoRiesgo = montoPendiente > 0 ? montoPendiente : montoCheques
  const impagos = parseNosisNumber(indicators.chequesImpagos)

  if (score >= 75 && qtyRiesgo === 0 && !indicators.juiciosConcursos) {
    return "El informe NOSIS no evidencia alertas crediticias relevantes. El comportamiento comercial observado es compatible con una evaluación favorable."
  }

  const parts = []
  if (qtyRiesgo > 0) {
    const etiqueta = indicators.chequesHistoricoParsed
      ? "cheques pendientes acumulados"
      : "cheques rechazados"
    parts.push(
      `Se observan ${qtyRiesgo.toLocaleString("es-AR")} ${etiqueta}${
        montoRiesgo > 0
          ? ` por $${montoRiesgo.toLocaleString("es-AR")}`
          : ""
      }`
    )
  }
  if (impagos > 0) {
    parts.push(`con ${impagos.toLocaleString("es-AR")} multas impagas`)
  }
  if (qtyRiesgo > 0 || impagos > 0) {
    parts.push("y antecedentes recientes")
  }
  if (indicators.juiciosConcursos) {
    parts.push("juicios o concursos registrados")
  }

  if (parts.length === 0) {
    return `Score NOSIS ${score}/100 (${getNosisRatingLabel(score)}). Revisar indicadores del informe.`
  }

  const detalle = parts.join(", ")
  const cierre =
    score < 40
      ? "El comportamiento crediticio observado eleva significativamente el riesgo comercial."
      : score < 60
        ? "El comportamiento crediticio observado incrementa el riesgo comercial."
        : "Se recomienda complementar con evaluación financiera."

  return `${detalle.charAt(0).toUpperCase()}${detalle.slice(1)}. ${cierre}`
}

/**
 * @param {number} score
 * @returns {"Favorable" | "Con observaciones" | "Riesgoso"}
 */
export function getNosisComentarioAutomatico(score) {
  if (score >= 75) return "Favorable"
  if (score >= 40) return "Con observaciones"
  return "Riesgoso"
}

/**
 * Comentario informativo por volumen de consultas (no afecta el score).
 *
 * @param {number} totalConsultas
 * @returns {string | null}
 */
export function getConsultasComercialComentario(totalConsultas) {
  if (!Number.isFinite(totalConsultas) || totalConsultas <= 0) {
    return null
  }
  if (totalConsultas > 40) {
    return "Actividad comercial alta"
  }
  if (totalConsultas >= 15) {
    return "Actividad comercial normal"
  }
  return "Actividad comercial baja"
}

/**
 * @param {NosisSemaphore} semaphore
 * @returns {string}
 */
export function getNosisSemaphoreLabelUpper(semaphore) {
  if (semaphore === "good") return "BUENO"
  if (semaphore === "medium") return "MEDIO"
  if (semaphore === "risky") return "RIESGOSO"
  return "SIN DATO"
}

/**
 * Etiqueta visible del semáforo NOSIS (prioriza estado comercial del informe).
 *
 * @param {import("@/lib/nosisOfficialAnalysis").NosisEstadoComercial | null | undefined} estadoComercial
 * @param {NosisSemaphore} [estadoNosis]
 * @returns {string}
 */
export function getNosisSemaphoreDisplayLabel(estadoComercial, estadoNosis) {
  if (estadoComercial) {
    return estadoComercial
  }
  return getNosisSemaphoreLabelUpper(estadoNosis ?? "unknown")
}

/**
 * @param {"good" | "medium" | "risky" | "unknown"} estado
 * @returns {number}
 */
export function mapEstadoToScore(estado) {
  if (estado === "good") return 85
  if (estado === "medium") return 65
  if (estado === "risky") return 35
  return 50
}

/**
 * @param {Record<string, unknown> | null | undefined} nosisDoc
 * @param {unknown} [creditPolicy]
 */
export function analyzeNosisReport(nosisDoc, creditPolicy) {
  const policy = resolveCreditPolicy(creditPolicy)
  const nosisConfig = policy.configuracionNosis
  if (!nosisDoc || !isNosisReportPresent(nosisDoc)) {
    return {
      disponible: false,
      confirmado: false,
      scoreNosis: null,
      scoreSource: /** @type {NosisScoreSource | null} */ (null),
      scoreSourceLabel: null,
      nosisAnalisis: null,
      estadoComercial: null,
      rating: null,
      estadoNosis: /** @type {NosisSemaphore} */ ("unknown"),
      indicadores: nosisDocToIndicators(null),
      alertas: [],
      conclusion: "Sin informe NOSIS cargado.",
      comentarioAutomatico: null,
      storageDisabled: true,
      hasDownloadUrl: false,
      downloadUrl: null,
      pdfDisplayLabel: null,
      status: /** @type {const} */ ("No cargado"),
    }
  }

  const parsedData = nosisParsedDataFromDoc(nosisDoc)
  const indicadores = nosisDocToIndicators(nosisDoc)
  const confirmado = hasConfirmedNosisIndicators(nosisDoc)

  const indicadoresRow =
    nosisDoc.indicadores && typeof nosisDoc.indicadores === "object"
      ? /** @type {Record<string, unknown>} */ (nosisDoc.indicadores)
      : null

  console.log("NOSIS ANALYSIS DOC USED", {
    docId: nosisDoc.id ?? nosisDoc.firestoreId ?? null,
    fechaCarga: formatNosisFechaCarga(nosisDoc),
    consultasParsedData: parsedData?.consultas?.ultimos4Meses ?? null,
    consultasIndicadores:
      indicadores.consultasUltimos4Meses ??
      indicadoresRow?.consultasUltimos4Meses ??
      null,
    consultasTopLevel: nosisDoc.consultasUltimos4Meses ?? null,
    hasParsedData: Boolean(nosisDoc.parsedData),
    validationStatus: nosisDoc.validationStatus ?? null,
  })

  const { scoreNosis, scoreSource, nosisAnalisis } = resolveNosisScore(
    nosisDoc,
    indicadores,
    parsedData
  )
  const estadoComercial = nosisAnalisis?.estado ?? null

  const cantidadCheques = parseNosisNumber(indicadores.cantidadCheques)
  const montoCheques = parseNosisNumber(indicadores.montoCheques)
  const chequesFromParsed = parsedData?.cheques
  const chequesHistorico = {
    parsed: Boolean(
      chequesFromParsed?.historicoParsed ?? indicadores.chequesHistoricoParsed
    ),
    rechazados:
      chequesFromParsed?.rechazados ??
      parseNosisNumber(indicadores.chequesRechazadosTotal),
    abonados:
      chequesFromParsed?.recuperados ??
      parseNosisNumber(indicadores.chequesAbonados),
    pendientes:
      chequesFromParsed?.pendientes ??
      parseNosisNumber(indicadores.chequesPendientes),
    montoRechazado:
      chequesFromParsed?.montoRechazado ??
      parseNosisNumber(indicadores.montoRechazadoTotal),
    montoAbonado:
      chequesFromParsed?.montoRecuperado ??
      parseNosisNumber(indicadores.montoAbonado),
    montoPendiente:
      chequesFromParsed?.montoPendiente ??
      parseNosisNumber(indicadores.montoPendiente),
  }

  const consultas =
    normalizeConsultasUltimos4Meses(parsedData?.consultas?.ultimos4Meses) ??
    normalizeConsultasUltimos4Meses(indicadores.consultasUltimos4Meses) ??
    normalizeConsultasUltimos4Meses(
      /** @type {Record<string, unknown>} */ (nosisDoc.indicadores)?.consultasUltimos4Meses
    ) ??
    normalizeConsultasUltimos4Meses(
      /** @type {Record<string, unknown>} */ (nosisDoc).consultasUltimos4Meses
    )

  console.log("NOSIS ANALYSIS CONSULTAS", {
    consultas,
    parsedDataConsultas: parsedData?.consultas?.ultimos4Meses ?? null,
    rawIndicadores: indicadores.consultasUltimos4Meses,
    rawDoc: /** @type {Record<string, unknown>} */ (nosisDoc).consultasUltimos4Meses,
  })

  const consultasComercialComentario = consultas?.total
    ? getConsultasComercialComentario(consultas.total)
    : null

  const semFromEstado = estadoComercialToSemaphore(estadoComercial)
  const estadoNosisResolved =
    semFromEstado ?? getNosisSemaphore(scoreNosis, nosisConfig)
  const officialFromPdf = scoreSource === "informe"
  const publishScore = confirmado || officialFromPdf

  const analysis = {
    disponible: true,
    confirmado,
    scoreNosis: publishScore ? scoreNosis : null,
    scoreSource: publishScore ? scoreSource : null,
    scoreSourceLabel: publishScore ? getNosisScoreSourceLabel(scoreSource) : null,
    nosisAnalisis: publishScore ? nosisAnalisis : null,
    estadoComercial: publishScore ? estadoComercial : null,
    rating: publishScore ? getNosisRatingLabel(scoreNosis) : null,
    estadoNosis: publishScore
      ? /** @type {NosisSemaphore} */ (estadoNosisResolved)
      : /** @type {NosisSemaphore} */ ("unknown"),
    indicadores,
    cantidadCheques,
    montoCheques,
    chequesHistorico,
    consultas,
    consultasComercialComentario,
    situacionBcra:
      parsedData?.bcra?.situacion ?? indicadores.situacionBcra ?? null,
    juiciosConcursos:
      Boolean(parsedData?.juicios?.detectado || parsedData?.concursos?.existe) ||
      indicadores.juiciosConcursos,
    parsedData,
    alertas: buildNosisAlertas(indicadores),
    comentarioAutomatico: publishScore
      ? estadoComercial ?? getNosisComentarioAutomatico(scoreNosis)
      : null,
    conclusion: publishScore
      ? buildNosisConclusion(indicadores, scoreNosis)
      : "Informe NOSIS pendiente de confirmación de indicadores.",
    storageDisabled: isNosisStorageDisabled(nosisDoc),
    hasDownloadUrl: hasNosisDownloadUrl(nosisDoc),
    downloadUrl: hasNosisDownloadUrl(nosisDoc)
      ? String(nosisDoc.downloadURL ?? nosisDoc.url ?? "")
      : null,
    pdfDisplayLabel: getNosisPdfDisplayLabel(nosisDoc, USE_FIREBASE_STORAGE),
    status: confirmado ? "Confirmado" : "Pendiente",
  }

  return analysis
}
