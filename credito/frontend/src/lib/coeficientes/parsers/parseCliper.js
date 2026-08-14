/**
 * Lector CLIPER — Excel, CSV, OCR+Regex, fallback Gemini, Manual.
 * Solo importa Cuotas + Coeficiente; ignora TNA, TEA y CFT.
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
import { parseCoeficienteValue } from "@/lib/coeficientes/parseCoeficientesMatrix";
import {
  formatCliperCoefRaw,
  parseCliperRegexFromText,
} from "@/lib/coeficientes/parsers/parseCliperRegex";

/** @typedef {import("./parserTypes").AcquirerParseResult} AcquirerParseResult */
/** @typedef {import("./parserTypes").AcquirerParseDebug} AcquirerParseDebug */
/** @typedef {import("./parserTypes").CliperImportMethod} CliperImportMethod */
/** @typedef {import("./parserUtils").ImportPreviewRow} ImportPreviewRow */

export const CLIPER_ACQUIRER = "CLIPER";

const REGEX_STATUS_MESSAGE = "Procesando imagen con OCR local (CLIPER)…";
const GEMINI_FAILURE_MESSAGE =
  "No se pudieron detectar coeficientes en el archivo.";
const GEMINI_SATURATED_MESSAGE =
  "Gemini temporalmente saturado. Reintente más tarde o utilice Excel/CSV.";

const CUOTAS_COLUMN_PATTERN = /^cuotas?$/i;
const COEFICIENTE_COLUMN_PATTERN = /^coeficientes?$/i;
const IGNORED_COLUMN_PATTERNS = [/^tna$/i, /^tea$/i, /^cft$/i];

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
 */
function isCoeficienteColumn(header) {
  const h = normalizeHeader(header);
  if (!h || isIgnoredColumn(h)) return false;
  return COEFICIENTE_COLUMN_PATTERN.test(h);
}

/**
 * @param {string[]} headerRow
 */
function detectCliperColumns(headerRow) {
  const headers = headerRow.map((c) => normalizeHeader(c));

  const cuotasIdx = headers.findIndex((h) => isCuotasColumn(h));
  if (cuotasIdx < 0) {
    return null;
  }

  const coefIdx = headers.findIndex((h) => isCoeficienteColumn(h));
  if (coefIdx < 0) {
    return null;
  }

  return { cuotasIdx, coefIdx, headers };
}

/**
 * @param {string[][]} matrix
 */
function findCliperTableHeader(matrix) {
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const row = matrix[i].map((c) => String(c ?? "").trim());
    if (row.every((c) => !c)) continue;

    const detected = detectCliperColumns(row);
    if (detected) {
      return { ...detected, headerRowIndex: i, dataStart: i + 1 };
    }
  }
  return null;
}

/**
 * @param {string} coefRaw
 */
function parseCliperCoeficienteValue(coefRaw) {
  return parseCoeficienteValue(formatCliperCoefRaw(coefRaw));
}

/**
 * @param {ImportPreviewRow[]} rows
 */
function sortCliperPreviewRows(rows) {
  return [...rows].sort((a, b) => {
    const numA = Number(a.cuotas);
    const numB = Number(b.cuotas);
    if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB;
    return String(a.cuotas).localeCompare(String(b.cuotas), "es");
  });
}

/**
 * @param {string[][]} matrix
 */
function parseCliperStructuredMatrix(matrix) {
  /** @type {ImportPreviewRow[]} */
  const rows = [];
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  const header = findCliperTableHeader(matrix);

  if (!header) {
    errors.push(
      'No se encontró tabla CLIPER con columnas "Cuotas" y "Coeficiente".'
    );
    return { rows, errors, warnings };
  }

  const { cuotasIdx, coefIdx, headers, dataStart } = header;

  warnings.push(
    `Columnas detectadas: Cuotas="${headers[cuotasIdx]}", Coeficiente="${headers[coefIdx]}". TNA, TEA y CFT ignorados.`
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
    if (/^coeficiente/i.test(coefRaw) || isIgnoredColumn(coefRaw)) {
      continue;
    }

    const cuotasValid = isCuotasToken(cuotasRaw);
    const coefFormatted = formatCliperCoefRaw(coefRaw);
    const coeficienteBase = parseCliperCoeficienteValue(coefRaw);
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
      coefRaw: coefFormatted,
      coeficienteBase,
      invalid: false,
    });
  }

  if (!rows.length) {
    errors.push("No se detectaron filas de datos bajo el encabezado CLIPER.");
  }

  return { rows, errors, warnings };
}

/**
 * @param {number} count
 * @param {CliperImportMethod} method
 */
function formatSuccessMessage(count, method) {
  const suffix =
    method === "Regex CLIPER"
      ? " (OCR + regex)."
      : method === "Gemini"
        ? "."
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
 *   manualPreview?: boolean;
 *   importMethod?: CliperImportMethod;
 *   ocrDebug?: Partial<AcquirerParseDebug>;
 *   matrix?: import("./parserTypes").ImportMatrix;
 * }} meta
 */
