import { EMPTY_NOSIS_INDICATORS } from "@/lib/nosisModel"

/** @typedef {{ label: string; regex: string; match: string; value: unknown }} NosisParserMatchLog */

const SECTION_HEADERS = [
  { key: "chequesRechazados", pattern: /cheques?\s*rechazados?/i },
  { key: "chequesImpagos", pattern: /cheques?\s*impagos?/i },
  { key: "mora", pattern: /\bmora\b/i },
  { key: "juicios", pattern: /juicios?/i },
  { key: "concursos", pattern: /concursos?/i },
]

const NEGATIVE_CONTEXT =
  /\b(?:sin|no\s+(?:registra|posee|tiene|existen|se\s+inform|hay|figura)|0\s+cheques?|cero\s+cheques?|no\s+registra)\b/i

const CONSULTAS_BLOCK_END_MARKER = /seguimientos\s+permanentes/i

/**
 * @param {Array<{ str?: string; transform?: number[] }>} items
 * @returns {string}
 */
function itemsToTextWithLineBreaks(items) {
  let lastY = /** @type {number | null} */ (null)
  const parts = []

  for (const item of items) {
    if (!("str" in item) || !item.str) {
      continue
    }

    const y = item.transform?.[5] ?? null
    let separator = " "

    if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
      separator = "\n"
    }

    if (parts.length > 0) {
      parts.push(separator)
    }

    parts.push(item.str)
    if (y !== null) {
      lastY = y
    }
  }

  return parts.join("")
}

/**
 * @param {File} file
 * @returns {Promise<import("pdfjs-dist").PDFDocumentProxy>}
 */
async function loadNosisPdfDocument(file) {
  const pdfjsLib = await import("pdfjs-dist/webpack")
  const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfjsWorker?.default?.toString?.() ||
    (typeof pdfjsWorker === "string" ? pdfjsWorker : pdfjsWorker.toString())

  const arrayBuffer = await file.arrayBuffer()
  return pdfjsLib.getDocument({ data: arrayBuffer }).promise
}

/**
 * @param {Array<{ str?: string; transform?: number[] }>} items
 * @param {number} [yTolerance=4]
 * @returns {Array<{ y: number; cells: Array<{ x: number; str: string }>; text: string }>}
 */
function groupPdfTextItemsIntoRows(items, yTolerance = 4) {
  const positioned = items
    .filter((item) => item.str?.trim())
    .map((item) => ({
      str: item.str.trim(),
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
    }))

  positioned.sort((a, b) => b.y - a.y || a.x - b.x)

  /** @type {Array<{ y: number; cells: Array<{ x: number; str: string }>; text?: string }>} */
  const rows = []

  for (const item of positioned) {
    let row = rows.find((entry) => Math.abs(entry.y - item.y) <= yTolerance)
    if (!row) {
      row = { y: item.y, cells: [] }
      rows.push(row)
    }
    row.cells.push({ x: item.x, str: item.str })
  }

  for (const row of rows) {
    row.cells.sort((a, b) => a.x - b.x)
    row.text = row.cells.map((cell) => cell.str).join("   ")
  }

  return /** @type {Array<{ y: number; cells: Array<{ x: number; str: string }>; text: string }>} */ (
    rows
  )
}

/**
 * @param {{ cells: Array<{ x: number; str: string }> }} row
 * @returns {string}
 */
function consultasLineFromPdfRow(row) {
  return row.cells.map((cell) => cell.str).join("   ")
}

/**
 * @param {Array<{ text: string; cells: Array<{ x: number; str: string }> }>} rows
 * @returns {string[][]}
 */
function extractConsultasLineBlocksFromPdfRows(rows) {
  const segIdx = rows.findIndex((row) =>
    CONSULTAS_BLOCK_END_MARKER.test(row.text)
  )
  const scanRows = segIdx >= 0 ? rows.slice(0, segIdx) : rows
  /** @type {string[][]} */
  const blocks = []

  for (let i = 0; i < scanRows.length; i++) {
    const text = scanRows[i].text
    const isRubrosHeader = /^rubros\b/i.test(text)
    const isConsultasTitle =
      /\bconsultas\b/i.test(text) &&
      !/consultas\s+y\s+seguimientos/i.test(text) &&
      !CONSULTAS_TABLE_MARKERS.entBancarias.test(text)

    if (!isRubrosHeader && !isConsultasTitle) {
      continue
    }

    const startIdx = i
    /** @type {string[]} */
    const lines = []

    for (let j = startIdx; j < Math.min(scanRows.length, startIdx + 16); j++) {
      const row = scanRows[j]
      const line = consultasLineFromPdfRow(row)
      lines.push(line)

      if (/^totales\b/i.test(line.trim())) {
        const hasEntity =
          lines.some((entry) => CONSULTAS_TABLE_MARKERS.entBancarias.test(entry)) ||
          lines.some((entry) => CONSULTAS_TABLE_MARKERS.entFinancieras.test(entry)) ||
          lines.some((entry) => CONSULTAS_TABLE_MARKERS.comercIndust.test(entry))
        if (hasEntity) {
          blocks.push(lines)
        }
        break
      }
    }
  }

  return blocks
}

/**
 * Tabla CONSULTAS por coordenadas pdfjs (antes de Seguimientos Permanentes).
 *
 * @param {File} file
 * @returns {Promise<{ lines: string[]; block: string; pageNum: number } | null>}
 */
async function extractConsultasTableFromPdfCoordinates(file) {
  const pdf = await loadNosisPdfDocument(file)
  /** @type {{ lines: string[]; score: number; pageNum: number }[]} */
  const ranked = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const rows = groupPdfTextItemsIntoRows(content.items)
    const blocks = extractConsultasLineBlocksFromPdfRows(rows)

    for (const lines of blocks) {
      ranked.push({
        lines,
        score: scoreConsultasLinesCoherence(normalizeConsultasTableLines(lines)),
        pageNum,
      })
    }
  }

  if (ranked.length === 0) {
    return null
  }

  ranked.sort((a, b) => b.score - a.score)

  for (const candidate of ranked) {
    const lines = normalizeConsultasTableLines(candidate.lines)
    const mensual = extractConsultasTotalesMensualFromLines(lines)
    if (mensual || candidate.score >= 50) {
      return {
        lines,
        block: candidate.lines.join("\n"),
        pageNum: candidate.pageNum,
      }
    }
  }

  return null
}

/**
 * @param {import("@/lib/nosisFullReport").NosisFullReport} parsedData
 * @param {string[]} lines
 * @param {string | null} block
 * @returns {import("@/lib/nosisFullReport").NosisFullReport}
 */
function applyConsultasTableToParsedData(parsedData, lines, block) {
  const mensual = extractConsultasTotalesMensualFromLines(lines)
  const ultimos4Meses =
    mapUltimos4MesesFromTotalesMensual(mensual) ?? parsedData.consultas?.ultimos4Meses ?? null
  const consultasSeguimientos = parseConsultasSeguimientosFromLines(lines, block)

  return {
    ...parsedData,
    consultas: {
      ...parsedData.consultas,
      mensual: mensual ?? parsedData.consultas?.mensual ?? null,
      ultimos4Meses,
    },
    consultasSeguimientos:
      consultasSeguimientos ?? parsedData.consultasSeguimientos ?? null,
  }
}

/**
 * @param {File} file
 * @returns {Promise<import("@/lib/nosisModel").ConsultasUltimos4Meses | null>}
 */
async function extractConsultasFromPdfCoordinates(file) {
  const table = await extractConsultasTableFromPdfCoordinates(file)
  if (!table) {
    return null
  }

  return mapUltimos4MesesFromTotalesMensual(
    extractConsultasTotalesMensualFromLines(table.lines)
  )
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromPdfFile(file) {
  const pdf = await loadNosisPdfDocument(file)
  const parts = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    parts.push(itemsToTextWithLineBreaks(content.items))
  }

  return parts.join("\n")
}

/**
 * @param {string} raw
 * @returns {number}
 */
function parseArgAmount(raw) {
  if (!raw) {
    return 0
  }

  let text = String(raw).trim()
  let multiplier = 1

  if (/\b(?:millones?|MM)\b/i.test(text)) {
    multiplier = 1_000_000
  } else if (/\bmil\b/i.test(text) && !/\bmill/i.test(text)) {
    multiplier = 1_000
  }

  text = text
    .replace(/\$/g, "")
    .replace(/\b(?:millones?|MM|mil)\b/gi, "")
    .trim()

  if (/,\d{1,2}$/.test(text)) {
    text = text.replace(/\./g, "").replace(",", ".")
  } else {
    text = text.replace(/\./g, "")
  }

  const value = Number(text.replace(/[^\d.-]/g, ""))
  return Number.isFinite(value) ? value * multiplier : 0
}

