import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/service/firebase"
import {
  formValuesToFirestoreNumbers,
  withScoringFieldAliases,
} from "@/lib/balanceIndicators"
import { ensureEmpresaDocument } from "@/lib/uploadFinancialDocument"
import { isPendingBalanceId } from "@/lib/balanceLocalUpload"
import { normalizeBalanceSlot } from "@/lib/balancePairModel"

/**
 * @param {string} cuit
 * @param {import("@/lib/balanceIndicators").BalanceIndicatorsFormValues} values
 * @param {{
 *   usuario?: string | null;
 *   indicatorsSource?: "manual" | "excel" | "pdf";
 *   validationStatus?: "draft" | "confirmed";
 *   nombre?: string;
 *   inflation?: import("@/lib/inflation/balanceInflation").InflationFactorResult | null;
 *   balanceSlot?: "actual" | "anterior" | null;
 * }} options
 * @returns {Promise<Record<string, unknown>>}
 */
export async function createBalanceIndicators(cuit, values, options = {}) {
  await ensureEmpresaDocument(cuit)

  const numericPayload = formValuesToFirestoreNumbers(
    values,
    options.inflation ?? null
  )
  const payload = withScoringFieldAliases(numericPayload)
  const validationStatus = options.validationStatus ?? "confirmed"

  const balanceSlot = normalizeBalanceSlot(options.balanceSlot)

  const firestoreData = {
    ...payload,
    nombre: options.nombre ?? "Balance",
    ...(balanceSlot ? { balanceSlot } : {}),
    tipoDocumento: "balances",
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
    collection(db, "empresas", cuit, "balances"),
    firestoreData
  )

  return {
    id: docRef.id,
    ...firestoreData,
    fechaCarga: new Date().toISOString(),
    validatedAt:
      validationStatus === "confirmed"
        ? new Date().toISOString()
        : null,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * @param {string} cuit
 * @param {string} balanceDocId
 * @param {import("@/lib/balanceIndicators").BalanceIndicatorsFormValues} values
 * @param {{
 *   usuario?: string | null;
 *   indicatorsSource?: "manual" | "excel" | "pdf";
 *   validationStatus?: "draft" | "confirmed";
 *   nombre?: string;
 *   inflation?: import("@/lib/inflation/balanceInflation").InflationFactorResult | null;
 *   balanceSlot?: "actual" | "anterior" | null;
 *   existingBalances?: unknown[];
 * }} [options]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function saveBalanceIndicators(
  cuit,
  balanceDocId,
  values,
  options = {}
) {
  const currentDoc = Array.isArray(options.existingBalances)
    ? options.existingBalances.find(
        (item) => /** @type {{ id?: string }} */ (item).id === balanceDocId
      )
    : null

  const balanceSlot = normalizeBalanceSlot(
    options.balanceSlot ??
      (currentDoc
        ? /** @type {Record<string, unknown>} */ (currentDoc).balanceSlot
        : null)
  )

  if (isPendingBalanceId(balanceDocId)) {
    const existingSameSlot = Array.isArray(options.existingBalances)
      ? options.existingBalances.find(
          (item) =>
            normalizeBalanceSlot(
              /** @type {Record<string, unknown>} */ (item).balanceSlot
            ) === balanceSlot &&
            !isPendingBalanceId(String(/** @type {{ id?: string }} */ (item).id))
        )
      : null

    if (existingSameSlot && /** @type {{ id?: string }} */ (existingSameSlot).id) {
      return saveBalanceIndicators(
        cuit,
        String(/** @type {{ id: string }} */ (existingSameSlot).id),
        values,
        { ...options, balanceSlot }
      )
    }

    return createBalanceIndicators(cuit, values, {
      ...options,
      nombre: options.nombre,
      balanceSlot,
    })
  }

  const numericPayload = formValuesToFirestoreNumbers(
    values,
    options.inflation ?? null
  )
  const payload = withScoringFieldAliases(numericPayload)

  const validationStatus = options.validationStatus ?? "confirmed"

  const firestoreUpdate = {
    ...payload,
    validationStatus,
    indicatorsSource: options.indicatorsSource ?? "manual",
    storageDisabled: true,
    updatedAt: serverTimestamp(),
    ...(balanceSlot ? { balanceSlot } : {}),
  }

  if (validationStatus === "confirmed") {
    firestoreUpdate.validatedBy = options.usuario || "desconocido"
    firestoreUpdate.validatedAt = serverTimestamp()
  }

  await updateDoc(
    doc(db, "empresas", cuit, "balances", balanceDocId),
    firestoreUpdate
  )

  return {
    id: balanceDocId,
    cuit,
    ...firestoreUpdate,
    validatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
