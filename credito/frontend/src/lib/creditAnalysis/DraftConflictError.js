export class DraftConflictError extends Error {
  /**
   * @param {number | null | undefined} serverRevision
   */
  constructor(serverRevision) {
    super("El borrador fue modificado en otra sesión.")
    this.name = "DraftConflictError"
    this.serverRevision = serverRevision ?? null
  }
}

/**
 * @param {unknown} error
 */
export function isDraftConflictError(error) {
  return error instanceof DraftConflictError
}
