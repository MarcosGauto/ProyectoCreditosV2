/**
 * @param {unknown} value
 * @returns {string}
 */
export function stableStringify(value) {
  if (value === null || value === undefined) {
    return "null"
  }
  if (typeof value !== "object") {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`
  }

  const record = /** @type {Record<string, unknown>} */ (value)
  const keys = Object.keys(record).sort()
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`
}

/**
 * @param {string} input
 * @returns {Promise<string>}
 */
export async function sha256Hex(input) {
  if (typeof globalThis.crypto?.subtle?.digest !== "function") {
    let hash = 0
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i)
      hash |= 0
    }
    return `fallback_${Math.abs(hash).toString(16)}`
  }

  const encoded = new TextEncoder().encode(input)
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * @param {unknown} payload
 */
export async function hashPayload(payload) {
  return sha256Hex(stableStringify(payload))
}

/**
 * @param {{
 *   inputs: Record<string, unknown>;
 *   policySnapshot: Record<string, unknown>;
 *   computed: Record<string, unknown>;
 *   decision: Record<string, unknown>;
 *   engineVersion: string;
 * }} parts
 */
export async function buildAnalysisFingerprints(parts) {
  const [inputsFingerprint, policyFingerprint, analysisFingerprint] =
    await Promise.all([
      hashPayload(parts.inputs),
      hashPayload(parts.policySnapshot),
      hashPayload({
        computed: parts.computed,
        decision: parts.decision,
        engineVersion: parts.engineVersion,
      }),
    ])

  return {
    inputsFingerprint,
    policyFingerprint,
    analysisFingerprint,
  }
}

/**
 * @param {{
 *   inputsFingerprint: string;
 *   policyFingerprint: string;
 *   analysisFingerprint: string;
 * } | null | undefined} a
 * @param {{
 *   inputsFingerprint: string;
 *   policyFingerprint: string;
 *   analysisFingerprint: string;
 * } | null | undefined} b
 */
export function fingerprintsAreEqual(a, b) {
  if (!a || !b) {
    return false
  }
  return (
    a.inputsFingerprint === b.inputsFingerprint &&
    a.policyFingerprint === b.policyFingerprint &&
    a.analysisFingerprint === b.analysisFingerprint
  )
}
