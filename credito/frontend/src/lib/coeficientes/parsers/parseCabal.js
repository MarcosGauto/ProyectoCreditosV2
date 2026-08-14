/**
 * Lector específico CABAL — Excel/CSV, OCR+Regex, fallback Gemini.
 */

import {
  buildImportMatrixFromRows,
  buildParseResult,
  detectImportFileKind,
  extractPdfText,
  isCuotasToken,
  parseCuotasToken,
  readFileAsMatrix,
  renderPdfFirstPageToFile,
  runSpanishOcr,
} from "@/lib/coeficientes/parsers/parserUtils";
import {
  fetchCoeficientesGeminiOcr,
  GEMINI_STATUS_MESSAGE,
} from "@/lib/coeficientes/parsers/geminiOcr";
import { parseCabalRegexFromText } from "@/lib/coeficientes/parsers/parseCabalRegex";
import { parseCoeficienteValue } from "@/lib/coeficientes/parseCoeficientesMatrix";

/** @typedef {import("./parserTypes").AcquirerParseResult} AcquirerParseResult */
/** @typedef {import("./parserTypes").AcquirerParseDebug} AcquirerParseDebug */
/** @typedef {import("./parserTypes").CabalImportMethod} CabalImportMethod */
/** @typedef {import("./parserUtils").ImportPreviewRow} ImportPreviewRow */

export const CABAL_ACQUIRER = "CABAL";

const REGEX_STATUS_MESSAGE = "Procesando imagen con OCR local (CABAL)…";
const GEMINI_FAILURE_MESSAGE =
  "No se pudieron detectar coeficientes en el archivo.";
const GEMINI_SATURATED_MESSAGE =
  "Gemini temporalmente saturado. Reintente más tarde o utilice Excel/CSV.";

/** Columnas de coeficiente aceptadas, en orden de prioridad. */
const COEF_COLUMN_PATTERNS = [
  /^coeficientes\s*\/\s*bonif\.?\s*tasa$/i,
  /^coeficientes$/i,
  /^coeficiente\s+final$/i,
  /^coeficiente$/i,
];

/** Columnas que deben ignorarse aunque contengan números. */
const IGNORED_COLUMN_PATTERNS = [
  /^tna$/i,
  /^%?\s*bonif\.?$/i,
  /^tna\s+bonificada$/i,
  /^td$/i,
  /^tna\s+bonif/i,
  /bonificada/i,
];

const CUOTAS_COLUMN_PATTERN = /^cuotas?$/i;

/**
 * @param {string} raw
 */
function normalizeHeader(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * @param {string} header
 */
function isIgnoredColumn(header) {
  const h = normalizeHeader(header);
  if (!h) return true;
  return IGNORED_COLUMN_PATTERNS.some((p) => p.test(h));
}

/**
 * @param {string} header
 */
function isCuotasColumn(header) {
  return CUOTAS_COLUMN_PATTERN.test(normalizeHeader(header));
}

/**
 * @param {string} header
 * @param {RegExp} pattern
 */
function headerMatches(header, pattern) {
  const h = normalizeHeader(header);
  if (!h || isIgnoredColumn(h)) return false;
  return pattern.test(h);
}

/**
 * @param {string[]} headerRow
 */
function detectCabalColumns(headerRow) {
  const headers = headerRow.map((c) => normalizeHeader(c));

  const cuotasIdx = headers.findIndex((h) => isCuotasColumn(h));
  if (cuotasIdx < 0) {
    return null;
  }

  let coefIdx = -1;
  for (const pattern of COEF_COLUMN_PATTERNS) {
    const idx = headers.findIndex((h) => headerMatches(h, pattern));
    if (idx >= 0) {
      coefIdx = idx;
      break;
    }
  }

  if (coefIdx < 0) {
    return null;
  }

  return { cuotasIdx, coefIdx, headers };
}

/**
 * @param {string[][]} matrix
 */
function findCabalTableHeader(matrix) {
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const row = matrix[i].map((c) => String(c ?? "").trim());
    if (row.every((c) => !c)) continue;

    const detected = detectCabalColumns(row);
    if (detected) {
      return { ...detected, headerRowIndex: i, dataStart: i + 1 };
    }
  }
  return null;
}

/**
 * @param {string} cuotasRaw
 */
function isCabalCuotasLabel(cuotasRaw) {
  return (
    isCuotasToken(cuotasRaw) ||
    /^d[eé]bito$/i.test(String(cuotasRaw ?? "").trim())
  );
}

/**
 * @param {ImportPreviewRow[]} rows
 */
