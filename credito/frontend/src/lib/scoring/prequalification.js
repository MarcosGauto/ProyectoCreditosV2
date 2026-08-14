import {
  parseBalanceAmount,
  pickBalanceNumericField,
} from "@/lib/balanceFinancialSummary"
import { getDocumentSortTime } from "@/lib/getLatestDocumentPeriod"
import { getEjercicioYear } from "@/lib/balancePairModel"
import {
  normalizeToBalanceContable,
  computePrequalificationFromContable,
  hasBalanceContableIndicators,
  BALANCE_CONTABLE_COLUMNS,
  getColumnEjercicio,
  getColumnInflationFactor,
  getVentasPromedioMensualForColumn,
  logBalanceContableVentasDebug,
  pickVentasPromedioMensualCompleteEjercicioRow,
  resolveColumnForLastCompleteEjercicio,
  logVentasContableSeleccionDebug,
  fechaCierreFieldForColumn,
} from "@/lib/balanceContableModel"
import {
  averagePromedioIvaConfirmed,
  hasConfirmedIvaIndicators,
} from "@/lib/ivaIndicators"
import { getIibbBaseImponibleForCredit } from "@/lib/iibbIndicators"
import {
  computeBalanceRubroExcelMetrics,
  computePreCalificacionFromVentasMensuales,
  formatCoeficienteIpcDisplay,
  getBalanceFactorActualizacion,
  getBalanceInflationAccumulated,
  PREQUALIFICATION_VENTAS_IVA_FACTOR,
} from "@/lib/balancePrequalificationPreview"

/** @deprecated Use PREQUALIFICATION_VENTAS_IVA_FACTOR */
export const PREQUALIFICATION_IVA_FACTOR = PREQUALIFICATION_VENTAS_IVA_FACTOR

/**
 * Coeficientes por tipo de empresa (misma tabla que el Excel).
 * @type {Record<string, number>}
 */
export const COEFICIENTE_TIPO_EMPRESA = {
  retail_tier_1: 0.03,
  retail_mediano: 0.06,
  retail_chico: 0.1,
  reseller_a: 0.07,
  reseller_b: 0.1,
  reseller_c: 0.15,
  corporativo: 0.03,
}

/** @type {Array<{ value: string; label: string }>} */
export const TIPO_EMPRESA_OPTIONS = [
  { value: "retail_tier_1", label: "Retail Tier 1" },
  { value: "retail_mediano", label: "Retail Mediano" },
  { value: "retail_chico", label: "Retail Chico" },
  { value: "reseller_a", label: "Reseller A" },
  { value: "reseller_b", label: "Reseller B" },
  { value: "reseller_c", label: "Reseller C" },
  { value: "corporativo", label: "Corporativo" },
]

/** @typedef {"ventas" | "compras" | "costos"} PrequalificationRubro */

/** @type {PrequalificationRubro[]} */
export const PREQUALIFICATION_RUBROS = ["ventas", "compras", "costos"]

/** @type {Record<PrequalificationRubro, { annual: string[]; label: string }>} */
const RUBRO_FIELD_MAP = {
  ventas: {
    // Solo ventas contables anuales (histórico); no ventasActualizada.
    annual: ["ventas", "ventas_contables"],
    label: "Ventas contables",
  },
  compras: {
    annual: ["compras"],
    label: "Compras",
  },
  costos: {
    annual: ["costos"],
    label: "Costos",
  },
}

const TIPO_EMPRESA_ALIASES = [
  ["retail_tier_1", ["retail tier 1", "retail_tier_1", "retailtier1", "tier 1"]],
  ["retail_mediano", ["retail mediano", "retail_mediano", "retailmediano"]],
  ["retail_chico", ["retail chico", "retail_chico", "retailchico"]],
  ["reseller_a", ["reseller a", "reseller_a", "resellera"]],
  ["reseller_b", ["reseller b", "reseller_b", "resellerb"]],
  ["reseller_c", ["reseller c", "reseller_c", "resellerc"]],
  ["corporativo", ["corporativo", "corp"]],
]

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeTipoEmpresa(raw) {
  if (raw == null || raw === "") {
    return null
  }

  const normalized = String(raw)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")

  if (Object.prototype.hasOwnProperty.call(COEFICIENTE_TIPO_EMPRESA, normalized)) {
    return normalized
  }

  for (const [canonical, aliases] of TIPO_EMPRESA_ALIASES) {
    if (
      aliases.some(
        (alias) =>
          normalized === alias ||
          normalized.replace(/\s/g, "") === alias.replace(/\s/g, "")
      )
    ) {
      return canonical
    }
  }

  return null
}

