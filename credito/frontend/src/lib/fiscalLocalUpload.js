export const IVA_STORAGE_ENABLED = false
export const IIBB_STORAGE_ENABLED = false

export const FISCAL_NO_ATTACHMENT_BADGE = {
  label: "Sin archivo adjunto (modo temporal)",
  className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {boolean}
 */
export function hasFiscalAttachment(doc) {
  if (!doc) {
    return false
  }

  const url = doc.downloadURL ?? doc.url
  return typeof url === "string" && url.trim().length > 0
}

/**
 * @param {string} prefix
 * @returns {string}
 */
export function createPendingFiscalId(prefix) {
  return `pending-${prefix}-${Date.now()}`
}

/**
 * @param {string} id
 * @param {"iva" | "iibb" | "balance"} [prefix]
 * @returns {boolean}
 */
export function isPendingFiscalId(id, prefix) {
  const value = String(id)
  if (prefix) {
    return value.startsWith(`pending-${prefix}-`)
  }
  return value.startsWith("pending-")
}

/**
 * @param {string} fileName
 * @param {string} periodo
 * @param {"iva" | "iibb"} tipo
 * @returns {Record<string, unknown> & { id: string }}
 */
export function buildPendingFiscalDoc(fileName, periodo, tipo) {
  return {
    id: createPendingFiscalId(tipo),
    nombre: fileName,
    periodo,
    tipoDocumento: tipo,
    validationStatus: "draft",
    storageDisabled: true,
  }
}
