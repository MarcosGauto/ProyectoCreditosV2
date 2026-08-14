import {
  getTarjetaDisplayLabel,
  normalizeTarjetaCodigo,
} from "@/lib/coeficientes/coeficientesTarjetasModel";

/** @type {Record<string, [string, string]>} */
export const COEF_FINAL_HEADER_LINES = {
  VISA_MASTER_ESTANDAR: ["VISA MASTER", "ESTÁNDAR"],
  ACUERDO_BANCARIO: ["VISA/MASTER/CABAL", "ACUERDO (*)"],
  BANCARIAS_GENERALES: ["VISA/MASTER/CABAL", "BANCARIAS (**)"],
  MERCADO_PAGO: ["MERCADO", "PAGO"],
};

/**
 * Líneas de encabezado para columnas de tarjeta (pantalla y PDF).
 * @param {string} card
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} tarjetas
 * @returns {string[]}
 */
export function getCoefFinalHeaderLines(card, tarjetas) {
  const codigo = normalizeTarjetaCodigo(card);
  const preset = COEF_FINAL_HEADER_LINES[codigo];
  if (preset) return preset;

  const label = getTarjetaDisplayLabel(card, tarjetas).toUpperCase();
  if (label.length <= 14) return [label];

  const slashIdx = label.indexOf("/");
  if (slashIdx > 0) {
    const spaceAfter = label.indexOf(" ", slashIdx);
    if (spaceAfter > 0) {
      return [label.slice(0, spaceAfter).trim(), label.slice(spaceAfter + 1).trim()];
    }
  }

  const lastSpace = label.lastIndexOf(" ");
  if (lastSpace > 0) {
    return [label.slice(0, lastSpace), label.slice(lastSpace + 1)];
  }

  return [label];
}

/**
 * Encabezado PDF con salto de línea para columnas estrechas.
 * @param {string} card
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} tarjetas
 */
export function formatCoefFinalPdfHeader(card, tarjetas) {
  return getCoefFinalHeaderLines(card, tarjetas).join("\n");
}

/**
 * Anchos de columna equilibrados para tabla Coeficientes finales en PDF.
 * @param {number} cardCount
 * @param {number} contentWidth
 * @param {{ cuotasWidth?: number; minCardWidth?: number }} [options]
 */
export function buildCoefFinalPdfColumnStyles(
  cardCount,
  contentWidth,
  options = {}
) {
  const cuotasWidth = options.cuotasWidth ?? 18;
  const minCardWidth = options.minCardWidth ?? 13;

  if (cardCount <= 0) {
    return { 0: { halign: "left", fontStyle: "bold", cellWidth: cuotasWidth } };
  }

  const available = Math.max(contentWidth - cuotasWidth, minCardWidth * cardCount);
  const cardWidth = Math.max(minCardWidth, available / cardCount);

  /** @type {Record<number, object>} */
  const columnStyles = {
    0: { halign: "left", fontStyle: "bold", cellWidth: cuotasWidth },
  };

  for (let i = 1; i <= cardCount; i++) {
    columnStyles[i] = {
      cellWidth: cardWidth,
      halign: "center",
      valign: "middle",
    };
  }

  return columnStyles;
}
