/**
 * Parser CABAL por OCR + regex — sin IA.
 * Detecta filas: cuotas (1-2 dígitos) + coeficiente (X,XXXX).
 */

import { parseCoeficienteValue } from "@/lib/coeficientes/parseCoeficientesMatrix";
import { parseCuotasToken, isCuotasToken } from "@/lib/coeficientes/parsers/parserUtils";

/** @typedef {import("./parserUtils").ImportPreviewRow} ImportPreviewRow */

/** Cuotas + coeficiente simple: "2 1,0487" */
const CABAL_SIMPLE_REGEX = /(\d{1,2})\s+(\d,\d{4})/g;

/** Fila con columnas intermedias — coeficiente al final: "2 ... 1,0487" */
const CABAL_ROW_END_REGEX =
  /(?:^|[\s\n])(\d{1,2})\s+(?:\S+\s+)+(\d,\d{4})(?=[\s\n]|$)/g;

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
 * @param {string} coefRaw
 */
function isValidCabalCoeficiente(coefRaw) {
  const normalized = normalizeCoefToken(coefRaw);
  if (!/^\d,\d{4}$/.test(normalized) && !/^1[,.]\d{4}$/.test(normalized)) {
    return false;
  }
  const val = parseCoeficienteValue(normalized);
  return Number.isFinite(val) && val >= 1 && val <= 3;
}

/**
 * @param {string} line
 * @param {number} lineNumber
 */
function parseCabalRegexLine(line, lineNumber) {
  const trimmed = line.trim();
  if (!trimmed) {
    return { ok: false, skip: true };
  }

  if (/^cuotas?\b/i.test(trimmed) && /coef/i.test(trimmed)) {
    return {
      ok: false,
      reason: "Encabezado de tabla",
      line: trimmed,
      lineNumber,
    };
  }

  if (/^tna\b|%?\s*bonif|bonificada|^td\b/i.test(trimmed)) {
    return {
      ok: false,
      reason: "Metadatos / encabezado",
      line: trimmed,
      lineNumber,
    };
  }

  const simpleMatch = trimmed.match(/^\s*(\d{1,2})\s+(\d,\d{4})\s*$/);
  if (simpleMatch) {
    const cuotasRaw = simpleMatch[1];
    const coefRaw = normalizeCoefToken(simpleMatch[2]);
    if (isCuotasToken(cuotasRaw) && isValidCabalCoeficiente(coefRaw)) {
      return {
        ok: true,
        cuotasRaw,
        coefRaw,
        coeficienteBase: parseCoeficienteValue(coefRaw),
        line: trimmed,
        lineNumber,
      };
    }
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const cuotasRaw = tokens[0]?.replace(/[^\d]/g, "");
  if (!/^\d{1,2}$/.test(cuotasRaw ?? "")) {
    return {
      ok: false,
      reason: "No comienza con cuotas válidas",
      line: trimmed,
      lineNumber,
    };
  }

  let coefRaw = "";
  for (let i = tokens.length - 1; i >= 1; i--) {
    const candidate = normalizeCoefToken(tokens[i]);
    if (isValidCabalCoeficiente(candidate)) {
      coefRaw = candidate;
      break;
    }
  }

  if (!coefRaw) {
    return {
      ok: false,
      reason: "Coeficiente (X,XXXX) no encontrado",
      line: trimmed,
      lineNumber,
    };
  }

  return {
    ok: true,
    cuotasRaw,
    coefRaw,
    coeficienteBase: parseCoeficienteValue(coefRaw),
    line: trimmed,
    lineNumber,
  };
}

/**
 * @param {string} rawText
 */
export function parseCabalRegexFromText(rawText) {
  console.log("[CABAL Regex] Texto OCR para parseo:\n", rawText);

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
    const result = parseCabalRegexLine(lines[i], i + 1);
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
    const globalPatterns = [CABAL_SIMPLE_REGEX, CABAL_ROW_END_REGEX];
    for (const pattern of globalPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(rawText)) !== null) {
        const cuotasRaw = match[1];
        const coefRaw = normalizeCoefToken(match[2]);
        const cuotasNum = Number(cuotasRaw);

        if (!isCuotasToken(cuotasRaw) || !isValidCabalCoeficiente(coefRaw)) {
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
          line: match[0].trim(),
          cuotas: cuotasNum,
          coeficiente: coeficienteBase,
        });
      }
      if (rows.length > 0) break;
    }
  }

  console.log("[CABAL Regex] Filas detectadas:", ocrDetectedRows.length);
  console.log("[CABAL Regex] Filas descartadas:", ocrDiscardedRows.length);

  return { rows, ocrDetectedRows, ocrDiscardedRows };
}
