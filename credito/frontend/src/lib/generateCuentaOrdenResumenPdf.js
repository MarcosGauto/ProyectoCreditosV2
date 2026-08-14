import autoTable from "jspdf-autotable";

import {
  addGrupoNucleoLogoToJsPdf,
  loadGrupoNucleoLogoImage,
} from "@/lib/pdfBranding";

/** @type {readonly [number, number, number]} */
const COLOR_BLACK = [26, 26, 26];
/** @type {readonly [number, number, number]} */
const COLOR_RED = [229, 57, 53];
/** @type {readonly [number, number, number]} */
const COLOR_GRAY_BG = [245, 245, 245];
/** @type {readonly [number, number, number]} */
const COLOR_GRAY_BORDER = [217, 217, 217];
/** @type {readonly [number, number, number]} */
const COLOR_RED_SOFT_BG = [253, 236, 236];
/** @type {readonly [number, number, number]} */
const COLOR_MUTED = [110, 110, 110];
/** @type {readonly [number, number, number]} */
const COLOR_WHITE = [255, 255, 255];

const MARGIN = 16;
const CARD_GAP = 3;
const FOOTER_RESERVE = 20;

/**
 * @param {number} value
 * @returns {string}
 */
function formatMoney(value) {
  return `$ ${Number(value || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * @param {number} pageHeight
 * @param {number} generalItemCount
 * @param {number} tableBodyRows
 */
function computeSinglePageLayout(pageHeight, generalItemCount, tableBodyRows) {
  const headerHeight = 38;
  const generalRows = Math.ceil(generalItemCount / 2);
  const generalBlockHeight = generalRows * 11 + 7;
  const cardHeight = 22;
  const sectionGaps = 7 + 8 + 5;
  const tableTitleHeight = 5;

  const contentBeforeTable =
    MARGIN +
    headerHeight +
    generalBlockHeight +
    sectionGaps +
    cardHeight +
    tableTitleHeight;

  const tableStartY = contentBeforeTable;
  const availableTableHeight =
    pageHeight - FOOTER_RESERVE - tableStartY - 2;
  const totalTableRows = tableBodyRows + 1;
  const rowHeight = availableTableHeight / Math.max(totalTableRows, 1);

  const fontSize = Math.min(10, Math.max(7.2, rowHeight * 0.42));
  const headFontSize = Math.min(9.2, Math.max(7, fontSize - 0.3));
  const cellPad = Math.min(3, Math.max(1.1, (rowHeight - fontSize * 0.35) / 2));
  const accentFontSize = Math.min(12, Math.max(9, fontSize + 1.8));

  return {
    headerHeight,
    generalRowHeight: 11,
    generalPadding: 7,
    generalGapAfter: 7,
    cardHeight,
    cardGapAfter: 8,
    tableTitleHeight,
    tableStartY,
    rowHeight,
    fontSize,
    headFontSize,
    cellPad,
    accentFontSize,
    titleFontSize: 18,
    logoHeight: 10,
  };
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} lineHeight
 */
function drawWrappedText(doc, text, x, y, w, h, lineHeight) {
  const lines = doc.splitTextToSize(String(text ?? "—"), w);
  const maxLines = Math.max(1, Math.floor(h / lineHeight));
  doc.text(lines.slice(0, maxLines), x, y);
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {{
 *   x: number;
 *   y: number;
 *   w: number;
 *   h: number;
 *   label: string;
 *   value: string;
 *   accent?: boolean;
 *   valueFontSize?: number;
 * }} card
 */
function drawSummaryCard(doc, card) {
  const {
    x,
    y,
    w,
    h,
    label,
    value,
    accent = false,
    valueFontSize = 10,
  } = card;

  doc.setDrawColor(...COLOR_GRAY_BORDER);
  doc.setLineWidth(0.2);
  doc.setFillColor(...(accent ? COLOR_RED_SOFT_BG : COLOR_WHITE));
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "FD");

  if (accent) {
    doc.setDrawColor(...COLOR_RED);
    doc.setLineWidth(0.5);
    doc.line(x + 2, y + h - 1, x + w - 2, y + h - 1);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(label.toUpperCase(), x + 3, y + 5.5);

  doc.setFont("helvetica", accent ? "bold" : "normal");
  doc.setFontSize(valueFontSize);
  doc.setTextColor(...(accent ? COLOR_RED : COLOR_BLACK));
  drawWrappedText(doc, value, x + 3, y + 12, w - 6, h - 14, 4.2);
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {number} pageWidth
 * @param {{ logoHeight: number; titleFontSize: number }} layout
 * @returns {Promise<number>}
 */
async function drawHeader(doc, pageWidth, layout) {
  const centerX = pageWidth / 2;
  let y = MARGIN;

  try {
    const { dataUrl, format, aspect } = await loadGrupoNucleoLogoImage();
    const logoWidth = layout.logoHeight * aspect;
    doc.addImage(
      dataUrl,
      format,
      centerX - logoWidth / 2,
      y,
      logoWidth,
      layout.logoHeight
    );
    y += layout.logoHeight + 5;
  } catch (error) {
    console.warn("[generateCuentaOrdenResumenPdf] logo", error);
    await addGrupoNucleoLogoToJsPdf(doc, {
      x: MARGIN,
      y,
      height: layout.logoHeight,
      align: "left",
    });
    y += layout.logoHeight + 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(layout.titleFontSize);
  doc.setTextColor(...COLOR_BLACK);
  doc.text("RESUMEN DE OPERACIÓN", centerX, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_MUTED);
  doc.text("Grupo Núcleo S.A.", centerX, y, { align: "center" });
  y += 4.5;
  doc.text("Cuenta y Orden", centerX, y, { align: "center" });
  y += 6;

  doc.setDrawColor(...COLOR_RED);
  doc.setLineWidth(0.7);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);

  return y + 7;
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {number} startY
 * @param {number} contentWidth
 * @param {Array<{ label: string; value: string }>} items
 * @param {{ generalRowHeight: number; generalPadding: number }} layout
 * @returns {number}
 */
function drawGeneralInfoGrid(doc, startY, contentWidth, items, layout) {
  const colGap = 6;
  const colWidth = (contentWidth - colGap) / 2;
  const rows = Math.ceil(items.length / 2);
  const boxHeight = rows * layout.generalRowHeight + layout.generalPadding;

  doc.setFillColor(...COLOR_GRAY_BG);
  doc.setDrawColor(...COLOR_GRAY_BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, startY, contentWidth, boxHeight, 1.5, 1.5, "FD");

  const baseY = startY + 5;
  items.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + 5 + col * (colWidth + colGap);
    const itemY = baseY + row * layout.generalRowHeight;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(item.label.toUpperCase(), x, itemY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_BLACK);
    drawWrappedText(doc, item.value, x, itemY + 3.8, colWidth - 3, 7, 3.5);
  });

  return startY + boxHeight + layout.generalGapAfter;
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {number} pageWidth
 * @param {number} pageHeight
 */
function drawFooter(doc, pageWidth, pageHeight) {
  const generatedAt = new Date().toLocaleString("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const footerY = pageHeight - 12;

  doc.setDrawColor(...COLOR_GRAY_BORDER);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, footerY - 5, pageWidth - MARGIN, footerY - 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text("Documento generado automáticamente", pageWidth / 2, footerY, {
    align: "center",
  });
  doc.text("Grupo Núcleo S.A.", pageWidth / 2, footerY + 3.5, {
    align: "center",
  });
  doc.text(generatedAt, pageWidth / 2, footerY + 7, { align: "center" });
}

/**
 * @param {{
 *   cliente: string;
 *   clienteGN: string;
 *   cuit: string;
 *   accion?: string;
 *   importeFacturaFinal: number;
 *   percepciones: number;
 *   importeFacturaSinIibb: number;
 *   costoGN: number;
 *   comisionPorcentaje: number;
 *   comisionGastoFc: number;
 *   margen: number;
 *   montoAcreditar: number;
 * }} data
 */
export async function generateCuentaOrdenResumenPdf(data) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;

  /** @type {Array<{ label: string; value: string }>} */
  const generalItems = [
    { label: "Cliente", value: data.cliente || "—" },
    { label: "Cliente GN", value: data.clienteGN || "—" },
    { label: "CUIT", value: data.cuit || "—" },
    {
      label: "Fecha de emisión",
      value: new Date().toLocaleDateString("es-AR", { dateStyle: "long" }),
    },
  ];

  if (String(data.accion ?? "").trim()) {
    generalItems.push({
      label: "Estado de la operación",
      value: String(data.accion).trim(),
    });
  }

  const tableBody = [
    ["Importe factura final", formatMoney(data.importeFacturaFinal)],
    ["Percepciones", formatMoney(data.percepciones)],
    ["Importe factura sin IIBB", formatMoney(data.importeFacturaSinIibb)],
    ["Costo GN", formatMoney(data.costoGN)],
    ["Comisión", `${(data.comisionPorcentaje * 100).toFixed(2)} %`],
    ["Comisión aplicada", formatMoney(data.comisionGastoFc)],
    ["Margen", formatMoney(data.margen)],
    ["Monto a acreditar", formatMoney(data.montoAcreditar)],
  ];

  const layout = computeSinglePageLayout(
    pageHeight,
    generalItems.length,
    tableBody.length
  );

  let y = await drawHeader(doc, pageWidth, layout);
  y = drawGeneralInfoGrid(doc, y, contentWidth, generalItems, layout);

  const cardWidth = (contentWidth - CARD_GAP * 3) / 4;
  const cards = [
    {
      label: "Factura final",
      value: formatMoney(data.importeFacturaFinal),
      accent: false,
      valueFontSize: 10,
    },
    {
      label: "Comisión",
      value: `${(data.comisionPorcentaje * 100).toFixed(2)} %`,
      accent: false,
      valueFontSize: 10,
    },
    {
      label: "Margen",
      value: formatMoney(data.margen),
      accent: false,
      valueFontSize: 10,
    },
    {
      label: "Monto a acreditar",
      value: formatMoney(data.montoAcreditar),
      accent: true,
      valueFontSize: layout.accentFontSize,
    },
  ];

  cards.forEach((card, index) => {
    drawSummaryCard(doc, {
      x: MARGIN + index * (cardWidth + CARD_GAP),
      y,
      w: cardWidth,
      h: layout.cardHeight,
      label: card.label,
      value: card.value,
      accent: card.accent,
      valueFontSize: card.valueFontSize,
    });
  });

  y += layout.cardHeight + layout.cardGapAfter;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_BLACK);
  doc.text("Detalle de la operación", MARGIN, y);
  y += layout.tableTitleHeight;

  const lastRowIndex = tableBody.length - 1;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_RESERVE },
    tableWidth: contentWidth,
    head: [["Concepto", "Valor"]],
    body: tableBody,
    theme: "plain",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: layout.fontSize,
      cellPadding: {
        top: layout.cellPad,
        right: 4,
        bottom: layout.cellPad,
        left: 4,
      },
      minCellHeight: layout.rowHeight,
      textColor: COLOR_BLACK,
      lineColor: COLOR_GRAY_BORDER,
      lineWidth: 0.2,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: COLOR_BLACK,
      textColor: COLOR_WHITE,
      fontStyle: "bold",
      fontSize: layout.headFontSize,
      minCellHeight: layout.rowHeight * 1.04,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.58, fontStyle: "normal" },
      1: { halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: COLOR_GRAY_BG,
    },
    didParseCell(hook) {
      if (hook.section !== "body") return;
      if (hook.row.index === lastRowIndex) {
        hook.cell.styles.fillColor = COLOR_RED_SOFT_BG;
        hook.cell.styles.textColor = COLOR_RED;
        hook.cell.styles.fontStyle = "bold";
        if (hook.column.index === 1) {
          hook.cell.styles.fontSize = layout.accentFontSize;
        }
      }
    },
  });

  drawFooter(doc, pageWidth, pageHeight);

  const safeCuit = String(data.cuit || "operacion").replace(/[^\w-]/g, "_");
  doc.save(`Operacion_${safeCuit}.pdf`);
}