/**
 * @param {string} raw
 * @returns {number}
 */
function parseIntegerCount(raw) {
  if (!raw) {
    return 0
  }

  const cleaned = String(raw).replace(/\./g, "").replace(/[^\d]/g, "")
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : 0
}

/**
 * @param {number} value
 * @returns {boolean}
 */
function isLikelyYear(value) {
  return value >= 2018 && value <= 2032 && String(value).length === 4
}

/**
 * Cantidad entera de la fila Total Actual (sin parseNosisNumber).
 *
 * @param {string} raw
 * @returns {number}
 */
function parseHistoricoCantidad(raw) {
  const value = Number(String(raw).trim().replace(/[^\d]/g, ""))
  return Number.isFinite(value) ? value : 0
}

/**
 * Monto formato US: 843,385,371.59 (sin parseNosisNumber / parseArgAmount).
 *
 * @param {string} raw
 * @returns {number}
 */
function parseHistoricoUsAmount(raw) {
  const cleaned = String(raw).trim().replace(/,/g, "")
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : 0
}

/**
 * Almacena montos históricos en formato compatible con parseNosisNumber (decimal con coma).
 *
 * @param {number} n
 * @returns {string}
 */
function historicoAmountToIndicatorString(n) {
  if (!Number.isFinite(n) || n <= 0) {
    return ""
  }
  const [entero, dec] = n.toFixed(2).split(".")
  return `${entero},${dec}`
}

/** Regex: Total Actual + 3 cantidades + 3 montos US (solo dentro de la fila). */
const TOTAL_ACTUAL_ROW_REGEX =
  /total\s*actual(?:\s*[\n\r]+|\s+)(\d{1,4})(?:\s*[\n\r]+|\s+)(\d{1,4})(?:\s*[\n\r]+|\s+)(\d{1,4})(?:\s*[\n\r]+|\s+)(\d{1,3}(?:,\d{3})*\.\d{2})(?:\s*[\n\r]+|\s+)(\d{1,3}(?:,\d{3})*\.\d{2})(?:\s*[\n\r]+|\s+)(\d{1,3}(?:,\d{3})*\.\d{2})/i

const HISTORICO_TABLE_REGEX =
  /estad[ií]stica\s*hist[oó]rica\s*de\s*cuentas?\s*de\s*personas?\s*jur[ií]dicas?/i

const US_AMOUNT_TOKEN_REGEX = /^\d{1,3}(?:,\d{3})*\.\d{2}$/
const QTY_TOKEN_REGEX = /^\d{1,4}$/

/**
 * @param {{
 *   rechazados: number;
 *   abonados: number;
 *   pendientes: number;
 *   montoRechazado: number;
 *   montoAbonado: number;
 *   montoPendiente: number;
 * }} parsed
 * @returns {boolean}
 */
function validateHistoricoParsed(parsed) {
  return (
    parsed.rechazados > 0 &&
    parsed.pendientes > 0 &&
    parsed.rechazados >= parsed.pendientes &&
    parsed.rechazados >= parsed.abonados &&
    parsed.montoRechazado > 0 &&
    parsed.montoPendiente > 0 &&
    parsed.montoRechazado >= parsed.montoPendiente &&
    parsed.montoPendiente >= parsed.montoAbonado
  )
}

/**
 * @param {string} rowSlice
 * @returns {{
 *   rechazados: number;
 *   abonados: number;
 *   pendientes: number;
 *   montoRechazado: number;
 *   montoAbonado: number;
 *   montoPendiente: number;
 * } | null}
 */
