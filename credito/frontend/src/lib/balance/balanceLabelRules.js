import { EMPTY_BALANCE_INDICATORS } from "@/lib/balanceIndicators"

/** @type {Array<{ field: keyof typeof EMPTY_BALANCE_INDICATORS; patterns: RegExp[] }>} */
export const BALANCE_LABEL_RULES = [
  {
    field: "totalActivo",
    patterns: [/total\s+del?\s+activo/i, /total\s+activo/i, /^activo\s+total$/i],
  },
  {
    field: "totalPasivo",
    patterns: [/total\s+del?\s+pasivo/i, /total\s+pasivo/i, /^pasivo\s+total$/i],
  },
  {
    field: "patrimonioNeto",
    patterns: [/patrimonio\s+neto/i, /pn\s+recalculado/i],
  },
  {
    field: "activoCorriente",
    patterns: [/activo\s+corriente/i],
  },
  {
    field: "activoNoCorriente",
    patterns: [/activo\s+no\s+corriente/i, /activo\s+no\s+currente/i],
  },
  {
    field: "pasivoCorriente",
    patterns: [/pasivo\s+corriente/i],
  },
  {
    field: "pasivoNoCorriente",
    patterns: [/pasivo\s+no\s+corriente/i],
  },
  {
    field: "disponibilidades",
    patterns: [/disponibilidades/i, /caja\s+y\s+bancos/i],
  },
  {
    field: "creditosVentas",
    patterns: [/cr[eé]ditos?\s+por\s+ventas/i, /cuentas\s+a\s+cobrar/i],
  },
  {
    field: "inventarios",
    patterns: [/inventarios/i, /bienes\s+de\s+cambio/i],
  },
  {
    field: "deudasComerciales",
    patterns: [/deudas?\s+comerciales/i, /cuentas\s+a\s+pagar/i],
  },
  {
    field: "ventas",
    patterns: [
      /^ventas$/i,
      /ventas\s+contables/i,
      /ingresos\s+por\s+ventas/i,
      /ventas\s+netas/i,
      /facturaci[oó]n/i,
    ],
  },
  {
    field: "compras",
    patterns: [/^compras$/i, /total\s+compras/i],
  },
  {
    field: "costos",
    patterns: [/^costos$/i, /costo\s+de\s+ventas/i, /cmv/i],
  },
  {
    field: "resultadoOperativo",
    patterns: [
      /resultado\s+operativo/i,
      /resultado\s+de\s+operaci[oó]n/i,
      /rdo\.?\s+operativo/i,
    ],
  },
  {
    field: "resultadoNeto",
    patterns: [
      /resultado\s+neto/i,
      /resultado\s+del\s+ejercicio/i,
      /ganancia\s*\(?\s*neta\s*\)?/i,
    ],
  },
  {
    field: "ebitda",
    patterns: [/^ebitda$/i],
  },
]

/**
 * @param {string} label
 * @returns {string}
 */
export function normalizeBalanceLabel(label) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

/**
 * @param {string} label
 * @returns {keyof typeof EMPTY_BALANCE_INDICATORS | null}
 */
export function matchBalanceField(label) {
  const normalized = normalizeBalanceLabel(label)
  if (!normalized) {
    return null
  }

  for (const rule of BALANCE_LABEL_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.field
    }
  }

  return null
}