function sortCabalPreviewRows(rows) {
  return [...rows].sort((a, b) => {
    const cuotasA = String(a.cuotas);
    const cuotasB = String(b.cuotas);
    if (/^d[eé]bito$/i.test(cuotasA)) return -1;
    if (/^d[eé]bito$/i.test(cuotasB)) return 1;
    const numA = Number(cuotasA);
    const numB = Number(cuotasB);
    if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB;
    return cuotasA.localeCompare(cuotasB, "es");
  });
}

/**
 * @param {string[][]} matrix
 */
function parseCabalStructuredMatrix(matrix) {
  /** @type {ImportPreviewRow[]} */
  const rows = [];
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  const header = findCabalTableHeader(matrix);

  if (!header) {
    errors.push(
      'No se encontró tabla CABAL con columnas "Cuotas" y "Coeficiente".'
    );
    return { rows, errors, warnings };
  }

  const { cuotasIdx, coefIdx, headers, dataStart } = header;

  warnings.push(
    `Columnas detectadas: Cuotas="${headers[cuotasIdx]}", Coeficiente="${headers[coefIdx]}".`
  );

  for (let i = dataStart; i < matrix.length; i++) {
    const row = matrix[i].map((c) => String(c ?? "").trim());
    if (row.every((c) => !c)) continue;

    const cuotasRaw = row[cuotasIdx] ?? "";
    const coefRaw = row[coefIdx] ?? "";

    if (!cuotasRaw && !coefRaw) continue;
    if (CUOTAS_COLUMN_PATTERN.test(cuotasRaw) || isIgnoredColumn(cuotasRaw)) {
      continue;
    }

    const cuotasValid = isCabalCuotasLabel(cuotasRaw);
    const coeficienteBase = parseCoeficienteValue(coefRaw);
    const coefValid = Number.isFinite(coeficienteBase) && coeficienteBase > 0;

    if (!cuotasValid || !coefValid) {
      if (!cuotasRaw && !coefRaw) continue;
      errors.push(
        `Fila ${i + 1}: no interpretada ("${cuotasRaw}" | "${coefRaw}").`
      );
      continue;
    }

    rows.push({
      cuotas: parseCuotasToken(cuotasRaw),
      coefRaw: String(coefRaw),
      coeficienteBase,
      invalid: false,
    });
  }

  if (!rows.length) {
    errors.push(
      "No se detectaron filas de datos bajo el encabezado CABAL."
    );
  }

  return { rows, errors, warnings };
}

/**
 * @param {import("./geminiOcr").GeminiOcrRecord[]} records
 */
function geminiRecordsToPreviewRows(records) {
  /** @type {ImportPreviewRow[]} */
  const rows = [];
  /** @type {NonNullable<AcquirerParseDebug["ocrDetectedRows"]>} */
  const ocrDetectedRows = [];

  for (const record of records) {
    const cuotasRaw = String(record.cuotas);
    const coeficienteBase = parseCoeficienteValue(String(record.coeficiente));
    const coefValid = Number.isFinite(coeficienteBase) && coeficienteBase > 0;
    const cuotasValid = isCabalCuotasLabel(cuotasRaw);

    if (!cuotasValid || !coefValid) continue;

    const cuotas = parseCuotasToken(cuotasRaw);
    const coefRaw = String(record.coeficiente).replace(".", ",");

    rows.push({
      cuotas,
      coefRaw,
      coeficienteBase,
      invalid: false,
    });

    ocrDetectedRows.push({
      lineNumber: rows.length,
      line: `${cuotas} → ${coefRaw}`,
      cuotas: Number(cuotas),
      coeficiente: coeficienteBase,
    });
  }

  return { rows, ocrDetectedRows };
}

/**
 * @param {number} count
 */
function formatSuccessMessage(count, method) {
  const suffix =
    method === "Gemini"
      ? "."
      : method === "Regex CABAL"
        ? " (OCR + regex)."
        : ".";
  if (count === 1) return `1 coeficiente detectado correctamente${suffix}`;
  return `${count} coeficientes detectados correctamente${suffix}`;
}

/**
 * @param {ImportPreviewRow[]} rows
 * @param {string[]} errors
 * @param {string[]} warnings
 * @param {{
 *   rawText?: string;
 *   source: string;
 *   fileKind: string;
 *   gemini?: boolean;
 *   manualPreview?: boolean;
 *   importMethod?: CabalImportMethod;
 *   ocrDebug?: Partial<AcquirerParseDebug>;
 *   matrix?: import("./parserTypes").ImportMatrix;
 * }} meta
 */
