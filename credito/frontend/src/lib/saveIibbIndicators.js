import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/service/firebase"
import {
  formValuesToIibbFirestore,
  withIibbScoringAliases,
} from "@/lib/iibbIndicators"
import { ensureEmpresaDocument } from "@/lib/uploadFinancialDocument"
import { isPendingFiscalId } from "@/lib/fiscalLocalUpload"

/**
 * @param {string} cuit
 * @param {import("@/lib/iibbIndicators").IibbIndicatorsFormValues} values
 * @param {{
 *   usuario?: string | null;
 *   indicatorsSource?: "manual" | "excel" | "pdf";
 *   validationStatus?: "draft" | "confirmed";
 *   nombre?: string;
 * }} [options]
 */
export async function createIibbIndicators(cuit, values, options = {}) {
  await ensureEmpresaDocument(cuit)

  const numericPayload = formValuesToIibbFirestore(values)
  const payload = withIibbScoringAliases(numericPayload)
  const validationStatus = options.validationStatus ?? "confirmed"

  const firestoreData = {
    ...payload,
    nombre: options.nombre ?? "Declaración IIBB",
    tipoDocumento: "iibb",
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
    collection(db, "empresas", cuit, "iibb"),
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
 * @param {import("@/lib/iibbIndicators").IibbIndicatorsFormValues} values
 * @param {{
 *   usuario?: string | null;
 *   indicatorsSource?: "manual" | "excel" | "pdf";
 *   validationStatus?: "draft" | "confirmed";
 *   nombre?: string;
 * }} [options]
 */
export async function saveIibbIndicators(
  cuit,
  docId,
  values,
  options = {}
) {
  if (isPendingFiscalId(docId, "iibb")) {
    return createIibbIndicators(cuit, values, options)
  }

  const numericPayload = formValuesToIibbFirestore(values)
  const payload = withIibbScoringAliases(numericPayload)
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

  await updateDoc(doc(db, "empresas", cuit, "iibb", docId), firestoreUpdate)

  return {
    id: docId,
    cuit,
    ...firestoreUpdate,
    validatedAt:
      validationStatus === "confirmed" ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  }
}
