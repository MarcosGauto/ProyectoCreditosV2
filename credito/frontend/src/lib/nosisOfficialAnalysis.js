/** @typedef {"APROBADO" | "OBSERVADO" | "RECHAZADO"} NosisEstadoComercial */

/**
 * @typedef {Object} NosisAnalisis
 * @property {number | null} score Score normalizado 0–100
 * @property {number | null} [scoreRaw] Valor bruto del PDF
 * @property {string | null} [scoreScale] Escala detectada (p. ej. "1-999", "0-100", "percent")
 * @property {NosisEstadoComercial | null} estado Calificación comercial
 * @property {NosisEstadoComercial | string | null} [resultado] Resultado según configuración CDA
 * @property {"informe"} [fuente]
 */

/**
 * @param {unknown} raw
 * @returns {NosisEstadoComercial | null}
 */
export function normalizeNosisEstadoComercial(raw) {
  if (raw === null || raw === undefined) {
    return null
  }

  const upper = String(raw)
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")

  if (/^APROBAD/.test(upper)) {
    return "APROBADO"
  }
  if (/^OBSERVAD/.test(upper)) {
    return "OBSERVADO"
  }
  if (/^RECHAZAD/.test(upper)) {
    return "RECHAZADO"
  }

  return null
}

/**
 * Convierte el score bruto del informe NOSIS a escala 0–100.
 *
 * @param {number} raw
 * @param {number} [scaleMax=999]
 * @returns {number | null}
 */
export function nosisRawScoreToPercent(raw, scaleMax = 999) {
  if (!Number.isFinite(raw)) {
    return null
  }

  if (raw >= 0 && raw <= 100) {
    return Math.round(raw)
  }

  if (raw > 100 && raw <= 999) {
    return Math.round(raw / 10)
  }

  if (scaleMax > 100) {
    return Math.max(0, Math.min(100, Math.round((raw / scaleMax) * 100)))
  }

  return null
}

/**
 * @param {string} text
 * @returns {{ score: number; scoreRaw: number; scoreScale: string } | null}
 */
export function extractNosisScoreFromText(text) {
  if (!text || typeof text !== "string") {
    return null
  }

  const pctMatch = text.match(
    /(?:Score\s+NOSIS|SCORE\s+NOSIS)\s*[:\-]?\s*(\d{1,3})\s*%/i
  )
  if (pctMatch) {
    const score = Number(pctMatch[1])
    if (score >= 0 && score <= 100) {
      return { score, scoreRaw: score, scoreScale: "percent" }
    }
  }

  const scoreBlock = text.match(
    /\bSCORE\b\s*\n\s*(\d{1,4})\s*\n\s*1\s+999\s*\n\s*(\d{1,4})/i
  )
  if (scoreBlock) {
    const raw = Number(scoreBlock[2] ?? scoreBlock[1])
    const score = nosisRawScoreToPercent(raw, 999)
    if (score !== null) {
      return { score, scoreRaw: raw, scoreScale: "1-999" }
    }
  }

  const scoreSimple = text.match(/\bSCORE\b\s*\n\s*(\d{1,4})\s*(?:\n|$)/i)
  if (scoreSimple) {
    const raw = Number(scoreSimple[1])
    const score = nosisRawScoreToPercent(raw, 999)
    if (score !== null) {
      return { score, scoreRaw: raw, scoreScale: "1-999" }
    }
  }

  const perfilScore = text.match(
    /PERFIL\s+DEL\s+CONSULTADO[\s\S]{0,1200}?\bScore:\s*(\d{1,4})\b/i
  )
  if (perfilScore) {
    const raw = Number(perfilScore[1])
    const score = nosisRawScoreToPercent(raw, 999)
    if (score !== null) {
      return {
        score,
        scoreRaw: raw,
        scoreScale: raw <= 100 ? "0-100" : "1-999",
      }
    }
  }

  const earlyScore = text.match(
    /(?:INFORMACI[ÓO]N\s+GENERAL|Facturaci[oó]n)[\s\S]{0,800}?\bScore:\s*(\d{1,4})\b/i
  )
  if (earlyScore) {
    const raw = Number(earlyScore[1])
    const score = nosisRawScoreToPercent(raw, 999)
    if (score !== null) {
      return {
        score,
        scoreRaw: raw,
        scoreScale: raw <= 100 ? "0-100" : "1-999",
      }
    }
  }

  return null
}

/**
 * @param {string} text
 * @returns {NosisEstadoComercial | null}
 */
