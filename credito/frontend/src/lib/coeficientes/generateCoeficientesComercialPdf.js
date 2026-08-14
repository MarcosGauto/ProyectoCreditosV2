import { normalizeCuotaComercialKey } from "@/lib/coeficientes/coeficientesComercialCuotasModel";
import {
  buildCoefFinalPdfColumnStyles,
  formatCoefFinalPdfHeader,
} from "@/lib/coeficientes/coeficientesComercialHeaderLabels";
import { buildTablasVigentesPdfPivot } from "@/lib/coeficientes/tablasVigentesDisplay";
import {
  buildComercialEmpresasCards,
  buildPdfEmpresasGroups,
  getPdfEmpresasColumnTitle,
  PYMENACION_COMERCIAL_AVISO,
} from "@/lib/coeficientes/coeficientesEmpresasModel";
import {
  drawPdfBrandsFooter,
  loadPdfBrandLogos,
  PDF_BRANDS_FOOTER_HEIGHT_MM,
} from "@/lib/coeficientes/pdfBrandLogos";
import { drawCoeficientesComercialLeyendaPdf } from "@/lib/coeficientes/coeficientesComercialLeyenda";
import { addGrupoNucleoLogoToJsPdf } from "@/lib/pdfBranding";

/** Paleta corporativa */
const C = {
  negro: [15, 15, 15],
  grisOscuro: [31, 31, 31],
  grisClaro: [209, 213, 219],
  grisFila: [243, 244, 246],
  rojo: [220, 38, 38],
  texto: [55, 55, 55],
  textoClaro: [107, 114, 128],
  blanco: [255, 255, 255],
};

const MARGIN = 12;
const FOOTER_HEIGHT = PDF_BRANDS_FOOTER_HEIGHT_MM;
const TABLE_BOTTOM_MARGIN = FOOTER_HEIGHT + 3;
const LEGEND_HEIGHT_EST = 14;
const SECTION_GAP = 4;

/**
 * @param {ReturnType<typeof buildComercialEmpresasCards>} empresasCards
 */
function estimateEmpresasSectionHeight(empresasCards) {
  const groups = buildPdfEmpresasGroups(empresasCards);
  if (!groups.length) return 0;

  let h = 9;
  for (const group of groups) {
    h += 8 + 14;
  }
  if (groups.some((g) => g.title === "PYMENACION")) {
    h += 12;
  }
  return h + SECTION_GAP;
}

/**
 * Calcula altura de fila y tipografía para que la tabla ocupe el espacio disponible.
 * @param {number} rowCount
 * @param {number} startY
 * @param {number} pageHeight
 * @param {number} empresasHeight
 */
function computeCoefTableLayout(rowCount, startY, pageHeight, empresasHeight) {
  const reservedBelow =
    TABLE_BOTTOM_MARGIN + LEGEND_HEIGHT_EST + SECTION_GAP + empresasHeight;
  const available = pageHeight - startY - 5 - reservedBelow;
  const totalRows = rowCount + 1;
  const rowHeight = available / Math.max(totalRows, 1);

  const fontSize = Math.min(8, Math.max(6.5, rowHeight * 0.42));
  const headFontSize = Math.min(7, Math.max(5.8, fontSize - 0.4));
  const cellPad = Math.min(2.2, Math.max(1.1, (rowHeight - fontSize * 0.38) / 2));
  const minCellHeight = rowHeight;
  const headMinH = rowHeight * 1.08;

  return { fontSize, cellPad, minCellHeight, headMinH, headFontSize };
}

/**
 * @param {number | null | undefined} value
 */
