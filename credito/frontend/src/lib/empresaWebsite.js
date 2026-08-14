/** Campos donde puede persistir la URL del sitio (empresas/{cuit}). */
export const EMPRESA_WEB_URL_FIELDS = [
  "paginaWeb",
  "pagina_web",
  "web",
  "url",
  "sitioWeb",
  "website",
]

/**
 * @param {Record<string, unknown>} record
 * @returns {string | null}
 */
function firstWebUrlFromRecord(record) {
  for (const field of EMPRESA_WEB_URL_FIELDS) {
    const value = record[field]
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }
  return null
}

/**
 * @param {Record<string, unknown> | null | undefined} empresa
 * @returns {string | null}
 */
export function getEmpresaWebsiteUrl(empresa) {
  if (!empresa || typeof empresa !== "object") {
    return null
  }

  const record = /** @type {Record<string, unknown>} */ (empresa)
  const fromRoot = firstWebUrlFromRecord(record)
  if (fromRoot) {
    return fromRoot
  }

  const nestedUbicacion =
    record.ubicacion && typeof record.ubicacion === "object"
      ? /** @type {Record<string, unknown>} */ (record.ubicacion)
      : null
  if (nestedUbicacion) {
    const fromUbicacion = firstWebUrlFromRecord(nestedUbicacion)
    if (fromUbicacion) {
      return fromUbicacion
    }
  }

  const nestedPerfil =
    record.perfilComercial && typeof record.perfilComercial === "object"
      ? /** @type {Record<string, unknown>} */ (record.perfilComercial)
      : null
  if (nestedPerfil) {
    return firstWebUrlFromRecord(nestedPerfil)
  }

  return null
}

/**
 * @param {Record<string, unknown> | null | undefined} empresa
 * @returns {boolean}
 */
export function hasWebUrl(empresa) {
  return hasEmpresaWebsite(empresa)
}

/**
 * @param {Record<string, unknown> | null | undefined} empresa
 * @returns {boolean}
 */
export function hasEmpresaWebsite(empresa) {
  const website = getEmpresaWebsiteUrl(empresa)
  return typeof website === "string" && website.trim().length > 0
}

/**
 * Dominio o URL corta para el panel lateral.
 *
 * @param {string | null | undefined} url
 * @returns {string}
 */
export function formatWebsiteDisplayLabel(url) {
  if (!url || typeof url !== "string") {
    return ""
  }
  const trimmed = url.trim()
  if (!trimmed) {
    return ""
  }
  try {
    const host = new URL(normalizeWebsiteUrl(trimmed)).hostname
    return host.replace(/^www\./i, "") || trimmed
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "")
  }
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeWebsiteUrl(raw) {
  const trimmed = String(raw ?? "").trim()
  if (!trimmed) {
    return ""
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed.replace(/^\/+/, "")}`
}

/**
 * @param {string | null | undefined} url
 * @returns {string}
 */
export function formatWebsiteHref(url) {
  if (!url) {
    return ""
  }
  return normalizeWebsiteUrl(url)
}

/**
 * Fusiona la URL guardada en el objeto empresa del estado de React.
 *
 * @param {Record<string, unknown> | null | undefined} empresa
 * @param {string} paginaWeb
 * @returns {Record<string, unknown>}
 */
export function mergeEmpresaWebsiteIntoEmpresa(empresa, paginaWeb) {
  const prev =
    empresa && typeof empresa === "object"
      ? /** @type {Record<string, unknown>} */ (empresa)
      : {}
  const prevUbicacion =
    prev.ubicacion && typeof prev.ubicacion === "object"
      ? /** @type {Record<string, unknown>} */ (prev.ubicacion)
      : {}

  const normalized = normalizeWebsiteUrl(paginaWeb)

  return {
    ...prev,
    paginaWeb: normalized,
    web: normalized,
    sitioWeb: normalized,
    ubicacion: {
      ...prevUbicacion,
      paginaWeb: normalized,
      web: normalized,
    },
  }
}
