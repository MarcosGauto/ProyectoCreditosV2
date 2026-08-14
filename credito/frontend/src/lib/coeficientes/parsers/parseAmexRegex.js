/**
 * Parser AMEX por OCR + regex.
 * Patrón principal: (\d{1,2})\s+(\d\.\d{4})
 */

import { parseCoeficienteValue } from "@/lib/coeficientes/parseCoeficientesMatrix";
import { isCuotasToken, parseCuotasToken } from "@/lib/coeficientes/parsers/parserUtils";

/** @typedef {import("./parserUtils").ImportPreviewRow} ImportPreviewRow */

/** Patrón principal: cuota + coeficiente con punto decimal */
export const AMEX_SIMPLE_REGEX = /(\d{1,2})\s+(\d\.\d{4})/g;

/** Fila con columnas intermedias — coeficiente al final */
const AMEX_ROW_END_REGEX =
  /(?:^|[\s\n])(\d{1,2})\s+(?:\S+\s+)+(\d\.\d{4})(?=[\s\n]|$)/g;

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
 * Coeficiente AMEX tal como aparece en tabla (punto decimal).
 * @param {string} coefRaw
 */
export function formatAmexCoefRaw(coefRaw) {
  return normalizeCoefToken(coefRaw).replace(",", ".");
}

/**
 * @param {string} coefRaw
 */
function isValidAmexCoeficiente(coefRaw) {
  const normalized = formatAmexCoefRaw(coefRaw);
  if (!/^\d\.\d{4}$/.test(normalized)) {
    return false;
  }
  const val = parseCoeficienteValue(normalized);
  return Number.isFinite(val) && val >= 1 && val <= 5;
}

/**
 * @param {string} trimmed
 */
function isAmexDataRow(trimmed) {
  return /^\d{1,2}\s+\d[.,]\d{4}/.test(trimmed);
}

/**
 * Ignora filas con TNA, TEM, Cuota o Coeficiente (encabezados).
 * @param {string} line
 */
export function getAmexLineDiscardReason(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  if (isAmexDataRow(trimmed)) {
    return null;
  }
  if (/\btna\b/i.test(trimmed)) {
    return "TNA";
  }
  if (/\btem\b/i.test(trimmed)) {
    return "TEM";
  }
  if (/\bcuotas?\b/i.test(trimmed)) {
    return "Cuota";
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
export function formatAmexDetectedLine(cuotas, coefRaw) {
  return `${cuotas} -> ${coefRaw}`;
}

/**
 * @param {string} line
 * @param {number} lineNumber
 */
function parseAmexRegexLine(line, lineNumber) {
  const trimmed = line.trim();
  if (!trimmed) {
    return { ok: false, skip: true };
  }

  const discardReason = getAmexLineDiscardReason(trimmed);
  if (discardReason) {
    return {
      ok: false,
      reason: discardReason,
      line: trimmed,
      lineNumber,
    };
  }

  const simpleMatch = trimmed.match(/^\s*(\d{1,2})\s+(\d[.,]\d{4})\s*$/);
  if (simpleMatch) {
    const cuotasRaw = simpleMatch[1];
    const coefRaw = formatAmexCoefRaw(simpleMatch[2]);
    if (isCuotasToken(cuotasRaw) && isValidAmexCoeficiente(coefRaw)) {
      const cuotasNum = Number(cuotasRaw);
      return {
        ok: true,
        cuotasRaw,
        coefRaw,
        coeficienteBase: parseCoeficienteValue(coefRaw),
        line: formatAmexDetectedLine(cuotasNum, coefRaw),
        lineNumber,
      };
    }
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const cuotasRaw = tokens[0]?.replace(/[^\d]/g, "");
  if (!/^\d{1,2}$/.test(cuotasRaw ?? "")) {
    return {
      ok: false,
      reason: "No comienza con cuota válida",
      line: trimmed,
      lineNumber,
    };
  }

  let coefRaw = "";
  for (let i = tokens.length - 1; i >= 1; i--) {
    const candidate = formatAmexCoefRaw(tokens[i]);
    if (isValidAmexCoeficiente(candidate)) {
      coefRaw = candidate;
      break;
    }
  }

  if (!coefRaw) {
    return {
      ok: false,
      reason: "Coeficiente (X.XXXX) no encontrado",
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
    line: formatAmexDetectedLine(cuotasNum, coefRaw),
    lineNumber,
  };
}

/**
 * @param {string} rawText
 */
export function parseAmexRegexFromText(rawText) {
  console.log("[AMEX Regex] Texto OCR para parseo:\n", rawText);

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
    const result = parseAmexRegexLine(lines[i], i + 1);
    if (result.skip) continue;

    if (result.ok) {
      const cuotasNum = Number(result.cuotasRaw);
      if (seenCuotas.has(cuotasNum)) {
        ocrDiscardedRows.push({
          lineNumber: result.lineNumber,
          line: result.line,
          reason: `Cuota ${cuotasNum} duplicada`,
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
    const globalPatterns = [AMEX_SIMPLE_REGEX, AMEX_ROW_END_REGEX];
    for (const pattern of globalPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(rawText)) !== null) {
        const cuotasRaw = match[1];
        const coefRaw = formatAmexCoefRaw(match[2]);
        const cuotasNum = Number(cuotasRaw);

        if (!isCuotasToken(cuotasRaw) || !isValidAmexCoeficiente(coefRaw)) {
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
          line: formatAmexDetectedLine(cuotasNum, coefRaw),
          cuotas: cuotasNum,
          coeficiente: coeficienteBase,
        });
      }
      if (rows.length > 0) break;
    }
  }

  console.log("[AMEX Regex] Filas detectadas:", ocrDetectedRows.length);
  console.log("[AMEX Regex] Filas descartadas:", ocrDiscardedRows.length);

  return { rows, ocrDetectedRows, ocrDiscardedRows };
}
