import { normalizeBcraReport } from "@/lib/normalizeBcraReport"
import { resolveCreditPolicy } from "@/lib/creditPolicy/resolveCreditPolicy"

export const TIPO_OPERACION = {
  NOMINADO: "NOMINADO",
  DISCRECIONAL: "DISCRECIONAL",
}

export const RESULTADO_COBERTURA = {
  NOMINADO_CON_COBERTURA: "NOMINADO_CON_COBERTURA",
  DISCRECIONAL_CON_COBERTURA: "DISCRECIONAL_CON_COBERTURA",
  SIN_COBERTURA: "SIN_COBERTURA",
}

export const RESULTADO_COBERTURA_LABELS = {
  [RESULTADO_COBERTURA.NOMINADO_CON_COBERTURA]: "NOMINADO - CON COBERTURA",
  [RESULTADO_COBERTURA.DISCRECIONAL_CON_COBERTURA]: "DISCRECIONAL - CON COBERTURA",
  [RESULTADO_COBERTURA.SIN_COBERTURA]: "SIN COBERTURA",
}

export const MOTIVOS_EXCLUSION = {
  ANTIGUEDAD: "Antigüedad insuficiente",
  CHEQUES: "Registra cheques rechazados",
  ATRASOS: "Registra atrasos bancarios",
  FACTURAS: "No cumple requisito de facturas al contado",
}

const DEFAULT_MESES_HISTORIAL_BCRA = 24
const DEFAULT_ANTIGUEDAD_MINIMA_ANIOS = 2
const DEFAULT_FACTURAS_CONTADO_MINIMAS = 3

export const TIPO_OPERACION_OPTIONS = [
  { value: TIPO_OPERACION.NOMINADO, label: "Nominado" },
  { value: TIPO_OPERACION.DISCRECIONAL, label: "Discrecional" },
]

/**
 * @param {import("@/lib/creditPolicy/creditPolicyTypes").CreditPolicy["reglasCobertura"]} reglas
 */
function buildCoverageLabels(reglas) {
  const anios = reglas.antiguedadMinimaAnios ?? DEFAULT_ANTIGUEDAD_MINIMA_ANIOS
  const meses = reglas.mesesSinAtrasos ?? DEFAULT_MESES_HISTORIAL_BCRA
  const facturasMin = reglas.facturasContadoMinimas ?? DEFAULT_FACTURAS_CONTADO_MINIMAS

  return {
    cheques: "Sin cheques rechazados",
    atrasosBancarios: `Sin atrasos bancarios últimos ${meses} meses`,
    facturasContado: `Facturas al contado (mín. ${facturasMin})`,
    antiguedadCumple: `Antigüedad ≥ ${anios} años`,
    antiguedadIncumple: `Antigüedad menor a ${anios} años`,
    motivoAntiguedad: `Antigüedad menor a ${anios} años`,
    motivoFacturas: `No posee ${facturasMin} facturas al contado`,
  }
}

/**
 * @typedef {Object} RequisitosCoberturaMap
 * @property {boolean} antiguedad
 * @property {boolean} cheques
 * @property {boolean} atrasosBancarios
 * @property {boolean} facturasContado
 */

/**
 * @typedef {Object} CoverageDecision
 * @property {string} tipoOperacion
 * @property {string} resultadoCobertura
 * @property {string} resultadoCoberturaLabel
 * @property {RequisitosCoberturaMap} requisitosCobertura
 * @property {string[]} motivosExclusion
 * @property {boolean} todosCumplen
 * @property {number | null} antiguedadAnios
 * @property {Array<{ key: string; label: string; cumple: boolean }>} checklist
 */

/**
 * @param {string | Date | null | undefined} value
 * @returns {Date | null}
 */
