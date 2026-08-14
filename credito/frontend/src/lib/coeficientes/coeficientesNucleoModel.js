/** Documento Firestore con parámetros globales y tablas operativas. */
export const COEFICIENTES_NUCLEO_DOC_PATH = ["coeficientes", "coeficientesNucleo"]

/** @typedef {{
 *   arancelDeb: number;
 *   arancelCre: number;
 *   interes: number;
 * }} CoeficientesGlobales
 */

/** Valores por defecto (misma semilla que Coeficientes Tarjetas). */
export const DEFAULT_COEFICIENTES_GLOBALES = {
  arancelDeb: 0.8,
  arancelCre: 1.8,
  interes: 1.14,
}

/**
 * @param {unknown} value
 * @param {number} fallback
 */
export function numOr(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * @param {Record<string, unknown> | null | undefined} raw
 * @returns {CoeficientesGlobales}
 */
export function parseCoeficientesGlobales(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_COEFICIENTES_GLOBALES }
  }
  return {
    arancelDeb: numOr(raw.arancelDeb, DEFAULT_COEFICIENTES_GLOBALES.arancelDeb),
    arancelCre: numOr(raw.arancelCre, DEFAULT_COEFICIENTES_GLOBALES.arancelCre),
    interes: numOr(raw.interes, DEFAULT_COEFICIENTES_GLOBALES.interes),
  }
}
