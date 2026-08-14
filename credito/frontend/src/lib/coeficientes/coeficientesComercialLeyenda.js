/**
 * Leyenda aclaratoria para Coeficientes Comerciales (pantalla y PDF).
 */

/** @type {Array<{ title: string; body: string; bullets?: string[] }>} */
export const COEFICIENTES_COMERCIAL_LEYENDA_ITEMS = [
  {
    title: "(*) ACUERDO BANCARIO",
    body: "Aplica para todas las tarjetas VISA, MASTER y CABAL de todos los bancos, exceptuando:",
    bullets: ["Santander", "Galicia", "BBVA", "Banco Nación", "Macro"],
  },
  {
    title: "(**) BANCARIAS GENERALES",
    body: "Aplica exclusivamente para las tarjetas VISA, MASTER y CABAL emitidas por:",
    bullets: ["Santander", "Galicia", "BBVA", "Banco Nación", "Macro"],
  },
  {
    title: "VISA MASTER ESTÁNDAR",
    body: "Corresponde a tarjetas no bancarias, sin convenio bancario.",
  },
];

/**
 * @param {string[]} bullets
 */
export function formatLeyendaBulletsInline(bullets) {
  return bullets.join(" · ");
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {number} startY
 * @param {number} contentWidth
 * @param {number} marginLeft
 * @returns {number}
 */
export function drawCoeficientesComercialLeyendaPdf(
  doc,
  startY,
  contentWidth,
  marginLeft
) {
  const textoGris = [107, 114, 128];
  const tituloGris = [75, 85, 99];
  const colGap = 4;
  const colWidth = (contentWidth - colGap * 2) / 3;
  const lineH = 3;
  const fontSize = 6.5;
  const titleSize = 7;

  /** @type {number[]} */
  const colEnds = [];

  COEFICIENTES_COMERCIAL_LEYENDA_ITEMS.forEach((item, index) => {
    const x = marginLeft + index * (colWidth + colGap);
    let y = startY;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(titleSize);
    doc.setTextColor(...tituloGris);
    const titleLines = doc.splitTextToSize(item.title, colWidth);
    doc.text(titleLines, x, y);
    y += titleLines.length * lineH + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(...textoGris);
    const bodyLines = doc.splitTextToSize(item.body, colWidth);
    doc.text(bodyLines, x, y);
    y += bodyLines.length * lineH;

    if (item.bullets?.length) {
      y += 0.6;
      const bulletText = formatLeyendaBulletsInline(item.bullets);
      const bulletLines = doc.splitTextToSize(bulletText, colWidth);
      doc.text(bulletLines, x, y);
      y += bulletLines.length * lineH;
    }

    colEnds.push(y);

    if (index < COEFICIENTES_COMERCIAL_LEYENDA_ITEMS.length - 1) {
      const dividerX = x + colWidth + colGap / 2;
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.15);
      doc.line(dividerX, startY - 1, dividerX, y + 1);
    }
  });

  return Math.max(...colEnds, startY) + 1.5;
}
