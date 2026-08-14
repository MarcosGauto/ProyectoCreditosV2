/**
 * Documentación Comercial — servicio (consulta).
 * Service → Repository Firestore → Storage (URLs).
 */

import {
  buildDocumentacionComercialGridRow,
  buildDocumentacionComercialVista,
  buildDocumentacionSearchHit,
} from "@/lib/documentacionComercial/documentacionComercialPresentation"
import {
  fetchAllDocumentacionEmpresas,
  fetchDocumentacionEmpresaByCuit,
  listEmpresasIndex,
} from "@/lib/documentacionComercial/documentacionComercialRepository"

/**
 * @typedef {import("@/lib/documentacionComercial/documentacionComercialPresentation").ComercialVista} ComercialVista
 * @typedef {import("@/lib/documentacionComercial/documentacionComercialPresentation").DocumentacionComercialGridRow} DocumentacionComercialGridRow
 */

/**
 * Índice liviano (CUIT + razón social) para búsqueda.
 */
export async function fetchDocumentacionComercialIndex() {
  const { items, truncated } = await listEmpresasIndex()
  return {
    truncated,
    items: items
      .map(buildDocumentacionSearchHit)
      .sort((a, b) => a.cliente.localeCompare(b.cliente, "es")),
  }
}

/**
 * Grilla principal: Cliente, CUIT, Balance, IVA, IIBB, Última actualización.
 * @returns {Promise<DocumentacionComercialGridRow[]>}
 */
export async function fetchDocumentacionComercial() {
  const { items } = await fetchAllDocumentacionEmpresas()
  return items
    .map(buildDocumentacionComercialGridRow)
    .sort((a, b) => {
      const byName = a.cliente.localeCompare(b.cliente, "es")
      if (byName !== 0) return byName
      return a.cuit.localeCompare(b.cuit)
    })
}

/**
 * Vista comercial de un CUIT (último doc por tipo + historial).
 * @param {string} cuit
 * @returns {Promise<ComercialVista | null>}
 */
export async function fetchDocumentacionComercialVista(cuit) {
  const item = await fetchDocumentacionEmpresaByCuit(cuit)
  if (!item) return null
  return buildDocumentacionComercialVista(item)
}

/** @deprecated Usar fetchDocumentacionComercialVista */
export async function fetchDocumentacionComercialDetalle(cuit) {
  return fetchDocumentacionComercialVista(cuit)
}
