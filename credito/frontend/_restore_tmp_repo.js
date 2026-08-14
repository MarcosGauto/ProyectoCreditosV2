/**
 * Lectura Firestore/Storage para Documentación Comercial.
 * Reutiliza colecciones canónicas existentes — no crea estructura nueva.
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
 * }} financial
 * @property {Array<Record<string, unknown>>} legales
 */

/**
 * Lista empresas (tope de página, mismo criterio que Cartera).
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
 * Documentos legales legacy: `clientes/{cuit}/documentos`
 * (Estatuto/Acta/Poder/DNI u otros si fueron cargados ahí).
 *
 * @param {string} cuit
 * @returns {Promise<Array<Record<string, unknown>>>}
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
 * Carga completa de documentación de un CUIT (consulta).
 *
 * @param {string} cuit
 * @returns {Promise<DocumentacionEmpresaListItem | null>}
 */
export async function fetchDocumentacionEmpresaByCuit(cuit) {
  const id = String(cuit || "").trim()
  if (!id) return null

  const empresaSnap = await getDoc(doc(db, "empresas", id))
  const empresa = empresaSnap.exists()
    ? /** @type {Record<string, unknown>} */ (empresaSnap.data())
    : {}

  const [financial, legales] = await Promise.all([
    fetchFinancialDocumentation(id),
    listDocumentosLegalesByCuit(id),
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
    },
    legales,
  }
}

/**
 * Escaneo de todas las empresas con su documentación financiera/legal.
 *
 * @param {{ pageSize?: number }} [options]
 * @returns {Promise<{
 *   items: DocumentacionEmpresaListItem[];
 *   scannedEmpresas: number;
 *   truncated: boolean;
 * }>}
 */
export async function fetchAllDocumentacionEmpresas(options = {}) {
  const { docs, truncated } = await listEmpresasDocumentacion(options)

  /** @type {DocumentacionEmpresaListItem[]} */
  const items = []

  await Promise.all(
    docs.map(async (empresaDoc) => {
      const cuit = empresaDoc.id
      try {
        const financial = await fetchFinancialDocumentation(cuit)
        const legales = await listDocumentosLegalesByCuit(cuit)
        items.push({
          cuit,
          empresa: /** @type {Record<string, unknown>} */ ({
            ...empresaDoc.data(),
            cuit: empresaDoc.data()?.cuit ?? cuit,
          }),
          financial: {
            iva: /** @type {Array<Record<string, unknown>>} */ (
              financial.iva ?? []
            ),
            iibb: /** @type {Array<Record<string, unknown>>} */ (
              financial.iibb ?? []
            ),
            balances: /** @type {Array<Record<string, unknown>>} */ (
              financial.balances ?? []
            ),
            locales: /** @type {Array<Record<string, unknown>>} */ (
              financial.locales ?? []
            ),
            nosis: /** @type {Array<Record<string, unknown>>} */ (
              financial.nosis ?? []
            ),
          },
          legales,
        })
      } catch (error) {
        console.warn("[documentacionComercialRepository]", cuit, error)
      }
    })
  )

  return {
    items,
    scannedEmpresas: docs.length,
    truncated,
  }
}
