import {
  collection,
  doc,
  addDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/service/firebase"
import { ensureEmpresaDocument } from "@/lib/uploadFinancialDocument"

/**
 * @param {string} cuit
 * @param {string} sucursalId
 * @param {string} fileName
 */
function buildSucursalPhotoPath(cuit, sucursalId, fileName) {
  const safeName = fileName.replace(/[^\w.\-() ]+/g, "_")
  return `empresas/${cuit}/locales/${sucursalId}/${Date.now()}_${safeName}`
}

/**
 * @param {string} cuit
 * @param {import("@/lib/sucursalesModel").Sucursal[]} sucursales
 */
export async function saveSucursalesMetadata(cuit, sucursales) {
  await ensureEmpresaDocument(cuit)

  await setDoc(
    doc(db, "empresas", cuit),
    {
      sucursales,
      sucursalesData: sucursales,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

/**
 * Sube varias fotos y las agrega (no reemplaza).
 *
 * @param {{
 *   cuit: string;
 *   sucursalId: string;
 *   files: File[];
 *   usuario?: string | null;
 * }} params
 * @returns {Promise<import("@/lib/sucursalesModel").SucursalFoto[]>}
 */
export async function uploadSucursalPhotos({
  cuit,
  sucursalId,
  files,
  usuario = null,
}) {
  if (!cuit || !sucursalId || !files?.length) {
    return []
  }

  await ensureEmpresaDocument(cuit)

  /** @type {import("@/lib/sucursalesModel").SucursalFoto[]} */
  const uploaded = []

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      continue
    }

    const storagePath = buildSucursalPhotoPath(cuit, sucursalId, file.name)
    const storageRef = ref(storage, storagePath)
    await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(storageRef)

    const metadata = {
      nombre: file.name,
      tipoDocumento: "locales",
      sucursalId,
      sucursal_id: sucursalId,
      fechaCarga: serverTimestamp(),
      storagePath,
      downloadURL,
      url: downloadURL,
      usuario: usuario || "desconocido",
      cuit,
    }

    const docRef = await addDoc(
      collection(db, "empresas", cuit, "locales"),
      metadata
    )

    uploaded.push({
      id: docRef.id,
      url: downloadURL,
      storagePath,
      nombre: file.name,
      fechaCarga: new Date().toISOString(),
    })
  }

  return uploaded
}
