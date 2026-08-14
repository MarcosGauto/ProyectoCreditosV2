/**
 * @typedef {Object} SucursalFoto
 * @property {string} id
 * @property {string} url
 * @property {string} [storagePath]
 * @property {string} [nombre]
 * @property {string} [fechaCarga]
 */

/**
 * @typedef {Object} Sucursal
 * @property {string} id
 * @property {string} nombre
 * @property {string} direccion
 * @property {string} observaciones
 * @property {SucursalFoto[]} fotos
 */

/**
 * @param {unknown} value
 * @returns {number}
 */
export function resolveSucursalCount(empresa) {
  if (!empresa || typeof empresa !== "object") {
    return 1
  }

  const record = /** @type {Record<string, unknown>} */ (empresa)

  if (Array.isArray(record.sucursales)) {
    return Math.max(1, record.sucursales.length)
  }

  const ubicacion =
    record.ubicacion && typeof record.ubicacion === "object"
      ? /** @type {Record<string, unknown>} */ (record.ubicacion)
      : null

  const candidates = [
    record.sucursales,
    record.cantidadSucursales,
    record.numeroSucursales,
    ubicacion?.sucursales,
  ]

  for (const raw of candidates) {
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 1) {
      return Math.min(Math.floor(n), 20)
    }
  }

  return 1
}

/**
 * @param {number} count
 * @returns {Sucursal[]}
 */
export function buildDefaultSucursales(count) {
  const total = Math.max(1, Math.min(count, 20))
  /** @type {Sucursal[]} */
  const list = []

  for (let i = 0; i < total; i++) {
    if (i === 0) {
      list.push({
        id: "central",
        nombre: "Casa Central",
        direccion: "",
        observaciones: "",
        fotos: [],
      })
    } else {
      list.push({
        id: `sucursal-${i}`,
        nombre: `Sucursal ${i}`,
        direccion: "",
        observaciones: "",
        fotos: [],
      })
    }
  }

  return list
}

/**
 * @param {unknown} raw
 * @returns {SucursalFoto | null}
 */
function normalizeFoto(raw) {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const row = /** @type {Record<string, unknown>} */ (raw)
  const url = String(row.url ?? row.downloadURL ?? "")
  if (!url) {
    return null
  }
  return {
    id: String(row.id ?? row.storagePath ?? url),
    url,
    storagePath: row.storagePath ? String(row.storagePath) : undefined,
    nombre: row.nombre ? String(row.nombre) : undefined,
    fechaCarga: row.fechaCarga ? String(row.fechaCarga) : undefined,
  }
}

/**
 * @param {unknown} raw
 * @returns {Sucursal | null}
 */
function normalizeSucursal(raw, fallbackId) {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const row = /** @type {Record<string, unknown>} */ (raw)
  const id = String(row.id ?? fallbackId)
  const fotosRaw = Array.isArray(row.fotos) ? row.fotos : []
  const fotos = fotosRaw
    .map((f, i) => normalizeFoto(f) ?? null)
    .filter(Boolean)

  return {
    id,
    nombre: String(row.nombre ?? "Sucursal"),
    direccion: String(row.direccion ?? ""),
    observaciones: String(row.observaciones ?? ""),
    fotos: /** @type {SucursalFoto[]} */ (fotos),
  }
}

/**
 * Fotos legacy en subcolección `locales`.
 * @param {unknown[]} localesDocs
 * @returns {Map<string, SucursalFoto[]>}
 */
function groupLegacyLocalesPhotos(localesDocs) {
  /** @type {Map<string, SucursalFoto[]>} */
  const map = new Map()

  for (const doc of localesDocs) {
    if (!doc || typeof doc !== "object") {
      continue
    }
    const row = /** @type {Record<string, unknown>} */ (doc)
    const url = String(row.url ?? row.downloadURL ?? "")
    if (!url) {
      continue
    }
    const sucursalId = String(row.sucursalId ?? row.sucursal_id ?? "central")
    const foto = {
      id: String(row.id ?? url),
      url,
      storagePath: row.storagePath ? String(row.storagePath) : undefined,
      nombre: row.nombre ? String(row.nombre) : undefined,
      fechaCarga: row.fechaCarga ? String(row.fechaCarga) : undefined,
    }
    const list = map.get(sucursalId) ?? []
    list.push(foto)
    map.set(sucursalId, list)
  }

  return map
}

/**
 * @param {Record<string, unknown> | null | undefined} empresa
 * @param {unknown[]} [localesDocs]
 * @returns {Sucursal[]}
 */
/**
 * Hay al menos un local persistido (metadata en empresa o fotos en subcolección).
 * No exige imágenes: basta `empresa.sucursales` / `sucursalesData` guardados.
 *
 * @param {Record<string, unknown> | null | undefined} empresa
 * @param {unknown[]} [localesDocs] — documentos en empresas/{cuit}/locales (fotos)
 * @returns {boolean}
 */
export function hasLocalesLoaded(empresa, localesDocs = []) {
  if (Array.isArray(localesDocs) && localesDocs.length > 0) {
    return true
  }

  if (!empresa || typeof empresa !== "object") {
    return false
  }

  const record = /** @type {Record<string, unknown>} */ (empresa)
  const stored = Array.isArray(record.sucursales)
    ? record.sucursales
    : Array.isArray(record.sucursalesData)
      ? record.sucursalesData
      : null

  return Array.isArray(stored) && stored.length > 0
}

export function mergeSucursalesFromFirestore(empresa, localesDocs = []) {
  const count = resolveSucursalCount(empresa)
  const defaults = buildDefaultSucursales(count)
  const legacyBySucursal = groupLegacyLocalesPhotos(localesDocs)

  const stored = Array.isArray(empresa?.sucursales)
    ? empresa.sucursales
    : Array.isArray(empresa?.sucursalesData)
      ? empresa.sucursalesData
      : null

  if (stored && stored.length > 0) {
    return stored.map((item, index) => {
      const normalized =
        normalizeSucursal(item, defaults[index]?.id ?? `sucursal-${index}`) ??
        defaults[index]
      const legacy = legacyBySucursal.get(normalized.id) ?? []
      const mergedFotos = [...normalized.fotos]
      for (const foto of legacy) {
        if (!mergedFotos.some((f) => f.url === foto.url)) {
          mergedFotos.push(foto)
        }
      }
      return { ...normalized, fotos: mergedFotos }
    })
  }

  return defaults.map((sucursal) => {
    const legacy = legacyBySucursal.get(sucursal.id) ?? []
    const unassigned =
      sucursal.id === "central" ? legacyBySucursal.get("") ?? [] : []
    const fotos = [...legacy, ...unassigned]
    return { ...sucursal, fotos }
  })
}
