import {
  parseNosisIndicatorsFromText,
  extractHistoricoTotalActual,
  extractConsultasSeguimientosFromText,
  extractConsultasTotalesMensualFromText,
} from "@/lib/parseNosisPdf"
import {
  normalizeConsultasUltimos4Meses,
  parseNosisNumber,
} from "@/lib/nosisModel"
import { buildNosisAnalisisFromPdfText } from "@/lib/nosisOfficialAnalysis"

/** @typedef {import("@/lib/nosisModel").ConsultasUltimos4Meses} ConsultasUltimos4Meses */

/**
 * @typedef {Object} NosisFullReport
 * @property {Object} identificacion
 * @property {string | null} identificacion.razonSocial
 * @property {string | null} identificacion.cuit
 * @property {string | null} identificacion.fechaInforme
 * @property {Object} bcra
 * @property {string | null} bcra.situacion
 * @property {boolean} bcra.moraVigente
 * @property {number | null} bcra.entidades
 * @property {string | null} bcra.deudaTotal
 * @property {Object} cheques
 * @property {number | null} cheques.rechazados
 * @property {number | null} cheques.recuperados
 * @property {number | null} cheques.pendientes
 * @property {number | null} cheques.montoRechazado
 * @property {number | null} cheques.montoRecuperado
 * @property {number | null} cheques.montoPendiente
 * @property {number | null} cheques.impagos
 * @property {boolean} cheques.historicoParsed
 * @property {Record<string, unknown> | null} cheques.historico
 * @property {Object} consultas
 * @property {ConsultasUltimos4Meses | null} consultas.ultimos4Meses
 * @property {Partial<Record<"jun26" | "may26" | "abr26" | "mar26" | "feb26" | "ene26", number>> | null} [consultas.mensual]
 * @property {Record<string, unknown> | null} consultas.historico
 * @property {Array<Record<string, unknown>>} consultas.detalleMensual
 * @property {import("@/lib/nosisModel").ConsultasSeguimientosTable | null} [consultasSeguimientos]
 * @property {Object} referencias
 * @property {number | null} referencias.negativas
 * @property {string[]} referencias.detalleNegativas
 * @property {Object} juicios
 * @property {number | null} juicios.cantidad
 * @property {string | null} juicios.monto
 * @property {boolean} juicios.detectado
 * @property {Object} concursos
 * @property {boolean} concursos.existe
 * @property {Object} actividad
 * @property {string | null} actividad.antiguedad
 * @property {number | null} actividad.empleados
 * @property {number | null} actividad.sucursales
 * @property {string | null} actividad.rubro
 * @property {string[]} observaciones
 * @property {Array<import("@/lib/nosisModel").NosisSociedadEntry>} sociedades
 * @property {import("@/lib/nosisOfficialAnalysis").NosisAnalisis | null} analisis
 * @property {Record<string, string>} rawSections
 */

const FULL_SECTION_HEADERS = [
  { key: "identificacion", pattern: /datos\s+identificatorios|identificaci[oó]n\s+del\s+sujeto/i },
  { key: "bcra", pattern: /central\s+de\s+deudores|situaci[oó]n\s*(?:en\s*)?(?:el\s*)?bcra/i },
  { key: "chequesRechazados", pattern: /cheques?\s*rechazados?/i },
  { key: "chequesImpagos", pattern: /cheques?\s*impagos?|multas?\s*impagas?/i },
  { key: "historicoCheques", pattern: /estad[ií]stica\s+hist[oó]rica/i },
  { key: "consultas", pattern: /consultas\s+y\s+seguimientos?/i },
  { key: "referencias", pattern: /referencias?\s+(?:comerciales?|negativas?)/i },
  { key: "mora", pattern: /\bmora\b/i },
  { key: "juicios", pattern: /juicios?\s*(?:y\s*)?(?:demandas?|laborales?)?/i },
  { key: "concursos", pattern: /concursos?\s*(?:y\s*)?(?:quiebras?|preventivos?)?/i },
  { key: "actividad", pattern: /actividad\s+(?:econ[oó]mica|principal)|datos\s+de\s+actividad/i },
  { key: "observaciones", pattern: /observaciones?\s+(?:relevantes|generales|del\s+informe)?/i },
  { key: "sociedades", pattern: /\bsociedades\b/i },
]