function parseHistoricoFromRowTokens(rowSlice) {
  const body = rowSlice.replace(/^total\s*actual/i, "").trim()
  const tokens = body.split(/[\s\n\r]+/).filter(Boolean)

  const quantities = []
  const amounts = []

  for (const token of tokens) {
    if (quantities.length < 3 && QTY_TOKEN_REGEX.test(token)) {
      const n = Number(token)
      if (Number.isFinite(n) && !isLikelyYear(n)) {
        quantities.push(n)
      }
      continue
    }

    if (amounts.length < 3 && US_AMOUNT_TOKEN_REGEX.test(token)) {
      amounts.push(parseHistoricoUsAmount(token))
    }

    if (quantities.length >= 3 && amounts.length >= 3) {
      break
    }
  }

  if (quantities.length < 3 || amounts.length < 3) {
    return null
  }

  return {
    rechazados: quantities[0],
    abonados: quantities[1],
    pendientes: quantities[2],
    montoRechazado: amounts[0],
    montoAbonado: amounts[1],
    montoPendiente: amounts[2],
  }
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function hasHistoricoPersonasJuridicasTable(text) {
  return HISTORICO_TABLE_REGEX.test(text)
}

/**
 * Extrae Total Actual de Estadística Histórica (última ocurrencia en el bloque).
 *
 * @param {string} text
 * @returns {{
 *   raw: RegExpMatchArray | null;
 *   rowSlice: string;
 *   parsed: {
 *     rechazados: number;
 *     abonados: number;
 *     pendientes: number;
 *     montoRechazado: number;
 *     montoAbonado: number;
 *     montoPendiente: number;
 *   } | null;
 * } | null}
 */
export function extractHistoricoTotalActual(text) {
  if (!text || typeof text !== "string") {
    return null
  }

  const tableMatch = text.match(HISTORICO_TABLE_REGEX)
  if (!tableMatch || typeof tableMatch.index !== "number") {
    return null
  }

  const block = text.slice(tableMatch.index, tableMatch.index + 8000)
  const totalMatches = [...block.matchAll(/total\s*actual/gi)]
  if (totalMatches.length === 0) {
    return { raw: null, rowSlice: "", parsed: null }
  }

  const lastTotal = totalMatches[totalMatches.length - 1]
  const rowStart = lastTotal.index ?? 0
  const rowSlice = block.slice(rowStart, rowStart + 600)

  const raw = rowSlice.match(TOTAL_ACTUAL_ROW_REGEX)

  /** @type {ReturnType<typeof parseHistoricoFromRowTokens>} */
  let parsed = null

  if (raw) {
    parsed = {
      rechazados: parseHistoricoCantidad(raw[1]),
      abonados: parseHistoricoCantidad(raw[2]),
      pendientes: parseHistoricoCantidad(raw[3]),
      montoRechazado: parseHistoricoUsAmount(raw[4]),
      montoAbonado: parseHistoricoUsAmount(raw[5]),
      montoPendiente: parseHistoricoUsAmount(raw[6]),
    }
  }

  if (!parsed || !validateHistoricoParsed(parsed)) {
    const fromTokens = parseHistoricoFromRowTokens(rowSlice)
    if (fromTokens && validateHistoricoParsed(fromTokens)) {
      parsed = fromTokens
    } else if (!parsed) {
      parsed = fromTokens
    }
  }

  return { raw, rowSlice, parsed }
}

/**
 * @param {import("@/lib/nosisModel").NosisIndicators} result
 * @param {{
 *   rechazados: number;
 *   abonados: number;
 *   pendientes: number;
 *   montoRechazado: number;
 *   montoAbonado: number;
 *   montoPendiente: number;
 * }} historico
 */
export function buildNosisIndicatorsFromHistorico(result, historico) {
  result.chequesHistoricoParsed = true
  result.chequesRechazadosTotal = String(historico.rechazados)
  result.chequesAbonados = String(historico.abonados)
  result.chequesPendientes = String(historico.pendientes)
  result.montoRechazadoTotal = historicoAmountToIndicatorString(
    historico.montoRechazado
  )
  result.montoAbonado = historicoAmountToIndicatorString(historico.montoAbonado)
  result.montoPendiente = historicoAmountToIndicatorString(historico.montoPendiente)

  result.cantidadCheques = String(historico.pendientes)
  result.montoCheques = historicoAmountToIndicatorString(historico.montoPendiente)
}

/**
 * @param {string} text
 * @returns {{
 *   rechazados: number;
 *   abonados: number;
 *   pendientes: number;
 *   montoRechazado: number;
 *   montoAbonado: number;
 *   montoPendiente: number;
 * } | null}
 */
export function parseHistoricoTotalActual(text) {
  const extraction = extractHistoricoTotalActual(text)
  return extraction?.parsed ?? null
}

/**
 * @param {number} n
 * @returns {string}
 */
function numberToIndicatorString(n) {
  if (!Number.isFinite(n) || n <= 0) {
    return ""
  }
  return String(Math.round(n))
}

/**
 * @param {string} text
 * @returns {Record<string, string>}
 */
function extractSections(text) {
  /** @type {Array<{ key: string; index: number; label: string }>} */
  const hits = []

  for (const header of SECTION_HEADERS) {
    const flags = header.pattern.flags.includes("g")
      ? header.pattern.flags
      : `${header.pattern.flags}g`
    const regex = new RegExp(header.pattern.source, flags)

    for (const match of text.matchAll(regex)) {
      if (typeof match.index === "number") {
        hits.push({
          key: header.key,
          index: match.index,
          label: match[0],
        })
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
 * @param {string} label
 * @param {RegExp} regex
 * @param {string} text
 * @param {NosisParserMatchLog[]} logs
 * @returns {RegExpMatchArray[]}
 */
function collectRegexMatches(label, regex, text, logs) {
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`
  const globalRegex = new RegExp(regex.source, flags)
  const matches = [...text.matchAll(globalRegex)]

  for (const match of matches) {
    logs.push({
      label,
      regex: regex.source,
      match: match[0],
      value: match[1] ?? match[0],
    })
  }

  return matches
}

/**
 * @param {string} sectionText
 * @param {NosisParserMatchLog[]} logs
 * @param {string} sectionLabel
 * @returns {{ cantidad: number; monto: number }}
 */
function extractChequesFromSection(sectionText, logs, sectionLabel) {
  let cantidad = 0
  let monto = 0

  const cantidadPatterns = [
    {
      label: `${sectionLabel}.cantidad.total`,
      regex:
        /(?:cantidad|total|n[°º]|nro\.?|cant\.?)\s*[:\-]?\s*(\d[\d.]*)/i,
    },
    {
      label: `${sectionLabel}.cantidad.cheques`,
      regex: /(\d[\d.]*)\s*cheques?\s*(?:rechazados?|impagos?)?/i,
    },
    {
      label: `${sectionLabel}.cantidad.rechazados`,
      regex: /(?:rechazados?|impagos?)\s*[:\-]?\s*(\d[\d.]*)/i,
    },
    {
      label: `${sectionLabel}.cantidad.cant`,
      regex: /\bcant(?:idad)?\.?\s*(\d[\d.]*)/i,
    },
  ]

  for (const { label, regex } of cantidadPatterns) {
    const matches = collectRegexMatches(label, regex, sectionText, logs)
    for (const match of matches) {
      cantidad = Math.max(cantidad, parseIntegerCount(match[1]))
    }
  }

  const montoPatterns = [
    {
      label: `${sectionLabel}.monto.total`,
      regex:
        /(?:monto|importe|total|acumulado|suma)\s*[:\-]?\s*\$?\s*([\d.,]+(?:\s*(?:MM|millones?|mil))?)/i,
    },
    {
      label: `${sectionLabel}.monto.pesos`,
      regex: /\$\s*([\d.,]+(?:\s*(?:MM|millones?|mil))?)/i,
    },
    {
      label: `${sectionLabel}.monto.importe`,
      regex:
        /(?:importe|monto)\s*(?:total|acumulado)?\s*[:\-]?\s*\$?\s*([\d.,]+)/i,
    },
  ]

  for (const { label, regex } of montoPatterns) {
    const matches = collectRegexMatches(label, regex, sectionText, logs)
    for (const match of matches) {
      monto = Math.max(monto, parseArgAmount(match[1]))
    }
  }

  return { cantidad, monto }
}

/**
 * @param {string} text
 * @param {NosisParserMatchLog[]} logs
 * @returns {boolean}
 */
function detectMoraVigente(text, logs) {
  const moraSection = extractSections(text).mora ?? text

  if (/sin\s*mora|no\s+(?:registra|posee|tiene)\s*mora|no\s+figura\s*mora/i.test(moraSection)) {
    logs.push({
      label: "mora.sin_registro",
      regex: "sin\\s*mora",
      match: moraSection.slice(0, 120),
      value: false,
    })
    return false
  }

  if (NEGATIVE_CONTEXT.test(moraSection) && !/\bmora\b/i.test(moraSection)) {
    logs.push({
      label: "mora.negativa",
      regex: NEGATIVE_CONTEXT.source,
      match: moraSection.slice(0, 120),
      value: false,
    })
    return false
  }

  const moraPatterns = [
    { label: "mora.vigente", regex: /mora\s*vigente\s*(?:si|s[ií]|con|detectada|activa)/i },
    { label: "mora.impaga", regex: /\bimpaga?s?\b/i },
    { label: "mora.keyword", regex: /\bmora\b/i },
  ]

  for (const { label, regex } of moraPatterns) {
    const matches = collectRegexMatches(label, regex, moraSection, logs)
    if (matches.length > 0) {
      const snippet = matches[0][0]
      if (/sin\s*mora|no\s+registra\s*mora|no\s+posee\s*mora/i.test(snippet)) {
        continue
      }
      return true
    }
  }

  return false
}

/**
 * @param {string} text
 * @param {NosisParserMatchLog[]} logs
 * @returns {boolean}
 */
function detectJuiciosConcursos(text, logs) {
  const sections = extractSections(text)
  const scope = [
    sections.juicios,
    sections.concursos,
    text,
  ]
    .filter(Boolean)
    .join("\n")

  const negativePatterns = [
    /sin\s+(?:juicios?|concursos?)/i,
    /no\s+(?:registra|posee|tiene)\s+(?:juicios?|concursos?)/i,
    /no\s+se\s+(?:registran|informan)\s+(?:juicios?|concursos?)/i,
    /(?:juicios?|concursos?)\s*[:\-]?\s*(?:no|sin|0|cero)/i,
  ]

  for (const regex of negativePatterns) {
    if (regex.test(scope)) {
      logs.push({
        label: "juicios.negativo",
        regex: regex.source,
        match: scope.match(regex)?.[0] ?? "",
        value: false,
      })
      return false
    }
  }

  const positivePatterns = [
    { label: "juicios.keyword", regex: /\bjuicios?\b/i },
    { label: "concursos.keyword", regex: /\bconcursos?\b/i },
    { label: "juicios.expediente", regex: /\bexpediente\b/i },
    { label: "juicios.demanda", regex: /\bdemanda\b/i },
  ]

  let found = false

  for (const { label, regex } of positivePatterns) {
    const matches = collectRegexMatches(label, regex, scope, logs)
    if (matches.length > 0) {
      found = true
    }
  }

  if (/\bimpaga?\b/i.test(scope)) {
    logs.push({
      label: "juicios.impaga",
      regex: "\\bimpaga?\\b",
      match: "Impaga",
      value: true,
    })
    found = true
  }

  return found
}

const CONSULTAS_SECTION_END_MARKERS = [
  /\bestad[ií]stica\s*hist[oó]rica\b/i,
  /\bcheques?\s*rechazados?\b/i,
  /\breferencias?\s*comerciales?\b/i,
  /\bjuicios?\b/i,
  /\bantecedentes?\b/i,
]

/** Marcadores de la tabla CONSULTAS (Rubros / entidades / fila Totales). */
const CONSULTAS_TABLE_MARKERS = {
  rubros: /\brubros\b/i,
  entBancarias: /ent\.?\s*bancarias?/i,
  entFinancieras: /ent\.?\s*financieras?/i,
  comercIndust: /comerc\.?,?\s*indust(?:\.|\s*y\s*serv)?/i,
  totales: /\btotales\b/i,
}


/**
 * Bloque tabla CONSULTAS (encabezado "CONSULTAS", no "Seguimientos Permanentes").
 * Corta estrictamente antes de "Seguimientos Permanentes".
 *
 * @param {string} text
 * @returns {{ block: string; lines: string[]; start: number } | null}
 */
function extractConsultasBlockFromText(text) {
  if (!text) {
    return null
  }

  const parentIdx = text.search(/\bconsultas\s+y\s+seguimientos\b/i)
  let sectionText =
    parentIdx >= 0 ? text.slice(parentIdx, parentIdx + 12000) : text
  const sectionOffset = parentIdx >= 0 ? parentIdx : 0

  const segRel = sectionText.search(CONSULTAS_BLOCK_END_MARKER)
  if (segRel >= 0) {
    sectionText = sectionText.slice(0, segRel)
  }

  if (CONSULTAS_BLOCK_END_MARKER.test(sectionText)) {
    return null
  }

  const start = findConsultasTableStartInScopedText(sectionText)
  if (start < 0) {
    return null
  }

  const block = sectionText.slice(start).trim()
  const lines = splitConsultasSectionLines(block)
  const hasTotalesRow = lines.some((line) =>
    /^totales\b/i.test(line.trim())
  )

  if (!hasTotalesRow) {
    return null
  }

  return {
    block,
    lines,
    start: sectionOffset + start,
  }
}

/**
 * @param {string} scopedText
 * @returns {number}
 */
function findConsultasTableStartInScopedText(scopedText) {
  if (CONSULTAS_BLOCK_END_MARKER.test(scopedText)) {
    const segIdx = scopedText.search(CONSULTAS_BLOCK_END_MARKER)
    scopedText = scopedText.slice(0, segIdx)
  }

  /** @type {number[]} */
  const starts = []

  for (const match of scopedText.matchAll(/\bconsultas\b/gi)) {
    const idx = match.index ?? 0
    if (/consultas\s+y\s+seguimientos/i.test(scopedText.slice(idx, idx + 40))) {
      continue
    }

    const window = scopedText.slice(idx, idx + 2200)
    if (
      CONSULTAS_TABLE_MARKERS.rubros.test(window) &&
      CONSULTAS_TABLE_MARKERS.totales.test(window) &&
      (CONSULTAS_TABLE_MARKERS.entBancarias.test(window) ||
        CONSULTAS_TABLE_MARKERS.entFinancieras.test(window) ||
        CONSULTAS_TABLE_MARKERS.comercIndust.test(window))
    ) {
      const rubrosInWindow = window.search(/\brubros\b/i)
      starts.push(rubrosInWindow >= 0 ? idx + rubrosInWindow : idx)
    }
  }

  if (starts.length > 0) {
    return Math.min(...starts)
  }

  const rubrosTotales = scopedText.match(
    /\brubros\b[\s\S]{0,2200}?\btotales\b/i
  )
  if (rubrosTotales && typeof rubrosTotales.index === "number") {
    return rubrosTotales.index
  }

  return -1
}

/**
 * @param {string} text
 * @param {number} start
 * @returns {string}
 */
function sliceConsultasSectionBlock(text, start) {
  const extracted = extractConsultasBlockFromText(text.slice(start))
  return extracted?.block ?? text.slice(start, Math.min(text.length, start + 5000))
}

/**
 * @param {string} sectionText
 * @returns {number}
 */
function scoreConsultasTableSection(sectionText) {
  let score = 0
  if (CONSULTAS_TABLE_MARKERS.rubros.test(sectionText)) {
    score += 4
  }
  if (CONSULTAS_TABLE_MARKERS.entBancarias.test(sectionText)) {
    score += 4
  }
  if (CONSULTAS_TABLE_MARKERS.entFinancieras.test(sectionText)) {
    score += 3
  }
  if (CONSULTAS_TABLE_MARKERS.comercIndust.test(sectionText)) {
    score += 3
  }
  if (CONSULTAS_TABLE_MARKERS.totales.test(sectionText)) {
    score += 4
  }
  const monthHeaderHits = CONSULTAS_MONTH_MARKERS.filter((pattern) =>
    pattern.test(sectionText)
  ).length
  if (monthHeaderHits >= 3) {
    score += 2
  }
  return score
}

/**
 * @param {string} sectionText
 * @returns {boolean}
 */
function isConsultasTableSection(sectionText) {
  return (
    CONSULTAS_TABLE_MARKERS.rubros.test(sectionText) &&
    CONSULTAS_TABLE_MARKERS.totales.test(sectionText) &&
    (CONSULTAS_TABLE_MARKERS.entBancarias.test(sectionText) ||
      CONSULTAS_TABLE_MARKERS.entFinancieras.test(sectionText) ||
      CONSULTAS_TABLE_MARKERS.comercIndust.test(sectionText))
  )
}

/**
 * @param {string[]} lines
 * @returns {number}
 */
function scoreConsultasLinesCoherence(lines) {
  const header = parseConsultasRubrosHeader(lines)
  const totalesRow = buildConsultasTotalesRow(lines)
  if (!header || !totalesRow?.columnIndexByMonth) {
    return 0
  }

  const entityLines = lines.filter(
    (line) =>
      CONSULTAS_TABLE_MARKERS.entBancarias.test(line) ||
      CONSULTAS_TABLE_MARKERS.entFinancieras.test(line) ||
      CONSULTAS_TABLE_MARKERS.comercIndust.test(line)
  )

  if (entityLines.length < 2) {
    return 0
  }

  let monthMatches = 0
  for (const monthKey of /** @type {ConsultasMonthKey[]} */ ([
    "may",
    "abr",
    "mar",
    "feb",
  ])) {
    const columnIndex = header.columnIndexByMonth[monthKey]
    const entitySum = entityLines.reduce((acc, line) => {
      const cells = splitConsultasTableCells(line)
      return acc + (parseConsultasTableCellValue(cells[columnIndex]) ?? 0)
    }, 0)
    const totalesValue = parseConsultasTableCellValue(
      totalesRow.totalesCells[columnIndex]
    )
    if (totalesValue !== null && entitySum === totalesValue) {
      monthMatches += 1
    }
  }

  const dataColumnCount = totalesRow.totalesCells.length - 1
  let widthScore = 0
  if (dataColumnCount >= 6 && dataColumnCount <= 8) {
    widthScore = 15
  } else if (dataColumnCount > 10) {
    widthScore = -60
  }

  return (
    monthMatches * 25 +
    scoreConsultasTableSection(lines.join("\n")) +
    (monthMatches === 4 ? 20 : 0) +
    widthScore
  )
}

/**
 * @param {string} text
 * @returns {{ sectionText: string; start: number; score: number; lines: string[] } | null}
 */
function findConsultasTableSection(text) {
  /** @type {{ sectionText: string; start: number; score: number; lines: string[] }[]} */
  const candidates = []

  const pushCandidate = (start) => {
    const sectionText = sliceConsultasSectionBlock(text, start)
    const lines = splitConsultasSectionLines(sectionText)
    const coherence = scoreConsultasLinesCoherence(lines)
    if (coherence <= 0 && !isConsultasTableSection(sectionText)) {
      return
    }
    candidates.push({
      sectionText,
      start,
      score: coherence > 0 ? coherence : scoreConsultasTableSection(sectionText),
      lines,
    })
  }

  for (const match of text.matchAll(/\bconsultas\b/gi)) {
    pushCandidate(match.index ?? 0)
  }

  const rubrosNearConsultas = text.search(/\bconsultas\b[\s\S]{0,200}\brubros\b/i)
  if (rubrosNearConsultas >= 0) {
    pushCandidate(rubrosNearConsultas)
  }

  if (candidates.length === 0) {
    return null
  }

  candidates.sort((a, b) => b.score - a.score)

  return candidates[0] ?? null
}

const CONSULTAS_MONTH_MARKERS = [
  /\bjun(?:[''`´\-\s]?\d{2})?/i,
  /\bmay(?:[''`´\-\s]?\d{2})?/i,
  /\babr(?:[''`´\-\s]?\d{2})?/i,
  /\bmar(?:[''`´\-\s]?\d{2})?/i,
  /\bfeb(?:[''`´\-\s]?\d{2})?/i,
  /\bene(?:[''`´\-\s]?\d{2})?/i,
]

/** @typedef {"may" | "abr" | "mar" | "feb"} ConsultasMonthKey */

/**
 * @param {string} sectionText
 * @returns {string[]}
 */
function splitConsultasSectionLines(sectionText) {
  return sectionText
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/**
 * Une filas partidas por pdfjs: "Rubros" + meses en la línea siguiente;
 * "Totales" + valores en la línea siguiente.
 *
 * @param {string[]} lines
 * @returns {string[]}
 */
function normalizeConsultasTableLines(lines) {
  /** @type {string[]} */
  const normalized = []

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    if (/^(?:mensuales|semestrales)\b/i.test(line.trim())) {
      continue
    }

    if (/^rubros\b/i.test(line)) {
      const headerCells = splitConsultasRubrosHeaderCells(line)
      const hasMonths = headerCells.some(
        (cell) =>
          consultasMonthKeyFromHeaderCell(cell) ||
          consultasSeguimientoColumnKeyFromHeaderCell(cell)
      )
      if (!hasMonths) {
        let j = i + 1
        while (
          j < lines.length &&
          /^(?:mensuales|semestrales)\b/i.test(lines[j].trim())
        ) {
          j++
        }
        if (j < lines.length) {
          const monthLine = lines[j]
          const monthHits = CONSULTAS_MONTH_MARKERS.filter((pattern) =>
            pattern.test(monthLine)
          ).length
          if (monthHits >= 2) {
            line = `${line}   ${monthLine}`
            i = j
          }
        }
      }
    }

    if (/^totales\s*$/i.test(line.trim()) && i + 1 < lines.length) {
      const next = lines[i + 1]
      const nextCells = splitConsultasTableCells(next)
      const numericCount = nextCells.filter(
        (cell) => parseConsultasTableCellValue(cell) !== null
      ).length
      if (numericCount >= 4) {
        line = `Totales   ${next}`
        i++
      }
    }

    const entityMarkers = [
      CONSULTAS_TABLE_MARKERS.entBancarias,
      CONSULTAS_TABLE_MARKERS.entFinancieras,
      CONSULTAS_TABLE_MARKERS.comercIndust,
    ]
    for (const marker of entityMarkers) {
      if (!marker.test(line) || i + 1 >= lines.length) {
        continue
      }
      const cells = splitConsultasTableCells(line)
      const hasNumbers = cells
        .slice(1)
        .some((cell) => parseConsultasTableCellValue(cell) !== null)
      if (hasNumbers) {
        break
      }
      const next = lines[i + 1]
      const nextNumericCount = splitConsultasTableCells(next).filter(
        (cell) => parseConsultasTableCellValue(cell) !== null
      ).length
      if (nextNumericCount >= 4) {
        line = `${line}   ${next}`
        i++
      }
      break
    }

    normalized.push(line)
  }

  return normalized
}

/**
 * Celdas separadas por espacios múltiples (formato típico pdfjs en NOSIS).
 * Si pdfjs usa un solo espacio (Totales 0 6 14…), hace fallback a split por espacio.
 *
 * @param {string} line
 * @returns {string[]}
 */
function splitConsultasTableCells(line) {
  if (line.includes("\t")) {
    return line.split("\t").map((cell) => cell.trim()).filter(Boolean)
  }

  if (/\s{2,}/.test(line)) {
    const wide = line.split(/\s{2,}/).map((cell) => cell.trim()).filter(Boolean)
    if (wide.length >= 2) {
      return wide
    }
  }

  return line.trim().split(/\s+/).filter(Boolean)
}

/**
 * @param {string} rubrosLine
 * @returns {string[]}
 */
function splitConsultasRubrosHeaderCells(rubrosLine) {
  const cells = splitConsultasTableCells(rubrosLine)
  const hasMonth = cells.some(
    (cell) =>
      consultasMonthKeyFromHeaderCell(cell) ||
      consultasSeguimientoColumnKeyFromHeaderCell(cell)
  )
  if (hasMonth) {
    return cells
  }
  return rubrosLine.trim().split(/\s+/).filter(Boolean)
}

/**
 * @param {string} totalesLine
 * @returns {string[]}
 */
function splitConsultasTotalesRowCells(totalesLine) {
  const trimmed = totalesLine.trim()
  const wide = trimmed.split(/\s{2,}/).map((cell) => cell.trim()).filter(Boolean)
  if (wide.length >= 5 && /^totales$/i.test(wide[0])) {
    return wide
  }

  const tight = trimmed.split(/\s+/).filter(Boolean)
  if (tight.length >= 5 && /^totales$/i.test(tight[0])) {
    return tight
  }

  return wide.length >= tight.length ? wide : tight
}

/**
 * @param {string} cell
 * @returns {ConsultasMonthKey | null}
 */
function consultasMonthKeyFromHeaderCell(cell) {
  const trimmed = cell.trim()
  if (/^may(?:[''`´\-\s]?\d{2})?$/i.test(trimmed)) {
    return "may"
  }
  if (/^abr(?:[''`´\-\s]?\d{2})?$/i.test(trimmed)) {
    return "abr"
  }
  if (/^mar(?:[''`´\-\s]?\d{2})?$/i.test(trimmed)) {
    return "mar"
  }
  if (/^feb(?:[''`´\-\s]?\d{2})?$/i.test(trimmed)) {
    return "feb"
  }
  return null
}

/** @typedef {"jun26" | "may26" | "abr26" | "mar26" | "feb26" | "ene26" | "total"} ConsultasSeguimientoColumnKey */

/** @typedef {Partial<Record<ConsultasSeguimientoColumnKey, number>>} ConsultasSeguimientoRow */

/**
 * @typedef {Object} ConsultasSeguimientosTable
 * @property {ConsultasSeguimientoRow | null} bancarias
 * @property {ConsultasSeguimientoRow | null} financieras
 * @property {ConsultasSeguimientoRow | null} comerciales
 * @property {ConsultasSeguimientoRow | null} totales
 */

const DEFAULT_SEGUIMIENTO_COLUMN_KEYS = /** @type {ConsultasSeguimientoColumnKey[]} */ ([
  "jun26",
  "may26",
  "abr26",
  "mar26",
  "feb26",
  "ene26",
  "total",
])

/**
 * @param {string} cell
 * @returns {ConsultasSeguimientoColumnKey | null}
 */
function consultasSeguimientoColumnKeyFromHeaderCell(cell) {
  const trimmed = cell.trim()
  if (/^tot(?:al)?\.?$/i.test(trimmed)) {
    return "total"
  }

  const monthMatch = trimmed.match(
    /^(ene|feb|mar|abr|may|jun)(?:[''`´.\-\s]*(\d{2}))?$/i
  )
  if (!monthMatch) {
    return null
  }

  const month = monthMatch[1].toLowerCase()
  const year = monthMatch[2] ?? "26"
  return /** @type {ConsultasSeguimientoColumnKey} */ (`${month}${year}`)
}

/**
 * @param {string[]} lines
 * @returns {{
 *   rubrosLine: string;
 *   headerCells: string[];
 *   columnIndexByKey: Partial<Record<ConsultasSeguimientoColumnKey, number>>;
 * } | null}
 */
function parseConsultasFullTableHeader(lines) {
  const rubrosLine = lines.find((line) => /^rubros\b/i.test(line.trim()))
  if (!rubrosLine) {
    return null
  }

  const headerCells = splitConsultasRubrosHeaderCells(rubrosLine)
  /** @type {Partial<Record<ConsultasSeguimientoColumnKey, number>>} */
  const columnIndexByKey = {}

  headerCells.forEach((cell, index) => {
    const key = consultasSeguimientoColumnKeyFromHeaderCell(cell)
    if (key) {
      columnIndexByKey[key] = index
    }
  })

  const monthKeys = Object.keys(columnIndexByKey).filter((key) => key !== "total")
  if (monthKeys.length < 4) {
    return null
  }

  return { rubrosLine, headerCells, columnIndexByKey }
}

/**
 * @param {string[]} cells
 * @param {{
 *   columnIndexByKey: Partial<Record<ConsultasSeguimientoColumnKey, number>>;
 * } | null} header
 * @returns {ConsultasSeguimientoRow | null}
 */
function mapCellsToConsultasSeguimientoRow(cells, header) {
  if (!cells.length) {
    return null
  }

  /** @type {ConsultasSeguimientoRow} */
  const row = {}

  if (header?.columnIndexByKey && Object.keys(header.columnIndexByKey).length > 0) {
    for (const [key, index] of Object.entries(header.columnIndexByKey)) {
      const value = parseConsultasTableCellValue(cells[index])
      if (value !== null) {
        row[/** @type {ConsultasSeguimientoColumnKey} */ (key)] = value
      }
    }
    return Object.keys(row).length > 0 ? row : null
  }

  for (let i = 0; i < DEFAULT_SEGUIMIENTO_COLUMN_KEYS.length; i++) {
    const value = parseConsultasTableCellValue(cells[i + 1])
    if (value !== null) {
      row[DEFAULT_SEGUIMIENTO_COLUMN_KEYS[i]] = value
    }
  }

  return Object.keys(row).length > 0 ? row : null
}

/**
 * @param {string[]} lines
 * @param {RegExp} marker
 * @param {{
 *   columnIndexByKey: Partial<Record<ConsultasSeguimientoColumnKey, number>>;
 * } | null} header
 * @returns {ConsultasSeguimientoRow | null}
 */
function parseConsultasSeguimientoEntityRow(lines, marker, header) {
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    if (!marker.test(line)) {
      continue
    }

    if (/^totales\s*$/i.test(line.trim()) && lines[i + 1]) {
      line = `Totales   ${lines[i + 1]}`
    }

    const cells =
      /^totales\b/i.test(line.trim()) && !/^totales\s*$/i.test(line.trim())
        ? splitConsultasTotalesRowCells(line)
        : splitConsultasTableCells(line)

    return mapCellsToConsultasSeguimientoRow(cells, header)
  }

  return null
}

/**
 * @param {string[]} lines
 * @param {string | null} tablaRaw
 * @returns {ConsultasSeguimientosTable | null}
 */
function parseConsultasSeguimientosFromLines(lines, tablaRaw) {
  if (!lines.length) {
    return null
  }

  const header = parseConsultasFullTableHeader(lines)
  const bancarias = parseConsultasSeguimientoEntityRow(
    lines,
    CONSULTAS_TABLE_MARKERS.entBancarias,
    header
  )
  const financieras = parseConsultasSeguimientoEntityRow(
    lines,
    CONSULTAS_TABLE_MARKERS.entFinancieras,
    header
  )
  const comerciales = parseConsultasSeguimientoEntityRow(
    lines,
    CONSULTAS_TABLE_MARKERS.comercIndust,
    header
  )
  const totales = parseConsultasSeguimientoEntityRow(
    lines,
    CONSULTAS_TABLE_MARKERS.totales,
    header
  )

  if (!bancarias && !financieras && !comerciales && !totales) {
    return null
  }

  const consultasSeguimientos = {
    bancarias,
    financieras,
    comerciales,
    totales,
  }

  console.log("NOSIS CONSULTAS TABLA RAW", tablaRaw ?? lines.join("\n"))
  console.log("NOSIS CONSULTAS TABLA PARSED", consultasSeguimientos)

  return consultasSeguimientos
}

/** @typedef {Partial<Record<"jun26" | "may26" | "abr26" | "mar26" | "feb26" | "ene26", number>>} ConsultasMensual */

/**
 * Fila Totales de la tabla CONSULTAS (sin columna Tot acumulado).
 *
 * @param {string[]} lines
 * @returns {ConsultasMensual | null}
 */
function extractConsultasTotalesMensualFromLines(lines) {
  if (!lines.length) {
    return null
  }

  const header = parseConsultasFullTableHeader(lines)
  const totalesRow = parseConsultasSeguimientoEntityRow(
    lines,
    CONSULTAS_TABLE_MARKERS.totales,
    header
  )

  if (!totalesRow) {
    return null
  }

  /** @type {ConsultasMensual} */
  const mensual = {}
  for (const key of ["jun26", "may26", "abr26", "mar26", "feb26", "ene26"]) {
    if (totalesRow[/** @type {ConsultasSeguimientoColumnKey} */ (key)] !== undefined) {
      mensual[/** @type {"jun26" | "may26" | "abr26" | "mar26" | "feb26" | "ene26"} */ (
        key
      )] = totalesRow[/** @type {ConsultasSeguimientoColumnKey} */ (key)]
    }
  }

  return Object.keys(mensual).length >= 6 ? mensual : null
}

/**
 * @param {ConsultasMensual | null | undefined} mensual
 * @returns {import("@/lib/nosisModel").ConsultasUltimos4Meses | null}
 */
function mapUltimos4MesesFromTotalesMensual(mensual) {
  if (!mensual) {
    return null
  }

  const jun = mensual.jun26
  const may = mensual.may26
  const abr = mensual.abr26
  const mar = mensual.mar26
  const feb = mensual.feb26
  const ene = mensual.ene26

  if (
    [jun, may, abr, mar, feb, ene].some(
      (value) => value === undefined || !Number.isFinite(value)
    )
  ) {
    return null
  }

  const total = jun + may + abr + mar + feb + ene
  if (total <= 0) {
    return null
  }

  const promedio = Math.round((total / 6) * 100) / 100
  return { jun, may, abr, mar, feb, ene, total, promedio }
}

/**
 * @param {string} text
 * @returns {ConsultasMensual | null}
 */
export function extractConsultasTotalesMensualFromText(text) {
  const { lines } = resolveConsultasTableLines(text)
  return extractConsultasTotalesMensualFromLines(lines)
}

/**
 * @param {string} text
 * @returns {{ block: string | null; lines: string[] }}
 */
function resolveConsultasTableLines(text) {
  const extracted = extractConsultasBlockFromText(text)
  if (!extracted?.lines?.length) {
    return { block: null, lines: [] }
  }

  if (CONSULTAS_BLOCK_END_MARKER.test(extracted.block)) {
    return { block: null, lines: [] }
  }

  const lines = normalizeConsultasTableLines(extracted.lines)
  const hasTotales = lines.some((line) => /^totales\b/i.test(line.trim()))

  if (!hasTotales) {
    return { block: null, lines: [] }
  }

  return { block: extracted.block, lines }
}

/**
 * @param {string} cell
 * @returns {number | null}
 */
function parseConsultasTableCellValue(cell) {
  const trimmed = (cell ?? "").trim()
  if (!trimmed || trimmed === "-") {
    return 0
  }
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed)
  }
  return null
}

