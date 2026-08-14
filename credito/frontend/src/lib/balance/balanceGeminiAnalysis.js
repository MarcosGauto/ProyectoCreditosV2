import { formatCreditAmount, formatRatioPercent } from "@/lib/creditAnalysisEngine"
import { authFetch } from "@/lib/auth/authFetch"

/**
 * Arma el payload de indicadores para el análisis ejecutivo con IA.
 * Solo incluye datos ya calculados por el sistema.
 *
 * @param {{
 *   financieroTab?: Record<string, unknown> | null;
 *   balanceAnalysis?: Record<string, unknown> | null;
 *   asyncPreCal?: Record<string, unknown> | null;
 * }} input
 */
export function buildBalanceAnalysisInput(input) {
  const financieroTab = input.financieroTab ?? {}
  const balanceAnalysis = input.balanceAnalysis ?? {}
  const asyncPreCal = input.asyncPreCal ?? {}
  const indicadores = balanceAnalysis.indicadores ?? {}
  const comparativo = balanceAnalysis.comparativo ?? {}
  const variaciones = balanceAnalysis.variaciones ?? {}
  const ventas =
    asyncPreCal.ventas ?? asyncPreCal.indicadores ?? financieroTab.ventasContable

  return {
    ventas: {
      contable: financieroTab.ventasContable ?? ventas?.ventasBalance ?? null,
      iva: financieroTab.ventasIva ?? ventas?.ventasIva ?? null,
      iibb: financieroTab.ventasIibb ?? ventas?.ventasIibb ?? null,
      promedio: financieroTab.promedio ?? ventas?.promedioVentas ?? null,
    },
    resultado: {
      patrimonioNeto:
        comparativo.patrimonioNetoActual ?? financieroTab.patrimonioNeto ?? null,
      variacionPatrimonio: variaciones.variacionPatrimonio ?? null,
    },
    liquidez: {
      liquidezCorriente:
        indicadores.liquidezCorriente ?? financieroTab.liquidezCorriente ?? null,
      capitalTrabajo: indicadores.capitalTrabajo ?? null,
      solvencia: indicadores.solvencia ?? null,
    },
    endeudamiento: {
      ratio: indicadores.endeudamiento ?? financieroTab.endeudamiento ?? null,
      participacionPatrimonial: indicadores.participacionPatrimonial ?? null,
      coberturaPatrimonial: indicadores.coberturaPatrimonial ?? null,
    },
    rentabilidad: {
      evolucionPatrimonial:
        balanceAnalysis.evolucionPatrimonial?.resumenPatrimonioNeto ?? null,
      estadoBalance: balanceAnalysis.estadoBalance ?? null,
      dictamen: balanceAnalysis.dictamenPatrimonial?.label ?? null,
    },
    ratios: {
      liquidezCorriente:
        indicadores.liquidezCorriente ?? financieroTab.liquidezCorriente ?? null,
      endeudamiento: indicadores.endeudamiento ?? financieroTab.endeudamiento ?? null,
      solvencia: indicadores.solvencia ?? null,
      participacionPatrimonial: indicadores.participacionPatrimonial ?? null,
    },
    periodos: {
      actual: balanceAnalysis.periodoReciente ?? balanceAnalysis.fechaCierreUltimo ?? null,
      anterior:
        balanceAnalysis.periodoAnterior ?? balanceAnalysis.fechaCierreAnterior ?? null,
    },
    formatoLegible: {
      ventasContable: formatCreditAmount(
        /** @type {number | null} */ (
          financieroTab.ventasContable ?? ventas?.ventasBalance ?? null
        )
      ),
      patrimonioNeto: formatCreditAmount(
        /** @type {number | null} */ (
          comparativo.patrimonioNetoActual ?? financieroTab.patrimonioNeto ?? null
        )
      ),
      liquidezCorriente:
        indicadores.liquidezCorriente != null
          ? Number(indicadores.liquidezCorriente).toLocaleString("es-AR", {
              maximumFractionDigits: 2,
            })
          : null,
      endeudamiento: formatRatioPercent(
        /** @type {number | null} */ (
          indicadores.endeudamiento ?? financieroTab.endeudamiento ?? null
        )
      ),
      capitalTrabajo: formatCreditAmount(
        /** @type {number | null} */ (indicadores.capitalTrabajo ?? null)
      ),
    },
  }
}

/**
 * @typedef {Object} BalanceGeminiAnalysisResult
 * @property {string[]} fortalezas
 * @property {string[]} debilidades
 * @property {string[]} monitorear
 * @property {string[]} lineas
 * @property {string} texto
 * @property {string} generadoEn
 */

/**
 * @param {ReturnType<typeof buildBalanceAnalysisInput>} indicadores
 * @returns {Promise<BalanceGeminiAnalysisResult>}
 */
export async function fetchBalanceGeminiAnalysis(indicadores) {
  const response = await authFetch("/api/balance-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ indicadores }),
  })

  /** @type {unknown} */
  let payload
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Error generando análisis con IA"
    throw new Error(message)
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("analisis" in payload) ||
    typeof payload.analisis !== "object" ||
    payload.analisis === null
  ) {
    throw new Error("Respuesta inválida del servicio de análisis")
  }

  return /** @type {BalanceGeminiAnalysisResult} */ (payload.analisis)
}

export const BALANCE_ANALYSIS_SATURATED_MESSAGE =
  "Gemini temporalmente saturado. Reintente más tarde."
