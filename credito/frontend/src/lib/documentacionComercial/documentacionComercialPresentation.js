/**
 * Presentación Documentación Comercial (consulta comercial, sin SC-1).
 */

import {
  evaluateFiscalVigency,
  getDocumentSortTime,
  getLatestDocument,
} from "@/lib/getLatestDocumentPeriod"
import { formatPortfolioCuit } from "@/lib/portfolio/portfolioPresentation"
import {
  BALANCE_PROXIMO_VENCER_DIAS,
  BALANCE_VIGENCIA_MESES,
  DOCUMENTACION_TIPO_CATALOG,
} from "@/lib/documentacionComercial/documentacionComercialTypes"

/** @typedef {"vigente" | "proximo" | "vencido" | "no_presentado" | "pendiente"} ComercialStatusCode */

/**
 * @typedef {object} ComercialStatus
 * @property {ComercialStatusCode} code
 * @property {string} label
 */

/**
 * @typedef {object} ComercialDocVersion
 * @property {string} id
 * @property {string | null} fecha
 * @property {string | null} vencimiento
 * @property {string | null} periodo
 * @property {string | null} nombreArchivo
 * @property {string | null} downloadUrl
 */

/**
 * @typedef {object} ComercialDocRow
 * @property {string} tipoId
 * @property {string} label
 * @property {ComercialStatus} estado
 * @property {string | null} fecha
 * @property {string | null} vencimiento
 * @property {string | null} nombreArchivo
 * @property {string | null} downloadUrl
 * @property {boolean} hasFile
 * @property {number} historialCount
 * @property {ComercialDocVersion[]} historial
 */

/**
 * @typedef {object} ComercialVista
 * @property {string} cuit
 * @property {string} cuitFormatted
 * @property {string} cliente
 * @property {Array<{ tipoId: string; label: string; estado: ComercialStatus }>} resumen
 * @property {ComercialDocRow[]} documentos
 */

/**
 * @param {unknown} value
 * @returns {Date | null}
 */
function toDate(value) {
  if (value == null || value === "") return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "object") {
    const ts = /** @type {{ toDate?: () => Date; seconds?: number }} */ (value)
    if (typeof ts.toDate === "function") {
      const d = ts.toDate()
      return Number.isNaN(d.getTime()) ? null : d
    }
    if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000)
  }
  if (typeof value === "number") {
    if (value > 1_000_000_000_000) return new Date(value)
    if (value > 1_000_000_000) return new Date(value * 1000)
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (/^\d{6}$/.test(trimmed)) {
      const y = Number(trimmed.slice(0, 4))
      const m = Number(trimmed.slice(4, 6))
      if (m >= 1 && m <= 12) return new Date(y, m, 0)
    }
    const ms = Date.parse(trimmed)
    if (!Number.isNaN(ms)) return new Date(ms)
  }
  return null
}

/**
 * @param {Date | null} date
 * @returns {string | null}
 */