/**
 * @param {string[]} lines
 * @returns {{
 *   rubrosLine: string;
 *   headerCells: string[];
 *   columnIndexByMonth: Record<ConsultasMonthKey, number>;
 * } | null}
 */
function parseConsultasRubrosHeader(lines) {
  const rubrosLine = lines.find((line) => /^rubros\b/i.test(line.trim()))
  if (!rubrosLine) {
    return null
  }

  const headerCells = splitConsultasRubrosHeaderCells(rubrosLine)
  /** @type {Partial<Record<ConsultasMonthKey, number>>} */
  const columnIndexByMonth = {}

  headerCells.forEach((cell, index) => {
    const monthKey = consultasMonthKeyFromHeaderCell(cell)
    if (monthKey) {
      columnIndexByMonth[monthKey] = index
    }
  })

  if (
    columnIndexByMonth.may === undefined ||
    columnIndexByMonth.abr === undefined ||
    columnIndexByMonth.mar === undefined ||
    columnIndexByMonth.feb === undefined
  ) {
    return null
  }

  return {
    rubrosLine,
    headerCells,
    columnIndexByMonth: /** @type {Record<ConsultasMonthKey, number>} */ (
      columnIndexByMonth
    ),
  }
}

/**
 * @param {string[]} totalesCells
 * @returns {number[]}
 */
