import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore"
import { db } from "@/service/firebase"
import { normalizeToBalanceContable } from "@/lib/balanceContableModel"
import { logNosisReportsOrder } from "@/lib/nosisModel"

/**
 * @param {import("firebase/firestore").QuerySnapshot} snap
 * @returns {Array<Record<string, unknown>>}
 */
function snapshotToRows(snap) {
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      // El id de Firestore debe ser la clave canónica (React key, deleteDoc, etc.)
      id: d.id,
      firestoreId: d.id,
      ...(data.id != null && String(data.id) !== d.id
        ? { documentoId: data.id }
        : {}),
    }
  })
}

/**
 * @param {unknown[]} rows
 * @param {string} label
 */
function logDuplicateRowIds(rows, label) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return
  }
  const ids = rows.map((row) =>
    row && typeof row === "object" ? String(/** @type {{ id?: string }} */ (row).id) : ""
  )
  const duplicados = ids.filter((id, index) => id && ids.indexOf(id) !== index)
  if (duplicados.length > 0) {
    console.warn("[fetchFinancialDocumentation] IDS DUPLICADOS", {
      coleccion: label,
      duplicados: [...new Set(duplicados)],
      filas: rows.filter(
        (row) =>
          row &&
          typeof row === "object" &&
          duplicados.includes(String(/** @type {{ id?: string }} */ (row).id))
      ),
    })
  }
}

/**
 * @param {string} cuit
 * @param {string} subcollection
 */
async function readCanonicalSubcollection(cuit, subcollection) {
  const snap = await getDocs(
    collection(db, "empresas", cuit, subcollection)
  )
  return snapshotToRows(snap)
}

/**
 * @param {string} cuit
 * @param {string} collectionName
 */
async function readLegacyFlatByCuit(cuit, collectionName) {
  const snap = await getDocs(
    query(collection(db, collectionName), where("cuit", "==", cuit))
  )
  return snapshotToRows(snap)
}

/**
 * @param {string} cuit
 * @param {string} collectionName
 */
async function readLegacySingleDoc(cuit, collectionName) {
  const snap = await getDoc(doc(db, collectionName, cuit))
  if (!snap.exists()) {
    return []
  }

  const data = snap.data()
  if (Array.isArray(data.declaraciones)) {
    return data.declaraciones.map((row, index) => ({
      ...(typeof row === "object" && row !== null ? row : {}),
      id: `${snap.id}-${index}`,
      documentoId: String(row?.periodo ?? row?.id ?? index),
    }))
  }

  return [{ ...data, id: snap.id, firestoreId: snap.id }]
}

/**
 * @param {string} cuit
 */
async function readLegacyBalanceItems(cuit) {
  const snap = await getDocs(
    collection(db, "balances", cuit, "items")
  )
  return snapshotToRows(snap)
}

/**
 * @param {string} cuit
 * @param {string} subcollection
 * @param {string} legacyCollection
 * @param {{ useLegacyDoc?: boolean; useLegacyItems?: boolean }} [options]
 */
async function fetchWithFallback(cuit, subcollection, legacyCollection, options = {}) {
  const canonical = await readCanonicalSubcollection(cuit, subcollection)
  if (canonical.length > 0) {
    return { rows: canonical, source: `empresas/${cuit}/${subcollection}` }
  }

  if (options.useLegacyItems) {
    const items = await readLegacyBalanceItems(cuit)
    if (items.length > 0) {
      return { rows: items, source: `balances/${cuit}/items` }
    }
  }

  if (options.useLegacyDoc) {
    const legacyDoc = await readLegacySingleDoc(cuit, legacyCollection)
    if (legacyDoc.length > 0) {
      return { rows: legacyDoc, source: `${legacyCollection}/${cuit}` }
    }
  }

  const legacyFlat = await readLegacyFlatByCuit(cuit, legacyCollection)
  if (legacyFlat.length > 0) {
    return { rows: legacyFlat, source: `${legacyCollection} (query cuit)` }
  }

  return { rows: [], source: "none" }
}

/**
 * Carga documentación financiera con el mismo criterio que los repositories del backend.
 *
 * @param {string} cuit
 */
export async function fetchFinancialDocumentation(cuit) {
  const [iva, iibb, balances, locales, nosis] = await Promise.all([
    fetchWithFallback(cuit, "iva", "iva", { useLegacyDoc: true }),
    fetchWithFallback(cuit, "iibb", "iibb", { useLegacyDoc: true }),
    fetchWithFallback(cuit, "balances", "balances", { useLegacyItems: true }),
    readCanonicalSubcollection(cuit, "locales").then((rows) => ({
      rows,
      source: rows.length > 0 ? `empresas/${cuit}/locales` : "none",
    })),
    readCanonicalSubcollection(cuit, "nosis_reports").then((rows) => ({
      rows,
      source: rows.length > 0 ? `empresas/${cuit}/nosis_reports` : "none",
    })),
  ])

  console.log("[fetchFinancialDocumentation] sources", {
    iva: iva.source,
    iibb: iibb.source,
    balances: balances.source,
    locales: locales.source,
    nosis: nosis.source,
    ivaCount: iva.rows.length,
    iibbCount: iibb.rows.length,
    balancesCount: balances.rows.length,
    localesCount: locales.rows.length,
    nosisCount: nosis.rows.length,
  })

  const balanceContable = normalizeToBalanceContable(balances.rows)

  logDuplicateRowIds(balances.rows, balances.source)
  logDuplicateRowIds(iva.rows, iva.source)
  logDuplicateRowIds(iibb.rows, iibb.source)
  logNosisReportsOrder(nosis.rows)

  return {
    iva: iva.rows,
    iibb: iibb.rows,
    balances: balances.rows,
    balanceContable,
    locales: locales.rows,
    nosis: nosis.rows,
    sources: {
      iva: iva.source,
      iibb: iibb.source,
      balances: balances.source,
      locales: locales.source,
      nosis: nosis.source,
    },
  }
}
