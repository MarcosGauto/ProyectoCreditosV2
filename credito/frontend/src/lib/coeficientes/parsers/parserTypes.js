/**
 * Tipos compartidos para parsers de adquirentes.
 */

/**
 * @typedef {import("../parseCoeficientesMatrix").ImportMatrix} ImportMatrix
 */

/**
 * @typedef {{
 *   cuotas: string | number;
 *   coeficienteBase: number;
 * }} ParsedImportRecord
 */

/**
 * @typedef {"Excel" | "CSV" | "Regex CABAL" | "Regex AMEX" | "Regex VISA / MASTER ESTÁNDAR" | "Regex Acuerdo Bancario" | "Regex FAVA" | "Regex CLIPER" | "Gemini" | "Manual"} ImportMethod
 */

/**
 * @typedef {{
 *   fileKind?: string;
 *   recordsFound: number;
 *   totalRows: number;
 *   invalidRows: number;
 *   recordsDiscarded?: number;
 *   importMethod?: ImportMethod;
 *   ocrDetectedRows?: { lineNumber: number; line: string; cuotas: number; coeficiente: number }[];
 *   ocrDiscardedRows?: { lineNumber: number; line: string; reason: string }[];
 *   ocrRawText?: string;
 *   geminiRawText?: string;
 *   geminiDetectedJson?: string;
 *   geminiParseError?: string;
 *   geminiApiKeyConfigured?: boolean;
 *   geminiStatus?: string;
 *   geminiError?: string;
 *   geminiRawResponse?: string;
 * }} AcquirerParseDebug
 */

/**
 * @typedef {{
 *   acquirer: string;
 *   records: ParsedImportRecord[];
 *   matrix: ImportMatrix | null;
 *   errors: string[];
 *   warnings: string[];
 *   debug?: AcquirerParseDebug;
 *   detectedCards?: string[];
 *   rawText?: string;
 *   source?: string;
 *   implemented?: boolean;
 * }} AcquirerParseResult
 */

/**
 * @typedef {(file: File, onProgress?: (progress: number, status: string) => void) => Promise<AcquirerParseResult>} AcquirerParserFn
 */

import { getTarjetasCache } from "@/lib/coeficientes/coeficientesTarjetasCache";
import {
  getImportTarjetas,
  getTarjetaByCodigo,
  getTarjetaDisplayLabel,
  isParserRegistered,
  normalizeTarjetaCodigo,
  resolveTarjetaCodigo,
} from "@/lib/coeficientes/coeficientesTarjetasModel";
import { getParserForTarjeta } from "@/lib/coeficientes/parsers/parserRegistry";

/**
 * Normaliza códigos en datos históricos contra el catálogo de Firestore.
 * @param {string} id
 * @param {import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta[]} [tarjetas]
 */
export function normalizeAcquirerId(id, tarjetas) {
  return resolveTarjetaCodigo(id, tarjetas);
}

/**
 * @param {string} id
 * @param {import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta[]} [tarjetas]
 */
export function getAcquirerDisplayLabel(id, tarjetas) {
  const normalized = normalizeTarjetaCodigo(normalizeAcquirerId(id));
  const list = tarjetas ?? getTarjetasCache();
  return getTarjetaDisplayLabel(normalized, list);
}

/**
 * @param {string} id
 * @param {import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta[]} [tarjetas]
 */
export function getAcquirerOption(id, tarjetas) {
  const list = tarjetas ?? getTarjetasCache();
  const tarjeta = getTarjetaByCodigo(list, id);
  if (!tarjeta) return null;
  return {
    id: tarjeta.codigo,
    label: tarjeta.nombre,
    implemented:
      tarjeta.tipoCarga === "automatica" &&
      Boolean(tarjeta.parser && getParserForTarjeta(tarjeta)),
    manualOnly: tarjeta.tipoCarga === "manual",
    description:
      tarjeta.tipoCarga === "manual"
        ? "Carga manual en Tablas Vigentes."
        : `Importación automática (${tarjeta.parser}).`,
  };
}

/**
 * @param {string} id
 * @param {import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta[]} [tarjetas]
 */
export function isAcquirerImplemented(id, tarjetas) {
  return Boolean(getAcquirerOption(id, tarjetas)?.implemented);
}

/**
 * Tarjetas activas con importación automática (desde Firestore).
 * @param {import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta[]} [tarjetas]
 */
export function getImportAcquirerOptions(tarjetas) {
  const list = tarjetas ?? getTarjetasCache();
  return getImportTarjetas(list).map((t) => ({
    id: t.codigo,
    label: t.nombre,
    implemented: Boolean(t.parser && isParserRegistered(t.parser)),
    parser: t.parser,
  }));
}