/**
 * @param {string | null | undefined} tipoEmpresa
 * @returns {number | null}
 */
export function getCoeficienteTipoEmpresa(tipoEmpresa) {
  const key = normalizeTipoEmpresa(tipoEmpresa)
  if (!key) {
    return null
  }
  return COEFICIENTE_TIPO_EMPRESA[key] ?? null
}

/**
 * @param {string | null | undefined} tipoEmpresa
 * @returns {string}
 */
export function getTipoEmpresaLabel(tipoEmpresa) {
  const key = normalizeTipoEmpresa(tipoEmpresa)
  if (!key) {
    return "—"
  }
  return TIPO_EMPRESA_OPTIONS.find((option) => option.value === key)?.label ?? key
}

/**
 * @param {Record<string, unknown> | null | undefined} empresa
 * @returns {string | null}
 */
export function inferTipoEmpresaFromEmpresa(empresa) {
  if (!empresa) {
    return null
  }

  const perfil =
    empresa.perfilComercial && typeof empresa.perfilComercial === "object"
      ? /** @type {Record<string, unknown>} */ (empresa.perfilComercial)
      : null

  const candidates = [
    empresa.tipoEmpresa,
    empresa.tipo_empresa,
    empresa.tipoDeEmpresa,
    empresa.categoriaComercial,
    perfil?.tipoEmpresa,
    perfil?.tipo_empresa,
    perfil?.categoria,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeTipoEmpresa(candidate)
    if (normalized) {
      return normalized
    }
  }

  return null
}

/**
 * @typedef {{
 *   ventasBalance: number | null;
 *   ventasIva: number | null;
 *   ventasIibb: number | null;
 * }} PrequalificationVentas
 */

/**
 * @typedef {{
 *   anio: string;
 *   balanceId: string | null;
 *   fechaCierre: string | null;
 *   promedioMensual: number | null;
 *   coefInflacion: number | null;
 *   inflacionAcumuladaPct: number | null;
 *   valorActualizado: number | null;
 *   creditoCalculado: number | null;
 *   fechaIPCOrigen: string | null;
 *   fechaIPCDestino: string | null;
 * }} PrequalificationTableRow
 */

/**
 * Excel PROMEDIO.SI(rango;"<>0";rango): promedio de valores > 0.
 *
 * @param {Array<number | null | undefined>} values
 * @returns {number}
 */
