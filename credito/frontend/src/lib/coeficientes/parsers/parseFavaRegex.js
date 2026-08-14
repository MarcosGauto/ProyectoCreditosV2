/**
 * Parser FAVA (FavaCard) por OCR + regex.
 * Fila: Cuotas del Plan | % descuento | Factor de Venta | Importe | T.N.A. | T.E.M.
 * Se importa cuotas + Factor de Venta (columna 3).
 */

import { parseCoeficienteValue } from "@/lib/coeficientes/parseCoeficientesMatrix";
import { isCuotasToken, parseCuotasToken } from "@/lib/coeficientes/parsers/parserUtils";

/** @typedef {import("./parserUtils").ImportPreviewRow} ImportPreviewRow */

/** Cuotas + % descuento + Factor de Venta */
export const FAVA_ROW_REGEX =
  /(\d{1,2})\s+(?:\S+)\s+(\d[.,]\d{4})/g;

/** Fila compacta: solo cuotas + factor */
export const FAVA_SIMPLE_REGEX = /(\d{1,2})\s+(\d[.,]\d{4})/g;

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
 * Factor de Venta tal como aparece en tabla (punto decimal).
 * @param {string} coefRaw
 */
export function formatFavaCoefRaw(coefRaw) {
  return normalizeCoefToken(coefRaw).replace(",", ".");
}

/**
 * @param {string} coefRaw
 */
function isValidFavaCoeficiente(coefRaw) {
  const normalized = formatFavaCoefRaw(coefRaw);
  if (!/^\d\.\d{4}$/.test(normalized)) {
    return false;
  }
  const val = parseCoeficienteValue(normalized);
  return Number.isFinite(val) && val >= 1 && val <= 5;
}

/**
 * @param {string} trimmed
 */
function isFavaDataRow(trimmed) {
  return (
    /^\d{1,2}\s+\S+\s+\d[.,]\d{4}/.test(trimmed) ||
    /^\d{1,2}\s+\d[.,]\d{4}/.test(trimmed)
  );
}

/**
 * @param {string} line
 */
export function getFavaLineDiscardReason(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  if (isFavaDataRow(trimmed)) {
    return null;
  }
  if (/descuento/i.test(trimmed)) {
    return "% de descuento";
  }
  if (/factor\s+de\s+venta/i.test(trimmed)) {
    return "Factor de Venta";
  }
  if (/importe\s+cuota/i.test(trimmed) || /cada\s+\$?\s*1000/i.test(trimmed)) {
    return "Importe cuota cada $1000";
  }
  if (/\bt\.?\s*n\.?\s*a\.?\b/i.test(trimmed)) {
    return "T.N.A.";
  }
  if (/\bt\.?\s*e\.?\s*m\.?\b/i.test(trimmed)) {
    return "T.E.M.";
  }
  if (/cuotas?\s+del\s+plan/i.test(trimmed)) {
    return "Cuotas del Plan";
  }
  return null;
}

/**
 * @param {number} cuotas
 * @param {string} coefRaw
 */
export function formatFavaDetectedLine(cuotas, coefRaw) {
  return `${cuotas} -> ${coefRaw}`;
}

/**
 * @param {string} trimmed
 */
function parseFavaTokens(trimmed) {
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return null;
  }

  const cuotasRaw = tokens[0].replace(/[^\d]/g, "");
  if (!/^\d{1,2}$/.test(cuotasRaw) || !isCuotasToken(cuotasRaw)) {
    return null;
  }

  const simpleCoef = formatFavaCoefRaw(tokens[1]);
  if (tokens.length === 2 && isValidFavaCoeficiente(simpleCoef)) {
    return {
      cuotasRaw,
      coefRaw: simpleCoef,
      coeficienteBase: parseCoeficienteValue(simpleCoef),
      cuotasNum: Number(cuotasRaw),
    };
  }

  if (tokens.length >= 3) {
    const factorCoef = formatFavaCoefRaw(tokens[2]);
    if (isValidFavaCoeficiente(factorCoef)) {
      return {
        cuotasRaw,
        coefRaw: factorCoef,
        coeficienteBase: parseCoeficienteValue(factorCoef),
        cuotasNum: Number(cuotasRaw),
      };
    }
  }

  for (let i = 1; i < tokens.length; i++) {
    const candidate = formatFavaCoefRaw(tokens[i]);
    if (isValidFavaCoeficiente(candidate)) {
      return {
        cuotasRaw,
        coefRaw: candidate,
        coeficienteBase: parseCoeficienteValue(candidate),
        cuotasNum: Number(cuotasRaw),
      };
    }
  }

  return null;
}