function formatDateEs(date) {
  if (!date) return null
  try {
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return null
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {string | null}
 */
function formatPeriodo(doc) {
  if (!doc) return null
  const raw = doc.periodo ?? doc.ejercicio ?? null
  if (raw == null || raw === "") return null
  const s = String(raw).trim()
  if (/^\d{6}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}`
  }
  return s
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 */
function getExplicitVencimiento(doc) {
  if (!doc) return null
  return (
    toDate(doc.vencimiento) ||
    toDate(doc.fechaVencimiento) ||
    toDate(doc.validoHasta) ||
    toDate(doc.vigenciaHasta)
  )
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {Date | null}
 */
function getDocReferenceDate(doc) {
  if (!doc) return null
  return (
    toDate(doc.fechaCierre) ||
    toDate(doc.fecha_cierre) ||
    toDate(doc.periodo) ||
    toDate(doc.fecha) ||
    toDate(doc.fechaCarga) ||
    toDate(doc.updatedAt) ||
    toDate(doc.uploadedAt)
  )
}

/**
 * @param {Date} base
 * @param {number} months
 */
function addMonths(base, months) {
  const d = new Date(base.getTime())
  d.setMonth(d.getMonth() + months)
  return d
}

/**
 * @param {number} days
 */
function statusFromDaysUntil(days) {
  if (days < 0) {
    return { code: /** @type {ComercialStatusCode} */ ("vencido"), label: "⚠️ Vencido" }
  }
  if (days <= BALANCE_PROXIMO_VENCER_DIAS) {
    return {
      code: /** @type {ComercialStatusCode} */ ("proximo"),
      label: "⚠️ Próximo a vencer",
    }
  }
  return { code: /** @type {ComercialStatusCode} */ ("vigente"), label: "✅ Vigente" }
}

/**
 * @param {Record<string, unknown> | null} doc
 * @returns {ComercialStatus}
 */
function resolveBalanceStatus(doc) {
  if (!doc) {
    return { code: "no_presentado", label: "❌ No presentado" }
  }
  const explicit = getExplicitVencimiento(doc)
  const ref = getDocReferenceDate(doc)
  const vencimiento = explicit || (ref ? addMonths(ref, BALANCE_VIGENCIA_MESES) : null)
  if (!vencimiento) {
    return { code: "vigente", label: "✅ Vigente" }
  }
  const days = Math.ceil((vencimiento.getTime() - Date.now()) / 86_400_000)
  return statusFromDaysUntil(days)
}

/**
 * @param {unknown[]} docs
 * @param {Record<string, unknown> | null} latest
 * @returns {ComercialStatus}
 */
function resolveFiscalStatus(docs, latest) {
  if (!latest) {
    return { code: "no_presentado", label: "❌ No presentado" }
  }
  const vig = evaluateFiscalVigency(docs)
  if (vig.level === "vencido") {
    return { code: "vencido", label: "⚠️ Vencido" }
  }
  if (vig.level === "atencion") {
    return { code: "proximo", label: "⚠️ Próximo a vencer" }
  }
  return { code: "vigente", label: "✅ Vigente" }
}

/**
 * @param {Record<string, unknown> | null} doc
 * @returns {ComercialStatus}
 */
function resolvePresenceStatus(doc) {
  if (!doc) {
    return { code: "no_presentado", label: "❌ No presentado" }
  }
  return { code: "vigente", label: "✅ Vigente" }
}

/**
 * @param {Record<string, unknown> | null} doc
 * @returns {ComercialStatus}
 */
function resolveExpiryStatus(doc) {
  if (!doc) {
    return { code: "no_presentado", label: "❌ No presentado" }
  }
  const vencimiento = getExplicitVencimiento(doc)
  if (!vencimiento) {
    return { code: "vigente", label: "✅ Vigente" }
  }
  const days = Math.ceil((vencimiento.getTime() - Date.now()) / 86_400_000)
  return statusFromDaysUntil(days)
}

/**
 * @param {Record<string, unknown>} empresa
 * @param {string} cuit
 */
export function resolveClienteNombre(empresa, cuit) {
  const name = String(
    empresa.razonSocial ??
      empresa.nombre ??
      empresa.nombreComercial ??
      empresa.cliente ??
      ""
  ).trim()
  return name || `CUIT ${cuit}`
}

/**
 * @param {Record<string, unknown>} doc
 * @param {string} fallbackTipo
 */
function fileMeta(doc, fallbackTipo) {
  const nombre = String(
    doc.nombre ?? doc.name ?? doc.fileName ?? doc.filename ?? ""
  ).trim()
  const url = String(doc.downloadURL ?? doc.url ?? "").trim()
  return {
    nombreArchivo: nombre || (url ? `${fallbackTipo}.pdf` : null),
    downloadUrl: url || null,
  }
}

/**
 * @param {Array<Record<string, unknown>>} docs
 * @returns {Array<Record<string, unknown>>}
 */
function sortDocsNewestFirst(docs) {
  return [...docs].sort(
    (a, b) => getDocumentSortTime(b) - getDocumentSortTime(a)
  )
}

/**
 * @param {Record<string, unknown>} doc
 * @param {import("./documentacionComercialTypes").DocumentacionTipoDef} def
 * @returns {ComercialDocVersion}
 */
function toVersion(doc, def) {
  const meta = fileMeta(doc, def.id)
  const ref = getDocReferenceDate(doc)
  const explicit = getExplicitVencimiento(doc)
  const vencimientoDate =
    explicit ||
    (def.id === "balance" && ref
      ? addMonths(ref, BALANCE_VIGENCIA_MESES)
      : null)

  return {
    id: String(doc.id ?? `${def.id}-${getDocumentSortTime(doc)}`),
    fecha:
      def.statusModel === "fiscal"
        ? formatPeriodo(doc) || formatDateEs(ref)
        : formatDateEs(ref) || formatPeriodo(doc),
    vencimiento: def.showVencimiento ? formatDateEs(vencimientoDate) : null,
    periodo: formatPeriodo(doc),
    nombreArchivo: meta.nombreArchivo,
    downloadUrl: meta.downloadUrl,
  }
}

/**
 * @param {import("./documentacionComercialRepository").DocumentacionEmpresaListItem} item
 * @param {string} tipoId
 * @returns {Array<Record<string, unknown>>}
 */
function docsForTipo(item, tipoId) {
  const { financial } = item
  switch (tipoId) {
    case "balance":
      return financial.balances ?? []
    case "iva":
      return financial.iva ?? []
    case "iibb":
      return financial.iibb ?? []
    case "afip":
      return financial.afip ?? []
    case "pyme":
      return financial.pyme ?? []
    default:
      return []
  }
}

/**
 * Vista comercial: solo último documento vigente por tipo + historial.
 *
 * @param {import("./documentacionComercialRepository").DocumentacionEmpresaListItem} item
 * @returns {ComercialVista}
 */
export function buildDocumentacionComercialVista(item) {
  const { cuit, empresa } = item
  const cliente = resolveClienteNombre(empresa, cuit)

  /** @type {ComercialDocRow[]} */
  const documentos = []
  /** @type {ComercialVista["resumen"]} */
  const resumen = []

  for (const def of DOCUMENTACION_TIPO_CATALOG) {
    if (!def.activeInVista) continue

    const all = sortDocsNewestFirst(docsForTipo(item, def.id))
    const latest = /** @type {Record<string, unknown> | null} */ (
      getLatestDocument(all) || all[0] || null
    )
    const historialDocs = latest
      ? all.filter((d) => String(d.id) !== String(latest.id))
      : all

    /** @type {ComercialStatus} */
    let estado
    if (def.statusModel === "balance") {
      estado = resolveBalanceStatus(latest)
    } else if (def.statusModel === "fiscal") {
      estado = resolveFiscalStatus(all, latest)
      // Si hay período pero fiscal marca vacío raro, tratar como pendiente solo sin docs
      if (!latest) {
        estado = { code: "no_presentado", label: "❌ No presentado" }
      } else if (estado.code === "proximo") {
        // UI comercial: "Pendiente" no aplica a fiscal con docs; se mantiene próximo
      }
    } else if (def.statusModel === "expiry") {
      estado = resolveExpiryStatus(latest)
    } else {
      estado = resolvePresenceStatus(latest)
    }

    // Resumen: IIBB sin doc → Pendiente (copy comercial del mock)
    const resumenEstado =
      !latest && (def.id === "iibb" || def.id === "iva")
        ? { code: /** @type {ComercialStatusCode} */ ("pendiente"), label: "Pendiente" }
        : estado

    resumen.push({
      tipoId: def.id,
      label: def.summaryLabel,
      estado: resumenEstado.code === "pendiente" ? resumenEstado : {
        ...estado,
        label:
          estado.code === "vigente"
            ? "Vigente"
            : estado.code === "proximo"
              ? "Próximo a vencer"
              : estado.code === "vencido"
                ? "Vencido"
                : estado.code === "no_presentado"
                  ? "No presentado"
                  : estado.label,
      },
    })

    const version = latest ? toVersion(latest, def) : null
    const meta = latest ? fileMeta(latest, def.id) : { nombreArchivo: null, downloadUrl: null }

    documentos.push({
      tipoId: def.id,
      label: def.label,
      estado,
      fecha: version?.fecha ?? null,
      vencimiento: def.showVencimiento ? version?.vencimiento ?? "—" : "—",
      nombreArchivo: meta.nombreArchivo,
      downloadUrl: meta.downloadUrl,
      hasFile: Boolean(meta.downloadUrl),
      historialCount: historialDocs.length,
      historial: historialDocs.map((d) => toVersion(d, def)),
    })
  }

  return {
    cuit,
    cuitFormatted: formatPortfolioCuit(cuit),
    cliente,
    resumen,
    documentos,
  }
}

/**
 * Índice de búsqueda.
 * @param {{ cuit: string; cliente: string }} item
 */
export function buildDocumentacionSearchHit(item) {
  return {
    id: item.cuit,
    cuit: item.cuit,
    cuitFormatted: formatPortfolioCuit(item.cuit),
    cliente: item.cliente,
  }
}

/**
 * Fila de grilla comercial (Cliente / CUIT / Balance / IVA / IIBB / Última actualización).
 * Reutiliza `buildDocumentacionComercialVista` — sin reglas nuevas.
 *
 * @typedef {{
 *   id: string;
 *   cuit: string;
 *   cuitFormatted: string;
 *   cliente: string;
 *   balance: { label: string };
 *   iva: { label: string };
 *   iibb: { label: string };
 *   ultimaActualizacion: string | null;
 * }} DocumentacionComercialGridRow
 *
 * @param {import("./documentacionComercialRepository").DocumentacionEmpresaListItem} item
 * @returns {DocumentacionComercialGridRow}
 */
export function buildDocumentacionComercialGridRow(item) {
  const vista = buildDocumentacionComercialVista(item)
  const byTipo = Object.fromEntries(
    vista.resumen.map((row) => [row.tipoId, row.estado.label])
  )

  /** @type {string | null} */
  let ultimaActualizacion = null
  for (const doc of vista.documentos) {
    if (doc.fecha && (!ultimaActualizacion || doc.fecha > ultimaActualizacion)) {
      ultimaActualizacion = doc.fecha
    }
  }

  return {
    id: vista.cuit,
    cuit: vista.cuit,
    cuitFormatted: vista.cuitFormatted,
    cliente: vista.cliente,
    balance: { label: byTipo.balance ?? "—" },
    iva: { label: byTipo.iva ?? "—" },
    iibb: { label: byTipo.iibb ?? "—" },
    ultimaActualizacion,
  }
}
