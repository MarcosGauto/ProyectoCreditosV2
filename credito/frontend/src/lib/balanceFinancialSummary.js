import { balanceContableLatestEjercicioLegacyDoc } from "@/lib/balanceContableModel"
import { getLatestDocument } from "@/lib/getLatestDocumentPeriod"
import {
  getIndicatorsSourceBadge,
  getValidationStatusBadge,
  hasConfirmedBalanceIndicators,
} from "@/lib/balanceIndicators"
import {
  BALANCE_NO_ATTACHMENT_BADGE,
  hasBalanceAttachment,
} from "@/lib/balanceLocalUpload"
import { computeFinancialResumenPromedio } from "@/lib/financialSalesSummary"
import { formatMoneyWithSymbol, parseMoney } from "@/lib/money"

const SUMMARY_ROWS = [
  {
    label: "Pasivo Total",
    keys: ["totalPasivo", "total_pasivo", "pasivo_total"],
  },
  {
    label: "Patrimonio Neto",
    keys: ["patrimonioNeto", "patrimonio_neto", "patrimonio"],
  },
  {
    label: "Ventas",
    keys: ["ventas", "ventasActualizada", "ventas_actualizada"],
  },
  {
    label: "Compras",
    keys: ["compras", "comprasActualizada"],
    optional: true,
  },
  {
    label: "Costos",
    keys: ["costos", "costosActualizada"],
    optional: true,
  },
  {
    label: "Resultado Operativo",
    keys: ["resultadoOperativo", "resultado_operativo"],
    optional: true,
  },
  {
    label: "Resultado Neto",
    keys: [
      "resultadoNeto",
      "resultado_neto",
      "resultadoEjercicio",
      "resultado_ejercicio",
      "resultado",
    ],
  },
  {
    label: "EBITDA",
    keys: ["ebitda"],
    optional: true,
  },
]

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseBalanceAmount(value) {
  return parseMoney(value)
}

/**
 * @param {number} amount
 * @returns {string}
 */
export function formatBalanceSummaryAmount(amount) {
  return formatMoneyWithSymbol(amount)
}

/**
 * @param {Record<string, unknown>} doc
 * @param {string[]} keys
 * @returns {number | null}
 */
export function pickBalanceNumericField(doc, keys) {
  for (const key of keys) {
    const parsed = parseBalanceAmount(doc[key])
    if (parsed !== null) {
      return parsed
    }
  }

  return null
}

/**
 * @param {Record<string, unknown> | null} balance
 * @returns {Array<{ label: string; value: string }>}
 */
export function buildBalanceSummaryRows(balance) {
  if (!balance) {
    return SUMMARY_ROWS.map((row) => ({
      label: row.label,
      value: "No informado",
    }))
  }

  if (balance.validationStatus !== "confirmed") {
    return SUMMARY_ROWS.flatMap((row) => {
      if (row.optional) {
        return []
      }
      return [
        {
          label: row.label,
          value: "Pendiente de validación",
        },
      ]
    })
  }

  return SUMMARY_ROWS.flatMap((row) => {
    const amount = pickBalanceNumericField(balance, row.keys)

    if (row.optional && amount === null) {
      return []
    }

    return [
      {
        label: row.label,
        value:
          amount === null
            ? "No informado"
            : formatBalanceSummaryAmount(amount),
      },
    ]
  })
}

/**
 * Resumen del último balance cargado (solo lectura; no calcula ratios ni scoring).
 *
 * @param {unknown[]} balances
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null} [balanceContable]
 * @param {{ iva?: unknown[]; iibb?: unknown[] }} [fiscalContext]
 * @returns {{
 *   hasBalance: boolean;
 *   rows: Array<{ label: string; value: string }>;
 *   latestBalance: Record<string, unknown> | null;
 *   validationBadge: { label: string; className: string } | null;
 *   sourceBadge: { label: string; className: string } | null;
 *   attachmentBadge: { label: string; className: string } | null;
 *   isConfirmed: boolean;
 * }}
 */
export function buildBalanceFinancialSummary(
  balances,
  balanceContable = null,
  fiscalContext = {}
) {
  const latestBalance = /** @type {Record<string, unknown> | null} */ (
    balanceContable
      ? balanceContableLatestEjercicioLegacyDoc(balanceContable)
      : getLatestDocument(balances)
  )

  const balanceRows = buildBalanceSummaryRows(latestBalance)
  const { promedio } = computeFinancialResumenPromedio({
    balances,
    balanceContable,
    iva: fiscalContext.iva,
    iibb: fiscalContext.iibb,
  })

  const rows = [
    ...balanceRows,
    {
      label: "Promedio",
      value: formatBalanceSummaryAmount(promedio),
    },
  ]

  return {
    hasBalance: latestBalance != null,
    rows,
    latestBalance,
    validationBadge: getValidationStatusBadge(latestBalance),
    sourceBadge: getIndicatorsSourceBadge(latestBalance),
    attachmentBadge: hasBalanceAttachment(latestBalance)
      ? null
      : BALANCE_NO_ATTACHMENT_BADGE,
    isConfirmed: hasConfirmedBalanceIndicators(latestBalance),
  }
}
