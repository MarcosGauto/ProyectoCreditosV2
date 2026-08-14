/** @typedef {"editable" | "computed"} BalanceFormRowKind */

/**
 * @typedef {Object} BalanceFormRow
 * @property {string} field
 * @property {string} label
 * @property {BalanceFormRowKind} kind
 * @property {boolean} [optional]
 * @property {boolean} [indent]
 */

/** Campos de resultados: solo estos alimentan pre-calificación Excel. */
export const BALANCE_RESULTADOS_FIELDS = ["ventas", "compras", "costos"]

/** Campos estructurales (balance patrimonial PDF). */
export const BALANCE_STRUCTURAL_BASE_FIELDS = [
  "activoCorriente",
  "activoNoCorriente",
  "disponibilidades",
  "creditosVentas",
  "inventarios",
  "cuentasSocios",
  "pasivoCorriente",
  "pasivoNoCorriente",
  "deudasComerciales",
]

export const BALANCE_COMPUTED_FIELDS = [
  "totalActivo",
  "totalPasivo",
  "patrimonioNeto",
]

/**
 * Secciones del balance (estructura contable). RESULTADOS va aparte en la UI.
 * @type {Array<{ section: string; rows: BalanceFormRow[] }>}
 */
export const BALANCE_STRUCTURE_SECTIONS = [
  {
    section: "ACTIVO",
    rows: [
      { field: "activoCorriente", label: "Activo corriente", kind: "editable" },
      {
        field: "disponibilidades",
        label: "Disponibilidades",
        kind: "editable",
        indent: true,
        optional: true,
      },
      {
        field: "creditosVentas",
        label: "Créditos por ventas",
        kind: "editable",
        indent: true,
        optional: true,
      },
      {
        field: "inventarios",
        label: "Inventarios",
        kind: "editable",
        indent: true,
        optional: true,
      },
      {
        field: "cuentasSocios",
        label: "Cuentas particulares socios",
        kind: "editable",
        indent: true,
        optional: true,
      },
      { field: "activoNoCorriente", label: "Activo no corriente", kind: "editable" },
      { field: "totalActivo", label: "Total activo", kind: "computed" },
    ],
  },
  {
    section: "PASIVO",
    rows: [
      { field: "pasivoCorriente", label: "Pasivo corriente", kind: "editable" },
      { field: "pasivoNoCorriente", label: "Pasivo no corriente", kind: "editable" },
      {
        field: "deudasComerciales",
        label: "Deudas comerciales",
        kind: "editable",
        indent: true,
        optional: true,
      },
      { field: "totalPasivo", label: "Total pasivo", kind: "computed" },
    ],
  },
  {
    section: "PATRIMONIO",
    rows: [
      { field: "patrimonioNeto", label: "Patrimonio neto", kind: "computed" },
    ],
  },
]

/**
 * @type {Array<{ field: string; label: string }>}
 */
export const BALANCE_RESULTADOS_ROWS = [
  { field: "ventas", label: "Ventas contables" },
  { field: "compras", label: "Compras" },
  { field: "costos", label: "Costos" },
]
