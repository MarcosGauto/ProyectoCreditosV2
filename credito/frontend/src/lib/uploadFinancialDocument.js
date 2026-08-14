import {
  collection,
  doc,
  addDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/service/firebase"

/** @typedef {"balances" | "iva" | "iibb"} FinancialDocumentType */

export const FINANCIAL_DOCUMENT_TYPES = {
  BALANCES: "balances",
  IVA: "iva",
  IIBB: "iibb",
}

/**
 * @param {string} fileName
 * @returns {string}
 */
export function inferPeriodoFromFileName(fileName) {
  const base = fileName.replace(/\.[^.]+$/, "")

  const yyyymm = base.match(/(?:^|[^\d])(20\d{2})(0[1-9]|1[0-2])(?:[^\d]|$)/)
  if (yyyymm) {
    return `${yyyymm[1]}${yyyymm[2]}`
  }

  const yearMonth = base.match(/(20\d{2})[-_.](0[1-9]|1[0-2])/)
  if (yearMonth) {
    return `${yearMonth[1]}${yearMonth[2]}`
  }

  const monthYear = base.match(/(0[1-9]|1[0-2])[-_.](20\d{2})/)
  if (monthYear) {
    return `${monthYear[2]}${monthYear[1]}`
  }

  const yearOnly = base.match(/(20\d{2})/)
  if (yearOnly) {
    return yearOnly[1]
  }

  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
}

/**
 * @param {string} cuit
 * @param {FinancialDocumentType} tipoDocumento
 * @param {string} fileName
 * @returns {string}
 */
export function buildFinancialDocumentStoragePath(
  cuit,
  tipoDocumento,
  fileName
) {
  const safeName = fileName.replace(/[^\w.\-() ]+/g, "_")
  return `empresas/${cuit}/${tipoDocumento}/${Date.now()}_${safeName}`
}

/**
 * @param {string} cuit
 */
export async function ensureEmpresaDocument(cuit) {
  await setDoc(
    doc(db, "empresas", cuit),
    {
      cuit,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

/**
 * @param {{
 *   cuit: string;
 *   file: File;
 *   tipoDocumento: FinancialDocumentType;
 *   usuario?: string | null;
 * }} params
 * @returns {Promise<Record<string, unknown>>}
 */
export async function uploadFinancialDocument({
  cuit,
  file,
  tipoDocumento,
  usuario = null,
}) {
  if (!cuit || !file || !tipoDocumento) {
    throw new Error("Faltan datos para subir el documento.")
  }

  await ensureEmpresaDocument(cuit)

  const periodo = inferPeriodoFromFileName(file.name)
  const storagePath = buildFinancialDocumentStoragePath(
    cuit,
    tipoDocumento,
    file.name
  )

  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, file)
  const downloadURL = await getDownloadURL(storageRef)

  const metadata = {
    nombre: file.name,
    tipoDocumento,
    periodo,
    fechaCarga: serverTimestamp(),
    storagePath,
    downloadURL,
    url: downloadURL,
    usuario: usuario || "desconocido",
    cuit,
  }

  const docRef = await addDoc(
    collection(db, "empresas", cuit, tipoDocumento),
    metadata
  )

  return {
    id: docRef.id,
    ...metadata,
    fechaCarga: new Date().toISOString(),
  }
}