/**
 * @returns {NosisFullReport}
 */
export function emptyNosisFullReport() {
  return {
    identificacion: {
      razonSocial: null,
      cuit: null,
      fechaInforme: null,
    },
    bcra: {
      situacion: null,
      moraVigente: false,
      entidades: null,
      deudaTotal: null,
    },
    cheques: {
      rechazados: null,
      recuperados: null,
      pendientes: null,
      montoRechazado: null,
      montoRecuperado: null,
      montoPendiente: null,
      impagos: null,
      historicoParsed: false,
      historico: null,
    },
    consultas: {
      ultimos4Meses: null,
      mensual: null,
      historico: null,
      detalleMensual: [],
    },
    consultasSeguimientos: null,
    referencias: {
      negativas: null,
      detalleNegativas: [],
    },
    juicios: {
      cantidad: null,
      monto: null,
      detectado: false,
    },
    concursos: {
      existe: false,
    },
    actividad: {
      antiguedad: null,
      empleados: null,
      sucursales: null,
      rubro: null,
    },
    observaciones: [],
    sociedades: [],
    analisis: null,
    rawSections: {},
  }
}

/**
 * @param {string} text
 * @returns {Record<string, string>}
 */
function extractAllNosisSections(text) {
  /** @type {Array<{ key: string; index: number }>} */
  const hits = []

  for (const header of FULL_SECTION_HEADERS) {
    const flags = header.pattern.flags.includes("g")
      ? header.pattern.flags
      : `${header.pattern.flags}g`
    const regex = new RegExp(header.pattern.source, flags)

    for (const match of text.matchAll(regex)) {
      if (typeof match.index === "number") {
        hits.push({ key: header.key, index: match.index })
      }
    }
  }

  hits.sort((a, b) => a.index - b.index)

  /** @type {Record<string, string>} */
  const sections = {}

  for (let i = 0; i < hits.length; i++) {
    const current = hits[i]
    const next = hits[i + 1]
    const end = next ? next.index : text.length
    const chunk = text.slice(current.index, end)

    sections[current.key] = sections[current.key]
      ? `${sections[current.key]}\n${chunk}`
      : chunk
  }

  return sections
}

/**
 * @param {string | null | undefined} raw
 * @returns {number | null}
 */
function parseOptionalNumber(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return null
  }
  const n = parseNosisNumber(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * @param {string} text
 * @param {Record<string, string>} sections
 */
function extractIdentificacion(text, sections) {
  const scope = sections.identificacion || text.slice(0, 4000)

  const cuitMatch =
    text.match(/(?:CUIT|C\.U\.I\.T\.?)\s*[:\-]?\s*(\d{2}[-\s]?\d{8}[-\s]?\d)/i) ??
    text.match(/\b(\d{2}-\d{8}-\d)\b/) ??
    text.match(/\b(\d{11})\b/)

  const razonMatch =
    scope.match(/Raz[oó]n\s+Social\s*[:\-]?\s*([^\n]+)/i) ??
    scope.match(/Denominaci[oó]n\s*[:\-]?\s*([^\n]+)/i) ??
    text.slice(0, 800).match(/(?:Informe\s+(?:de\s+)?(?:NOSIS|Central\s+Comercial))\s*\n?\s*([^\n]{4,120})/i)

  const fechaMatch =
    text.match(
      /(?:Fecha\s+(?:del\s+)?(?:Informe|Consulta)|Informe\s+(?:del|de))\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
    ) ??
    text.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\b/)

  return {
    razonSocial: razonMatch?.[1]?.trim() ?? null,
    cuit: cuitMatch?.[1]?.replace(/\s/g, "") ?? null,
    fechaInforme: fechaMatch?.[1]?.trim() ?? null,
  }
}

/**
 * @param {string} text
 * @param {Record<string, string>} sections
 * @param {import("@/lib/nosisModel").NosisIndicators} indicators
 */