function buildConsultasFirstSixFromCells(totalesCells) {
  return totalesCells
    .slice(1, 7)
    .map((cell) => parseConsultasTableCellValue(cell))
    .filter((value) => value !== null)
}

/**
 * @param {string[]} lines
 * @returns {{
 *   labelIndex: number;
 *   label: string;
 *   rubrosLine: string | null;
 *   headerCells: string[] | null;
 *   columnIndexByMonth: Record<ConsultasMonthKey, number> | null;
 *   totalesLine: string;
 *   totalesCells: string[];
 *   numericValues: number[];
 *   firstSix: number[];
 *   rawText: string;
 * } | null}
 */
function buildConsultasTotalesRow(lines) {
  const header = parseConsultasRubrosHeader(lines)

  for (let i = 0; i < lines.length; i++) {
    let totalesLine = lines[i]
    if (!/^totales\b/i.test(totalesLine) && !/^totales\s*$/i.test(totalesLine.trim())) {
      continue
    }

    if (/^totales\s*$/i.test(totalesLine.trim()) && lines[i + 1]) {
      totalesLine = `Totales   ${lines[i + 1]}`
    }

    const totalesCells = splitConsultasTotalesRowCells(totalesLine)
    if (totalesCells.length < 5) {
      continue
    }

    const numericValues = totalesCells
      .slice(1)
      .map((cell) => parseConsultasTableCellValue(cell))
      .filter((value) => value !== null)

    return {
      labelIndex: i,
      label: totalesCells[0] ?? "Totales",
      rubrosLine: header?.rubrosLine ?? null,
      headerCells: header?.headerCells ?? null,
      columnIndexByMonth: header?.columnIndexByMonth ?? null,
      totalesLine,
      totalesCells,
      numericValues,
      firstSix: buildConsultasFirstSixFromCells(totalesCells),
      rawText: totalesLine,
    }
  }

  return null
}

