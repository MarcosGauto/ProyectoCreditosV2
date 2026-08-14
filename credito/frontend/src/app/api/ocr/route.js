import {
  buildGeminiErrorResponse,
  extractJsonArray,
  generateContentWithRetry,
  getGeminiClient,
  GEMINI_MODEL,
  GEMINI_SATURATED_MESSAGE,
  isGeminiApiKeyConfigured,
  isGeminiUnavailable,
} from "@/lib/gemini/geminiServer"

/**
 * @param {unknown[]} records
 */
function normalizeRecords(records) {
  return records
    .map((record) => {
      if (!record || typeof record !== "object") return null
      const cuotas = Number(record.cuotas)
      const coeficiente = Number(
        String(record.coeficiente ?? "")
          .trim()
          .replace(",", ".")
      )

      if (
        !Number.isFinite(cuotas) ||
        !Number.isFinite(coeficiente) ||
        coeficiente <= 0
      ) {
        return null
      }

      return { cuotas, coeficiente }
    })
    .filter(Boolean)
}

export async function POST(req) {
  /** @type {string} */
  let geminiRawText = ""

  try {
    const { requireApiAuth, API_STAFF_ROLES } = await import(
      "@/lib/auth/requireApiAuth"
    )
    const gate = await requireApiAuth(req, { roles: [...API_STAFF_ROLES] })
    if (!gate.ok) return gate.response

    const formData = await req.formData()
    const file = formData.get("file")
    const adquirente = String(formData.get("adquirente") ?? "").trim() || "tarjeta"

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
        {
          text: `
Analiza este archivo de tasas/coeficientes.

Adquirente: ${adquirente}

Extrae únicamente filas con:
- cuotas (número entero)
- coeficiente (número decimal, ej. 1.0487)

Ignora columnas TNA, bonificaciones, TD u otras.

Devuelve exclusivamente JSON válido, sin markdown ni texto adicional.

Formato:

[
  {
    "cuotas": 2,
    "coeficiente": 1.0487
  }
]
`,
        },
      ],
    })

    geminiRawText = response.text ?? ""

    console.log("[/api/ocr] Gemini raw response:")
    console.log(geminiRawText)

    try {
      const records = normalizeRecords(extractJsonArray(geminiRawText))

      if (!records.length) {
        return Response.json(
          {
            success: false,
            error: "No se detectaron registros válidos",
            rawText: geminiRawText,
            geminiRawResponse: geminiRawText,
            parseError: "El JSON no contiene registros válidos de cuotas/coeficiente",
            apiKeyConfigured: isGeminiApiKeyConfigured(),
          },
          { status: 422 }
        )
      }

      return Response.json({
        success: true,
        records,
        rawText: geminiRawText,
        geminiRawResponse: geminiRawText,
        apiKeyConfigured: isGeminiApiKeyConfigured(),
      })
    } catch (parseError) {
      const parseMessage =
        parseError instanceof Error ? parseError.message : "Error de parseo"

      console.error("[/api/ocr] Parse error:", parseMessage)

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
    console.error("[/api/ocr]", error)

    if (isGeminiUnavailable(error)) {
      return Response.json(
        {
          success: false,
          error: `${GEMINI_SATURATED_MESSAGE} o utilice Excel/CSV.`,
          rawText: geminiRawText || undefined,
          geminiRawResponse: geminiRawText || undefined,
          geminiStatus: "UNAVAILABLE",
          geminiError: String(
            error instanceof Error ? error.message : "Error de Gemini"
          ),
          apiKeyConfigured: isGeminiApiKeyConfigured(),
        },
        { status: 503 }
      )
    }

    const { body, status } = buildGeminiErrorResponse(error, geminiRawText)
    return Response.json(body, { status })
  }
}
