import {
  isAmbiguousCell,
  parseCoeficienteValue,
} from "@/lib/coeficientes/parseCoeficientesMatrix";
import { normalizeCuotasLabel, sortImportRecords } from "@/lib/coeficientes/coeficientesVigentesModel";
import { listParserOptions } from "@/lib/coeficientes/parsers/parserDefinitions";

/** @typedef {import("./parserTypes").ParsedImportRecord} ParsedImportRecord */
/** @typedef {import("./parserTypes").ImportMatrix} ImportMatrix */

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const IMAGE_EXT = /\.(png|jpe?g)$/i;
const PDF_EXT = /\.pdf$/i;
const EXCEL_EXT = /\.(xlsx|xls)$/i;
const CSV_EXT = /\.csv$/i;

/**
 * @param {File} file
 */
/** @type {Record<string, string>} */
export const FILE_KIND_LABELS = {
  excel: "Excel (.xlsx / .xls)",
  csv: "CSV",
  pdf: "PDF",
  image: "Imagen (PNG / JPG)",
  unknown: "Desconocido",
};

/**
 * @param {string} kind
 */
export function formatFileKindLabel(kind) {
  return FILE_KIND_LABELS[kind] ?? kind ?? "—";
}

/**
 * @param {File} file
 */
export function detectImportFileKind(file) {
  const name = file.name.toLowerCase();
  if (IMAGE_TYPES.has(file.type) || IMAGE_EXT.test(name)) return "image";
  if (file.type === "application/pdf" || PDF_EXT.test(name)) return "pdf";
  if (CSV_EXT.test(name)) return "csv";
  if (
    EXCEL_EXT.test(name) ||
    file.type.includes("spreadsheet") ||
    file.type.includes("excel")
  ) {
    return "excel";
  }
  return "unknown";
}

/**
 * @param {unknown} cell
 */
export function cellText(cell) {
  if (cell == null) return "";
  return String(cell).trim();
}

/**
 * @param {string} text
 */
export function parseCsvToMatrix(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const sep = line.includes(";") ? ";" : ",";
    return line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  });
}

/**
 * @param {File} file
 */
export async function readExcelMatrix(file) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return matrix.map((row) =>
    Array.isArray(row) ? row.map(cellText) : [cellText(row)]
  );
}

/**
 * @param {File} file
 */
export async function readFileAsMatrix(file) {
  const kind = detectImportFileKind(file);
  if (kind === "csv") {
    return parseCsvToMatrix(await file.text());
  }
  if (kind === "excel") {
    return readExcelMatrix(file);
  }
  return [];
}

/**
 * @param {File} file
 * @param {(progress: number, status: string) => void} [onProgress]
 */
export async function runSpanishOcr(file, onProgress) {
  const { createWorker } = await import("tesseract.js");

  onProgress?.(0, "Iniciando OCR…");

  const worker = await createWorker("spa", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.(Math.round(m.progress * 100), "Reconociendo texto…");
      }
    },
  });

  try {
    onProgress?.(10, "Procesando imagen…");
    const { data } = await worker.recognize(file);
    onProgress?.(100, "OCR completado");
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

/**
 * @param {File} file
 * @param {(progress: number, status: string) => void} [onProgress]
 */
export async function extractPdfText(file, onProgress) {
  onProgress?.(5, "Leyendo PDF…");

  const pdfjsLib = await import("pdfjs-dist/webpack");
  const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfjsWorker?.default?.toString?.() ||
    (typeof pdfjsWorker === "string" ? pdfjsWorker : pdfjsWorker.toString());

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  /** @type {string[]} */
  const parts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(
      Math.round((i / pdf.numPages) * 90),
      `Extrayendo página ${i}/${pdf.numPages}…`
    );
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    parts.push(pageText);
  }

  onProgress?.(100, "PDF procesado");
  return parts.join("\n");
}

/**
 * Renderiza la primera página del PDF como imagen PNG para OCR.
 * @param {File} file
 * @param {(progress: number, status: string) => void} [onProgress]
 */
export async function renderPdfFirstPageToFile(file, onProgress) {
  onProgress?.(5, "Preparando PDF para OCR…");

  const pdfjsLib = await import("pdfjs-dist/webpack");
  const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfjsWorker?.default?.toString?.() ||
    (typeof pdfjsWorker === "string" ? pdfjsWorker : pdfjsWorker.toString());

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  onProgress?.(50, "Renderizando página…");

  await page.render({
    canvasContext: canvas.getContext("2d"),
    viewport,
  }).promise;

  onProgress?.(90, "Generando imagen…");

  const blob = await new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });

  if (!blob) {
    throw new Error("No se pudo convertir el PDF a imagen para OCR.");
  }

  onProgress?.(100, "Listo");
  return new File([blob], "cabal-pdf-page-1.png", { type: "image/png" });
}

/**
 * @param {string} acquirer
 * @param {ParsedImportRecord[]} records
 */
/**
 * @typedef {{
 *   cuotas: string | number;
 *   coefRaw: string;
 *   coeficienteBase: number;
 *   invalid?: boolean;
 * }} ImportPreviewRow
 */

/**
 * @param {string} acquirer
 * @param {ImportPreviewRow[]} rows
 */
