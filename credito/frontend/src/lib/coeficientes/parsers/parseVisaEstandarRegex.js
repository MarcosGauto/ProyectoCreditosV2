/**
 * Parser VISA / MASTER ESTÁNDAR por OCR + regex.
 * Fila: Cuotas | TNA | Coeficiente | Coeficiente con IVA
 * Se importa columna 1 (cuotas) y columna 3 (coeficiente).
 */

import { parseCoeficienteValue } from "@/lib/coeficientes/parseCoeficientesMatrix";
import { isCuotasToken, parseCuotasToken } from "@/lib/coeficientes/parsers/parserUtils";

/** @typedef {import("./parserUtils").ImportPreviewRow} ImportPreviewRow */

/** Cuotas + TNA + coeficiente (sin IVA) */
export const VISA_ESTANDAR_ROW_REGEX =
  /(\d{1,2})\s+(?:\d+[,.]\d+%?)\s+(\d,\d{4})/g;

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
 * Coeficiente VISA / MASTER ESTÁNDAR (punto decimal para almacenamiento).
 * @param {string} coefRaw
 */
export function formatVisaEstandarCoefRaw(coefRaw) {
  return normalizeCoefToken(coefRaw).replace(",", ".");
}

/**
 * @param {string} coefRaw
 */
function isValidVisaEstandarCoeficiente(coefRaw) {
  const normalized = formatVisaEstandarCoefRaw(coefRaw);
  if (!/^\d\.\d{4}$/.test(normalized)) {
    return false;
  }
  const val = parseCoeficienteValue(normalized);
  return Number.isFinite(val) && val >= 1 && val <= 5;
}

/**
 * @param {string} trimmed
 */
function isVisaEstandarDataRow(trimmed) {
  return /^\d{1,2}\s+\S+\s+\d,\d{4}/.test(trimmed);
}

/**
 * @param {string} line
 */
export function getVisaEstandarLineDiscardReason(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  if (isVisaEstandarDataRow(trimmed)) {
    return null;
  }
  if (/\btna\b/i.test(trimmed)) {
    return "TNA";
  }
  if (/coeficiente\s+con\s+iva/i.test(trimmed)) {
    return "Coeficiente con IVA";
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
export function formatVisaEstandarDetectedLine(cuotas, coefRaw) {
  return `${cuotas} -> ${coefRaw}`;
}

/**
 * @param {string} trimmed
 */
function parseVisaEstandarTokens(trimmed) {
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) {
    return null;
  }

  const cuotasRaw = tokens[0].replace(/[^\d]/g, "");
  const coefRaw = formatVisaEstandarCoefRaw(tokens[2]);

  if (!/^\d{1,2}$/.test(cuotasRaw)) {
    return null;
  }
  if (!isCuotasToken(cuotasRaw) || !isValidVisaEstandarCoeficiente(coefRaw)) {
    return null;
  }

  return {
    cuotasRaw,
    coefRaw,
    coeficienteBase: parseCoeficienteValue(coefRaw),
    cuotasNum: Number(cuotasRaw),
  };
}

/**
 * @param {string} line
 * @param {number} lineNumber
 */
function parseVisaEstandarRegexLine(line, lineNumber) {
  const trimmed = line.trim();
  if (!trimmed) {
    return { ok: false, skip: true };
  }

  const discardReason = getVisaEstandarLineDiscardReason(trimmed);
  if (discardReason) {
    return {
      ok: false,
      reason: discardReason,
      line: trimmed,
      lineNumber,
    };
  }

  const fullMatch = trimmed.match(
    /^\s*(\d{1,2})\s+\S+\s+(\d,\d{4})(?:\s+\d,\d{4})?\s*$/
  );
  if (fullMatch) {
    const cuotasRaw = fullMatch[1];
    const coefRaw = formatVisaEstandarCoefRaw(fullMatch[2]);
    if (isCuotasToken(cuotasRaw) && isValidVisaEstandarCoeficiente(coefRaw)) {
      const cuotasNum = Number(cuotasRaw);
      return {
        ok: true,
        cuotasRaw,
        coefRaw,
        coeficienteBase: parseCoeficienteValue(coefRaw),
        line: formatVisaEstandarDetectedLine(cuotasNum, coefRaw),
        lineNumber,
      };
    }
  }

  const parsed = parseVisaEstandarTokens(trimmed);
  if (parsed) {
    return {
      ok: true,
      cuotasRaw: parsed.cuotasRaw,
      coefRaw: parsed.coefRaw,
      coeficienteBase: parsed.coeficienteBase,
      line: formatVisaEstandarDetectedLine(parsed.cuotasNum, parsed.coefRaw),
      lineNumber,
    };
  }

  return {
    ok: false,
    reason: "Fila VISA / MASTER ESTÁNDAR no interpretada",
    line: trimmed,
    lineNumber,
  };
}

/**
 * @param {string} rawText
 */
export function parseVisaEstandarRegexFromText(rawText) {
  console.log("[VISA / MASTER ESTÁNDAR Regex] Texto OCR para parseo:\n", rawText);

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
    const result = parseVisaEstandarRegexLine(lines[i], i + 1);
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
    VISA_ESTANDAR_ROW_REGEX.lastIndex = 0;
    let match;
    while ((match = VISA_ESTANDAR_ROW_REGEX.exec(rawText)) !== null) {
      const cuotasRaw = match[1];
      const coefRaw = formatVisaEstandarCoefRaw(match[2]);
      const cuotasNum = Number(cuotasRaw);

      if (!isCuotasToken(cuotasRaw) || !isValidVisaEstandarCoeficiente(coefRaw)) {
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
        line: formatVisaEstandarDetectedLine(cuotasNum, coefRaw),
        cuotas: cuotasNum,
        coeficiente: coeficienteBase,
      });
    }
  }

  console.log("[VISA / MASTER ESTÁNDAR Regex] Filas detectadas:", ocrDetectedRows.length);
  console.log("[VISA / MASTER ESTÁNDAR Regex] Filas descartadas:", ocrDiscardedRows.length);

  return { rows, ocrDetectedRows, ocrDiscardedRows };
}
