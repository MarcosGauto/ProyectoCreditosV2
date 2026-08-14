import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/service/firebase"
import {
  formValuesToIvaFirestore,
  withIvaScoringAliases,
} from "@/lib/ivaIndicators"
import { ensureEmpresaDocument } from "@/lib/uploadFinancialDocument"
import { isPendingFiscalId } from "@/lib/fiscalLocalUpload"

/**
 * @param {string} cuit
 * @param {import("@/lib/ivaIndicators").IvaIndicatorsFormValues} values
 * @param {{
 *   usuario?: string | null;
 *   indicatorsSource?: "manual" | "excel" | "pdf";
 *   validationStatus?: "draft" | "confirmed";
 *   nombre?: string;
 *   coeficiente?: number | null;
 * }} [options]
 */
export async function createIvaIndicators(cuit, values, options = {}) {
  await ensureEmpresaDocument(cuit)

  const numericPayload = formValuesToIvaFirestore(
    values,
    options.coeficiente ?? null
  )
  const payload = withIvaScoringAliases(numericPayload)
  const validationStatus = options.validationStatus ?? "confirmed"

  const firestoreData = {
    ...payload,
    nombre: options.nombre ?? "Declaración IVA",
    tipoDocumento: "iva",
    validationStatus,
    indicatorsSource: options.indicatorsSource ?? "manual",
    usuario: options.usuario || "desconocido",
    fechaCarga: serverTimestamp(),
    storageDisabled: true,
    cuit,
    updatedAt: serverTimestamp(),
  }

  if (validationStatus === "confirmed") {
    firestoreData.validatedBy = options.usuario || "desconocido"
    firestoreData.validatedAt = serverTimestamp()
  }

  const docRef = await addDoc(
    collection(db, "empresas", cuit, "iva"),
    firestoreData
  )

  return {
    id: docRef.id,
    ...firestoreData,
    fechaCarga: new Date().toISOString(),
    validatedAt:
      validationStatus === "confirmed" ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * @param {string} cuit
 * @param {string} docId
 * @param {import("@/lib/ivaIndicators").IvaIndicatorsFormValues} values
 * @param {{
 *   usuario?: string | null;
 *   indicatorsSource?: "manual" | "excel" | "pdf";
 *   validationStatus?: "draft" | "confirmed";
 *   nombre?: string;
 *   coeficiente?: number | null;
 * }} [options]
 */
export async function saveIvaIndicators(
  cuit,
  docId,
  values,
  options = {}
) {
  if (isPendingFiscalId(docId, "iva")) {
    return createIvaIndicators(cuit, values, options)
  }

  const numericPayload = formValuesToIvaFirestore(
    values,
    options.coeficiente ?? null
  )
  const payload = withIvaScoringAliases(numericPayload)
  const validationStatus = options.validationStatus ?? "confirmed"

  const firestoreUpdate = {
    ...payload,
    validationStatus,
    indicatorsSource: options.indicatorsSource ?? "manual",
    storageDisabled: true,
    updatedAt: serverTimestamp(),
  }

  if (validationStatus === "confirmed") {
    firestoreUpdate.validatedBy = options.usuario || "desconocido"
    firestoreUpdate.validatedAt = serverTimestamp()
  }

  await updateDoc(doc(db, "empresas", cuit, "iva", docId), firestoreUpdate)

  return {
    id: docId,
    cuit,
    ...firestoreUpdate,
    validatedAt:
      validationStatus === "confirmed" ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  }
}
