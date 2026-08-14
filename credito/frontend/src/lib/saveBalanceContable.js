import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/service/firebase"
import { ensureEmpresaDocument } from "@/lib/uploadFinancialDocument"
import {
  BALANCE_CONTABLE_DOC_ID,
  BALANCE_CONTABLE_SCHEMA_VERSION,
} from "@/lib/balanceContableModel"
import { buildInflationDataPayload } from "@/lib/inflation/balanceInflation"

/**
 * @param {string} cuit
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc} data
 * @param {{
 *   usuario?: string | null;
 *   validationStatus?: "draft" | "confirmed";
 *   indicatorsSource?: "manual" | "excel" | "pdf";
 *   inflationActual?: import("@/lib/inflation/balanceInflation").InflationFactorResult | null;
 *   inflationAnterior?: import("@/lib/inflation/balanceInflation").InflationFactorResult | null;
 * }} [options]
 */
export async function saveBalanceContable(cuit, data, options = {}) {
  await ensureEmpresaDocument(cuit)

  const validationStatus = options.validationStatus ?? "confirmed"
  const inflationDataActual = options.inflationActual
    ? buildInflationDataPayload(options.inflationActual)
    : data.inflationDataActual ?? null
  const inflationDataAnterior = options.inflationAnterior
    ? buildInflationDataPayload(options.inflationAnterior)
    : data.inflationDataAnterior ?? null

  const payload = {
    ...data,
    schemaVersion: BALANCE_CONTABLE_SCHEMA_VERSION,
    tipoDocumento: "balances",
    cuit,
    validationStatus,
    indicatorsSource: options.indicatorsSource ?? data.indicatorsSource ?? "manual",
    usuario: options.usuario || "desconocido",
    inflationDataActual,
    inflationDataAnterior,
    factorActualizacionActual: inflationDataActual?.factor ?? null,
    factorActualizacionAnterior: inflationDataAnterior?.factor ?? null,
    storageDisabled: true,
    updatedAt: serverTimestamp(),
  }

  if (!data.fechaCarga) {
    payload.fechaCarga = serverTimestamp()
  }

  if (validationStatus === "confirmed") {
    payload.validatedBy = options.usuario || "desconocido"
    payload.validatedAt = serverTimestamp()
  }

  const docRef = doc(db, "empresas", cuit, "balances", BALANCE_CONTABLE_DOC_ID)
  await setDoc(docRef, payload, { merge: true })

  return {
    id: BALANCE_CONTABLE_DOC_ID,
    ...payload,
    updatedAt: new Date().toISOString(),
    validatedAt:
      validationStatus === "confirmed" ? new Date().toISOString() : null,
  }
}
