export const PUBLISH_WAITING_PRECAL_MESSAGE =
  "Esperando el cálculo de la precalificación..."

export const PUBLISH_WAITING_SC1_MESSAGE =
  "Esperando el cálculo SC-1.0..."

const RENDERED_CONTEXT_REQUIRED_KEYS = [
  "asyncPreCal",
  "financieroTab",
  "balanceAnalysis",
  "coverageDecision",
  "nosisAnalysis",
]

/**
 * @param {{
 *   loading?: boolean;
 *   error?: string | null;
 *   ready?: boolean;
 * } | null | undefined} sc1Runtime
 * @returns {string | null}
 */
function getSc1PublishBlockReason(sc1Runtime) {
  if (sc1Runtime == null) {
    return PUBLISH_WAITING_SC1_MESSAGE
  }

  if (sc1Runtime.loading === true) {
    return PUBLISH_WAITING_SC1_MESSAGE
  }

  if (typeof sc1Runtime.error === "string" && sc1Runtime.error.trim()) {
    return `SC-1.0 falló: ${sc1Runtime.error.trim()}. No se puede publicar hasta que el dual-run finalice correctamente.`
  }

  if (sc1Runtime.ready !== true) {
    return PUBLISH_WAITING_SC1_MESSAGE
  }

  return null
}

/**
 * @param {{
 *   preCalLoading?: boolean;
 *   asyncPreCal?: Record<string, unknown> | null;
 *   renderedContext?: Record<string, unknown> | null;
 *   sc1Runtime?: {
 *     loading?: boolean;
 *     error?: string | null;
 *     ready?: boolean;
 *   } | null;
 *   requireSc1?: boolean;
 * }} params
 * @returns {string | null}
 */
export function getPublishBlockReason({
  preCalLoading = false,
  asyncPreCal = null,
  renderedContext = null,
  sc1Runtime = null,
  requireSc1 = true,
}) {
  if (preCalLoading) {
    return PUBLISH_WAITING_PRECAL_MESSAGE
  }

  if (!asyncPreCal || asyncPreCal.loading === true) {
    return "La precalificación aún no finalizó. Esperá unos segundos e intentá de nuevo."
  }

  if (!renderedContext || typeof renderedContext !== "object") {
    return "El contexto de publicación no está listo."
  }

  const frozenPreCal = /** @type {Record<string, unknown> | null} */ (
    renderedContext.asyncPreCal ?? null
  )
  if (!frozenPreCal || frozenPreCal.loading === true) {
    return PUBLISH_WAITING_PRECAL_MESSAGE
  }

  for (const key of RENDERED_CONTEXT_REQUIRED_KEYS) {
    if (renderedContext[key] == null) {
      return `No se puede publicar: falta ${key} en el contexto congelado.`
    }
  }

  if (requireSc1) {
    const sc1Reason = getSc1PublishBlockReason(sc1Runtime)
    if (sc1Reason) {
      return sc1Reason
    }
  }

  return null
}

/**
 * @param {{
 *   preCalLoading?: boolean;
 *   asyncPreCal?: Record<string, unknown> | null;
 *   renderedContext?: Record<string, unknown> | null;
 *   sc1Runtime?: {
 *     loading?: boolean;
 *     error?: string | null;
 *     ready?: boolean;
 *   } | null;
 *   requireSc1?: boolean;
 * }} params
 */
export function assertPublishReady(params) {
  const reason = getPublishBlockReason(params)
  if (reason) {
    throw new Error(reason)
  }
}
