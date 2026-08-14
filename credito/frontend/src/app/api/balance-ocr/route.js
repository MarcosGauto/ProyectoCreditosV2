import {
  BALANCE_GEMINI_JSON_EXAMPLE,
  normalizeBalanceGeminiValues,
} from "@/lib/balance/balanceGeminiSchema"
import { isBalanceParseSufficient } from "@/lib/balance/balanceParseValidation"
import {
  buildGeminiErrorResponse,
  extractJsonObject,
  generateContentWithRetry,
  getGeminiClient,
  GEMINI_MODEL,
  isGeminiApiKeyConfigured,
} from "@/lib/gemini/geminiServer"

const BALANCE_OCR_PROMPT = `
Analiza este balance contable argentino (PDF o imagen).

Extrae las principales cuentas del balance patrimonial y de resultados.
Si hay dos ejercicios (actual y anterior), completá ambas columnas.
Si solo hay un ejercicio, completá únicamente los campos con sufijo "Actual".

Usá números enteros sin separadores de miles (ej. 1500000).
Si un dato no está visible o no es legible, omitilo o usá null.
No inventes valores.

Devolvé exclusivamente JSON válido, sin markdown ni texto adicional.

Formato:

${BALANCE_GEMINI_JSON_EXAMPLE}
`

export async function POST(req) {
  /** @type {string} */
  let geminiRawText = ""

  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || typeof file === "string") {
      return Response.json(
        {
          error: "Archivo no recibido",
          apiKeyConfigured: isGeminiApiKeyConfigured(),
        },
        { status: 400 }
      )
    }

    const ai = getGeminiClient()
    const bytes = await file.arrayBuffer()
    const mimeType = file.type || "application/octet-stream"

    const response = await generateContentWithRetry(ai, {
      model: GEMINI_MODEL,
      contents: [
        {
          inlineData: {
            mimeType,
            data: Buffer.from(bytes).toString("base64"),
          },
        },
        { text: BALANCE_OCR_PROMPT },
      ],
    })

    geminiRawText = response.text ?? ""

    try {
      const rawObject = extractJsonObject(geminiRawText)
      const { values, detected } = normalizeBalanceGeminiValues(rawObject)

      const sufficient =
        isBalanceParseSufficient(values, { suffix: "Actual", minFields: 2 }) ||
        isBalanceParseSufficient(values, { suffix: "Anterior", minFields: 2 }) ||
        isBalanceParseSufficient(values, { minFields: 2 })

      if (!sufficient || detected.length === 0) {
        return Response.json(
          {
            success: false,
            error: "No se detectaron cuentas válidas del balance",
            values,
            detected,
            rawText: geminiRawText,
            geminiRawResponse: geminiRawText,
            parseError: "El JSON no contiene cuentas suficientes del balance",
            apiKeyConfigured: isGeminiApiKeyConfigured(),
          },
          { status: 422 }
        )
      }

      return Response.json({
        success: true,
        values,
        detected,
        rawText: geminiRawText,
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
          rawText: geminiRawText,
          geminiRawResponse: geminiRawText,
          parseError: parseMessage,
          apiKeyConfigured: isGeminiApiKeyConfigured(),
        },
        { status: 422 }
      )
    }
  } catch (error) {
    console.error("[/api/balance-ocr]", error)
    const { body, status } = buildGeminiErrorResponse(error, geminiRawText)
    return Response.json(body, { status })
  }
}