export function calculateAverageSales(values) {
  const valid = /** @type {number[]} */ ([])

  for (const raw of values) {
    if (raw === null || raw === undefined) {
      continue
    }
    const value = Number(raw)
    if (!Number.isFinite(value) || value === 0) {
      continue
    }
    valid.push(value)
  }

  if (valid.length === 0) {
    return 0
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

/**
 * @param {unknown[]} docs
 * @param {(doc: Record<string, unknown>) => number | null} extractor
 * @returns {number | null}
 */
function averageFromDocs(docs, extractor) {
  const values = docs
    .map((doc) => extractor(/** @type {Record<string, unknown>} */ (doc)))
    .filter((value) => value !== null && Number.isFinite(value))

  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * @param {unknown[]} ivaDocs
 * @returns {number | null}
 */
function averageIvaVentasMensuales(ivaDocs) {
  if (!Array.isArray(ivaDocs) || ivaDocs.length === 0) {
    return 0
  }
  return averagePromedioIvaConfirmed(ivaDocs)
}

/**
 * @param {Record<string, unknown>} balance
 * @returns {Date | null}
 */
function getBalanceCierreDate(balance) {
  const fields = ["fechaCierre", "fecha_cierre", "fecha", "periodo", "ejercicio"]
  for (const field of fields) {
    const raw = balance[field]
    if (raw == null || raw === "") {
      continue
    }
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
      return raw
    }
    const parsed = new Date(
      typeof raw === "string" && !raw.includes("T") ? `${raw}T12:00:00` : raw
    )
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }
  const sortTime = getDocumentSortTime(balance)
  return sortTime > 0 ? new Date(sortTime) : null
}

/**
 * @param {Record<string, unknown>} balance
 * @returns {string}
 */
function getBalanceYearLabel(balance) {
  const ejercicio = getEjercicioYear(balance)
  if (ejercicio != null) {
    return String(ejercicio)
  }
  const cierre = getBalanceCierreDate(balance)
  if (cierre) {
    return String(cierre.getFullYear())
  }
  return "—"
}

/**
 * @param {Record<string, unknown>} balance
 * @param {PrequalificationRubro} rubro
 * @returns {number | null}
 */
function getBalanceAnnualAmount(balance, rubro) {
  const keys = RUBRO_FIELD_MAP[rubro].annual
  return pickBalanceNumericField(balance, keys)
}

/**
 * @deprecated Usar normalizeToBalanceContable. Mantenido por compatibilidad.
 * @param {unknown[]} balances
 * @returns {import("@/lib/balanceContableModel").BalanceContableDoc}
 */
export function sortBalancesForPrequalification(balances) {
  return normalizeToBalanceContable(balances)
}

/**
 * Indicadores externos (IVA / IIBB) para la pestaña Financiero.
 * No usa balances: la pre-calificación Excel trabaja por balance/año en tablas.
 *
 * @param {{
 *   iva?: unknown[];
 *   iibb?: unknown[];
 * }} [input]
 * @returns {PrequalificationVentas}
 */
export function extractPrequalificationVentas(input = {}) {
  const ventasIva = averageIvaVentasMensuales(input.iva ?? [])
  const ventasIibbValues = (input.iibb ?? [])
    .filter(
      (doc) =>
        /** @type {Record<string, unknown>} */ (doc).validationStatus ===
        "confirmed"
    )
    .map((doc) =>
      getIibbBaseImponibleForCredit(/** @type {Record<string, unknown>} */ (doc))
    )
    .filter((value) => value !== null && Number.isFinite(value))

  const ventasIibb =
    ventasIibbValues.length > 0
      ? ventasIibbValues.reduce((sum, value) => sum + value, 0) /
        ventasIibbValues.length
      : 0

  return {
    ventasBalance: 0,
    ventasIva,
    ventasIibb,
  }
}

/** @deprecated Use extractPrequalificationVentas */
export const extractPrequalificationIndicadores = extractPrequalificationVentas

/**
 * Una fila por balance/año: mensual = anual/12 → IPC → crédito.
 * No promedia entre balances; eso ocurre después por rubro.
 *
 * @param {{
 *   balances: Record<string, unknown>[];
 *   rubro: PrequalificationRubro;
 *   coeficiente: number | null;
 * }} params
 * @returns {PrequalificationTableRow[]}
 */
export function buildPrequalificationRubroTable({
  balances,
  rubro,
  coeficiente,
}) {
  /** @type {PrequalificationTableRow[]} */
  const rows = []

  for (const balance of balances) {
    const annual = getBalanceAnnualAmount(balance, rubro)
    if (annual === null || annual <= 0) {
      continue
    }

    const factorInflacion = getBalanceFactorActualizacion(balance)
    const metrics = computeBalanceRubroExcelMetrics(
      annual,
      factorInflacion,
      coeficiente
    )

    const cierre = getBalanceCierreDate(balance)

    rows.push({
      anio: getBalanceYearLabel(balance),
      balanceId:
        typeof balance.id === "string"
          ? balance.id
          : balance.id != null
            ? String(balance.id)
            : null,
      fechaCierre: cierre ? cierre.toISOString().slice(0, 10) : null,
      promedioMensual: metrics.promedioMensual,
      ...(rubro === "ventas"
        ? { ventasContablesMensuales: metrics.promedioMensual }
        : {}),
      ...(rubro === "compras"
        ? { comprasMensuales: metrics.promedioMensual }
        : {}),
      ...(rubro === "costos" ? { costosMensuales: metrics.promedioMensual } : {}),
      coefInflacion: metrics.coefInflacion,
      accumulated: metrics.accumulated,
      valorActualizado: metrics.valorActualizado,
      ventasActualizadas: metrics.valorActualizado,
      creditoCalculado: metrics.creditoCalculado,
      fechaIPCOrigen:
        balance.fechaIPCOrigen != null
          ? String(balance.fechaIPCOrigen)
          : null,
      fechaIPCDestino:
        balance.fechaIPCDestino != null
          ? String(balance.fechaIPCDestino)
          : null,
    })
  }

  return rows
}

/**
 * Pre-calificación: tablas por rubro (solo visual) + tarjeta resultado con fórmula Excel
 * Promedio = (ventas contables último ejercicio + IVA + IIBB) / 3;
 * PreCalificacion = Promedio × coeficiente × 1,1575.
 *
 * @param {{
 *   balanceContable?: import("@/lib/balanceContableModel").BalanceContableDoc | null;
 *   balances?: unknown[];
 *   iva?: unknown[];
 *   iibb?: unknown[];
 *   tipoEmpresa?: string | null;
 *   coeficienteEmpresa?: number | null;
 * }} input
 */
export async function calculateExcelPrequalification(input) {
  const tipoKey = normalizeTipoEmpresa(input.tipoEmpresa ?? null)
  const coeficienteFromInput =
    input.coeficienteEmpresa != null &&
    Number.isFinite(input.coeficienteEmpresa) &&
    input.coeficienteEmpresa > 0
      ? input.coeficienteEmpresa
      : null
  const coeficiente =
    coeficienteFromInput ??
    (tipoKey ? COEFICIENTE_TIPO_EMPRESA[tipoKey] ?? null : null)

  const balanceContable =
    input.balanceContable ??
    normalizeToBalanceContable(input.balances ?? [])

  const indicadoresExternos = extractPrequalificationVentas({
    iva: input.iva ?? [],
    iibb: input.iibb ?? [],
  })

  const {
    tablas,
    promedioPorRubro,
    ventasContablesMensuales,
    ventasIvaMensuales,
    ventasIibbMensuales,
  } = computePrequalificationFromContable(balanceContable, coeficiente, {
    ventasIva: indicadoresExternos.ventasIva ?? 0,
    ventasIibb: indicadoresExternos.ventasIibb ?? 0,
  })

  logBalanceContableVentasDebug(balanceContable, "Financiero/PreCal")
  logVentasContableSeleccionDebug(balanceContable, tablas, "PreCalificacion")

  const latestYearRow = pickVentasPromedioMensualCompleteEjercicioRow(tablas.ventas)
  const ventasContablesUltimoEjercicio =
    latestYearRow?.promedioMensual ??
    getVentasPromedioMensualForColumn(
      balanceContable,
      resolveColumnForLastCompleteEjercicio(balanceContable)
    )

  const ventasIva = Number(indicadoresExternos.ventasIva) || 0
  const ventasIibb = Number(indicadoresExternos.ventasIibb) || 0

  const { promedio: promedioVentasExcel, preCalificacion: preCalificacionTarjeta } =
    computePreCalificacionFromVentasMensuales({
      ventasContablesMensuales: ventasContablesUltimoEjercicio,
      ventasIvaMensuales: ventasIva,
      ventasIibbMensuales: ventasIibb,
      coeficienteEmpresa: coeficiente,
    })

  const fuentesValidas = [
    ventasContablesUltimoEjercicio,
    ventasIva,
    ventasIibb,
  ].filter((value) => Number(value) > 0)

  console.log("[PROMEDIO FINANCIERO] inputs", {
    ventasContablesUltimoEjercicio,
    ventasIva,
    ventasIibb,
    fuentesValidas: fuentesValidas.length,
    formula: "suma(fuentes > 0) / cantidad(fuentes > 0)",
    suma: fuentesValidas.reduce((sum, value) => sum + Number(value), 0),
    promedioVentasExcel,
    preCalificacionTarjeta,
    coeficiente,
    factorIva: PREQUALIFICATION_VENTAS_IVA_FACTOR,
  })

  const ventas = {
    ...indicadoresExternos,
    ventasBalance: ventasContablesUltimoEjercicio,
    ventasContablesMensuales,
    ventasIvaMensuales,
    ventasIibbMensuales,
  }

  /** @type {string[]} */
  const warnings = []

  const columnsWithData = BALANCE_CONTABLE_COLUMNS.filter((column) => {
    return PREQUALIFICATION_RUBROS.some((rubro) => {
      const rows = tablas[rubro] ?? []
      return rows.some((row) => row.columna === column)
    })
  })

  if (!hasBalanceContableIndicators(balanceContable)) {
    warnings.push(
      "Completá ventas, compras o costos en al menos un ejercicio (columna actual o anterior)."
    )
  } else if (columnsWithData.length === 1) {
    warnings.push(
      "Solo hay datos en un ejercicio; el Excel usa actual y ejercicio anterior."
    )
  }

  const missingStoredFactor = BALANCE_CONTABLE_COLUMNS.some((column) => {
    const fecha = balanceContable[fechaCierreFieldForColumn(column)]
    return (
      fecha &&
      String(fecha).trim() &&
      getColumnInflationFactor(balanceContable, column) <= 1
    )
  })
  if (missingStoredFactor) {
    warnings.push(
      "Guardá fecha de cierre y factor IPC para cada ejercicio con datos."
    )
  }

  let preCalificacion = null
  let error = null

  if (!tipoKey || coeficiente === null) {
    if (hasBalanceContableIndicators(balanceContable)) {
      warnings.push("Seleccionar tipo de empresa")
    }
    preCalificacion = null
  } else if (preCalificacionTarjeta === 0 && promedioVentasExcel === 0) {
    preCalificacion = 0
  } else {
    preCalificacion = preCalificacionTarjeta
  }

  return {
    balanceContable,
    ventas,
    indicadores: ventas,
    promedioPorRubro,
    promedioVentas: promedioVentasExcel,
    promedioCompras: promedioPorRubro.compras,
    promedioCostos: promedioPorRubro.costos,
    promedioIndicadores: promedioVentasExcel,
    factorIva: PREQUALIFICATION_VENTAS_IVA_FACTOR,
    tipoEmpresa: tipoKey,
    tipoEmpresaLabel: getTipoEmpresaLabel(tipoKey),
    coeficiente,
    preCalificacion,
    tablas,
    ejercicioActual: getColumnEjercicio(balanceContable, "actual"),
    ejercicioAnterior: getColumnEjercicio(balanceContable, "anterior"),
    rubroLabels: Object.fromEntries(
      PREQUALIFICATION_RUBROS.map((rubro) => [
        rubro,
        RUBRO_FIELD_MAP[rubro].label,
      ])
    ),
    ipcSource: null,
    error,
    warnings,
  }
}

/** @deprecated Alias de calculateExcelPrequalification */
export const calculatePrequalificationAsync = calculateExcelPrequalification

/**
 * Versión síncrona legacy (sin IPC). Usar calculateExcelPrequalification.
 *
 * @param {PrequalificationVentas} ventas
 * @param {string | null | undefined} tipoEmpresa
 */
export function calculatePrequalification(ventas, tipoEmpresa) {
  const tipoKey = normalizeTipoEmpresa(tipoEmpresa)
  const coeficiente = tipoKey ? COEFICIENTE_TIPO_EMPRESA[tipoKey] ?? null : null
  const { promedio: promedioVentas, preCalificacion: preCalificacionSync } =
    computePreCalificacionFromVentasMensuales({
      ventasContablesMensuales: ventas.ventasBalance,
      ventasIibbMensuales: ventas.ventasIibb,
      ventasIvaMensuales: ventas.ventasIva,
      coeficienteEmpresa: coeficiente,
    })

  if (!tipoKey || coeficiente === null) {
    return {
      ventas,
      indicadores: ventas,
      promedioVentas,
      promedioIndicadores: promedioVentas,
      tipoEmpresa: tipoKey,
      tipoEmpresaLabel: getTipoEmpresaLabel(tipoKey),
      coeficiente: null,
      factorIva: PREQUALIFICATION_VENTAS_IVA_FACTOR,
      preCalificacion: promedioVentas === 0 ? 0 : null,
      tablas: { ventas: [], compras: [], costos: [] },
      rubroLabels: {},
      ipcSource: null,
      error:
        promedioVentas > 0
          ? "Tipo de empresa no definido o no reconocido."
          : null,
      warnings: ["Pre-calificación pendiente de actualización por IPC."],
    }
  }

  return {
    ventas,
    indicadores: ventas,
    promedioVentas,
    promedioIndicadores: promedioVentas,
    tipoEmpresa: tipoKey,
    tipoEmpresaLabel: getTipoEmpresaLabel(tipoKey),
    coeficiente,
    factorIva: PREQUALIFICATION_VENTAS_IVA_FACTOR,
    preCalificacion: preCalificacionSync,
    tablas: { ventas: [], compras: [], costos: [] },
    rubroLabels: {},
    ipcSource: null,
    error: null,
    warnings: ["Pre-calificación pendiente de actualización por IPC."],
  }
}

/**
 * @param {number | null} coeficiente
 * @returns {string}
 */
export function formatCoeficienteDisplay(coeficiente) {
  if (coeficiente === null || !Number.isFinite(coeficiente)) {
    return "—"
  }
  return coeficiente.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Coeficiente IPC multiplicador (Excel), ej. 3,762.
 *
 * @param {number | null | undefined} factor
 * @returns {string}
 */
export function formatInflationFactorDisplay(factor) {
  return formatCoeficienteIpcDisplay(factor)
}