export function buildImportMatrixFromRows(acquirer, rows) {
  /** @type {ImportMatrix} */
  const matrix = { cards: [acquirer], rows: [] };

  for (const row of rows) {
    const raw =
      row.coefRaw?.trim() ||
      (Number.isFinite(row.coeficienteBase)
        ? String(row.coeficienteBase).replace(".", ",")
        : "");
    const parsed = Number.isFinite(row.coeficienteBase)
      ? row.coeficienteBase
      : parseCoeficienteValue(raw);
    const ambiguous =
      Boolean(row.invalid) || isAmbiguousCell(raw, parsed);

    matrix.rows.push({
      cuotas: row.cuotas,
      invalid: Boolean(row.invalid),
      cells: {
        [acquirer]: {
          coeficienteBase: Number.isFinite(parsed) ? parsed : 0,
          raw,
          ambiguous,
        },
      },
    });
  }

  return matrix;
}

export function buildSingleCardMatrix(acquirer, records) {
  return buildImportMatrixFromRows(
    acquirer,
    sortImportRecords(records).map((record) => ({
      cuotas: record.cuotas,
      coefRaw: String(record.coeficienteBase).replace(".", ","),
      coeficienteBase: record.coeficienteBase,
      invalid: false,
    }))
  );
}

/**
 * @param {ImportMatrix} matrix
 * @param {string} card
 */
export function matrixToRecords(matrix, card) {
  /** @type {ParsedImportRecord[]} */
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
 * @param {string} line
 */
export function splitTableLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return [];
  if (trimmed.includes("|")) {
    return trimmed.split("|").map((c) => c.trim());
  }
  if (trimmed.includes("\t")) {
    return trimmed.split("\t").map((c) => c.trim());
  }
  const bySpaces = trimmed.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (bySpaces.length >= 2) return bySpaces;
  return trimmed.split(/\s+/).map((c) => c.trim()).filter(Boolean);
}

/**
 * @param {string} text
 */
export function textToMatrix(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(splitTableLine)
    .filter((row) => row.length > 0);
}

/**
 * @param {string} acquirer
 */
export function notImplementedResult(acquirer) {
  const enabled = listParserOptions()
    .map((p) => p.label)
    .join(", ");
  return {
    acquirer,
    records: [],
    matrix: null,
    errors: [],
    warnings: [
      `El lector de ${acquirer} está en desarrollo. Parsers disponibles: ${enabled}.`,
    ],
    implemented: false,
    source: "stub",
  };
}

/**
 * Alinea el resultado del parser con el código comercial de la tarjeta en Firestore.
 * @param {import("./parserTypes").AcquirerParseResult} result
 * @param {import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta} tarjeta
 */
export function remapParseResultForTarjeta(result, tarjeta) {
  const codigo = tarjeta.codigo;
  const parserCardId = result.acquirer;

  if (!parserCardId || parserCardId === codigo) {
    return {
      ...result,
      acquirer: codigo,
      detectedCards: [codigo],
    };
  }

  /** @type {ImportMatrix | null} */
  let matrix = result.matrix;
  if (matrix) {
    matrix = {
      cards: matrix.cards.map((c) => (c === parserCardId ? codigo : c)),
      rows: matrix.rows.map((row) => {
        if (!row.cells[parserCardId]) return row;
        const { [parserCardId]: cell, ...rest } = row.cells;
        return { ...row, cells: { ...rest, [codigo]: cell } };
      }),
    };
  }

  return {
    ...result,
    acquirer: codigo,
    detectedCards: [codigo],
    matrix,
  };
}

/**
 * @param {string | undefined} importMethod
 */
export function describeImportMethodPreview(importMethod) {
  const method = String(importMethod ?? "").trim();
  if (!method || method === "—") {
    return "Revise los coeficientes detectados antes de confirmar.";
  }
  if (method.startsWith("Regex ")) {
    return `Coeficientes extraídos por OCR local + ${method.toLowerCase()}.`;
  }
  if (method === "Gemini") {
    return "Coeficientes extraídos por IA (Gemini).";
  }
  if (method === "Manual") {
    return "No se detectaron coeficientes automáticamente. Puede editar la vista previa o usar Excel/CSV.";
  }
  if (method === "Excel" || method === "CSV") {
    return `Coeficientes leídos desde planilla ${method}.`;
  }
  return `Coeficientes importados (${method}).`;
}

/**
 * @param {ParsedImportRecord[]} records
 * @param {string[]} warnings
 * @param {Partial<import("./parserTypes").AcquirerParseResult>} extra
 */
export function buildParseResult(records, warnings, extra = {}) {
  if (!extra.acquirer) {
    throw new Error("buildParseResult requiere extra.acquirer.");
  }
  const acquirer = extra.acquirer;
  const matrix =
    extra.matrix ??
    (records.length ? buildSingleCardMatrix(acquirer, records) : null);

  return {
    acquirer,
    records,
    matrix,
    errors: extra.errors ?? [],
    warnings,
    implemented: true,
    detectedCards: [acquirer],
    ...extra,
  };
}

/**
 * @param {string} text
 */
export function isCuotasToken(text) {
  const t = String(text ?? "").trim();
  if (!t) return false;
  if (/^d[eé]bito$/i.test(t)) return true;
  if (/^\d+$/.test(t)) return true;
  if (/^\d+\s*cuotas?$/i.test(t)) return true;
  return false;
}

/**
 * @param {string} raw
 */
export function parseCuotasToken(raw) {
  return normalizeCuotasLabel(raw);
}
