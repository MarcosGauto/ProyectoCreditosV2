import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/service/firebase"
import { NOSIS_COLLECTION } from "@/lib/uploadNosisReport"
import { calculateNosisScore } from "@/lib/nosisScore"
import { nosisAnalisisFromDoc } from "@/lib/nosisModel"
import { USE_FIREBASE_STORAGE } from "@/lib/storageConfig"

/**
 * @param {{
 *   cuit: string;
 *   docId: string;
 *   indicadores: import("@/lib/nosisModel").NosisIndicators;
 *   validationStatus?: "draft" | "pending" | "confirmed";
 *   usuario?: string | null;
 * }} params
 */
export async function saveNosisIndicators({
  cuit,
  docId,
  indicadores,
  validationStatus = "confirmed",
  usuario = null,
}) {
  if (!cuit || !docId) {
    throw new Error("CUIT y documento NOSIS requeridos.")
  }

  const docRef = doc(db, "empresas", cuit, NOSIS_COLLECTION, docId)
  const existingSnap = await getDoc(docRef)
  const existingData = existingSnap.exists() ? existingSnap.data() : null
  const officialAnalisis = nosisAnalisisFromDoc(
    existingData ? { ...existingData, id: docId } : null
  )
  const officialScore =
    officialAnalisis?.score != null && Number.isFinite(officialAnalisis.score)
      ? Math.round(officialAnalisis.score)
      : null
  const scoreNosis = officialScore ?? calculateNosisScore(indicadores)
  const scoreSource = officialScore != null ? "informe" : "calculo_interno"

  console.log("NOSIS FLOW [3/5] saveNosisIndicators payload", {
    docId,
    consultasUltimos4Meses: indicadores.consultasUltimos4Meses ?? null,
    cantidadCheques: indicadores.cantidadCheques,
    montoCheques: indicadores.montoCheques,
    validationStatus,
  })

  await setDoc(
    docRef,
    {
      indicadores,
      scoreNosis,
      scoreSource,
      validationStatus,
      indicadoresConfirmados: validationStatus === "confirmed",
      updatedAt: serverTimestamp(),
      confirmadoPor: usuario || "desconocido",
      ...(!USE_FIREBASE_STORAGE
        ? { storageDisabled: true, processedLocally: true }
        : {}),
    },
    { merge: true }
  )

  return { scoreNosis, validationStatus }
}
