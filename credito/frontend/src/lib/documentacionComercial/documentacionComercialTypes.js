/**
 * Catálogo de tipos documentales — extensible sin cambiar Firestore.
 * Fuentes reales hoy: empresas/{cuit}/{subcolección} + clientes/{cuit}/documentos.
 */

/** @typedef {"balance" | "fiscal" | "presence" | "expiry"} DocStatusModel */

/**
 * @typedef {object} DocumentacionTipoDef
 * @property {string} id
 * @property {string} label
 * @property {string} summaryLabel
 * @property {DocStatusModel} statusModel
 * @property {boolean} showVencimiento
 * @property {boolean} activeInVista
 * @property {boolean} [future]
 * @property {string} [firestoreSubcollection]
 */

/** Tipos visibles en la vista comercial actual. */
export const DOCUMENTACION_TIPOS_ACTIVOS = /** @type {const} */ ([
  "balance",
  "iva",
  "iibb",
  "afip",
  "pyme",
])

/**
 * Modelo preparado para ampliar sin tocar estructura canónica.
 * @type {DocumentacionTipoDef[]}
 */
export const DOCUMENTACION_TIPO_CATALOG = [
  {
    id: "balance",
    label: "Balance",
    summaryLabel: "Balance",
    statusModel: "balance",
    showVencimiento: true,
    activeInVista: true,
    firestoreSubcollection: "balances",
  },
  {
    id: "iva",
    label: "IVA",
    summaryLabel: "IVA",
    statusModel: "fiscal",
    showVencimiento: false,
    activeInVista: true,
    firestoreSubcollection: "iva",
  },
  {
    id: "iibb",
    label: "Ingresos Brutos",
    summaryLabel: "IIBB",
    statusModel: "fiscal",
    showVencimiento: false,
    activeInVista: true,
    firestoreSubcollection: "iibb",
  },
  {
    id: "afip",
    label: "AFIP / ARCA",
    summaryLabel: "AFIP / ARCA",
    statusModel: "presence",
    showVencimiento: false,
    activeInVista: true,
    firestoreSubcollection: "afip",
  },
  {
    id: "pyme",
    label: "Certificado PyME",
    summaryLabel: "PyME",
    statusModel: "expiry",
    showVencimiento: true,
    activeInVista: true,
    firestoreSubcollection: "pyme",
  },
  // —— Futuro (no se muestran en la grilla principal aún) ——
  {
    id: "estatuto",
    label: "Estatuto",
    summaryLabel: "Estatuto",
    statusModel: "presence",
    showVencimiento: false,
    activeInVista: false,
    future: true,
  },
  {
    id: "poder",
    label: "Poderes",
    summaryLabel: "Poderes",
    statusModel: "presence",
    showVencimiento: false,
    activeInVista: false,
    future: true,
  },
  {
    id: "dni",
    label: "DNI socios",
    summaryLabel: "DNI",
    statusModel: "presence",
    showVencimiento: false,
    activeInVista: false,
    future: true,
  },
  {
    id: "constancia_afip",
    label: "Constancia AFIP",
    summaryLabel: "Constancia AFIP",
    statusModel: "presence",
    showVencimiento: false,
    activeInVista: false,
    future: true,
  },
  {
    id: "certificado_bancario",
    label: "Certificados bancarios",
    summaryLabel: "Bancarios",
    statusModel: "expiry",
    showVencimiento: true,
    activeInVista: false,
    future: true,
  },
]

export const BALANCE_PROXIMO_VENCER_DIAS = 60

/** Meses de vigencia estimada del balance si no hay campo de vencimiento. */
export const BALANCE_VIGENCIA_MESES = 18
