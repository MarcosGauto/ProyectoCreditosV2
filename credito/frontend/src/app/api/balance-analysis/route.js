import {
  buildGeminiErrorResponse,
  extractJsonObject,
  generateContentWithRetry,
  getGeminiClient,
  GEMINI_MODEL,
  isGeminiApiKeyConfigured,
} from "@/lib/gemini/geminiServer"

const BALANCE_ANALYSIS_PROMPT = `
Sos un analista financiero. Recibirás únicamente indicadores ya calculados por un sistema crediticio.

Generá una reseña breve en español argentino con MÁXIMO 8 líneas en total, agrupadas en:
- fortalezas (array de strings, 1-3 ítems cortos)
- debilidades (array de strings, 1-3 ítems cortos)
- monitorear (array de strings, 1-3 ítems cortos)

Reglas estrictas:
- Basate EXCLUSIVAMENTE en los datos provistos. No inventes cifras ni contexto.
- No emitas recomendaciones legales, contables ni de inversión.
- No sugieras aprobar o rechazar créditos.
- Si falta un dato, no lo menciones como si existiera.

Devolvé exclusivamente JSON válido, sin markdown ni texto adicional:

{
  "fortalezas": ["..."],
  "debilidades": ["..."],
  "monitorear": ["..."],
  "lineas": ["línea 1", "línea 2"]
}

El array "lineas" debe tener como máximo 8 strings (una por línea de la reseña).
`

/**
 * @param {unknown} raw
 */
function normalizeBalanceAnalysisResponse(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Respuesta inválida")
  }

  const obj = /** @type {Record<string, unknown>} */ (raw)

  /** @param {unknown} value */
  const toLines = (value) => {
    if (!Array.isArray(value)) {
      return []
    }
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .slice(0, 3)
  }

  const fortalezas = toLines(obj.fortalezas)
  const debilidades = toLines(obj.debilidades)
  const monitorear = toLines(obj.monitorear)

  let lineas = toLines(obj.lineas)
  if (lineas.length === 0) {
    lineas = [
      ...fortalezas.map((item) => `Fortaleza: ${item}`),
      ...debilidades.map((item) => `Debilidad: ${item}`),
      ...monitorear.map((item) => `Monitorear: ${item}`),
    ].slice(0, 8)
  }

  lineas = lineas.slice(0, 8)

  if (lineas.length === 0) {
    throw new Error("La respuesta no contiene análisis utilizable")
  }

  const texto = lineas.join("\n")

  return {
    fortalezas,
    debilidades,
    monitorear,
    lineas,
    texto,
    generadoEn: new Date().toISOString(),
  }
}

export async function POST(req) {
  /** @type {string} */
  let geminiRawText = ""

  try {
    const body = await req.json()
    const indicadores = body?.indicadores

    if (!indicadores || typeof indicadores !== "object") {
      return Response.json(
        {
          error: "Indicadores no recibidos",
          apiKeyConfigured: isGeminiApiKeyConfigured(),
        },
        { status: 400 }
      )
    }

    const ai = getGeminiClient()

    const response = await generateContentWithRetry(ai, {
      model: GEMINI_MODEL,
      contents: [
        { text: BALANCE_ANALYSIS_PROMPT },
        {
          text: `Indicadores calculados:\n${JSON.stringify(indicadores, null, 2)}`,
        },
      ],
    })

    geminiRawText = response.text ?? ""

    try {
      const parsed = normalizeBalanceAnalysisResponse(
        extractJsonObject(geminiRawText)
      )

      return Response.json({
        success: true,
        analisis: parsed,
        geminiRawResponse: geminiRawText,
        apiKeyConfigured: isGeminiApiKeyConfigured(),
      })
    } catch (parseError) {
      const parseMessage =
        parseError instanceof Error ? parseError.message : "Error de parseo"

      return Response.json(
        {
          success: false,
          error: "Error parseando respuesta de Gemini",
          geminiRawResponse: geminiRawText,
          parseError: parseMessage,
          apiKeyConfigured: isGeminiApiKeyConfigured(),
        },
        { status: 422 }
      )
    }
  } catch (error) {
    console.error("[/api/balance-analysis]", error)
    const { body, status } = buildGeminiErrorResponse(error, geminiRawText)
    return Response.json(body, { status })
  }
}