function finalizeCabal(rows, errors, warnings, meta) {
  const sortedRows = sortCabalPreviewRows(rows);
  const validRecords = sortedRows
    .filter((row) => !row.invalid)
    .map((row) => ({
      cuotas: row.cuotas,
      coeficienteBase: row.coeficienteBase,
    }));

  const matrix =
    meta.matrix ??
    (sortedRows.length > 0
      ? buildImportMatrixFromRows(CABAL_ACQUIRER, sortedRows)
      : { cards: [CABAL_ACQUIRER], rows: [] });

  const invalidRows = sortedRows.filter((row) => row.invalid).length;
  const nextWarnings = [...warnings];
  const recordsDiscarded = meta.ocrDebug?.ocrDiscardedRows?.length ?? 0;

  if (validRecords.length > 0 && meta.importMethod) {
    nextWarnings.unshift(
      formatSuccessMessage(validRecords.length, meta.importMethod)
    );
  } else if (validRecords.length && !meta.manualPreview) {
    nextWarnings.push(
      "Revise los coeficientes detectados antes de confirmar la importación."
    );
  }

  if (meta.manualPreview) {
    nextWarnings.push(
      "Complete la vista previa manualmente o utilice Excel/CSV."
    );
  }

  if (invalidRows > 0) {
    nextWarnings.push(
      `${invalidRows} fila(s) no interpretada(s) — resaltadas en amarillo.`
    );
  }

  const { ocrDebug, ...restMeta } = meta;

  return buildParseResult(validRecords, nextWarnings, {
    acquirer: CABAL_ACQUIRER,
    errors,
    matrix,
    detectedCards: [CABAL_ACQUIRER],
    debug: {
      fileKind: meta.fileKind,
      recordsFound: validRecords.length,
      totalRows: sortedRows.length,
      invalidRows,
      recordsDiscarded,
      importMethod: meta.importMethod,
      ...ocrDebug,
    },
    ...restMeta,
  });
}

/**
 * @param {string} fileKind
 * @param {Partial<AcquirerParseDebug>} [debugExtra]
 * @param {string[]} [extraErrors]
 */
function buildManualFallbackResult(fileKind, debugExtra = {}, extraErrors = []) {
  const errors = [GEMINI_FAILURE_MESSAGE, ...extraErrors];

  return finalizeCabal([], errors, [], {
    source: "cabal-gemini-manual",
    fileKind,
    manualPreview: true,
    importMethod: "Manual",
    matrix: { cards: [CABAL_ACQUIRER], rows: [] },
    ocrDebug: debugExtra,
  });
}

/**
 * @param {ImportPreviewRow[]} rows
 * @param {"image" | "pdf"} kind
 * @param {string} ocrRawText
 * @param {Partial<AcquirerParseDebug>} regexDebug
 */
function buildRegexSuccessResult(rows, kind, ocrRawText, regexDebug) {
  return finalizeCabal(rows, [], [], {
    source: kind === "pdf" ? "cabal-pdf-regex" : "cabal-image-regex",
    fileKind: kind,
    rawText: ocrRawText,
    importMethod: "Regex CABAL",
    ocrDebug: {
      ...regexDebug,
      ocrRawText,
    },
  });
}

/**
 * @param {File} file
 * @param {"image" | "pdf"} kind
 * @param {(progress: number, status: string) => void} [onProgress]
 */
async function extractTextForCabalRegex(file, kind, onProgress) {
  if (kind === "image") {
    onProgress?.(10, REGEX_STATUS_MESSAGE);
    return runSpanishOcr(file, (pct, status) => {
      onProgress?.(
        10 + Math.round(pct * 0.55),
        status || REGEX_STATUS_MESSAGE
      );
    });
  }

  onProgress?.(10, "Leyendo PDF…");
  const pdfText = await extractPdfText(file, (pct, status) => {
    onProgress?.(
      Math.min(30, Math.round(pct * 0.3)),
      status || "Leyendo PDF…"
    );
  });

  const pdfRegex = parseCabalRegexFromText(pdfText);
  if (pdfRegex.rows.some((row) => !row.invalid)) {
    return { text: pdfText, regexResult: pdfRegex, fromPdfText: true };
  }

  onProgress?.(35, REGEX_STATUS_MESSAGE);
  const pageImage = await renderPdfFirstPageToFile(file, (pct, status) => {
    onProgress?.(
      35 + Math.round(pct * 0.15),
      status || "Preparando PDF para OCR…"
    );
  });

  const ocrText = await runSpanishOcr(pageImage, (pct, status) => {
    onProgress?.(
      50 + Math.round(pct * 0.35),
      status || REGEX_STATUS_MESSAGE
    );
  });

  return { text: ocrText, regexResult: null, fromPdfText: false };
}

/**
 * @param {File} file
 * @param {"image" | "pdf"} kind
 * @param {(progress: number, status: string) => void} [onProgress]
 * @returns {Promise<AcquirerParseResult>}
 */
