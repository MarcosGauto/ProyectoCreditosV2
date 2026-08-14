import { SEMAPHORE_STYLES } from "@/config/creditAnalysis"
import {
  getResultadoCoberturaLabel,
  getResultadoFinalDisplayEmoji,
  resultadoCoberturaPermiteMonto,
  TIPO_OPERACION_OPTIONS,
} from "@/lib/coverageRequirements"
import { formatCreditAmount } from "@/lib/creditAnalysisEngine"
import { getTipoEmpresaLabel } from "@/lib/scoring/prequalification"

/**
 * @param {string | null | undefined} value
 * @param {Array<{ value: string; label: string }>} options
 * @returns {string}
 */
function labelFromOptions(value, options) {
  if (!value) {
    return "—"
  }
  return options.find((option) => option.value === value)?.label ?? value
}

/**
 * @param {number | null | undefined} ratio
 * @returns {string}
 */
function formatPercent(ratio) {
  if (ratio === null || ratio === undefined || !Number.isFinite(Number(ratio))) {
    return "—"
  }
  return `${(Number(ratio) * 100).toLocaleString("es-AR", {
    maximumFractionDigits: 1,
  })}%`
}

/**
 * @param {import("@/config/creditAnalysis").SEMAPHORE_STYLES[keyof typeof SEMAPHORE_STYLES]} sem
 */
function formatSemaphore(estado) {
  const sem = SEMAPHORE_STYLES[estado] ?? SEMAPHORE_STYLES.unknown
  return `${sem.emoji} ${sem.label}`
}

/**
 * @param {Record<string, unknown> | null | undefined} saved
 * @param {ReturnType<import("@/lib/normalizeBcraReport").computeBcraMetrics> | null} [bcraMetrics]
 */
export function mapCreditAnalysisToResultView(saved, bcraMetrics = null) {
  if (!saved) {
    return null
  }

  const computed =
    saved.computed && typeof saved.computed === "object"
      ? /** @type {Record<string, unknown>} */ (saved.computed)
      : {}

  const preCal =
    computed.preCalificacion && typeof computed.preCalificacion === "object"
      ? /** @type {Record<string, unknown>} */ (computed.preCalificacion)
      : {}

  const ventasRaw =
    preCal.ventas && typeof preCal.ventas === "object"
      ? preCal.ventas
      : preCal.indicadores && typeof preCal.indicadores === "object"
        ? preCal.indicadores
        : {}

  const ventas = /** @type {Record<string, unknown>} */ (ventasRaw)

  const capacidad =
    computed.capacidadEconomica &&
    typeof computed.capacidadEconomica === "object"
      ? /** @type {Record<string, unknown>} */ (computed.capacidadEconomica)
      : {}

  const credito =
    computed.creditoAsumible && typeof computed.creditoAsumible === "object"
      ? /** @type {Record<string, unknown>} */ (computed.creditoAsumible)
      : {}

  const resumen =
    computed.resumenEjecutivo && typeof computed.resumenEjecutivo === "object"
      ? /** @type {Record<string, unknown>} */ (computed.resumenEjecutivo)
      : {}

  const tipoEmpresaKey = String(
    saved.tipoEmpresa ?? preCal.tipoEmpresa ?? ""
  )

  return {
    cuit: String(saved.cuit ?? resumen.cuit ?? "—"),
    razonSocial: String(resumen.razonSocial ?? "—"),
    analista: String(saved.analista ?? resumen.analista ?? "—"),
    updatedAt: saved.updatedAt ?? null,
    tipoOperacion: labelFromOptions(
      String(saved.tipoOperacion ?? ""),
      TIPO_OPERACION_OPTIONS
    ),
    tipoEmpresa: getTipoEmpresaLabel(tipoEmpresaKey),
    recomendacionAnalista: String(saved.recomendacionAnalista ?? "").trim(),
    resultadoCobertura: String(saved.resultadoCobertura ?? ""),
    resultadoFinal: String(saved.resultadoCobertura ?? ""),
    resultadoFinalLabel: (() => {
      const key = String(saved.resultadoCobertura ?? "")
      return `${getResultadoFinalDisplayEmoji(key)} ${getResultadoCoberturaLabel(key)}`
    })(),
    permiteMontoCredito: resultadoCoberturaPermiteMonto(
      String(saved.resultadoCobertura ?? "")
    ),
    montoCreditoOtorgado:
      saved.montoCreditoOtorgado != null &&
      Number.isFinite(Number(saved.montoCreditoOtorgado))
        ? formatCreditAmount(Number(saved.montoCreditoOtorgado))
        : null,
    preCalificacion: formatCreditAmount(
      /** @type {number | null} */ (preCal.preCalificacion ?? null)
    ),
    calificacionFinal: formatCreditAmount(
      /** @type {number | null} */ (credito.creditoSugerido ?? null)
    ),
    ventas: {
      balance: formatCreditAmount(
        /** @type {number | null} */ (ventas.ventasBalance ?? null)
      ),
      iva: formatCreditAmount(
        /** @type {number | null} */ (ventas.ventasIva ?? null)
      ),
      iibb: formatCreditAmount(
        /** @type {number | null} */ (ventas.ventasIibb ?? null)
      ),
      promedio: formatCreditAmount(
        /** @type {number | null} */ (
          preCal.promedioVentas ?? preCal.promedioIndicadores ?? null
        )
      ),
    },
    indicadoresFinancieros: {
      patrimonioNeto: formatCreditAmount(
        /** @type {number | null} */ (capacidad.patrimonioNeto ?? null)
      ),
      activoTotal: formatCreditAmount(
        /** @type {number | null} */ (capacidad.activoTotal ?? null)
      ),
      liquidezCorriente:
        capacidad.liquidezCorriente != null &&
        Number.isFinite(Number(capacidad.liquidezCorriente))
          ? Number(capacidad.liquidezCorriente).toLocaleString("es-AR", {
              maximumFractionDigits: 2,
            })
          : "—",
      endeudamiento: formatPercent(
        /** @type {number | null} */ (capacidad.endeudamiento ?? null)
      ),
      estadoGeneral: formatSemaphore(
        /** @type {keyof typeof SEMAPHORE_STYLES} */ (
          resumen.estadoGeneral ?? "unknown"
        )
      ),
      ventasAnuales: formatCreditAmount(
        /** @type {number | null} */ (capacidad.ventasAnualesEstimadas ?? null)
      ),
    },
    bcra: bcraMetrics?.hasBcra
      ? {
          peorSituacion: bcraMetrics.peorSituacion ?? "—",
          deudaTotal: formatCreditAmount(bcraMetrics.deudaTotal ?? 0),
          entidadesConAtraso: String(bcraMetrics.entidadesConAtraso ?? 0),
          maxDiasAtraso: String(bcraMetrics.maxDiasAtraso ?? 0),
          tieneJudiciales: bcraMetrics.tieneJudiciales ? "Sí" : "No",
          tieneRefinanciaciones: bcraMetrics.tieneRefinanciaciones
            ? "Sí"
            : "No",
        }
      : null,
  }
}
