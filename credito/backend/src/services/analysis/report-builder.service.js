/** Versión del shape persistido / expuesto (campos y semántica). */
export const QUALIFICATION_SCHEMA_VERSION = "1.0.0";

/** Versión del motor de reglas (ratios + scoring) acoplada a este payload. */
export const QUALIFICATION_ENGINE_VERSION = "1.0.0";

/**
 * @typedef {object} QualificationPayloadInput
 * @property {string} cuit
 * @property {number} score
 * @property {string} categoria
 * @property {number | null} liquidez
 * @property {number | null} endeudamiento
 * @property {number | null} margen
 * @property {number} rechazosPct
 * @property {number} fiscalScore
 * @property {number} bcraScore
 * @property {number} [timestampMs] ms desde epoch; default `Date.now()`
 */

/**
 * @param {QualificationPayloadInput} input
 * @returns {Record<string, unknown>}
 */
function assembleQualificationRecord(input) {
  const timestamp = input.timestampMs ?? Date.now();
  return {
    cuit: input.cuit,
    score: input.score,
    categoria: input.categoria,
    liquidez: input.liquidez,
    endeudamiento: input.endeudamiento,
    margen: input.margen,
    rechazosPct: input.rechazosPct,
    fiscalScore: input.fiscalScore,
    bcraScore: input.bcraScore,
    timestamp,
    generatedAt: new Date(timestamp).toISOString(),
    schemaVersion: QUALIFICATION_SCHEMA_VERSION,
    engineVersion: QUALIFICATION_ENGINE_VERSION,
  };
}

/**
 * DTO devuelto por la API (misma forma que el documento Firestore en esta versión).
 *
 * @param {QualificationPayloadInput} input
 * @returns {Record<string, unknown>}
 */
export function buildQualificationApiDto(input) {
  return assembleQualificationRecord(input);
}

/**
 * Documento persistido en `qualification/{cuit}`.
 *
 * @param {QualificationPayloadInput} input
 * @returns {Record<string, unknown>}
 */
export function buildQualificationFirestoreDocument(input) {
  return assembleQualificationRecord(input);
}

/**
 * Métricas internas (no incluidas en el DTO ni en Firestore por defecto).
 *
 * @param {{
 *   lastBalance: Record<string, unknown> | null;
 *   chequeMetrics: { totalCheques: number; rechazados: number; rechazosPct: number };
 * }} params
 * @returns {{
 *   lastBalance: Record<string, unknown> | null;
 *   lastBalancePeriodo: unknown;
 *   totalCheques: number;
 *   rechazados: number;
 *   rechazosPct: number;
 * }}
 */
export function buildQualificationMetrics({ lastBalance, chequeMetrics }) {
  return {
    lastBalance,
    lastBalancePeriodo: lastBalance?.periodo ?? null,
    totalCheques: chequeMetrics.totalCheques,
    rechazados: chequeMetrics.rechazados,
    rechazosPct: chequeMetrics.rechazosPct,
  };
}
