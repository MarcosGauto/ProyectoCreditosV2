/** @typedef {"pendiente" | "abonado"} ChequeEstado */

export const CHEQUES_RECHAZADOS_COLLECTION = "chequesRechazados"

export const CHEQUE_ESTADO = {
  PENDIENTE: /** @type {ChequeEstado} */ ("pendiente"),
  ABONADO: /** @type {ChequeEstado} */ ("abonado"),
}

export const CHEQUE_ESTADO_LABEL = {
  pendiente: "Pendiente",
  abonado: "Abonado",
}

export const MOTIVOS_RECHAZO_OPTIONS = [
  "Fondos insuficientes",
  "Cuenta cerrada",
  "Orden de no pagar",
  "Firma irregular",
  "Endoso irregular",
  "Otro",
]

/**
 * @param {unknown} value
 * @returns {number}
 */
export function parseChequeImporte(value) {
  if (value === null || value === undefined || value === "") {
    return 0
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  const normalized = String(value)
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * @param {number | null | undefined} amount
 * @returns {string}
 */
export function formatChequeImporte(amount) {
  if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) {
    return "—"
  }
  return `$${Number(amount).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * @param {string | null | undefined} iso
 * @returns {string}
 */
export function formatChequeFecha(iso) {
  if (!iso) {
    return "—"
  }
  try {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) {
      return String(iso)
    }
    return date.toLocaleDateString("es-AR")
  } catch {
    return String(iso)
  }
}

/**
 * @param {string} cuit
 * @returns {string}
 */
export function normalizeCuit(cuit) {
  return String(cuit ?? "").replace(/\D/g, "")
}

/**
 * @typedef {Object} ChequeHistorialEntry
 * @property {string} fecha
 * @property {string} usuario
 * @property {string} accion
 * @property {string} detalle
 */

/**
 * @typedef {Object} ChequeRechazadoDoc
 * @property {string} [id]
 * @property {string} cuit
 * @property {string} razonSocial
 * @property {string} numeroCheque
 * @property {string} banco
 * @property {string | null} fechaEmision
 * @property {string | null} fechaVencimiento
 * @property {string | null} fechaRechazo
 * @property {string} motivoRechazo
 * @property {number} importe
 * @property {ChequeEstado} estado
 * @property {string | null} fechaAbono
 * @property {string} observaciones
 * @property {string} [observacionesPago]
 * @property {string | null} imagenChequeUrl
 * @property {string | null} notaDebitoUrl
 * @property {string | null} [imagenChequeStoragePath]
 * @property {string | null} [notaDebitoStoragePath]
 * @property {ChequeHistorialEntry[]} [historial]
 * @property {import("firebase/firestore").Timestamp | string | null} [createdAt]
 * @property {import("firebase/firestore").Timestamp | string | null} [updatedAt]
 */
