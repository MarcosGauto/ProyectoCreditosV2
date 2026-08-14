/**
 * Parser CLIPER por OCR + regex.
 * Fila: Cuotas | Coeficiente | TNA | TEA | CFT
 * Se importa cuotas + coeficiente (columnas 1 y 2).
 */

import { parseCoeficienteValue } from "@/lib/coeficientes/parseCoeficientesMatrix";
import { isCuotasToken, parseCuotasToken } from "@/lib/coeficientes/parsers/parserUtils";

/** @typedef {import("./parserUtils").ImportPreviewRow} ImportPreviewRow */

/** Cuotas + coeficiente */
export const CLIPER_ROW_REGEX = /(\d{1,2})\s+(\d[.,]\d{4})/g;

/**
 * @param {string} token
 */
function normalizeCoefToken(token) {
  return String(token ?? "")
    .trim()
    .replace(/%$/, "")
    .replace(/^[lI|]/, "1");
}

/**
 * Coeficiente CLIPER (punto decimal para almacenamiento).
 * @param {string} coefRaw
 */
export function formatCliperCoefRaw(coefRaw) {
  return normalizeCoefToken(coefRaw).replace(",", ".");
}

/**
 * @param {string} coefRaw
 */
function isValidCliperCoeficiente(coefRaw) {
  const normalized = formatCliperCoefRaw(coefRaw);
  if (!/^\d\.\d{4}$/.test(normalized)) {
    return false;
  }
  const val = parseCoeficienteValue(normalized);
  return Number.isFinite(val) && val >= 1 && val <= 5;
}

/**
 * @param {string} trimmed
 */
function isCliperDataRow(trimmed) {
  return /^\d{1,2}\s+\d[.,]\d{4}/.test(trimmed);
}

/**
 * @param {string} line
 */
export function getCliperLineDiscardReason(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  if (isCliperDataRow(trimmed)) {
    return null;
  }
  if (/\btna\b/i.test(trimmed)) {
    return "TNA";
  }
  if (/\btea\b/i.test(trimmed)) {
    return "TEA";
  }
  if (/\bcft\b/i.test(trimmed)) {
    return "CFT";
  }
  if (/\bcuotas?\b/i.test(trimmed)) {
    return "Cuotas";
  }
  if (/\bcoeficientes?\b/i.test(trimmed)) {
    return "Coeficiente";
  }
  return null;
}

/**
 * @param {number} cuotas
 * @param {string} coefRaw
 */
export function formatCliperDetectedLine(cuotas, coefRaw) {
  return `${cuotas} -> ${coefRaw}`;
}

/**
 * @param {string} line
 * @param {number} lineNumber
 */