/**
 * @param {string} block
 * @param {string[]} lines
 * @param {unknown} totalesRow
 */
function logConsultasExtractionDebug(block, lines, totalesRow) {
  void block
  void lines
  void totalesRow
}

/**
 * May'26…Feb'26 por índice de columna del encabezado Rubros (sin Jun/Ene/Tot).
 *
 * @param {{
 *   columnIndexByMonth: Record<ConsultasMonthKey, number> | null;
 *   totalesCells: string[];
 * }} totalesRow
 * @returns {import("@/lib/nosisModel").ConsultasUltimos4Meses | null}
 */
function mapConsultasFromTotalesTable(totalesRow) {
  const { columnIndexByMonth, totalesCells, headerCells } = totalesRow

  if (headerCells?.length && totalesCells.length >= 5) {
    /** @type {Partial<Record<string, number>>} */
    const byShortKey = {}

    headerCells.forEach((cell, index) => {
      const columnKey = consultasSeguimientoColumnKeyFromHeaderCell(cell)
      if (!columnKey || columnKey === "total") {
        return
      }
      const shortKey = columnKey.replace(/26$/, "")
      const value = parseConsultasTableCellValue(totalesCells[index])
      if (value !== null) {
        byShortKey[shortKey] = value
      }
    })

    const jun = byShortKey.jun
    const may = byShortKey.may
    const abr = byShortKey.abr
    const mar = byShortKey.mar
    const feb = byShortKey.feb
    const ene = byShortKey.ene

    if (
      [jun, may, abr, mar, feb, ene].every(
        (value) => typeof value === "number" && Number.isFinite(value)
      )
    ) {
      const total = jun + may + abr + mar + feb + ene
      if (total > 0) {
        return {
          jun,
          may,
          abr,
          mar,
          feb,
          ene,
          total,
          promedio: Math.round((total / 6) * 100) / 100,
        }
      }
    }
  }

  if (!columnIndexByMonth || totalesCells.length < 5) {
    return null
  }

  const may = parseConsultasTableCellValue(
    totalesCells[columnIndexByMonth.may]
  )
  const abr = parseConsultasTableCellValue(
    totalesCells[columnIndexByMonth.abr]
  )
  const mar = parseConsultasTableCellValue(
    totalesCells[columnIndexByMonth.mar]
  )
  const feb = parseConsultasTableCellValue(
    totalesCells[columnIndexByMonth.feb]
  )

  if (
    [may, abr, mar, feb].some(
      (value) => value === null || !Number.isFinite(value)
    )
  ) {
    return null
  }

  const total = may + abr + mar + feb
  if (total <= 0) {
    return null
  }

  const promedio = Math.round((total / 4) * 100) / 100
  return { may, abr, mar, feb, total, promedio }
}