function finalizeCliper(rows, errors, warnings, meta) {
  const sortedRows = sortCliperPreviewRows(rows);
  const validRecords = sortedRows
    .filter((row) => !row.invalid)
    .map((row) => ({
      cuotas: row.cuotas,
      coeficienteBase: row.coeficienteBase,
    }));

  const matrix =
    meta.matrix ??
    (sortedRows.length > 0
      ? buildImportMatrixFromRows(CLIPER_ACQUIRER, sortedRows)
      : { cards: [CLIPER_ACQUIRER], rows: [] });

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
    acquirer: CLIPER_ACQUIRER,
    errors,
    matrix,
    detectedCards: [CLIPER_ACQUIRER],
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

  return finalizeCliper([], errors, [], {
    source: "cliper-gemini-manual",
    fileKind,
    manualPreview: true,
    importMethod: "Manual",
    matrix: { cards: [CLIPER_ACQUIRER], rows: [] },
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
  return finalizeCliper(rows, [], [], {
    source: kind === "pdf" ? "cliper-pdf-regex" : "cliper-image-regex",
    fileKind: kind,
    rawText: ocrRawText,
    importMethod: "Regex CLIPER",
    ocrDebug: {
      ...regexDebug,
      ocrRawText,
    },
  });
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
    const coefFormatted = formatCliperCoefRaw(String(record.coeficiente));
    const coeficienteBase = parseCoeficienteValue(coefFormatted);
    const coefValid = Number.isFinite(coeficienteBase) && coeficienteBase > 0;
    const cuotasValid = isCuotasToken(cuotasRaw);

    if (!cuotasValid || !coefValid) continue;

    const cuotas = parseCuotasToken(cuotasRaw);
    rows.push({
      cuotas,
      coefRaw: coefFormatted,
      coeficienteBase,
      invalid: false,
    });

    ocrDetectedRows.push({
      lineNumber: rows.length,
      line: `${cuotas} -> ${coefFormatted}`,
      cuotas: Number(cuotas),
      coeficiente: coeficienteBase,
    });
  }

  return { rows, ocrDetectedRows };
}

/**
 * @param {File} file
 * @param {"image" | "pdf"} kind
 * @param {(progress: number, status: string) => void} [onProgress]
 */
async function extractTextForCliperRegex(file, kind, onProgress) {
  if (kind === "image") {
    onProgress?.(10, REGEX_STATUS_MESSAGE);
    const ocrText = await runSpanishOcr(file, (pct, status) => {
      onProgress?.(
        10 + Math.round(pct * 0.55),
        status || REGEX_STATUS_MESSAGE
      );
    });
    return { text: ocrText, regexResult: null, fromPdfText: false };
  }

  onProgress?.(10, "Leyendo PDF…");
  const pdfText = await extractPdfText(file, (pct, status) => {
    onProgress?.(
      Math.min(30, Math.round(pct * 0.3)),
      status || "Leyendo PDF…"
    );
  });

  const pdfRegex = parseCliperRegexFromText(pdfText);
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
async function parseCliperFromGemini(file, kind, onProgress) {
  onProgress?.(70, GEMINI_STATUS_MESSAGE);

  try {
    const gemini = await fetchCoeficientesGeminiOcr(
      file,
      CLIPER_ACQUIRER,
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

    return finalizeCliper(rows, [], [], {
      source: kind === "pdf" ? "cliper-pdf-gemini" : "cliper-image-gemini",
      fileKind: kind,
      rawText: gemini.rawText,
      importMethod: "Gemini",
      ocrDebug: {
        ...geminiDebug,
        ocrDetectedRows,
        ocrDiscardedRows: [],
      },
    });
  } catch (error) {
    console.error("[CLIPER Gemini]", error);

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
 * Imagen/PDF: OCR+Regex → Gemini → Manual.
 *
 * @param {File} file
 * @param {"image" | "pdf"} kind
 * @param {(progress: number, status: string) => void} [onProgress]
 * @returns {Promise<AcquirerParseResult>}
 */
async function parseCliperFromMedia(file, kind, onProgress) {
  onProgress?.(5, REGEX_STATUS_MESSAGE);

  try {
    const extracted = await extractTextForCliperRegex(file, kind, onProgress);
    const regexResult =
      extracted.regexResult ?? parseCliperRegexFromText(extracted.text);

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
    return parseCliperFromGemini(file, kind, onProgress);
  } catch (error) {
    console.error("[CLIPER Regex/OCR]", error);
    onProgress?.(65, "Error en OCR — intentando con IA…");
    return parseCliperFromGemini(file, kind, onProgress);
  }
}

/**
 * @param {File} file
 * @param {(progress: number, status: string) => void} [onProgress]
 * @returns {Promise<AcquirerParseResult>}
 */
export async function parseCliper(file, onProgress) {
  const kind = detectImportFileKind(file);

  if (kind === "excel") {
    onProgress?.(20, "Leyendo planilla CLIPER (Excel)…");
    const matrix = await readFileAsMatrix(file);
    const { rows, errors, warnings } = parseCliperStructuredMatrix(matrix);
    onProgress?.(100, "Listo");
    return finalizeCliper(rows, errors, warnings, {
      source: "cliper-excel",
      fileKind: kind,
      importMethod: "Excel",
    });
  }

  if (kind === "csv") {
    onProgress?.(20, "Leyendo planilla CLIPER (CSV)…");
    const matrix = await readFileAsMatrix(file);
    const { rows, errors, warnings } = parseCliperStructuredMatrix(matrix);
    onProgress?.(100, "Listo");
    return finalizeCliper(rows, errors, warnings, {
      source: "cliper-csv",
      fileKind: kind,
      importMethod: "CSV",
    });
  }

  if (kind === "image" || kind === "pdf") {
    return parseCliperFromMedia(file, kind, onProgress);
  }

  return finalizeCliper(
    [],
    [
      "Formato de archivo no soportado para CLIPER. Use Excel (.xlsx), CSV, PDF o imagen.",
    ],
    [],
    { source: "cliper-unknown", fileKind: kind }
  );
}