export function parseFechaInicioActividad(value) {
  if (!value) {
    return null
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Antigüedad de la razón social = fecha actual − fecha inicio de actividad.
 * Usa años calendario completos (misma fecha de aniversario cuenta como cumplido).
 *
 * @param {string | Date | null | undefined} fechaInicio
 * @param {Date} [referenceDate]
 * @returns {number | null}
 */
export function calcularAntiguedadAnios(
  fechaInicio,
  referenceDate = new Date()
) {
  const start = parseFechaInicioActividad(fechaInicio)
  if (!start) {
    return null
  }

  const ref = new Date(referenceDate)
  if (ref.getTime() < start.getTime()) {
    return 0
  }

  let years = ref.getFullYear() - start.getFullYear()
  const monthDiff = ref.getMonth() - start.getMonth()
  const dayDiff = ref.getDate() - start.getDate()

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years -= 1
  }

  return Math.max(0, years)
}

/**
 * @param {RequisitosCoberturaMap} requisitosCobertura
 * @param {ReturnType<typeof buildCoverageLabels>} labels
 * @returns {Array<{ key: string; label: string; cumple: boolean }>}
 */
function buildCoverageChecklist(requisitosCobertura, labels) {
  return [
    {
      key: "antiguedad",
      label: requisitosCobertura.antiguedad
        ? labels.antiguedadCumple
        : labels.antiguedadIncumple,
      cumple: requisitosCobertura.antiguedad,
    },
    {
      key: "cheques",
      label: labels.cheques,
      cumple: requisitosCobertura.cheques,
    },
    {
      key: "atrasosBancarios",
      label: labels.atrasosBancarios,
      cumple: requisitosCobertura.atrasosBancarios,
    },
    {
      key: "facturasContado",
      label: labels.facturasContado,
      cumple: requisitosCobertura.facturasContado,
    },
  ]
}

/**
 * @param {string | null | undefined} periodo
 * @returns {Date | null}
 */
function parseBcraPeriodoToDate(periodo) {
  if (!periodo) {
    return null
  }

  const raw = String(periodo).trim()
  const compact = raw.replace(/\D/g, "")

  if (compact.length >= 6) {
    const year = Number(compact.slice(0, 4))
    const month = Number(compact.slice(4, 6))
    if (year >= 1900 && month >= 1 && month <= 12) {
      return new Date(year, month - 1, 1)
    }
  }

  if (compact.length === 4) {
    const year = Number(compact)
    if (year >= 1900) {
      return new Date(year, 0, 1)
    }
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * @param {unknown[]} bcraReports
 * @returns {Array<{ periodo: string | null; entidades: Array<Record<string, unknown>> }>}
 */
export function extractBcraPeriodosFromReports(bcraReports = []) {
  const periodos = /** @type {Array<{ periodo: string | null; entidades: Array<Record<string, unknown>> }>} */ ([])

  for (const report of bcraReports) {
    if (!report || typeof report !== "object") {
      continue
    }

    const doc = /** @type {Record<string, unknown>} */ (report)
    const results =
      doc.results && typeof doc.results === "object" && !Array.isArray(doc.results)
        ? /** @type {Record<string, unknown>} */ (doc.results)
        : null

    const rawPeriodos = /** @type {unknown[]} */ (
      results?.periodos ?? doc.periodos ?? []
    )

    if (Array.isArray(rawPeriodos) && rawPeriodos.length > 0) {
      for (const item of rawPeriodos) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          continue
        }
        const row = /** @type {Record<string, unknown>} */ (item)
        periodos.push({
          periodo: row.periodo != null ? String(row.periodo) : null,
          entidades: Array.isArray(row.entidades)
            ? row.entidades.filter(
                (e) => e && typeof e === "object" && !Array.isArray(e)
              )
            : [],
        })
      }
      continue
    }

    const normalized = normalizeBcraReport(doc)
    if (normalized.entidades.length > 0 || normalized.periodo) {
      periodos.push({
        periodo: normalized.periodo,
        entidades: normalized.entidades,
      })
    }
  }

  return periodos
}

/**
 * @param {unknown[]} bcraReports
 * @param {Date} [referenceDate]
 * @param {number} [mesesHistorial]
 * @returns {boolean}
 */
export function evaluateAtrasosBancarios24Meses(
  bcraReports = [],
  referenceDate = new Date(),
  mesesHistorial = DEFAULT_MESES_HISTORIAL_BCRA
) {
  const periodos = extractBcraPeriodosFromReports(bcraReports)

  if (periodos.length === 0) {
    return false
  }

  const cutoff = new Date(referenceDate)
  cutoff.setMonth(cutoff.getMonth() - mesesHistorial)

  const periodosEnVentana = periodos.filter((item) => {
    const date = parseBcraPeriodoToDate(item.periodo)
    return date ? date >= cutoff : true
  })

  if (periodosEnVentana.length === 0) {
    return false
  }

  for (const item of periodosEnVentana) {
    for (const entidad of item.entidades) {
      const situacion = Number(entidad.situacion) || 1
      const diasAtraso = Number(entidad.diasAtrasoPago) || 0
      const tieneProblema =
        situacion > 1 ||
        diasAtraso > 0 ||
        Boolean(entidad.refinanciaciones) ||
        Boolean(entidad.procesoJud) ||
        Boolean(entidad.situacionJuridica)

      if (tieneProblema) {
        return false
      }
    }
  }

  return true
}

/**
 * @param {string} resultadoCobertura
 * @returns {"green" | "amber" | "red"}
 */
export function getResultadoCoberturaTone(resultadoCobertura) {
  if (resultadoCobertura === RESULTADO_COBERTURA.NOMINADO_CON_COBERTURA) {
    return "green"
  }
  if (resultadoCobertura === RESULTADO_COBERTURA.DISCRECIONAL_CON_COBERTURA) {
    return "amber"
  }
  return "red"
}

/**
 * @param {string} resultadoCobertura
 * @returns {string}
 */
export function getResultadoCoberturaEmoji(resultadoCobertura) {
  const tone = getResultadoCoberturaTone(resultadoCobertura)
  if (tone === "green") return "🟢"
  if (tone === "amber") return "🟡"
  return "🔴"
}

/** Emoji del bloque Resultado Final (ambas coberturas válidas en verde). */
export function getResultadoFinalDisplayEmoji(resultadoCobertura) {
  if (
    resultadoCobertura === RESULTADO_COBERTURA.NOMINADO_CON_COBERTURA ||
    resultadoCobertura === RESULTADO_COBERTURA.DISCRECIONAL_CON_COBERTURA
  ) {
    return "🟢"
  }
  return "🔴"
}

/**
 * @param {string} resultadoCobertura
 * @returns {string}
 */
export function getResultadoCoberturaBadgeClass(resultadoCobertura) {
  const tone = getResultadoCoberturaTone(resultadoCobertura)
  if (tone === "green" || tone === "amber") {
    return "border-green-500/40 bg-green-500/15 text-green-300"
  }
  return "border-red-500/40 bg-red-500/15 text-red-300"
}

/**
 * @param {string | null | undefined} resultadoCobertura
 * @returns {boolean}
 */
export function resultadoCoberturaPermiteMonto(resultadoCobertura) {
  return (
    resultadoCobertura === RESULTADO_COBERTURA.NOMINADO_CON_COBERTURA ||
    resultadoCobertura === RESULTADO_COBERTURA.DISCRECIONAL_CON_COBERTURA
  )
}

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function getResultadoCoberturaLabel(value) {
  const key = String(value ?? "")
  return RESULTADO_COBERTURA_LABELS[key] ?? "SIN COBERTURA"
}

/**
 * @param {{
 *   tipoOperacion?: string | null;
 *   fechaInicioActividad?: string | Date | null;
 *   chequesRechazadosCount?: number;
 *   nosisChequesRechazados?: number | null;
 *   nosisChequesPendientes?: number | null;
 *   bcraReports?: unknown[];
 *   facturasAlContado?: boolean | null;
 *   facturasContadoCount?: number | null;
 *   referenceDate?: Date;
 *   creditPolicy?: unknown;
 * }} input
 * @returns {CoverageDecision}
 */
export function evaluateCoverageDecision(input) {
  const policy = resolveCreditPolicy(input.creditPolicy)
  const reglas = policy.reglasCobertura
  const labels = buildCoverageLabels(reglas)

  const tipoOperacion =
    input.tipoOperacion === TIPO_OPERACION.DISCRECIONAL
      ? TIPO_OPERACION.DISCRECIONAL
      : TIPO_OPERACION.NOMINADO

  const antiguedadAnios = calcularAntiguedadAnios(
    input.fechaInicioActividad ?? null,
    input.referenceDate ?? new Date()
  )
  const antiguedadMinima =
    reglas.antiguedadMinimaAnios ?? DEFAULT_ANTIGUEDAD_MINIMA_ANIOS
  const antiguedadCumple =
    antiguedadAnios !== null && antiguedadAnios >= antiguedadMinima

  const chequesInternos = Number(input.chequesRechazadosCount) || 0
  const chequesNosisRechazados =
    input.nosisChequesRechazados != null &&
    Number.isFinite(Number(input.nosisChequesRechazados))
      ? Number(input.nosisChequesRechazados)
      : null
  const chequesNosisPendientes =
    input.nosisChequesPendientes != null &&
    Number.isFinite(Number(input.nosisChequesPendientes))
      ? Number(input.nosisChequesPendientes)
      : null

  const nosisTieneCheques =
    (chequesNosisRechazados != null && chequesNosisRechazados > 0) ||
    (chequesNosisPendientes != null && chequesNosisPendientes > 0)

  const exigirCheques = reglas.exigirSinChequesRechazados !== false
  const chequesCumple = exigirCheques
    ? chequesInternos === 0 && !nosisTieneCheques
    : true

  const mesesSinAtrasos = reglas.mesesSinAtrasos ?? DEFAULT_MESES_HISTORIAL_BCRA
  const atrasosBancariosCumple = evaluateAtrasosBancarios24Meses(
    input.bcraReports ?? [],
    input.referenceDate ?? new Date(),
    mesesSinAtrasos
  )

  const facturasMinimas =
    reglas.facturasContadoMinimas ?? DEFAULT_FACTURAS_CONTADO_MINIMAS
  const facturasContadoCumple =
    input.facturasContadoCount != null &&
    Number.isFinite(Number(input.facturasContadoCount))
      ? Number(input.facturasContadoCount) >= facturasMinimas
      : input.facturasAlContado === true

  /** @type {RequisitosCoberturaMap} */
  const requisitosCobertura = {
    antiguedad: antiguedadCumple,
    cheques: chequesCumple,
    atrasosBancarios: atrasosBancariosCumple,
    facturasContado: facturasContadoCumple,
  }

  /** @type {string[]} */
  const motivosExclusion = []
  if (!antiguedadCumple) {
    motivosExclusion.push(labels.motivoAntiguedad)
  }
  if (!chequesCumple) {
    motivosExclusion.push(MOTIVOS_EXCLUSION.CHEQUES)
  }
  if (!atrasosBancariosCumple) {
    motivosExclusion.push(MOTIVOS_EXCLUSION.ATRASOS)
  }
  if (!facturasContadoCumple) {
    motivosExclusion.push(labels.motivoFacturas)
  }

  const todosCumplen = motivosExclusion.length === 0

  let resultadoCobertura = RESULTADO_COBERTURA.SIN_COBERTURA
  if (todosCumplen) {
    resultadoCobertura =
      tipoOperacion === TIPO_OPERACION.DISCRECIONAL
        ? RESULTADO_COBERTURA.DISCRECIONAL_CON_COBERTURA
        : RESULTADO_COBERTURA.NOMINADO_CON_COBERTURA
  }

  const checklist = buildCoverageChecklist(requisitosCobertura, labels)

  return {
    tipoOperacion,
    resultadoCobertura,
    resultadoCoberturaLabel: RESULTADO_COBERTURA_LABELS[resultadoCobertura],
    requisitosCobertura,
    motivosExclusion,
    todosCumplen,
    antiguedadAnios,
    checklist,
  }
}

/**
 * @param {string | null | undefined} iso
 * @returns {string}
 */
export function formatFechaInicioActividadInput(iso) {
  const date = parseFechaInicioActividad(iso)
  if (!date) {
    return ""
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * @param {string} inputValue YYYY-MM-DD
 * @returns {string | null} ISO date at noon UTC-safe local
 */
export function fechaInicioActividadFromInput(inputValue) {
  if (!inputValue || !/^\d{4}-\d{2}-\d{2}$/.test(inputValue)) {
    return null
  }
  const [year, month, day] = inputValue.split("-").map(Number)
  const date = new Date(year, month - 1, day, 12, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