function extractBcraDetail(text, sections, indicators) {
  const scope = sections.bcra || text

  const entidadesMatch = scope.match(
    /(?:Ent(?:idades)?\.?|Cant(?:idad)?\.?\s*(?:de\s*)?Ent(?:idades)?\.?)\s*[:\-]?\s*(\d+)/i
  )
  const deudaMatch = scope.match(
    /(?:Deuda\s+Total|Monto\s+Total|Total\s+(?:de\s+)?Deuda)\s*[:\-]?\s*\$?\s*([\d.,]+(?:\s*(?:MM|millones?|mil))?)/i
  )

  return {
    situacion: indicators.situacionBcra || null,
    moraVigente: Boolean(indicators.moraVigente),
    entidades: entidadesMatch ? Number(entidadesMatch[1]) : null,
    deudaTotal: deudaMatch?.[1]?.trim() ?? null,
  }
}

/**
 * @param {import("@/lib/nosisModel").NosisIndicators} indicators
 * @param {ReturnType<typeof extractHistoricoTotalActual>} historicoExtraction
 */
function buildChequesBlock(indicators, historicoExtraction) {
  const historicoParsed = historicoExtraction?.parsed ?? null

  const rechazados =
    historicoParsed?.rechazados ??
    parseOptionalNumber(indicators.chequesRechazadosTotal) ??
    parseOptionalNumber(indicators.cantidadCheques)
  const recuperados =
    historicoParsed?.abonados ??
    parseOptionalNumber(indicators.chequesAbonados)
  const pendientes =
    historicoParsed?.pendientes ??
    parseOptionalNumber(indicators.chequesPendientes) ??
    parseOptionalNumber(indicators.cantidadCheques)
  const montoRechazado =
    historicoParsed?.montoRechazado ??
    parseOptionalNumber(indicators.montoRechazadoTotal) ??
    parseOptionalNumber(indicators.montoCheques)
  const montoRecuperado =
    historicoParsed?.montoAbonado ??
    parseOptionalNumber(indicators.montoAbonado)
  const montoPendiente =
    historicoParsed?.montoPendiente ??
    parseOptionalNumber(indicators.montoPendiente) ??
    parseOptionalNumber(indicators.montoCheques)

  return {
    rechazados,
    recuperados,
    pendientes,
    montoRechazado,
    montoRecuperado,
    montoPendiente,
    impagos: parseOptionalNumber(indicators.chequesImpagos),
    historicoParsed: Boolean(indicators.chequesHistoricoParsed),
    historico: historicoParsed
      ? {
          ...historicoParsed,
          rowSlice: historicoExtraction?.rowSlice ?? null,
        }
      : null,
  }
}

/**
 * @param {string} consultasSection
 * @returns {Array<Record<string, unknown>>}
 */
function extractConsultasDetalleMensual(consultasSection) {
  if (!consultasSection) {
    return []
  }

  const lines = consultasSection.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const entityPattern =
    /^(ent\.?\s*bancarias|ent\.?\s*financieras|comerc\.|indust\.|serv\.|totales)\b/i

  /** @type {Array<Record<string, unknown>>} */
  const rows = []

  for (const line of lines) {
    if (!entityPattern.test(line)) {
      continue
    }

    const cells = line.includes("\t")
      ? line.split("\t").map((c) => c.trim()).filter(Boolean)
      : /\s{2,}/.test(line)
        ? line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean)
        : line.split(/\s+/).filter(Boolean)

    if (cells.length >= 2) {
      rows.push({
        rubro: cells[0],
        valores: cells.slice(1),
        raw: line,
      })
    }
  }

  return rows
}

/**
 * @param {import("@/lib/nosisModel").NosisIndicators} indicators
 * @param {Record<string, string>} sections
 */
function buildConsultasBlock(indicators, sections, text) {
  const consultasSection = sections.consultas ?? ""
  const segIdx = consultasSection.search(/seguimientos\s+permanentes/i)
  const consultasTableText =
    segIdx > 0 ? consultasSection.slice(0, segIdx) : consultasSection
  const mensual = extractConsultasTotalesMensualFromText(text)

  return {
    ultimos4Meses: normalizeConsultasUltimos4Meses(
      indicators.consultasUltimos4Meses
    ),
    mensual,
    historico: null,
    detalleMensual: extractConsultasDetalleMensual(consultasTableText),
  }
}

/**
 * @param {string} text
 * @param {Record<string, string>} sections
 */
