/** @typedef {'MILES' | 'PESOS'} BcraMontoFormat */

/**
 * @param {{
 *   periodos?: unknown[];
 *   flatEntidades?: unknown[];
 *   hasMapperResumen?: boolean;
 *   explicitFormat?: string | null;
 * }} ctx
 * @returns {BcraMontoFormat}
 */
export function detectBcraMontoFormat(ctx) {
  const { periodos = [], flatEntidades = [], hasMapperResumen, explicitFormat } =
    ctx;

  if (explicitFormat === "PESOS" || explicitFormat === "MILES") {
    return explicitFormat;
  }

  if (Array.isArray(periodos) && periodos.length > 0) {
    return "MILES";
  }

  if (Array.isArray(flatEntidades) && flatEntidades.length > 0) {
    if (hasMapperResumen) {
      return "PESOS";
    }
    return "PESOS";
  }

  return "MILES";
}

/**
 * @param {unknown} montoRaw
 * @param {BcraMontoFormat} format
 * @returns {{ montoRaw: number; montoPesos: number; format: BcraMontoFormat }}
 */
export function convertBcraMontoToPesos(montoRaw, format) {
  const raw = Number(montoRaw) || 0;

  if (format === "MILES") {
    return {
      montoRaw: raw,
      montoPesos: raw * 1000,
      format,
    };
  }

  return {
    montoRaw: raw,
    montoPesos: raw,
    format,
  };
}

/**
 * @param {string} scope
 * @param {Record<string, unknown>} payload
 */
export function logBcraMonto(scope, payload) {
  console.info(`[BCRA monto] ${scope}`, payload);
}
