import { formatBalanceSummaryAmount } from "@/lib/balanceFinancialSummary"
import {
  getRubroAnual,
  getVentasPromedioMensualEjercicioActual,
  logBalanceContableVentasDebug,
  normalizeToBalanceContable,
} from "@/lib/balanceContableModel"
import { averageExcelPromedioSi } from "@/lib/balancePrequalificationPreview"
import { calculateIvaMetrics } from "@/lib/scoring/calculateIvaMetrics"
import { averagePromedioIvaConfirmed } from "@/lib/ivaIndicators"
import { hasConfirmedIibbIndicators } from "@/lib/iibbIndicators"
import { getIibbBaseImponibleForCredit } from "@/lib/iibbIndicators"
import { formatMoneyWithSymbol } from "@/lib/money"

/**
 * @param {unknown[]} docs
 * @param {(doc: Record<string, unknown>) => number} extractor
 * @returns {number}
 */
function averageFromConfirmedDocs(docs, extractor) {
  if (!Array.isArray(docs) || docs.length === 0) {
    return 0
  }

  const values = docs
    .filter(
      (doc) =>
        /** @type {Record<string, unknown>} */ (doc).validationStatus ===
        "confirmed"
    )
    .map((doc) => extractor(/** @type {Record<string, unknown>} */ (doc)))
    .filter((value) => Number.isFinite(value))

  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Ventas contables mensuales del último ejercicio (columna actual / balance más reciente).
 *
 * @param {unknown[]} balances
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null} [balanceContable]
 * @returns {number}
 */
export function computeVentasBalanceLatestExerciseMonthly(
  balances,
  balanceContable = null
) {
  const contable =
    balanceContable ?? normalizeToBalanceContable(balances ?? [])
  return getVentasPromedioMensualEjercicioActual(contable)
}

/**
 * Promedio mensual de ventas contables (ambos ejercicios del balance contable).
 * @param {unknown[]} balances
 * @returns {number}
 */
export function computeVentasBalanceMonthlyAverage(balances) {
  const contable = normalizeToBalanceContable(balances ?? [])
  const monthlyValues = ["actual", "anterior"].map((column) => {
    const annual = getRubroAnual(
      contable,
      "ventas",
      /** @type {"actual" | "anterior"} */ (column)
    )
    return annual != null && annual > 0 ? annual / 12 : null
  }).filter((value) => value !== null && Number.isFinite(value))

  if (monthlyValues.length === 0) {
    return 0
  }

  return (
    monthlyValues.reduce((sum, value) => sum + value, 0) / monthlyValues.length
  )
}

/**
 * Resumen financiero — PROMEDIO.SI(ventas balance, ventas IVA, ventas IIBB; "&gt;0").
 * Ventas balance = promedio mensual del último ejercicio (columna derecha / Pre-Calificación).
 *
 * @param {{
 *   balances?: unknown[];
 *   balanceContable?: import("@/lib/balanceContableModel").BalanceContableDoc | null;
 *   iva?: unknown[];
 *   iibb?: unknown[];
 * }} input
 */
export function computeFinancialResumenPromedio(input) {
  const contable =
    input.balanceContable ?? normalizeToBalanceContable(input.balances ?? [])
  logBalanceContableVentasDebug(contable, "ResumenFinanciero")

  const ventasBalance = computeVentasBalanceLatestExerciseMonthly(
    input.balances ?? [],
    input.balanceContable ?? null
  )
  const ventasIva = averagePromedioIvaConfirmed(input.iva ?? [])
  const ventasIibb = computeVentasIibbAverage(input.iibb ?? [])

  const promedio = averageExcelPromedioSi([
    ventasBalance,
    ventasIva,
    ventasIibb,
  ])

  return {
    ventasBalance,
    ventasIva,
    ventasIibb,
    promedio,
  }
}

/**
 * @param {unknown[]} iibb
 * @returns {number}
 */
export function computeVentasIibbAverage(iibb) {
  return averageFromConfirmedDocs(iibb, (doc) => {
    if (!hasConfirmedIibbIndicators(doc)) {
      const base = getIibbBaseImponibleForCredit(doc)
      return base ?? 0
    }
    return getIibbBaseImponibleForCredit(doc) ?? 0
  })
}

/**
 * @param {number} amount
 * @returns {string}
 */
export function formatSalesSummaryAmount(amount) {
  if (!Number.isFinite(amount)) {
    return formatMoneyWithSymbol(0)
  }
  return formatBalanceSummaryAmount(amount)
}

/**
 * @param {{
 *   balances?: unknown[];
 *   balanceContable?: import("@/lib/balanceContableModel").BalanceContableDoc | null;
 *   iva?: unknown[];
 *   iibb?: unknown[];
 * }} input
 */
export function buildFinancialSalesSummary(input) {
  const metrics = computeFinancialResumenPromedio(input)

  const rows = [
    {
      label: "Ventas Contable",
      value: formatSalesSummaryAmount(metrics.ventasBalance),
    },
    { label: "Ventas IVA", value: formatSalesSummaryAmount(metrics.ventasIva) },
    { label: "Ventas IIBB", value: formatSalesSummaryAmount(metrics.ventasIibb) },
  ]

  return {
    ventasBalance: metrics.ventasBalance,
    ventasIva: metrics.ventasIva,
    ventasIibb: metrics.ventasIibb,
    promedio: metrics.promedio,
    rows,
  }
}

/**
 * Tabla de declaraciones IVA confirmadas con métricas Excel.
 * @param {unknown[]} ivaDocs
 * @param {number | null} [coeficiente]
 */
export function buildIvaDeclarationsTable(ivaDocs, coeficiente = null) {
  if (!Array.isArray(ivaDocs)) {
    return []
  }

  return ivaDocs
    .filter((doc) => /** @type {Record<string, unknown>} */ (doc).validationStatus === "confirmed")
    .map((doc) => {
      const record = /** @type {Record<string, unknown>} */ (doc)
      const metrics = calculateIvaMetrics({
        debitoFiscal: record.debitoFiscal ?? record.debito_fiscal,
        creditoFiscal: record.creditoFiscal ?? record.credito_fiscal,
        coeficiente,
      })

      const periodo = String(record.periodo ?? "—")
      const periodoLabel =
        /^\d{6}$/.test(periodo) ? `${periodo.slice(4, 6)}/${periodo.slice(0, 4)}` : periodo

      return {
        id: String(record.id ?? periodo),
        periodo: periodoLabel,
        saldoTecnico: formatSalesSummaryAmount(metrics.saldoTecnico),
        ventasIVA105: formatSalesSummaryAmount(metrics.ventasIVA105),
        ventasIVA21: formatSalesSummaryAmount(metrics.ventasIVA21),
        promedioIVA: formatSalesSummaryAmount(metrics.promedioIVA),
        creditoAsumibleIVA: formatSalesSummaryAmount(metrics.creditoAsumibleIVA),
      }
    })
    .sort((a, b) => String(b.periodo).localeCompare(String(a.periodo)))
}