/**
 * Fallback: Jun'26=índice 0 … Ene'26=índice 5 (solo columnas mensuales).
 *
 * @param {number[]} numericValues
 * @returns {import("@/lib/nosisModel").ConsultasUltimos4Meses | null}
 */
function mapConsultasFromDefaultMonthIndices(numericValues) {
  if (numericValues.length < 6) {
    return null
  }

  const jun = numericValues[0]
  const may = numericValues[1]
  const abr = numericValues[2]
  const mar = numericValues[3]
  const feb = numericValues[4]
  const ene = numericValues[5]

  if (
    ![jun, may, abr, mar, feb, ene].every(
      (value) => typeof value === "number" && Number.isFinite(value)
    )
  ) {
    return null
  }

  const total = jun + may + abr + mar + feb + ene
  if (total <= 0) {
    return null
  }

  const promedio = Math.round((total / 6) * 100) / 100
  return { jun, may, abr, mar, feb, ene, total, promedio }
}

/**
 * @param {{
 *   columnIndexByMonth: Record<ConsultasMonthKey, number> | null;
 *   totalesCells: string[];
 *   numericValues: number[];
 * }} totalesRow
 * @returns {import("@/lib/nosisModel").ConsultasUltimos4Meses | null}
 */
function mapConsultasFromTotalesRow(totalesRow) {
  const fromHeader = mapConsultasFromTotalesTable(totalesRow)
  if (fromHeader) {
    return fromHeader
  }

  return mapConsultasFromDefaultMonthIndices(totalesRow.numericValues)
}

/**
 * @param {{
 *   total: number;
 *   may?: number;
 *   abr?: number;
 *   mar?: number;
 *   feb?: number;
 *   valuesByMonth?: Partial<Record<"may" | "abr" | "mar" | "feb", number>>;
 * }} input
 * @returns {import("@/lib/nosisModel").ConsultasUltimos4Meses | null}
 */
function buildConsultasRecord(input) {
  const byMonth = input.valuesByMonth ?? {}
  const may = input.may ?? byMonth.may ?? 0
  const abr = input.abr ?? byMonth.abr ?? 0
  const mar = input.mar ?? byMonth.mar ?? 0
  const feb = input.feb ?? byMonth.feb ?? 0
  const sumMeses = may + abr + mar + feb
  const total = input.total > 0 ? input.total : sumMeses

  if (total <= 0 || sumMeses <= 0) {
    return null
  }

  const promedio = Math.round((total / 4) * 100) / 100

  return { may, abr, mar, feb, total, promedio }
}

/**
 * Tabla CONSULTAS — fila Totales (Rubros / Ent. Bancarias / Financieras / Comerc. / Totales).
 *
 * @param {string} text
 * @param {NosisParserMatchLog[]} logs
 * @returns {import("@/lib/nosisModel").ConsultasUltimos4Meses | null}
 */
/**
 * @param {string} text
 * @returns {ConsultasSeguimientosTable | null}
 */
export function extractConsultasSeguimientosFromText(text) {
  const { block, lines } = resolveConsultasTableLines(text)
  return parseConsultasSeguimientosFromLines(lines, block)
}

function extractConsultasUltimos4Meses(text, logs) {
  const { block, lines } = resolveConsultasTableLines(text)
  const mensual = extractConsultasTotalesMensualFromLines(lines)
  let result = mapUltimos4MesesFromTotalesMensual(mensual)

  const row = lines.length > 0 ? buildConsultasTotalesRow(lines) : null
  if (!result && row) {
    result = mapConsultasFromTotalesRow(row)
  }

  if (!result) {
    return null
  }

  logs.push({
    label: "consultas.totales.row",
    regex: "CONSULTAS",
    match: row?.rawText?.slice(0, 240) ?? "",
    value: { consultasBlock: block, mensual, row, result },
  })

  return result
}

/**
 * @param {RegExpMatchArray} match
 */
function buildConsultasFromMatch(match) {
  return buildConsultasFromValues(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5])
  )
}

/**
 * @param {number} total
 * @param {number} may
 * @param {number} abr
 * @param {number} mar
 * @param {number} feb
 * @returns {import("@/lib/nosisModel").ConsultasUltimos4Meses | null}
 */
function buildConsultasFromValues(total, may, abr, mar, feb) {
  return buildConsultasRecord({
    total,
    may,
    abr,
    mar,
    feb,
  })
}

/**
 * @param {string} text
 * @param {NosisParserMatchLog[]} logs
 * @returns {string}
 */
function extractSituacionBcra(text, logs) {
  const patterns = [
    {
      label: "bcra.situacion",
      regex:
        /situaci[oó]n\s*(?:bcra|central\s*de\s*deudores)?\s*[:\-]?\s*(\d)/i,
    },
    {
      label: "bcra.peor",
      regex: /peor\s*situaci[oó]n\s*[:\-]?\s*(\d)/i,
    },
    {
      label: "bcra.clasificacion",
      regex: /clasificaci[oó]n\s*[:\-]?\s*(\d)/i,
    },
  ]

  for (const { label, regex } of patterns) {
    const matches = collectRegexMatches(label, regex, text, logs)
    if (matches[0]?.[1]) {
      return matches[0][1]
    }
  }

  return ""
}