/**
 * @param {string} line
 * @param {number} lineNumber
 */
function parseFavaRegexLine(line, lineNumber) {
  const trimmed = line.trim();
  if (!trimmed) {
    return { ok: false, skip: true };
  }

  const discardReason = getFavaLineDiscardReason(trimmed);
  if (discardReason) {
    return {
      ok: false,
      reason: discardReason,
      line: trimmed,
      lineNumber,
    };
  }

  const fullMatch = trimmed.match(
    /^\s*(\d{1,2})\s+\S+\s+(\d[.,]\d{4})(?:\s+\S+)*\s*$/
  );
  if (fullMatch) {
    const cuotasRaw = fullMatch[1];
    const coefRaw = formatFavaCoefRaw(fullMatch[2]);
    if (isCuotasToken(cuotasRaw) && isValidFavaCoeficiente(coefRaw)) {
      const cuotasNum = Number(cuotasRaw);
      return {
        ok: true,
        cuotasRaw,
        coefRaw,
        coeficienteBase: parseCoeficienteValue(coefRaw),
        line: formatFavaDetectedLine(cuotasNum, coefRaw),
        lineNumber,
      };
    }
  }

  const simpleMatch = trimmed.match(/^\s*(\d{1,2})\s+(\d[.,]\d{4})\s*$/);
  if (simpleMatch) {
    const cuotasRaw = simpleMatch[1];
    const coefRaw = formatFavaCoefRaw(simpleMatch[2]);
    if (isCuotasToken(cuotasRaw) && isValidFavaCoeficiente(coefRaw)) {
      const cuotasNum = Number(cuotasRaw);
      return {
        ok: true,
        cuotasRaw,
        coefRaw,
        coeficienteBase: parseCoeficienteValue(coefRaw),
        line: formatFavaDetectedLine(cuotasNum, coefRaw),
        lineNumber,
      };
    }
  }

  const parsed = parseFavaTokens(trimmed);
  if (parsed) {
    return {
      ok: true,
      cuotasRaw: parsed.cuotasRaw,
      coefRaw: parsed.coefRaw,
      coeficienteBase: parsed.coeficienteBase,
      line: formatFavaDetectedLine(parsed.cuotasNum, parsed.coefRaw),
      lineNumber,
    };
  }

  return {
    ok: false,
    reason: "Fila FAVA no interpretada",
    line: trimmed,
    lineNumber,
  };
}

/**
 * @param {string} rawText
 */
export function parseFavaRegexFromText(rawText) {
  console.log("[FAVA Regex] Texto OCR para parseo:\n", rawText);

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
    const result = parseFavaRegexLine(lines[i], i + 1);
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
    const globalPatterns = [FAVA_ROW_REGEX, FAVA_SIMPLE_REGEX];
    for (const pattern of globalPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(rawText)) !== null) {
        const cuotasRaw = match[1];
        const coefRaw = formatFavaCoefRaw(match[2]);
        const cuotasNum = Number(cuotasRaw);

        if (!isCuotasToken(cuotasRaw) || !isValidFavaCoeficiente(coefRaw)) {
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
          line: formatFavaDetectedLine(cuotasNum, coefRaw),
          cuotas: cuotasNum,
          coeficiente: coeficienteBase,
        });
      }
      if (rows.length > 0) break;
    }
  }

  console.log("[FAVA Regex] Filas detectadas:", ocrDetectedRows.length);
  console.log("[FAVA Regex] Filas descartadas:", ocrDiscardedRows.length);

  return { rows, ocrDetectedRows, ocrDiscardedRows };
}
