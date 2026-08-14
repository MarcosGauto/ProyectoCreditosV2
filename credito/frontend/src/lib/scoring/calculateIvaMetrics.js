import { parseMoney, roundMoneyForFirestore } from "@/lib/money"

export const IVA_ALICUOTA_21 = 0.21
export const IVA_ALICUOTA_105 = 0.105

/**
 * @param {unknown} value
 * @returns {number}
 */
function toAmountOrZero(value) {
  if (value == null || value === "") {
    return 0
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  return parseMoney(value) ?? 0
}

/**
 * @param {number} value
 * @returns {number}
 */
function roundMetric(value) {
  if (!Number.isFinite(value)) {
    return 0
  }
  return roundMoneyForFirestore(value) ?? 0
}

/**
 * Métricas IVA alineadas al Excel.
 *
 * @param {{
 *   debitoFiscal?: unknown;
 *   creditoFiscal?: unknown;
 *   coeficiente?: number | null;
 * }} input
 * @returns {{
 *   saldoTecnico: number;
 *   ventasIVA21: number;
 *   ventasIVA105: number;
 *   promedioIVA: number;
 *   creditoAsumibleIVA: number;
 *   ventas21: number;
 *   ventas105: number;
 *   promedioVentas: number;
 *   creditoAsumible: number;
 * }}
 */
export function calculateIvaMetrics(input) {
  const debito = toAmountOrZero(input.debitoFiscal)
  const credito = toAmountOrZero(input.creditoFiscal)
  const coeficiente =
    input.coeficiente != null && Number.isFinite(input.coeficiente)
      ? input.coeficiente
      : null

  const saldoTecnico = roundMetric(debito + credito)

  const ventasIVA21 =
    debito === 0 ? 0 : roundMetric(debito / IVA_ALICUOTA_21)

  const ventasIVA105 =
    debito === 0 ? 0 : roundMetric(debito / IVA_ALICUOTA_105)

  const promedioIVA = roundMetric((ventasIVA21 + ventasIVA105) / 2)

  const creditoAsumibleIVA =
    coeficiente != null ? roundMetric(promedioIVA * coeficiente) : 0

  return {
    saldoTecnico,
    ventasIVA21,
    ventasIVA105,
    promedioIVA,
    creditoAsumibleIVA,
    ventas21: ventasIVA21,
    ventas105: ventasIVA105,
    promedioVentas: promedioIVA,
    creditoAsumible: creditoAsumibleIVA,
  }
}
