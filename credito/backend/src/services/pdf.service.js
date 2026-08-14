import PDFDocument from "pdfkit"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOGO_PATH = path.resolve(__dirname, "../../assets/logo-grupo-nucleo.png")

/**
 * @param {import("pdfkit").PDFDocument} doc
 * @param {number} [x]
 * @param {number} [y]
 * @param {number} [size]
 */
function addLogoToPdfKit(doc, x = 40, y = 40, size = 48) {
  if (!fs.existsSync(LOGO_PATH)) {
    return y
  }

  doc.image(LOGO_PATH, x, y, { fit: [size, size], align: "left", valign: "top" })
  return y + size + 12
}

export const generateQualificationPDF = async (qualificationData) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 })

    const pdfPath = path.join(
      process.cwd(),
      "temp",
      `qualification_${Date.now()}.pdf`
    )

    const stream = fs.createWriteStream(pdfPath)
    doc.pipe(stream)

    let contentY = addLogoToPdfKit(doc, 40, 40, 52)
    doc.y = contentY

    doc.fontSize(20).text("Informe de Calificación Crediticia", { align: "center" })
    doc.moveDown()

    doc.fontSize(12).text(`CUIT: ${qualificationData.cuit}`)
    doc.text(`Razón social: ${qualificationData.companyName}`)
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`)
    doc.moveDown()

    doc.fontSize(14).text("Resultados Financieros", { underline: true })
    doc.moveDown(0.5)

    doc.fontSize(12).text(`Score Final: ${qualificationData.score}`)
    doc.text(`Nivel de Riesgo: ${qualificationData.riskLevel}`)
    doc.text(`Capacidad financiera: $${qualificationData.suggestedLimit}`)
    doc.moveDown()

    doc.fontSize(14).text("Detalle Analítico", { underline: true })
    doc.moveDown(0.5)

    qualificationData.details.forEach((item) => {
      doc.fontSize(12).text(`• ${item.label}: ${item.value}`)
    })

    doc.end()

    stream.on("finish", () => resolve(pdfPath))
    stream.on("error", reject)
  })
}
