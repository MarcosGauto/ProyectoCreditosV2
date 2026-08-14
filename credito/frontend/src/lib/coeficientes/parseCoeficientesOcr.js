import { tryParseMatrixTable } from "@/lib/coeficientes/parseCoeficientesMatrix";

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

const IMAGE_EXTENSIONS = /\.(png|jpe?g)$/i;

/**
 * @param {File} file
 */
export function isCoeficientesImageFile(file) {
  if (IMAGE_TYPES.has(file.type)) return true;
  return IMAGE_EXTENSIONS.test(file.name);
}

/**
 * @param {string} line
 */
export function splitOcrTableLine(line) {
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
export function ocrTextToMatrix(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map(splitOcrTableLine).filter((row) => row.length > 0);
}

/**
 * @param {File} file
 * @param {(progress: number, status: string) => void} [onProgress]
 */
export async function parseCoeficientesImageFile(file, onProgress) {
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
    onProgress?.(95, "Extrayendo tabla…");

    const matrix = ocrTextToMatrix(data.text);
    const parsed = tryParseMatrixTable(matrix);

    if (parsed) {
      return {
        ...parsed,
        source: "ocr",
        ocrText: data.text,
        warnings: [
          ...(parsed.warnings ?? []),
          "Texto extraído por OCR. Revise y corrija celdas resaltadas antes de confirmar.",
        ],
      };
    }

    return {
      source: "ocr",
      records: [],
      matrix: null,
      ocrText: data.text,
      warnings: [
        "OCR completado pero no se detectó una tabla con columnas CUOTAS y tarjetas.",
        "Puede editar el texto detectado o usar Excel/CSV.",
      ],
    };
  } finally {
    await worker.terminate();
    onProgress?.(100, "Listo");
  }
}