function parseCliperRegexLine(line, lineNumber) {
  const trimmed = line.trim();
  if (!trimmed) {
    return { ok: false, skip: true };
  }

  const discardReason = getCliperLineDiscardReason(trimmed);
  if (discardReason) {
    return {
      ok: false,
      reason: discardReason,
      line: trimmed,
      lineNumber,
    };
  }

  const fullMatch = trimmed.match(
    /^\s*(\d{1,2})\s+(\d[.,]\d{4})(?:\s+\S+)*\s*$/
  );
  if (fullMatch) {
    const cuotasRaw = fullMatch[1];
    const coefRaw = formatCliperCoefRaw(fullMatch[2]);
    if (isCuotasToken(cuotasRaw) && isValidCliperCoeficiente(coefRaw)) {
      const cuotasNum = Number(cuotasRaw);
      return {
        ok: true,
        cuotasRaw,
        coefRaw,
        coeficienteBase: parseCoeficienteValue(coefRaw),
        line: formatCliperDetectedLine(cuotasNum, coefRaw),
        lineNumber,
      };
    }
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const cuotasRaw = tokens[0]?.replace(/[^\d]/g, "");
  if (!/^\d{1,2}$/.test(cuotasRaw ?? "") || tokens.length < 2) {
    return {
      ok: false,
      reason: "Fila CLIPER no interpretada",
      line: trimmed,
      lineNumber,
    };
  }

  const coefRaw = formatCliperCoefRaw(tokens[1]);
  if (!isCuotasToken(cuotasRaw) || !isValidCliperCoeficiente(coefRaw)) {
    return {
      ok: false,
      reason: "Cuotas o coeficiente inválidos",
      line: trimmed,
      lineNumber,
    };
  }

  const cuotasNum = Number(cuotasRaw);
  return {
    ok: true,
    cuotasRaw,
    coefRaw,
    coeficienteBase: parseCoeficienteValue(coefRaw),
    line: formatCliperDetectedLine(cuotasNum, coefRaw),
    lineNumber,
  };
}

/**
 * @param {string} rawText
 */
export function parseCliperRegexFromText(rawText) {
  console.log("[CLIPER Regex] Texto OCR para parseo:\n", rawText);

  /** @type {ImportPreviewRow[]} */
  const rows = [];
  /** @type {NonNullable<import("./parserTypes").AcquirerParseDebug["ocrDetectedRows"]>} */
  const ocrDetectedRows = [];
  /** @type {NonNullable<import("./parserTypes").AcquirerParseDebug["ocrDiscardedRows"]>} */
  const ocrDiscardedRows = [];
  /** @type {Set<number>} */
  const seenCuotas = new Set();

  const lines = String(rawText ?? "").split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const result = parseCliperRegexLine(lines[i], i + 1);
    if (result.skip) continue;

    if (result.ok) {
      const cuotasNum = Number(result.cuotasRaw);
      if (seenCuotas.has(cuotasNum)) {
        ocrDiscardedRows.push({
          lineNumber: result.lineNumber,
          line: result.line,
          reason: `Cuotas ${cuotasNum} duplicada`,
        });
        continue;
      }
      seenCuotas.add(cuotasNum);
      rows.push({
        cuotas: parseCuotasToken(result.cuotasRaw),
        coefRaw: result.coefRaw,
        coeficienteBase: result.coeficienteBase,
        invalid: false,
      });
      ocrDetectedRows.push({
        lineNumber: result.lineNumber,
        line: result.line,
        cuotas: cuotasNum,
        coeficiente: result.coeficienteBase,
      });
    } else if (result.line) {
      ocrDiscardedRows.push({
        lineNumber: result.lineNumber,
        line: result.line,
        reason: result.reason,
      });
    }
  }

  if (rows.length === 0) {
    CLIPER_ROW_REGEX.lastIndex = 0;
    let match;
    while ((match = CLIPER_ROW_REGEX.exec(rawText)) !== null) {
      const cuotasRaw = match[1];
      const coefRaw = formatCliperCoefRaw(match[2]);
      const cuotasNum = Number(cuotasRaw);

      if (!isCuotasToken(cuotasRaw) || !isValidCliperCoeficiente(coefRaw)) {
        ocrDiscardedRows.push({
          lineNumber: 0,
          line: match[0].trim(),
          reason: "Coincidencia global inválida",
        });
        continue;
      }

      if (seenCuotas.has(cuotasNum)) continue;

      seenCuotas.add(cuotasNum);
      const coeficienteBase = parseCoeficienteValue(coefRaw);
      rows.push({
        cuotas: parseCuotasToken(cuotasRaw),
        coefRaw,
        coeficienteBase,
        invalid: false,
      });
      ocrDetectedRows.push({
        lineNumber: 0,
        line: formatCliperDetectedLine(cuotasNum, coefRaw),
        cuotas: cuotasNum,
        coeficiente: coeficienteBase,
      });
    }
  }

  console.log("[CLIPER Regex] Filas detectadas:", ocrDetectedRows.length);
  console.log("[CLIPER Regex] Filas descartadas:", ocrDiscardedRows.length);

  return { rows, ocrDetectedRows, ocrDiscardedRows };
}
