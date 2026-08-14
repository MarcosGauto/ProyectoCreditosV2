import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req) {
  try {
    const { requireApiAuth, API_STAFF_ROLES } = await import(
      "@/lib/auth/requireApiAuth"
    )
    const gate = await requireApiAuth(req, { roles: [...API_STAFF_ROLES] })
    if (!gate.ok) return gate.response

    const formData = await req.formData();

    const file = formData.get("file");
    const adquirente = formData.get("adquirente");

    if (!file) {
      return Response.json(
        { error: "Archivo no recibido" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: file.type,
            data: Buffer.from(bytes).toString("base64"),
          },
        },
        {
          text: `
Analiza esta imagen.

Adquirente: ${adquirente}

Extrae únicamente:
- cuotas
- coeficiente

Devuelve exclusivamente JSON válido.

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
    });

    return Response.json({
      success: true,
      result: response.text,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: "Error procesando OCR",
      },
      { status: 500 }
    );
  }
}