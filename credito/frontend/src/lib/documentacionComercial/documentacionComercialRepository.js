/**
 * Lectura Firestore/Storage para Documentación Comercial.
 * Reutiliza colecciones canónicas — no crea estructura nueva.
 */

import { collection, doc, getDoc, getDocs, limit, query } from "firebase/firestore"

import { fetchFinancialDocumentation } from "@/lib/fetchAnalysisFirestore"
import { db } from "@/service/firebase"

const EMPRESAS_PAGE_SIZE = 200

/**
 * @typedef {object} DocumentacionEmpresaListItem
 * @property {string} cuit
 * @property {Record<string, unknown>} empresa
 * @property {{
 *   iva: Array<Record<string, unknown>>;
 *   iibb: Array<Record<string, unknown>>;
 *   balances: Array<Record<string, unknown>>;
 *   locales: Array<Record<string, unknown>>;
 *   nosis: Array<Record<string, unknown>>;
 *   afip: Array<Record<string, unknown>>;
 *   pyme: Array<Record<string, unknown>>;
 * }} financial
 * @property {Array<Record<string, unknown>>} legales
 */

/**
 * @param {{ pageSize?: number }} [options]
 */
export async function listEmpresasDocumentacion(options = {}) {
  const pageSize = options.pageSize ?? EMPRESAS_PAGE_SIZE
  const snap = await getDocs(query(collection(db, "empresas"), limit(pageSize)))
  return {
    docs: snap.docs,
    truncated: snap.size >= pageSize,
  }
}

/**
 * Índice liviano para búsqueda (sin bajar toda la documentación).
 * @param {{ pageSize?: number }} [options]
 */
export async function listEmpresasIndex(options = {}) {
  const { docs, truncated } = await listEmpresasDocumentacion(options)
  return {
    truncated,
    items: docs.map((empresaDoc) => {
      const data = /** @type {Record<string, unknown>} */ (empresaDoc.data() || {})
      const cuit = empresaDoc.id
      const cliente = String(
        data.razonSocial ?? data.nombre ?? data.nombreComercial ?? data.cliente ?? ""
      ).trim()
      return {
        cuit,
        cliente: cliente || `CUIT ${cuit}`,
        empresa: { ...data, cuit: data.cuit ?? cuit },
      }
    }),
  }
}

/**
 * @param {string} cuit
 * @param {string} subcollection
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
async function readOptionalSubcollection(cuit, subcollection) {
  try {
    const snap = await getDocs(collection(db, "empresas", cuit, subcollection))
    return snap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      firestoreId: d.id,
    }))
  } catch (error) {
    console.warn(
      "[documentacionComercialRepository] subcollection",
      cuit,
      subcollection,
      error
    )
    return []
  }
}

/**
 * Legacy: `clientes/{cuit}/documentos`
 * @param {string} cuit
 */
export async function listDocumentosLegalesByCuit(cuit) {
  const id = String(cuit || "").trim()
  if (!id) return []

  try {
    const snap = await getDocs(collection(db, "clientes", id, "documentos"))
    return snap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      firestoreId: d.id,
    }))
  } catch (error) {
    console.warn("[documentacionComercialRepository] legales", id, error)
    return []
  }
}

/**
 * @param {string} name
 * @returns {"afip" | "pyme" | "estatuto" | "acta" | "poder" | "dni" | "otro"}
 */
export function classifyDocumentoName(name) {
  const n = String(name || "").toLowerCase()
  if (/pyme|mipymes?|certificado.?pyme/.test(n)) return "pyme"
  if (/afip|arca|constancia.?cuit|constancia.?afip/.test(n)) return "afip"
  if (/estatuto|contrato.?social/.test(n)) return "estatuto"
  if (/acta|asamblea/.test(n)) return "acta"
  if (/poder/.test(n)) return "poder"
  if (/\bdni\b|documento.?identidad|identidad/.test(n)) return "dni"
  return "otro"
}

/**
 * Une subcolección opcional + docs legales clasificados por nombre.
 * @param {Array<Record<string, unknown>>} fromSub
 * @param {Array<Record<string, unknown>>} legales
 * @param {"afip" | "pyme"} tipo
 */
function mergeTypedDocs(fromSub, legales, tipo) {
  const fromLegal = legales.filter(
    (d) => classifyDocumentoName(String(d.nombre ?? d.name ?? "")) === tipo
  )
  const map = new Map()
  for (const d of [...fromSub, ...fromLegal]) {
    map.set(String(d.id), d)
  }
  return [...map.values()]
}

/**
 * Carga documentación de un CUIT.
 * @param {string} cuit
 * @returns {Promise<DocumentacionEmpresaListItem | null>}
 */
export async function fetchDocumentacionEmpresaByCuit(cuit) {
  const id = String(cuit || "").replace(/\D/g, "").trim() || String(cuit || "").trim()
  if (!id) return null

  const empresaSnap = await getDoc(doc(db, "empresas", id))
  const empresa = empresaSnap.exists()
    ? /** @type {Record<string, unknown>} */ (empresaSnap.data())
    : {}

  const [financial, legales, afipSub, pymeSub] = await Promise.all([
    fetchFinancialDocumentation(id),
    listDocumentosLegalesByCuit(id),
    readOptionalSubcollection(id, "afip"),
    readOptionalSubcollection(id, "pyme"),
  ])

  return {
    cuit: id,
    empresa: {
      ...empresa,
      cuit: empresa.cuit ?? id,
    },
    financial: {
      iva: /** @type {Array<Record<string, unknown>>} */ (financial.iva ?? []),
      iibb: /** @type {Array<Record<string, unknown>>} */ (financial.iibb ?? []),
      balances: /** @type {Array<Record<string, unknown>>} */ (
        financial.balances ?? []
      ),
      locales: /** @type {Array<Record<string, unknown>>} */ (
        financial.locales ?? []
      ),
      nosis: /** @type {Array<Record<string, unknown>>} */ (financial.nosis ?? []),
      afip: mergeTypedDocs(afipSub, legales, "afip"),
      pyme: mergeTypedDocs(pymeSub, legales, "pyme"),
    },
    legales,
  }
}

/**
 * Carga documentación de todas las empresas del índice (para grilla comercial).
 * @param {{ pageSize?: number }} [options]
 * @returns {Promise<{ items: DocumentacionEmpresaListItem[]; truncated: boolean }>}
 */
export async function fetchAllDocumentacionEmpresas(options = {}) {
  const { docs, truncated } = await listEmpresasDocumentacion(options)
  const items = []
  for (const empresaDoc of docs) {
    const item = await fetchDocumentacionEmpresaByCuit(empresaDoc.id)
    if (item) items.push(item)
  }
  return { items, truncated }
}