/**
 * @param {string} text
 * @returns {import("@/lib/nosisModel").NosisIndicators}
 */
export function parseNosisIndicatorsFromText(text) {
  const result = { ...EMPTY_NOSIS_INDICATORS }
  /** @type {NosisParserMatchLog[]} */
  const regexLogs = []

  if (!text || typeof text !== "string") {
    console.log("NOSIS PARSER DEBUG", {
      textoExtraido: "",
      indicadoresDetectados: result,
      regexMatches: regexLogs,
    })
    return result
  }

  const sections = extractSections(text)

  for (const [key, sectionText] of Object.entries(sections)) {
    regexLogs.push({
      label: `section.${key}`,
      regex: SECTION_HEADERS.find((h) => h.key === key)?.pattern.source ?? key,
      match: sectionText.slice(0, 80),
      value: sectionText.length,
    })
  }

  result.situacionBcra = extractSituacionBcra(text, regexLogs)
  result.consultasUltimos4Meses = extractConsultasUltimos4Meses(text, regexLogs)
  result.moraVigente = detectMoraVigente(text, regexLogs)

  const historicoExtraction = extractHistoricoTotalActual(text)
  const historicoRaw = historicoExtraction?.raw ?? historicoExtraction?.rowSlice ?? null
  const historicoParsed = historicoExtraction?.parsed ?? null

  console.log("NOSIS HISTORICO RAW", historicoRaw)
  console.log("NOSIS HISTORICO PARSED", historicoParsed)

  if (historicoParsed) {
    buildNosisIndicatorsFromHistorico(result, historicoParsed)
  } else if (hasHistoricoPersonasJuridicasTable(text)) {
    console.warn(
      "[parseNosisPdf] Tabla histórica detectada pero Total Actual no parseable",
      historicoExtraction?.rowSlice?.slice(0, 200)
    )
  } else if (!hasHistoricoPersonasJuridicasTable(text)) {
    let cantidadCheques = 0
    let montoCheques = 0

    if (sections.chequesRechazados) {
      const extracted = extractChequesFromSection(
        sections.chequesRechazados,
        regexLogs,
        "chequesRechazados"
      )
      cantidadCheques += extracted.cantidad
      montoCheques += extracted.monto
    }

    if (sections.chequesImpagos) {
      const extracted = extractChequesFromSection(
        sections.chequesImpagos,
        regexLogs,
        "chequesImpagos"
      )
      cantidadCheques += extracted.cantidad
      montoCheques += extracted.monto

      if (!result.chequesImpagos && extracted.cantidad > 0) {
        result.chequesImpagos = String(extracted.cantidad)
      }
    }

    const globalChequesPatterns = [
      {
        label: "global.cheques.cantidad",
        regex: /(\d{1,5})\s*cheques?\s*rechazados?/gi,
        type: "cantidad",
      },
      {
        label: "global.cheques.rechazados",
        regex: /cheques?\s*rechazados?\s*[:\-]?\s*(\d{1,5})/gi,
        type: "cantidad",
      },
      {
        label: "global.cheques.monto",
        regex:
          /(?:monto|importe)\s*(?:total\s*)?(?:de\s*)?cheques?\s*rechazados?\s*[:\-]?\s*\$?\s*([\d.,]+(?:\s*(?:MM|millones?|mil))?)/gi,
        type: "monto",
      },
      {
        label: "global.cheques.acumulado",
        regex:
          /(?:acumulado|total)\s*(?:de\s*)?cheques?\s*rechazados?\s*[:\-]?\s*\$?\s*([\d.,]+(?:\s*(?:MM|millones?|mil))?)/gi,
        type: "monto",
      },
    ]

    for (const { label, regex, type } of globalChequesPatterns) {
      const matches = collectRegexMatches(label, regex, text, regexLogs)
      for (const match of matches) {
        const raw = match[1]
        if (type === "cantidad") {
          const qty = parseIntegerCount(raw)
          if (!isLikelyYear(qty)) {
            cantidadCheques = Math.max(cantidadCheques, qty)
          }
        } else {
          montoCheques = Math.max(montoCheques, parseArgAmount(raw))
        }
      }
    }

    if (cantidadCheques > 0) {
      result.cantidadCheques = String(cantidadCheques)
    }
    if (montoCheques > 0) {
      result.montoCheques = String(montoCheques)
    }
  }

  result.juiciosConcursos = detectJuiciosConcursos(text, regexLogs)

  const impagosPatterns = [
    {
      label: "impagos.cantidad",
      regex: /(?:cheques?\s*)?(?:impagos?|multas?\s*impagas?)\s*[:\-]?\s*(\d[\d.]*)/i,
    },
  ]

  for (const { label, regex } of impagosPatterns) {
    const matches = collectRegexMatches(label, regex, text, regexLogs)
    if (matches[0]?.[1]) {
      result.chequesImpagos = matches[0][1].replace(/\./g, "")
    }
  }

  for (const entry of regexLogs) {
    console.log("[NOSIS PARSER REGEX]", entry)
  }

  console.log("NOSIS INDICATORS BUILT", {
    chequesHistoricoParsed: result.chequesHistoricoParsed,
    cantidadCheques: result.cantidadCheques,
    montoCheques: result.montoCheques,
    chequesRechazadosTotal: result.chequesRechazadosTotal,
    chequesAbonados: result.chequesAbonados,
    chequesPendientes: result.chequesPendientes,
    montoRechazadoTotal: result.montoRechazadoTotal,
    montoAbonado: result.montoAbonado,
    montoPendiente: result.montoPendiente,
  })

  console.log("NOSIS PARSER DEBUG", {
    textoExtraido: text,
    indicadoresDetectados: {
      situacionBcra: result.situacionBcra,
      cantidadCheques: result.cantidadCheques,
      montoCheques: result.montoCheques,
      chequesRechazadosTotal: result.chequesRechazadosTotal,
      chequesAbonados: result.chequesAbonados,
      chequesPendientes: result.chequesPendientes,
      montoRechazadoTotal: result.montoRechazadoTotal,
      montoAbonado: result.montoAbonado,
      montoPendiente: result.montoPendiente,
      chequesHistoricoParsed: result.chequesHistoricoParsed,
      consultasUltimos4Meses: result.consultasUltimos4Meses,
      juiciosConcursos: result.juiciosConcursos,
      moraVigente: result.moraVigente,
    },
  })

  console.log("NOSIS FLOW [2/5] parseNosisIndicatorsFromText", {
    consultasUltimos4Meses: result.consultasUltimos4Meses,
    cantidadCheques: result.cantidadCheques,
    montoCheques: result.montoCheques,
  })

  return result
}

/**
 * @param {File} file
 * @returns {Promise<{
 *   parsedData: import("@/lib/nosisFullReport").NosisFullReport;
 *   indicators: import("@/lib/nosisModel").NosisIndicators;
 * }>}
 */
export async function parseNosisPdfFile(file) {
  const [text, pdfConsultasTable] = await Promise.all([
    extractTextFromPdfFile(file),
    extractConsultasTableFromPdfCoordinates(file),
  ])
  const { parseNosisFullReport } = await import("@/lib/nosisFullReport")
  const { nosisFullReportToIndicators } = await import("@/lib/nosisModel")

  let parsedData = parseNosisFullReport(text)

  if (pdfConsultasTable?.lines?.length) {
    console.log("NOSIS CONSULTAS SOURCE", "pdf-coordinates", {
      pageNum: pdfConsultasTable.pageNum,
    })
    parsedData = applyConsultasTableToParsedData(
      parsedData,
      pdfConsultasTable.lines,
      pdfConsultasTable.block
    )
  } else {
    console.log("NOSIS CONSULTAS SOURCE", "text-fallback")
  }

  const indicators = nosisFullReportToIndicators(parsedData)
  if (parsedData.consultas?.ultimos4Meses) {
    indicators.consultasUltimos4Meses = parsedData.consultas.ultimos4Meses
  }

  console.log("NOSIS FLOW [2/5] parseNosisPdfFile", {
    consultasUltimos4Meses: indicators.consultasUltimos4Meses,
    parsedDataConsultas: parsedData.consultas?.ultimos4Meses ?? null,
    consultasMensual: parsedData.consultas?.mensual ?? null,
    consultasSeguimientos: parsedData.consultasSeguimientos ?? null,
  })
  return { parsedData, indicators }
}

export { parseNosisFullReport } from "@/lib/nosisFullReport"
