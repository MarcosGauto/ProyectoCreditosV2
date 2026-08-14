import {
  addGrupoNucleoLogoToJsPdf,
  stampGrupoNucleoLogoOnAllJsPdfPages,
} from "@/lib/pdfBranding"
import { SHOW_CAPACIDAD_FINANCIERA } from "@/config/creditAnalysis"

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} maxWidth
 * @param {number} lineHeight
 * @returns {number}
 */
function writeParagraph(doc, text, x, y, maxWidth, lineHeight = 5.5) {
  const lines = doc.splitTextToSize(String(text ?? ""), maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {string} title
 * @param {number} x
 * @param {number} y
 * @param {number} maxWidth
 * @returns {number}
 */
function writeSectionTitle(doc, title, x, y, maxWidth) {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(30, 30, 30)
  const nextY = writeParagraph(doc, title, x, y, maxWidth, 6)
  doc.setDrawColor(180, 30, 30)
  doc.setLineWidth(0.4)
  doc.line(x, nextY + 1, x + maxWidth, nextY + 1)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  return nextY + 6
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {number} y
 * @param {number} margin
 * @param {number} pageHeight
 * @param {number} needed
 * @returns {number}
 */
function ensureSpace(doc, y, margin, pageHeight, needed) {
  if (y + needed > pageHeight - margin) {
    doc.addPage()
    return margin
  }
  return y
}

/**
 * @param {ReturnType<import("@/lib/generateProfessionalCreditReport").generateProfessionalCreditReport>} report
 */
export async function generateCreditReportPdf(report) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "mm", format: "a4" })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18
  const contentWidth = pageWidth - margin * 2
  let y = margin

  doc.setFillColor(30, 30, 30)
  doc.rect(0, 0, pageWidth, 28, "F")
  await addGrupoNucleoLogoToJsPdf(doc, {
    pageNumber: 1,
    x: margin,
    y: 6,
    size: 16,
    align: "left",
  })
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("INFORME DE ANÁLISIS CREDITICIO", margin + 20, 12)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("Grupo Núcleo · Área de Riesgo Crediticio", margin + 20, 19)

  y = 36
  doc.setTextColor(30, 30, 30)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text(String(report.meta.razonSocial), margin, y)
  y += 7

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  const fechaStr = (() => {
    try {
      return new Date(report.meta.fecha).toLocaleString("es-AR", {
        dateStyle: "long",
        timeStyle: "short",
      })
    } catch {
      return String(report.meta.fecha)
    }
  })()

  doc.text(`CUIT: ${report.meta.cuit}`, margin, y)
  y += 5
  doc.text(`Analista: ${report.meta.analista}`, margin, y)
  y += 5
  doc.text(`Fecha: ${fechaStr}`, margin, y)
  y += 10

  doc.setFillColor(245, 245, 245)
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, "F")
  doc.setTextColor(30, 30, 30)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("RESULTADO", margin + 4, y + 8)
  doc.setFontSize(12)
  doc.text(String(report.conclusionFinal.resultado), margin + 4, y + 16)

  const kpiX = margin + contentWidth / 2
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  if (SHOW_CAPACIDAD_FINANCIERA) {
    doc.text(
      `Capacidad financiera: ${report.resumenEjecutivo.kpis.capacidadFinanciera ?? report.resumenEjecutivo.kpis.creditoSugerido}`,
      kpiX,
      y + 8
    )
    doc.text(
      `Crédito otorgado: ${report.resumenEjecutivo.kpis.creditoOtorgado ?? "—"}`,
      kpiX,
      y + 14
    )
    doc.text(
      `Score financiero: ${report.resumenEjecutivo.kpis.scoreFinanciero} · NOSIS: ${report.resumenEjecutivo.kpis.scoreNosis}`,
      kpiX,
      y + 20
    )
    doc.text(
      `BCRA: ${report.resumenEjecutivo.kpis.situacionBcra}`,
      kpiX,
      y + 26
    )
  } else {
    doc.text(
      `Crédito otorgado: ${report.resumenEjecutivo.kpis.creditoOtorgado ?? "—"}`,
      kpiX,
      y + 8
    )
    doc.text(
      `Score financiero: ${report.resumenEjecutivo.kpis.scoreFinanciero} · NOSIS: ${report.resumenEjecutivo.kpis.scoreNosis}`,
      kpiX,
      y + 14
    )
    doc.text(
      `BCRA: ${report.resumenEjecutivo.kpis.situacionBcra}`,
      kpiX,
      y + 20
    )
  }
  y += 40

  if (SHOW_CAPACIDAD_FINANCIERA && report.capacidadFinanciera) {
    y = ensureSpace(doc, y, margin, pageHeight, 42)
    y = writeSectionTitle(doc, "Capacidad financiera", margin, y, contentWidth)
    y =
      writeParagraph(
        doc,
        report.capacidadFinanciera.descripcion,
        margin,
        y,
        contentWidth
      ) + 4
    y = writeParagraph(
      doc,
      `Importe: ${report.capacidadFinanciera.monto}`,
      margin,
      y,
      contentWidth
    )
    y += 2
    y = writeParagraph(
      doc,
      `• Capacidad por patrimonio: ${report.capacidadFinanciera.porPatrimonio} (${report.capacidadFinanciera.formulaPatrimonio})`,
      margin,
      y,
      contentWidth
    )
    y += 2
    y = writeParagraph(
      doc,
      `• Capacidad por flujo IVA: ${report.capacidadFinanciera.porFlujo} (${report.capacidadFinanciera.formulaFlujo})`,
      margin,
      y,
      contentWidth
    )
    y += 2
    y = writeParagraph(
      doc,
      report.capacidadFinanciera.formulaTotal,
      margin,
      y,
      contentWidth
    )
    if (report.capacidadFinanciera.criterioLimitante) {
      y += 2
      y = writeParagraph(
        doc,
        `Criterio limitante: ${report.capacidadFinanciera.criterioLimitante}`,
        margin,
        y,
        contentWidth
      )
    }
    y += 6
  }

  const sections = [
    {
      title: "1. Resumen ejecutivo",
      body: report.resumenEjecutivo.narrativa,
    },
    {
      title: "2. Análisis financiero",
      body: report.analisisFinanciero.narrativa,
    },
    {
      title: "3. Análisis comercial",
      body: report.analisisComercial.narrativa,
    },
    {
      title: "4. Análisis NOSIS",
      body: report.analisisNosis.narrativa,
    },
    {
      title: "5. Análisis BCRA",
      body: report.analisisBcra.narrativa,
    },
    {
      title: "6. Análisis fiscal",
      body: report.analisisFiscal.narrativa,
    },
  ]

  for (const section of sections) {
    y = ensureSpace(doc, y, margin, pageHeight, 30)
    y = writeSectionTitle(doc, section.title, margin, y, contentWidth)
    y = writeParagraph(doc, section.body, margin, y, contentWidth) + 6
  }

  const analisisIA = report.analisisFinanciero?.analisisIA
  const analisisIATexto =
    analisisIA &&
    typeof analisisIA === "object" &&
    (typeof analisisIA.texto === "string"
      ? analisisIA.texto.trim()
      : Array.isArray(analisisIA.lineas)
        ? analisisIA.lineas.join("\n")
        : "")

  if (analisisIATexto) {
    y = ensureSpace(doc, y, margin, pageHeight, 30)
    y = writeSectionTitle(doc, "Análisis IA", margin, y, contentWidth)
    y = writeParagraph(doc, analisisIATexto, margin, y, contentWidth) + 6
  }

  y = ensureSpace(doc, y, margin, pageHeight, 25)
  y = writeSectionTitle(doc, "7. Fortalezas", margin, y, contentWidth)
  for (const item of report.fortalezas) {
    y = ensureSpace(doc, y, margin, pageHeight, 8)
    y = writeParagraph(doc, `• ${item}`, margin + 2, y, contentWidth - 2) + 2
  }
  y += 4

  y = ensureSpace(doc, y, margin, pageHeight, 25)
  y = writeSectionTitle(doc, "8. Debilidades", margin, y, contentWidth)
  for (const item of report.debilidades) {
    y = ensureSpace(doc, y, margin, pageHeight, 8)
    y = writeParagraph(doc, `• ${item}`, margin + 2, y, contentWidth - 2) + 2
  }
  y += 4

  y = ensureSpace(doc, y, margin, pageHeight, 30)
  y = writeSectionTitle(doc, "9. Conclusión final", margin, y, contentWidth)
  y = writeParagraph(doc, report.conclusionFinal.narrativa, margin, y, contentWidth)

  if (report.conclusionFinal.recomendacionAnalista) {
    y += 4
    y = ensureSpace(doc, y, margin, pageHeight, 20)
    y = writeSectionTitle(
      doc,
      "Observaciones del analista",
      margin,
      y,
      contentWidth
    )
    writeParagraph(
      doc,
      report.conclusionFinal.recomendacionAnalista,
      margin,
      y,
      contentWidth
    )
  }

  await stampGrupoNucleoLogoOnAllJsPdfPages(doc, {
    size: 10,
    y: 6,
    rightMargin: margin,
  })

  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    doc.setFontSize(8)
    doc.setTextColor(130, 130, 130)
    doc.text(
      `Página ${page} de ${totalPages} · Grupo Núcleo · Documento confidencial`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    )
  }

  const safeName = String(report.meta.cuit).replace(/\D/g, "")
  doc.save(`informe-crediticio-${safeName}.pdf`)
}