function formatCoefPdf(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "—";
  return (
    n.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

/**
 * @param {number | null | undefined} value
 */
function formatPctPdf(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "—";
  return (
    n.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

function formatCuotasLabel(cuotas) {
  if (cuotas === "Débito") return "Débito";
  return String(cuotas);
}

/**
 * @param {string | number} cuotas
 */
function isHighlightCuotaRow(cuotas) {
  const key = normalizeCuotaComercialKey(cuotas);
  if (key === "DEBITO" || key === "1") return true;
  const label = formatCuotasLabel(cuotas).toUpperCase();
  return label.includes("PLAN Z");
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {number} pageWidth
 * @param {number} pageHeight
 * @param {Awaited<ReturnType<typeof loadPdfBrandLogos>>} brandLogos
 */
function drawPageFooter(doc, pageWidth, pageHeight, brandLogos) {
  drawPdfBrandsFooter(doc, pageWidth, pageHeight, brandLogos);
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {number} pageWidth
 */
async function drawHeader(doc, pageWidth) {
  const logoHeight = 13;
  await addGrupoNucleoLogoToJsPdf(doc, {
    pageNumber: 1,
    align: "right",
    y: MARGIN - 1,
    height: logoHeight,
    rightMargin: MARGIN,
  });

  let y = MARGIN + 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...C.negro);
  doc.text("Grupo Núcleo S.A.", MARGIN, y);
  y += 6.5;

  doc.setFontSize(11);
  doc.setTextColor(...C.grisOscuro);
  doc.text("Coeficientes Comerciales Vigentes", MARGIN, y);
  y += 5;

  doc.setDrawColor(...C.rojo);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);

  return y + 6;
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {import("jspdf-autotable").default} autoTable
 * @param {number} startY
 * @param {number} contentWidth
 * @param {ReturnType<typeof buildComercialEmpresasCards>} empresasCards
 */
function drawFinanciamientoEmpresasSection(doc, autoTable, startY, contentWidth, empresasCards) {
  const groups = buildPdfEmpresasGroups(empresasCards);
  if (!groups.length) return startY;

  let y = startY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.rojo);
  doc.text("FINANCIAMIENTO EMPRESAS", MARGIN, y);
  y += 5;

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    if (gi > 0) y += 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.negro);
    doc.text(group.title, MARGIN, y);
    y += 4;

    const headers = group.lineas.map((l) =>
      getPdfEmpresasColumnTitle(l, group.title)
    );

    autoTable(doc, {
      startY: y,
      head: [["", ...headers]],
      body: [
        ["TNA", ...group.lineas.map((l) => formatPctPdf(l.tna))],
        ["Comisión", ...group.lineas.map((l) => formatPctPdf(l.comision))],
      ],
      margin: { left: MARGIN, right: MARGIN, bottom: TABLE_BOTTOM_MARGIN },
      tableWidth: contentWidth,
      rowPageBreak: "avoid",
      pageBreak: "avoid",
      styles: {
        fontSize: 7,
        cellPadding: { top: 1.6, right: 2, bottom: 1.6, left: 2 },
        textColor: C.texto,
        lineColor: C.grisClaro,
        lineWidth: 0.18,
        halign: "center",
        valign: "middle",
        minCellHeight: 7,
      },
      headStyles: {
        fillColor: C.grisOscuro,
        textColor: C.grisClaro,
        fontStyle: "bold",
        fontSize: 7,
        minCellHeight: 8,
      },
      columnStyles: {
        0: {
          halign: "left",
          fontStyle: "bold",
          fillColor: C.grisFila,
          textColor: C.textoClaro,
          cellWidth: 20,
        },
      },
    });

    y = (doc.lastAutoTable?.finalY ?? y) + 2.5;
  }

  const showAviso = groups.some((g) => g.title === "PYMENACION");
  if (showAviso) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    const noticeLines = doc.splitTextToSize(
      PYMENACION_COMERCIAL_AVISO,
      contentWidth - 6
    );
    const boxH = noticeLines.length * 3.2 + 4;
    doc.roundedRect(MARGIN, y, contentWidth, boxH, 1, 1, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.texto);
    doc.text(noticeLines, MARGIN + 3, y + 4);
    y += boxH + 2;
  }

  return y;
}

/**
 * @param {{
 *   vigentesRaw: Array<{ tarjeta: string; cuotas: string | number; coeficienteBase?: number }>;
 *   globales: import("./coeficientesCalculo").CoeficientesGlobales;
 *   consumoTarjetas: import("./coeficientesTarjetasModel").CoeficienteTarjeta[];
 *   empresasTarjetas: import("./coeficientesTarjetasModel").CoeficienteTarjeta[];
 *   financiaciones: import("./coeficientesEmpresasModel").EmpresaFinanciacion[];
 *   cuotasComercialesVisibles: string[] | null;
 * }} params
 */
export async function generateCoeficientesComercialPdf({
  vigentesRaw,
  globales,
  consumoTarjetas,
  empresasTarjetas,
  financiaciones,
  cuotasComercialesVisibles,
}) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;

  const empresasCards = buildComercialEmpresasCards(empresasTarjetas, financiaciones);
  const empresasHeight = estimateEmpresasSectionHeight(empresasCards);

  let y = await drawHeader(doc, pageWidth);

  const pdfPivot = buildTablasVigentesPdfPivot(
    vigentesRaw,
    globales,
    consumoTarjetas,
    cuotasComercialesVisibles
  );
  const cuotasRows = pdfPivot.cuotasRows;
  const cards = pdfPivot.cards;
  const tarjetas = pdfPivot.tarjetas;

  if (cards.length > 0) {
    const tableLayout = computeCoefTableLayout(
      cuotasRows.length,
      y + 4,
      pageHeight,
      empresasHeight
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.rojo);
    doc.text("COEFICIENTES FINALES", MARGIN, y);
    y += 5;

    const head = [
      "Cuotas",
      ...cards.map((c) => formatCoefFinalPdfHeader(c, tarjetas)),
    ];
    const body = cuotasRows.map((cuotas) => {
      const row = [formatCuotasLabel(cuotas)];
      for (const card of cards) {
        row.push(formatCoefPdf(pdfPivot.getCoefFinal(cuotas, card)));
      }
      return row;
    });

    const columnStyles = buildCoefFinalPdfColumnStyles(cards.length, contentWidth, {
      cuotasWidth: 18,
      minCardWidth: 12.5,
    });

    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      margin: { left: MARGIN, right: MARGIN, bottom: TABLE_BOTTOM_MARGIN },
      pageBreak: "avoid",
      rowPageBreak: "avoid",
      styles: {
        fontSize: tableLayout.fontSize,
        cellPadding: {
          top: tableLayout.cellPad,
          right: tableLayout.cellPad,
          bottom: tableLayout.cellPad,
          left: tableLayout.cellPad,
        },
        minCellHeight: tableLayout.minCellHeight,
        textColor: C.texto,
        lineColor: C.grisClaro,
        lineWidth: 0.15,
        valign: "middle",
        halign: "center",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: C.grisOscuro,
        textColor: C.grisClaro,
        fontStyle: "bold",
        fontSize: tableLayout.headFontSize,
        halign: "center",
        valign: "middle",
        minCellHeight: tableLayout.headMinH,
        cellPadding: {
          top: 1.2,
          right: 1,
          bottom: 1.2,
          left: 1,
        },
      },
      columnStyles,
      alternateRowStyles: { fillColor: [252, 252, 252] },
      didParseCell: (data) => {
        if (data.section === "head" && data.column.index > 0) {
          data.cell.styles.fontSize = tableLayout.headFontSize;
        }
        if (data.section === "body") {
          data.cell.styles.minCellHeight = tableLayout.minCellHeight;
        }
        if (data.section !== "body") return;
        const cuotas = cuotasRows[data.row.index];
        if (isHighlightCuotaRow(cuotas)) {
          data.cell.styles.fillColor = C.grisFila;
          if (data.column.index === 0) {
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
      tableWidth: contentWidth,
    });

    y = (doc.lastAutoTable?.finalY ?? y) + 3;
    y = drawCoeficientesComercialLeyendaPdf(doc, y, contentWidth, MARGIN);
    y += 3;
  }

  if (empresasCards.length > 0) {
    const footerTop = pageHeight - FOOTER_HEIGHT;
    const empresasStart = Math.max(y, footerTop - empresasHeight);
    y = drawFinanciamientoEmpresasSection(
      doc,
      autoTable,
      empresasStart,
      contentWidth,
      empresasCards
    );
  }

  const brandLogos = await loadPdfBrandLogos(24);

  doc.setPage(1);
  drawPageFooter(doc, pageWidth, pageHeight, brandLogos);

  doc.save(`coeficientes-comerciales-${new Date().toISOString().slice(0, 10)}.pdf`);
}
