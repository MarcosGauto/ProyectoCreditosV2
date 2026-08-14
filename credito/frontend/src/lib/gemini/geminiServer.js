import { GoogleGenAI } from "@google/genai"

export const GEMINI_RETRY_DELAYS_MS = [2000, 4000, 8000]
export const GEMINI_SATURATED_MESSAGE =
  "Gemini temporalmente saturado. Reintente más tarde."
export const GEMINI_MODEL = "gemini-2.5-flash"

/**
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @returns {GoogleGenAI}
 */
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada")
  }
  return new GoogleGenAI({ apiKey })
}

export function isGeminiApiKeyConfigured() {
  return Boolean(process.env.GEMINI_API_KEY)
}

/**
 * @param {unknown} error
 */
export function isGeminiUnavailable(error) {
  if (!error || typeof error !== "object") return false

  const err = /** @type {Record<string, unknown>} */ (error)
  const nested =
    err.error && typeof err.error === "object"
      ? /** @type {Record<string, unknown>} */ (err.error)
      : null

  const code = err.code ?? err.status ?? nested?.code ?? nested?.status
  const status = String(err.status ?? nested?.status ?? "").toUpperCase()
  const message = String(err.message ?? nested?.message ?? "")

  return (
    code === 503 ||
    status === "UNAVAILABLE" ||
    message.includes("503") ||
    message.toUpperCase().includes("UNAVAILABLE")
  )
}

/**
 * @param {unknown} error
 */
export function extractGeminiErrorInfo(error) {
  if (!error || typeof error !== "object") {
    return { geminiStatus: "", geminiError: String(error ?? "Error desconocido") }
  }

  const err = /** @type {Record<string, unknown>} */ (error)
  const nested =
    err.error && typeof err.error === "object"
      ? /** @type {Record<string, unknown>} */ (err.error)
      : null

  return {
    geminiStatus: String(
      err.status ?? nested?.status ?? (isGeminiUnavailable(error) ? "UNAVAILABLE" : "")
    ),
    geminiError: String(err.message ?? nested?.message ?? "Error de Gemini"),
  }
}

/**
 * @param {GoogleGenAI} ai
 * @param {Parameters<GoogleGenAI["models"]["generateContent"]>[0]} request
 */
export async function generateContentWithRetry(ai, request) {
  let lastError = null

  for (let attempt = 0; attempt < GEMINI_RETRY_DELAYS_MS.length + 1; attempt++) {
    try {
      return await ai.models.generateContent(request)
    } catch (error) {
      lastError = error
      const isLastAttempt = attempt >= GEMINI_RETRY_DELAYS_MS.length

      if (!isGeminiUnavailable(error) || isLastAttempt) {
        throw error
      }

      const delay = GEMINI_RETRY_DELAYS_MS[attempt]
      console.warn(
        `[Gemini] UNAVAILABLE (503) — reintento ${attempt + 2}/${GEMINI_RETRY_DELAYS_MS.length + 1} en ${delay}ms`
      )
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * @param {string} text
 */
export function extractJsonFromGeminiText(text) {
  if (!text) {
    throw new Error("Respuesta vacía de Gemini")
  }

  let cleaned = String(text).trim()
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    cleaned = fenced[1].trim()
  }

  return JSON.parse(cleaned)
}

/**
 * @param {string} text
 */
export function extractJsonArray(text) {
  const parsed = extractJsonFromGeminiText(text)
  if (!Array.isArray(parsed)) {
    throw new Error("Se esperaba un array JSON")
  }
  return parsed
}

/**
 * @param {string} text
 */
export function extractJsonObject(text) {
  const parsed = extractJsonFromGeminiText(text)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Se esperaba un objeto JSON")
  }
  return parsed
}

/**
 * @param {unknown} error
 * @param {string} [geminiRawText]
 */
export function buildGeminiErrorResponse(error, geminiRawText = "") {
  const { geminiStatus, geminiError } = extractGeminiErrorInfo(error)
  const unavailable = isGeminiUnavailable(error)

  return {
    body: {
      success: false,
      error: unavailable ? GEMINI_SATURATED_MESSAGE : geminiError,
      rawText: geminiRawText || undefined,
      geminiRawResponse: geminiRawText || undefined,
      geminiStatus: unavailable ? "UNAVAILABLE" : geminiStatus,
      geminiError,
      apiKeyConfigured: isGeminiApiKeyConfigured(),
    },
    status: unavailable ? 503 : 500,
  }
}