function extractReferencias(text, sections) {
  const scope = sections.referencias || text
  const negativasMatch = scope.match(
    /(?:referencias?\s*)?negativas?\s*[:\-]?\s*(\d+)/i
  )

  /** @type {string[]} */
  const detalleNegativas = []

  for (const line of scope.split(/\r?\n/)) {
    if (/negativ/i.test(line) && line.trim().length > 8) {
      detalleNegativas.push(line.trim())
    }
  }

  return {
    negativas: negativasMatch ? Number(negativasMatch[1]) : null,
    detalleNegativas: detalleNegativas.slice(0, 20),
  }
}

/**
 * @param {string} text
 * @param {Record<string, string>} sections
 */
function extractJuiciosDetail(text, sections) {
  const scope = sections.juicios || text

  const negative =
    /sin\s+juicios?|no\s+(?:registra|posee|tiene)\s+juicios?|juicios?\s*[:\-]?\s*(?:no|sin|0|cero)/i.test(
      scope
    )

  const cantidadMatch = scope.match(
    /(?:cant(?:idad)?\.?|total|n[°º]?)\s*[:\-]?\s*(\d+)/i
  )
  const montoMatch = scope.match(
    /(?:monto|importe)\s*[:\-]?\s*\$?\s*([\d.,]+(?:\s*(?:MM|millones?|mil))?)/i
  )

  const keywordDetected = /\bjuicios?\b|\bdemanda\b|\bexpediente\b/i.test(scope)

  return {
    cantidad: cantidadMatch ? Number(cantidadMatch[1]) : null,
    monto: montoMatch?.[1]?.trim() ?? null,
    detectado: !negative && keywordDetected,
  }
}

/**
 * @param {string} text
 * @param {Record<string, string>} sections
 */
function extractConcursosDetail(text, sections) {
  const scope = sections.concursos || text

  const negative =
    /sin\s+concursos?|no\s+(?:registra|posee|tiene)\s+concursos?|concursos?\s*[:\-]?\s*(?:no|sin|0|cero)/i.test(
      scope
    )

  const existe =
    !negative && /\bconcursos?\b|\bquiebra\b|\bconcurso\s+preventivo\b/i.test(scope)

  return { existe }
}

/**
 * @param {string} text
 * @param {Record<string, string>} sections
 */
function extractActividad(text, sections) {
  const scope = sections.actividad || text

  const antiguedadMatch = scope.match(
    /(?:Antig[uü]edad|Años?\s+(?:de\s+)?actividad)\s*[:\-]?\s*([^\n]+)/i
  )
  const empleadosMatch = scope.match(
    /(?:Empleados|Personal|N[°º]?\s*(?:de\s+)?Empleados)\s*[:\-]?\s*(\d+)/i
  )
  const sucursalesMatch = scope.match(
    /(?:Sucursales|Locales)\s*[:\-]?\s*(\d+)/i
  )
  const rubroMatch = scope.match(
    /(?:Actividad\s+Principal|Rubro|CIIU)\s*[:\-]?\s*([^\n]+)/i
  )

  return {
    antiguedad: antiguedadMatch?.[1]?.trim() ?? null,
    empleados: empleadosMatch ? Number(empleadosMatch[1]) : null,
    sucursales: sucursalesMatch ? Number(sucursalesMatch[1]) : null,
    rubro: rubroMatch?.[1]?.trim() ?? null,
  }
}

/**
 * @param {string} text
 * @param {Record<string, string>} sections
 * @returns {string[]}
 */
function extractObservacionesList(text, sections) {
  const scope = sections.observaciones || ""
  if (!scope.trim()) {
    return []
  }

  return scope
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 10 && !/^observaciones?\b/i.test(line))
    .slice(0, 30)
}

/**
 * @typedef {import("@/lib/nosisModel").NosisSociedadEntry} NosisSociedadEntry
 */

/**
 * @param {string} block
 * @returns {NosisSociedadEntry | null}
 */
