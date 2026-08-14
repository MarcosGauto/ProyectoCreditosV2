import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/service/firebase"
import { ensureEmpresaDocument } from "@/lib/uploadFinancialDocument"
import { normalizeWebsiteUrl } from "@/lib/empresaWebsite"

/**
 * Persiste el sitio web en empresas/{cuit}.
 * Campos: paginaWeb (raíz) y ubicacion.paginaWeb / ubicacion.web.
 *
 * @param {string} cuit
 * @param {string} rawUrl
 */
export async function saveEmpresaWebsite(cuit, rawUrl) {
  if (!cuit) {
    throw new Error("CUIT requerido para guardar el sitio web.")
  }

  await ensureEmpresaDocument(cuit)

  const paginaWeb = normalizeWebsiteUrl(rawUrl)
  const docRef = doc(db, "empresas", cuit)
  const snap = await getDoc(docRef)

  const existingUbicacion =
    snap.exists() &&
    snap.data().ubicacion &&
    typeof snap.data().ubicacion === "object"
      ? { ...snap.data().ubicacion }
      : {}

  await setDoc(
    docRef,
    {
      paginaWeb: paginaWeb || null,
      web: paginaWeb || null,
      sitioWeb: paginaWeb || null,
      ubicacion: {
        ...existingUbicacion,
        paginaWeb: paginaWeb || null,
        web: paginaWeb || null,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  return { paginaWeb, cuit }
}
