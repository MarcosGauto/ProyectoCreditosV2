/**
 * Cliente para OCR de coeficientes vía Gemini (/api/ocr).
 */

/** @typedef {{ cuotas: number; coeficiente: number }} GeminiOcrRecord */

/**
 * @typedef {{
 *   records: GeminiOcrRecord[];
 *   rawText: string;
 *   parseError?: string;
 *   apiKeyConfigured?: boolean;
 *   geminiStatus?: string;
 *   geminiError?: string;
 *   geminiRawResponse?: string;
 * }} GeminiOcrResult
 */

export const GEMINI_STATUS_MESSAGE = "Procesando archivo con IA...";

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
    return payload.error;
  }
  return fallback;
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
    return payload[key];
  }
  return "";
}

/**
 * @param {unknown} payload
 */
function readApiKeyConfigured(payload) {
  if (
    payload &&
    typeof payload === "object" &&
    "apiKeyConfigured" in payload &&
    typeof payload.apiKeyConfigured === "boolean"
  ) {
    return payload.apiKeyConfigured;
  }
  return undefined;
}

/**
 * @param {File} file
 * @param {string} adquirente
 * @param {(progress: number, status: string) => void} [onProgress]
 * @returns {Promise<GeminiOcrResult>}
 */
export async function fetchCoeficientesGeminiOcr(file, adquirente, onProgress) {
  onProgress?.(10, GEMINI_STATUS_MESSAGE);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("adquirente", adquirente);

  onProgress?.(40, GEMINI_STATUS_MESSAGE);

  const response = await fetch("/api/ocr", {
    method: "POST",
    body: formData,
  });

  onProgress?.(85, GEMINI_STATUS_MESSAGE);

  /** @type {unknown} */
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const rawText =
    readApiString(payload, "rawText") ||
    readApiString(payload, "geminiRawResponse");
  const parseError = readApiString(payload, "parseError") || undefined;
  const apiKeyConfigured = readApiKeyConfigured(payload);
  const geminiStatus = readApiString(payload, "geminiStatus") || undefined;
  const geminiError = readApiString(payload, "geminiError") || undefined;
  const geminiRawResponse =
    readApiString(payload, "geminiRawResponse") || rawText || undefined;

  if (!response.ok) {
    const message = readApiError(payload, "Error procesando archivo con IA");
    const error = new Error(message);
    error.rawText = rawText;
    error.parseError = parseError ?? message;
    error.apiKeyConfigured = apiKeyConfigured;
    error.geminiStatus = geminiStatus;
    error.geminiError = geminiError ?? message;
    error.geminiRawResponse = geminiRawResponse;
    throw error;
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("records" in payload) ||
    !Array.isArray(payload.records)
  ) {
    const error = new Error("Respuesta inválida del servicio de IA");
    error.rawText = rawText;
    error.apiKeyConfigured = apiKeyConfigured;
    error.geminiRawResponse = geminiRawResponse;
    throw error;
  }

  onProgress?.(100, "Listo");

  const records = payload.records.filter(
    (record) =>
      record &&
      typeof record === "object" &&
      Number.isFinite(Number(record.cuotas)) &&
      Number.isFinite(Number(record.coeficiente))
  );

  return {
    records,
    rawText: typeof payload.rawText === "string" ? payload.rawText : rawText,
    parseError,
    apiKeyConfigured,
    geminiStatus,
    geminiError,
    geminiRawResponse,
  };
}
