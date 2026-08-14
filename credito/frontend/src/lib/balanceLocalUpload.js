/** Storage deshabilitado temporalmente para balances. */
export const BALANCES_STORAGE_ENABLED = false

export const BALANCE_NO_ATTACHMENT_BADGE = {
  label: "Sin archivo adjunto (modo temporal)",
  className:
    "border-amber-500/30 bg-amber-500/10 text-amber-300",
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {boolean}
 */
export function hasBalanceAttachment(doc) {
  if (!doc) {
    return false
  }

  const url = doc.downloadURL ?? doc.url
  return typeof url === "string" && url.trim().length > 0
}

/**
 * @param {string} fileName
 * @returns {string}
 */
export function createPendingBalanceId() {
  return `pending-${Date.now()}`
}

/**
 * @param {string} id
 * @returns {boolean}
 */
export function isPendingBalanceId(id) {
  const value = String(id)
  return value.startsWith("pending-")
}

/**
 * @param {string} fileName
 * @param {string} periodo
 * @param {"actual" | "anterior" | null} [balanceSlot]
 * @returns {Record<string, unknown> & { id: string }}
 */
export function buildPendingBalanceDoc(fileName, periodo, balanceSlot = null) {
  const ejercicio =
    periodo.length >= 4 ? periodo.slice(0, 4) : String(new Date().getFullYear())
  const id = balanceSlot ? `pending-${balanceSlot}` : createPendingBalanceId()

  return {
    id,
    nombre: fileName,
    periodo: periodo.length >= 4 ? periodo : `${ejercicio}12`,
    ejercicio,
    ...(balanceSlot ? { balanceSlot } : {}),
    validationStatus: "draft",
    storageDisabled: true,
  }
}
