import { getLatestDocument } from "@/lib/getLatestDocumentPeriod"
import {
  formatBalanceSummaryAmount,
  parseBalanceAmount,
} from "@/lib/balanceFinancialSummary"
import {
  buildFinancialSalesSummary,
  buildIvaDeclarationsTable,
  formatSalesSummaryAmount,
} from "@/lib/financialSalesSummary"
import { hasConfirmedIvaIndicators } from "@/lib/ivaIndicators"
import {
  hasConfirmedIibbIndicators,
  parseAlicuotaPercent,
  DEFAULT_IIBB_ALICUOTA,
} from "@/lib/iibbIndicators"
import { calculateIvaMetrics } from "@/lib/scoring/calculateIvaMetrics"

/**
 * @param {string | null | undefined} periodo
 * @returns {string}
 */
export function formatFiscalPeriodo(periodo) {
  if (!periodo) {
    return "—"
  }

  const value = String(periodo)
  if (/^\d{6}$/.test(value)) {
    return `${value.slice(4, 6)}/${value.slice(0, 4)}`
  }

  return value
}

/**
 * @param {Record<string, unknown>} doc
 * @param {string[]} keys
 * @returns {string}
 */
function pickAmount(doc, keys) {
  for (const key of keys) {
    const parsed = parseBalanceAmount(doc[key])
    if (parsed !== null) {
      return formatBalanceSummaryAmount(parsed)
    }
  }
  return formatSalesSummaryAmount(0)
}

/**
 * @param {Record<string, unknown> | null} doc
 * @param {Array<{ label: string; keys: string[] }>} rows
 * @returns {Array<{ label: string; value: string }>}
 */
function buildConfirmedRows(doc, rows) {
  if (!doc) {
    return rows.map((row) => ({ label: row.label, value: formatSalesSummaryAmount(0) }))
  }

  if (doc.validationStatus !== "confirmed") {
    return rows.map((row) => ({
      label: row.label,
      value: "Pendiente de validación",
    }))
  }

  return rows.map((row) => ({
    label: row.label,
    value: pickAmount(doc, row.keys),
  }))
}

/**
 * @param {unknown[]} iva
 * @param {unknown[]} iibb
 * @param {unknown[]} [balances]
 * @param {number | null} [coeficiente]
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null} [balanceContable]
 */
export function buildFiscalFinancialSummary(
  iva,
  iibb,
  balances = [],
  coeficiente = null,
  balanceContable = null
) {
  const latestIva = /** @type {Record<string, unknown> | null} */ (
    getLatestDocument(iva)
  )
  const latestIibb = /** @type {Record<string, unknown> | null} */ (
    getLatestDocument(iibb)
  )

  const salesSummary = buildFinancialSalesSummary({
    balances,
    balanceContable,
    iva,
    iibb,
  })

  const latestMetrics = latestIva
    ? calculateIvaMetrics({
        debitoFiscal: latestIva.debitoFiscal ?? latestIva.debito_fiscal,
        creditoFiscal: latestIva.creditoFiscal ?? latestIva.credito_fiscal,
        coeficiente,
      })
    : null

  const ivaRows = latestIva
    ? [
        {
          label: "Débito fiscal",
          value: formatSalesSummaryAmount(
            Number(latestIva.debitoFiscal ?? latestIva.debito_fiscal ?? 0)
          ),
        },
        {
          label: "Crédito fiscal",
          value: formatSalesSummaryAmount(
            Number(latestIva.creditoFiscal ?? latestIva.credito_fiscal ?? 0)
          ),
        },
        {
          label: "Saldo técnico",
          value: formatSalesSummaryAmount(latestMetrics?.saldoTecnico ?? 0),
        },
        {
          label: "Ventas IVA 10,5%",
          value: formatSalesSummaryAmount(latestMetrics?.ventasIVA105 ?? 0),
        },
        {
          label: "Ventas IVA 21%",
          value: formatSalesSummaryAmount(latestMetrics?.ventasIVA21 ?? 0),
        },
        {
          label: "Promedio IVA",
          value: formatSalesSummaryAmount(latestMetrics?.promedioIVA ?? 0),
        },
        {
          label: "Crédito asumible IVA",
          value: formatSalesSummaryAmount(latestMetrics?.creditoAsumibleIVA ?? 0),
        },
      ]
    : []

  const ivaDeclarationsTable = buildIvaDeclarationsTable(iva, coeficiente)

  const iibbAlicuota =
    latestIibb != null
      ? parseAlicuotaPercent(latestIibb.alicuota) ?? DEFAULT_IIBB_ALICUOTA
      : null

  const iibbRows = [
    ...buildConfirmedRows(latestIibb, [
      {
        label: "Impuesto determinado",
        keys: ["impuestoDeterminado", "impuesto_determinado"],
      },
    ]),
    ...(latestIibb?.validationStatus === "confirmed" && iibbAlicuota != null
      ? [
          {
            label: "Alícuota IIBB",
            value: `${iibbAlicuota}%`,
          },
        ]
      : latestIibb?.validationStatus !== "confirmed" && latestIibb
        ? [{ label: "Alícuota IIBB", value: "Pendiente de validación" }]
        : []),
    ...buildConfirmedRows(latestIibb, [
      {
        label: "Base imponible",
        keys: ["baseImponible", "base_imponible", "base_imponible_credito"],
      },
    ]),
  ]

  return {
    ventasConsolidadas: salesSummary,
    ivaDeclarationsTable,
    iva: {
      periodo: latestIva ? formatFiscalPeriodo(String(latestIva.periodo ?? "")) : "—",
      rows: ivaRows,
      isConfirmed: hasConfirmedIvaIndicators(latestIva),
      hasDoc: Boolean(latestIva),
    },
    iibb: {
      periodo: latestIibb
        ? formatFiscalPeriodo(String(latestIibb.periodo ?? ""))
        : "—",
      rows: iibbRows,
      isConfirmed: hasConfirmedIibbIndicators(latestIibb),
      hasDoc: Boolean(latestIibb),
    },
  }
}
