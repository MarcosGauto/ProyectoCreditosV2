export class DuplicatePublishError extends Error {
  /**
   * @param {string} versionId
   * @param {number} versionNumber
   */
  constructor(versionId, versionNumber) {
    super("DUPLICATE_PUBLISH")
    this.name = "DuplicatePublishError"
    this.versionId = versionId
    this.versionNumber = versionNumber
  }
}

/**
 * @param {unknown} error
 */
export function isDuplicatePublishError(error) {
  return error instanceof DuplicatePublishError
}
