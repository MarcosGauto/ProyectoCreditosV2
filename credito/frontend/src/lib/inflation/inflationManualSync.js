/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseLocaleDecimalInput(raw) {
  if (raw == null || raw === "") {
    return null
  }

  const cleaned = String(raw).trim().replace(/\s/g, "").replace(",", ".")
  if (!cleaned) {
    return null
  }

  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/**
 * @param {import("@/lib/inflation/balanceInflation").InflationFactorResult | null | undefined} inflation
 * @returns {boolean}
 */
export function isAutomaticInflation(inflation) {
  if (!inflation) {
    return false
  }
  if (inflation.manual || inflation.sourceId === "manual") {
    return false
  }
  if (inflation.fallback || inflation.apiUnavailable) {
    return false
  }
  return true
}

/**
 * @param {import("@/lib/inflation/balanceInflation").InflationFactorResult | null | undefined} inflation
 * @returns {boolean}
 */
export function isInflationApiUnavailable(inflation) {
  return Boolean(inflation?.apiUnavailable || inflation?.fallback)
}

/**
 * @param {{
 *   factor?: number | null;
 *   fechaIPCOrigen?: string | null;
 *   fechaIPCDestino?: string | null;
 * }} input
 * @returns {import("@/lib/inflation/balanceInflation").InflationFactorResult}
 */
export function buildManualInflationFactor(input) {
  const factor =
    input.factor != null && Number.isFinite(input.factor) && input.factor > 0
      ? input.factor
      : 1

  const accumulated = factor - 1

  return {
    factorInflacion: factor,
    accumulated,
    inflacionAcumuladaPct: accumulated * 100,
    ipcOrigen: null,
    ipcDestino: null,
    fechaIPCOrigen: input.fechaIPCOrigen ?? "",
    fechaIPCDestino: input.fechaIPCDestino ?? "",
    sourceId: "manual",
    manual: true,
    fallback: false,
    apiUnavailable: false,
  }
}

/**
 * @param {import("@/lib/inflation/balanceInflation").InflationFactorResult} inflation
 * @returns {{ coeficienteIpc: string }}
 */
export function inflationToManualFormFields(inflation) {
  const factor = inflation?.factorInflacion ?? 1

  return {
    coeficienteIpc: factor.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }),
  }
}