export function extractNosisEstadoComercialFromText(text) {
  if (!text || typeof text !== "string") {
    return null
  }

  const resultadoConfig = text.match(
    /Resultado\s+seg[uú]n\s+configuraci[oó]n:\s*(Aprobado|Observado|Rechazado)/i
  )
  if (resultadoConfig) {
    return normalizeNosisEstadoComercial(resultadoConfig[1])
  }

  const cdaMatch = text.match(
    /CDA:\s*[^\n]+\n\s*(Aprobado|Observado|Rechazado)\b/i
  )
  if (cdaMatch) {
    return normalizeNosisEstadoComercial(cdaMatch[1])
  }

  const perfilMatch = text.match(
    /PERFIL\s+DEL\s+CONSULTADO[\s\S]{0,1200}?\b(?:Aprobado|Observado|Rechazado)\b/i
  )
  if (perfilMatch) {
    const word = perfilMatch[0].match(/\b(Aprobado|Observado|Rechazado)\b/i)
    if (word) {
      return normalizeNosisEstadoComercial(word[1])
    }
  }

  return null
}

/**
 * @param {string} text
 * @returns {NosisEstadoComercial | string | null}
 */
export function extractNosisResultadoFromText(text) {
  if (!text || typeof text !== "string") {
    return null
  }

  const match = text.match(
    /Resultado\s+seg[uú]n\s+configuraci[oó]n:\s*([^\n]+)/i
  )
  if (!match) {
    return null
  }

  const raw = match[1].trim()
  return normalizeNosisEstadoComercial(raw) ?? raw
}

/**
 * @param {string} text
 * @returns {NosisAnalisis | null}
 */
export function buildNosisAnalisisFromPdfText(text) {
  const scoreData = extractNosisScoreFromText(text)
  const estado = extractNosisEstadoComercialFromText(text)
  const resultado = extractNosisResultadoFromText(text)

  if (!scoreData && !estado && !resultado) {
    return null
  }

  return {
    score: scoreData?.score ?? null,
    scoreRaw: scoreData?.scoreRaw ?? null,
    scoreScale: scoreData?.scoreScale ?? null,
    estado,
    resultado: resultado ?? estado,
    fuente: "informe",
  }
}

/**
 * @param {unknown} raw
 * @returns {NosisAnalisis | null}
 */
export function normalizeNosisAnalisis(raw) {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const row = /** @type {Record<string, unknown>} */ (raw)
  const score =
    typeof row.score === "number" && Number.isFinite(row.score)
      ? Math.round(row.score)
      : null
  const scoreRaw =
    typeof row.scoreRaw === "number" && Number.isFinite(row.scoreRaw)
      ? row.scoreRaw
      : null
  const estado = normalizeNosisEstadoComercial(row.estado)
  const resultadoRaw = row.resultado
  const resultado =
    typeof resultadoRaw === "string"
      ? normalizeNosisEstadoComercial(resultadoRaw) ?? resultadoRaw
      : estado

  if (score === null && !estado && !resultado) {
    return null
  }

  return {
    score,
    scoreRaw,
    scoreScale: typeof row.scoreScale === "string" ? row.scoreScale : null,
    estado,
    resultado,
    fuente: "informe",
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {NosisAnalisis | null}
 */
export function nosisAnalisisFromDoc(doc) {
  if (!doc || typeof doc !== "object") {
    return null
  }

  const row = /** @type {Record<string, unknown>} */ (doc)

  const topLevel = normalizeNosisAnalisis(row.nosisAnalisis)
  if (topLevel) {
    return topLevel
  }

  const parsedData =
    row.parsedData && typeof row.parsedData === "object"
      ? /** @type {Record<string, unknown>} */ (row.parsedData)
      : null
  const fromParsed = normalizeNosisAnalisis(parsedData?.analisis)
  if (fromParsed) {
    return fromParsed
  }

  if (
    row.scoreSource === "informe" &&
    typeof row.scoreNosis === "number" &&
    Number.isFinite(row.scoreNosis)
  ) {
    return {
      score: Math.round(row.scoreNosis),
      scoreRaw: null,
      scoreScale: null,
      estado: null,
      resultado: null,
      fuente: "informe",
    }
  }

  return null
}

/**
 * @param {"informe" | "calculo_interno"} source
 * @returns {string}
 */
export function getNosisScoreSourceLabel(source) {
  return source === "informe" ? "Informe NOSIS" : "Cálculo interno"
}

/**
 * @param {NosisEstadoComercial | null | undefined} estado
 * @returns {"good" | "medium" | "risky" | null}
 */
export function estadoComercialToSemaphore(estado) {
  if (estado === "APROBADO") {
    return "good"
  }
  if (estado === "OBSERVADO") {
    return "medium"
  }
  if (estado === "RECHAZADO") {
    return "risky"
  }
  return null
}
