/**
 * Cliente Gemini para extracción de balances (/api/balance-ocr).
 */

export const BALANCE_GEMINI_STATUS_MESSAGE = "Procesando balance con IA..."

/**
 * @typedef {Object} BalanceGeminiOcrResult
 * @property {Record<string, string | number | null>} values
 * @property {string[]} detected
 * @property {string} [rawText]
 * @property {string} [parseError]
 * @property {boolean} [apiKeyConfigured]
 * @property {string} [geminiStatus]
 * @property {string} [geminiError]
 * @property {string} [geminiRawResponse]
 */

/**
 * @param {unknown} payload
 * @param {string} fallback
 */
function readApiError(payload, fallback) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error
  }
  return fallback
}

/**
 * @param {unknown} payload
 * @param {string} key
 */
function readApiString(payload, key) {
  if (
    payload &&
    typeof payload === "object" &&
    key in payload &&
    typeof payload[key] === "string"
  ) {
    return payload[key]
  }
  return ""
}

/**
 * @param {File} file
 * @param {(progress: number, status: string) => void} [onProgress]
 * @returns {Promise<BalanceGeminiOcrResult>}
 */
export async function fetchBalanceGeminiOcr(file, onProgress) {
  onProgress?.(10, BALANCE_GEMINI_STATUS_MESSAGE)

  const formData = new FormData()
  formData.append("file", file)

  onProgress?.(40, BALANCE_GEMINI_STATUS_MESSAGE)

  const response = await fetch("/api/balance-ocr", {
    method: "POST",
    body: formData,
  })

  onProgress?.(85, BALANCE_GEMINI_STATUS_MESSAGE)

  /** @type {unknown} */
  let payload
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  const rawText =
    readApiString(payload, "rawText") ||
    readApiString(payload, "geminiRawResponse")
  const parseError = readApiString(payload, "parseError") || undefined
  const geminiStatus = readApiString(payload, "geminiStatus") || undefined
  const geminiError = readApiString(payload, "geminiError") || undefined
  const geminiRawResponse =
    readApiString(payload, "geminiRawResponse") || rawText || undefined
  const apiKeyConfigured =
    payload &&
    typeof payload === "object" &&
    "apiKeyConfigured" in payload &&
    typeof payload.apiKeyConfigured === "boolean"
      ? payload.apiKeyConfigured
      : undefined

  if (!response.ok) {
    const message = readApiError(payload, "Error procesando balance con IA")
    const error = new Error(message)
    error.rawText = rawText
    error.parseError = parseError ?? message
    error.apiKeyConfigured = apiKeyConfigured
    error.geminiStatus = geminiStatus
    error.geminiError = geminiError ?? message
    error.geminiRawResponse = geminiRawResponse
    throw error
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("values" in payload) ||
    typeof payload.values !== "object" ||
    payload.values === null
  ) {
    const error = new Error("Respuesta inválida del servicio de IA")
    error.rawText = rawText
    error.apiKeyConfigured = apiKeyConfigured
    error.geminiRawResponse = geminiRawResponse
    throw error
  }

  onProgress?.(100, "Listo")

  return {
    values: /** @type {Record<string, string | number | null>} */ (payload.values),
    detected: Array.isArray(payload.detected)
      ? payload.detected.map((item) => String(item))
      : Object.keys(payload.values),
    rawText: readApiString(payload, "rawText") || rawText,
    parseError,
    apiKeyConfigured,
    geminiStatus,
    geminiError,
    geminiRawResponse,
  }
}

export const BALANCE_GEMINI_SATURATED_MESSAGE =
  "Gemini temporalmente saturado. Reintente más tarde o complete los campos manualmente."