async function parseCabalFromGemini(file, kind, onProgress) {
  onProgress?.(70, GEMINI_STATUS_MESSAGE);

  try {
    const gemini = await fetchCoeficientesGeminiOcr(
      file,
      CABAL_ACQUIRER,
      onProgress
    );

    const detectedJson = JSON.stringify(gemini.records, null, 2);
    const geminiDebug = {
      geminiRawText: gemini.geminiRawResponse ?? gemini.rawText,
      geminiDetectedJson: detectedJson,
      geminiParseError: gemini.parseError ?? "",
      geminiApiKeyConfigured: gemini.apiKeyConfigured,
      geminiStatus: gemini.geminiStatus,
      geminiError: gemini.geminiError,
      geminiRawResponse: gemini.geminiRawResponse ?? gemini.rawText,
    };

    const { rows, ocrDetectedRows } = geminiRecordsToPreviewRows(gemini.records);

    if (!rows.length) {
      return buildManualFallbackResult(
        kind,
        geminiDebug,
        [gemini.parseError ?? "No se obtuvieron registros válidos de Gemini"]
      );
    }

    return finalizeCabal(rows, [], [], {
      source: kind === "pdf" ? "cabal-pdf-gemini" : "cabal-image-gemini",
      fileKind: kind,
      rawText: gemini.rawText,
      gemini: true,
      importMethod: "Gemini",
      ocrDebug: {
        ...geminiDebug,
        ocrDetectedRows,
        ocrDiscardedRows: [],
      },
    });
  } catch (error) {
    console.error("[CABAL Gemini]", error);

    const geminiDebug = {
      geminiRawText: error.geminiRawResponse ?? error.rawText ?? "",
      geminiDetectedJson: "",
      geminiParseError: error.parseError ?? "",
      geminiApiKeyConfigured: error.apiKeyConfigured,
      geminiStatus: error.geminiStatus,
      geminiError: error.geminiError,
      geminiRawResponse: error.geminiRawResponse ?? error.rawText ?? "",
    };

    const isSaturated =
      error.geminiStatus === "UNAVAILABLE" ||
      String(error.message).includes("saturado");

    return buildManualFallbackResult(
      kind,
      geminiDebug,
      [isSaturated ? GEMINI_SATURATED_MESSAGE : error.message]
    );
  }
}

/**
 * @param {File} file
 * @param {"image" | "pdf"} kind
 * @param {(progress: number, status: string) => void} [onProgress]
 * @returns {Promise<AcquirerParseResult>}
 */
async function parseCabalFromMedia(file, kind, onProgress) {
  onProgress?.(5, REGEX_STATUS_MESSAGE);

  try {
    const extracted = await extractTextForCabalRegex(file, kind, onProgress);
    const regexResult =
      extracted.regexResult ?? parseCabalRegexFromText(extracted.text);

    const validRows = regexResult.rows.filter((row) => !row.invalid);

    if (validRows.length > 0) {
      onProgress?.(100, "Listo");
      return buildRegexSuccessResult(validRows, kind, extracted.text, {
        ocrDetectedRows: regexResult.ocrDetectedRows,
        ocrDiscardedRows: regexResult.ocrDiscardedRows,
        ocrRawText: extracted.text,
      });
    }

    onProgress?.(65, "OCR sin resultados — intentando con IA…");
    return parseCabalFromGemini(file, kind, onProgress);
  } catch (error) {
    console.error("[CABAL Regex/OCR]", error);
    onProgress?.(65, "Error en OCR — intentando con IA…");
    return parseCabalFromGemini(file, kind, onProgress);
  }
}

/**
 * @param {File} file
 * @param {(progress: number, status: string) => void} [onProgress]
 * @returns {Promise<AcquirerParseResult>}
 */
export async function parseCabal(file, onProgress) {
  const kind = detectImportFileKind(file);

  if (kind === "excel" || kind === "csv") {
    onProgress?.(20, "Leyendo planilla CABAL…");
    const matrix = await readFileAsMatrix(file);
    const { rows, errors, warnings } = parseCabalStructuredMatrix(matrix);
    onProgress?.(100, "Listo");
    return finalizeCabal(rows, errors, warnings, {
      source: kind === "csv" ? "cabal-csv" : "cabal-excel",
      fileKind: kind,
      importMethod: kind === "csv" ? "CSV" : "Excel",
    });
  }

  if (kind === "image" || kind === "pdf") {
    return parseCabalFromMedia(file, kind, onProgress);
  }

  return finalizeCabal(
    [],
    ["Formato de archivo no soportado para CABAL. Use Excel (.xlsx), CSV, PDF o imagen."],
    [],
    { source: "cabal-unknown", fileKind: kind }
  );
}
