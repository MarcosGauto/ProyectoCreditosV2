import { getTarjetasCache } from "@/lib/coeficientes/coeficientesTarjetasCache";
import {
  buildCardHeaderPatterns,
  resolveTarjetaCodigo,
} from "@/lib/coeficientes/coeficientesTarjetasModel";
import {
  normalizeCuotasLabel,
  numOr,
  sortImportRecords,
} from "@/lib/coeficientes/coeficientesVigentesModel";

/**
 * @typedef {{
 *   coeficienteBase: number;
 *   raw: string;
 *   ambiguous: boolean;
 * }} MatrixCell
 */

/**
 * @typedef {{
 *   cuotas: string | number;
 *   cells: Record<string, MatrixCell>;
 *   invalid?: boolean;
 * }} MatrixRow
 */

/**
 * @typedef {{
 *   cards: string[];
 *   rows: MatrixRow[];
 * }} ImportMatrix
 */

const CUOTAS_HEADER = /cuotas?|plazo|plan/i;

/**
 * @param {string} text
 */
export function parseCoeficienteValue(text) {
  const raw = String(text ?? "").trim();
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");
  return numOr(cleaned, NaN);
}

/**
 * @param {string} raw
 * @param {number} parsed
 */
export function isAmbiguousCell(raw, parsed) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return true;
  if (!Number.isFinite(parsed)) return true;
  if (parsed < 0) return true;

  const withoutDebito = trimmed.replace(/d[eé]bito/gi, "");
  if (/[a-wyzA-WYZ]/.test(withoutDebito)) return true;
  if (/[oOlI]/.test(trimmed) && /\d/.test(trimmed)) return true;
  if (parsed > 500) return true;

  return false;
}

/**
 * @param {string} text
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} [tarjetas]
 */
function detectCardFromHeader(text, tarjetas) {
  const cell = String(text ?? "").trim();
  if (!cell || CUOTAS_HEADER.test(cell)) return null;

  const list = tarjetas ?? getTarjetasCache();
  for (const { codigo, pattern } of buildCardHeaderPatterns(list)) {
    if (pattern.test(cell)) return codigo;
  }

  const resolved = resolveTarjetaCodigo(cell, list);
  return resolved.length >= 2 ? resolved : null;
}

/**
 * @param {string[]} headerRow
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} [tarjetas]
 */
export function detectMatrixHeader(headerRow, tarjetas) {
  const cells = headerRow.map((c) => String(c ?? "").trim());
  const cuotasIdx = cells.findIndex((c) => CUOTAS_HEADER.test(c));
  if (cuotasIdx < 0) return null;

  /** @type {string[]} */
  const cards = [];
  /** @type {number[]} */
  const cardIndices = [];

  cells.forEach((cell, idx) => {
    if (idx === cuotasIdx) return;
    const card = detectCardFromHeader(cell, tarjetas);
    if (card) {
      cards.push(card);
      cardIndices.push(idx);
    }
  });

  if (!cards.length) return null;
  return { cuotasIdx, cards, cardIndices };
}

/**
 * @param {string} text
 */
export function isCuotasLabel(text) {
  const t = String(text ?? "").trim();
  if (!t) return false;
  if (CUOTAS_HEADER.test(t)) return false;
  if (/^d[eé]bito$/i.test(t)) return true;
  if (/^\d+$/.test(t)) return true;
  if (/^\d+\s*cuotas?$/i.test(t)) return true;
  return false;
}

/**
 * @param {string[][]} matrix
 * @param {number} headerIdx
 * @param {{ cuotasIdx: number; cards: string[]; cardIndices: number[] }} header
 * @param {string} [source]
 */
export function parseMatrixTable(matrix, headerIdx, header, source = "matrix") {
  /** @type {MatrixRow[]} */
  const rows = [];
  const warnings = [];

  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const line = matrix[i].map((c) => String(c ?? "").trim());
    if (line.every((c) => !c)) continue;

    const cuotasRaw = line[header.cuotasIdx] ?? line[0];
    if (!isCuotasLabel(cuotasRaw)) continue;

    const cuotas = normalizeCuotasLabel(cuotasRaw);
    /** @type {Record<string, MatrixCell>} */
    const cells = {};

    header.cards.forEach((card, cardPos) => {
      const colIdx = header.cardIndices[cardPos];
      const raw = line[colIdx] ?? "";
      const coeficienteBase = parseCoeficienteValue(raw);
      const ambiguous = isAmbiguousCell(raw, coeficienteBase);

      if (!Number.isFinite(coeficienteBase)) {
        warnings.push(
          `Fila "${cuotas}" · ${card}: valor no reconocido "${raw}".`
        );
      }

      cells[card] = {
        coeficienteBase: Number.isFinite(coeficienteBase) ? coeficienteBase : 0,
        raw: String(raw),
        ambiguous,
      };
    });

    rows.push({ cuotas, cells });
  }

  if (!rows.length) {
    warnings.push("No se detectaron filas de cuotas en la tabla.");
  }

  return {
    source,
    matrix: { cards: header.cards, rows },
    records: [],
    detectedCards: header.cards,
    warnings,
  };
}

/**
 * @param {string[][]} matrix
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} [tarjetas]
 */
export function tryParseMatrixTable(matrix, tarjetas) {
  for (let i = 0; i < Math.min(matrix.length, 20); i++) {
    const header = detectMatrixHeader(matrix[i], tarjetas);
    if (header) {
      return parseMatrixTable(matrix, i, header, "matrix");
    }
  }
  return null;
}

/**
 * @param {ImportMatrix} matrix
 * @param {string} card
 */
export function matrixColumnToRecords(matrix, card) {
  /** @type {import("./parseCoeficientesMatrix").ParsedImportRecord[]} */
  const records = [];

  for (const row of matrix.rows) {
    const cell = row.cells[card];
    if (!cell) continue;
    const value = parseCoeficienteValue(cell.raw);
    if (!Number.isFinite(value) || value <= 0) continue;
    records.push({
      cuotas: row.cuotas,
      coeficienteBase: value,
    });
  }

  return sortImportRecords(records);
}

/**
 * @param {ImportMatrix} matrix
 */
export function matrixHasAmbiguousCells(matrix) {
  return matrix.rows.some((row) =>
    Object.values(row.cells).some((cell) => cell.ambiguous)
  );
}

/**
 * @param {ImportMatrix} matrix
 */
export function countAmbiguousCells(matrix) {
  let count = 0;
  for (const row of matrix.rows) {
    for (const cell of Object.values(row.cells)) {
      if (cell.ambiguous) count += 1;
    }
  }
  return count;
}