function parseSociedadBlock(block) {
  const cleaned = block
    .replace(/\bSOCIEDADES\b/gi, "")
    .replace(/NOSIS\.Manager[\s\S]*$/i, "")
    .replace(/© Copyright[\s\S]*$/i, "")
    .trim()

  if (cleaned.length < 20) {
    return null
  }

  const fechaPublicacion =
    cleaned.match(/Fecha\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1]?.trim() ?? null
  const constitucion =
    cleaned.match(/CONSTITUCI[ÓO]N\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1]?.trim() ??
    null
  const fuente =
    cleaned.match(/Fuente:\s*([^\n]+)/i)?.[1]?.trim() ?? null
  const domicilio =
    cleaned.match(/\d+\.\-\s*((?:[^\.]|\.){5,120}?)(?:\d+\.\-|\.\s+\d+\.\-)/i)?.[1]?.trim() ??
    cleaned.match(/\d+\.\-\s*([^\.]{8,120}\.)/i)?.[1]?.trim() ??
    null

  let razonSocial = null
  const razonMatch =
    cleaned.match(
      /([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9\s.&\-]{2,80}?)\s+CONSTITUCI[ÓO]N\s*:\s*\d/i
    ) ??
    cleaned.match(
      /\d+\.\-\s*([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9\s.&\-]{2,80}?)\s*\./i
    )
  if (razonMatch?.[1]) {
    razonSocial = razonMatch[1].replace(/\s+/g, " ").trim()
  }

  let detalle = cleaned
    .replace(/^Fecha\s*:[^\n]*\n?/i, "")
    .replace(/Fuente:[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim()

  if (razonSocial) {
    detalle = detalle.replace(
      new RegExp(`^${razonSocial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"),
      ""
    )
  }

  if (!razonSocial && !constitucion && !fuente && detalle.length < 40) {
    return null
  }

  return {
    razonSocial,
    fechaPublicacion,
    constitucion,
    domicilio,
    fuente,
    detalle: detalle.length > 0 ? detalle : null,
  }
}

/**
 * @param {string} text
 * @param {Record<string, string>} sections
 * @returns {NosisSociedadEntry[]}
 */
function extractSociedades(text, sections) {
  let scope = sections.sociedades ?? ""

  if (!scope.trim()) {
    const idx = text.search(/\bSOCIEDADES\b/i)
    if (idx >= 0) {
      scope = text.slice(idx, idx + 20000)
    }
  }

  if (!scope.trim()) {
    return []
  }

  scope = scope.split(/NOSIS\.Manager|© Copyright/i)[0] ?? scope

  const blocks = scope
    .split(/(?=Fecha\s*:\s*\d{1,2}\/\d{1,2}\/\d{4})/i)
    .map((block) => block.trim())
    .filter(Boolean)

  /** @type {NosisSociedadEntry[]} */
  const parsed = []

  for (const block of blocks) {
    const entry = parseSociedadBlock(block)
    if (entry) {
      parsed.push(entry)
    }
  }

  if (parsed.length === 0) {
    const fallback = parseSociedadBlock(scope)
    if (fallback) {
      parsed.push(fallback)
    }
  }

  return parsed
}

/**
 * Parsea el informe NOSIS completo desde el texto extraído del PDF.
 *
 * @param {string} text
 * @returns {NosisFullReport}
 */
export function parseNosisFullReport(text) {
  if (!text || typeof text !== "string") {
    const empty = emptyNosisFullReport()
    console.log("NOSIS FULL REPORT", empty)
    return empty
  }

  const rawSections = extractAllNosisSections(text)
  const indicators = parseNosisIndicatorsFromText(text)
  const historicoExtraction = extractHistoricoTotalActual(text)

  const analisis = buildNosisAnalisisFromPdfText(text)

  const report = {
    identificacion: extractIdentificacion(text, rawSections),
    bcra: extractBcraDetail(text, rawSections, indicators),
    cheques: buildChequesBlock(indicators, historicoExtraction),
    consultas: buildConsultasBlock(indicators, rawSections, text),
    consultasSeguimientos: extractConsultasSeguimientosFromText(text),
    referencias: extractReferencias(text, rawSections),
    juicios: extractJuiciosDetail(text, rawSections),
    concursos: extractConcursosDetail(text, rawSections),
    actividad: extractActividad(text, rawSections),
    observaciones: extractObservacionesList(text, rawSections),
    sociedades: extractSociedades(text, rawSections),
    analisis,
    rawSections,
  }

  console.log("NOSIS FULL REPORT", report)
  return report
}
