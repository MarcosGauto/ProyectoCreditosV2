/** @typedef {"full" | "rawBase"} ParserImportMode */

/**
 * Parsers registrados en código (no son tarjetas comerciales).
 * @typedef {{
 *   key: string;
 *   label: string;
 *   importMode: ParserImportMode;
 *   acuerdoBancario?: boolean;
 * }} ParserDefinition
 */

/** @type {ParserDefinition[]} */
export const PARSER_DEFINITIONS = [
  { key: "CABAL", label: "CABAL", importMode: "full" },
  { key: "AMEX", label: "AMEX", importMode: "rawBase" },
  {
    key: "VISA_MASTER_ESTANDAR",
    label: "Visa / Master Estándar",
    importMode: "rawBase",
  },
  {
    key: "ACUERDO_BANCARIO",
    label: "Acuerdo Bancario",
    importMode: "rawBase",
    acuerdoBancario: true,
  },
  {
    key: "BANCARIAS_GENERALES",
    label: "Bancarias Generales",
    importMode: "rawBase",
    acuerdoBancario: true,
  },
  { key: "FAVA", label: "FavaCard", importMode: "rawBase" },
  { key: "CLIPER", label: "CLIPER", importMode: "rawBase" },
];

/**
 * @param {string | null | undefined} parserKey
 */
export function getParserDefinition(parserKey) {
  const key = String(parserKey ?? "")
    .trim()
    .toUpperCase();
  if (!key) return null;
  return PARSER_DEFINITIONS.find((d) => d.key === key) ?? null;
}

/**
 * @param {string | null | undefined} parserKey
 */
export function isRawBaseParser(parserKey) {
  return getParserDefinition(parserKey)?.importMode === "rawBase";
}

/**
 * @param {string | null | undefined} parserKey
 */
export function isFullImportParser(parserKey) {
  return getParserDefinition(parserKey)?.importMode === "full";
}

/**
 * @param {string | null | undefined} parserKey
 */
export function isAcuerdoBancarioParser(parserKey) {
  return Boolean(getParserDefinition(parserKey)?.acuerdoBancario);
}

export function listParserOptions() {
  return PARSER_DEFINITIONS.map((d) => ({ key: d.key, label: d.label }));
}
