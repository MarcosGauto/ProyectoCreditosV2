import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/service/firebase"
import { createDefaultCreditPolicy } from "@/lib/creditPolicy/defaultCreditPolicy"
import { resolveCreditPolicy } from "@/lib/creditPolicy/resolveCreditPolicy"

/** @typedef {import("./creditPolicyTypes").CreditPolicy} CreditPolicy */

export const CREDIT_POLICY_COLLECTION = "credit_policy"
export const ACTIVE_CREDIT_POLICY_ID = "active_policy"

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function timestampToIso(value) {
  if (!value) {
    return null
  }
  if (typeof value === "string") {
    return value
  }
  if (
    typeof value === "object" &&
    value !== null &&
    typeof /** @type {{ toDate?: () => Date }} */ (value).toDate === "function"
  ) {
    return /** @type {{ toDate: () => Date }} */ (value).toDate().toISOString()
  }
  return null
}

/**
 * @returns {Promise<CreditPolicy>}
 */
export async function fetchActiveCreditPolicy() {
  const ref = doc(db, CREDIT_POLICY_COLLECTION, ACTIVE_CREDIT_POLICY_ID)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    return createDefaultCreditPolicy()
  }

  return resolveCreditPolicy({
    id: snap.id,
    ...snap.data(),
  })
}

/**
 * @param {CreditPolicy} policy
 * @param {string | null | undefined} updatedBy
 * @returns {Promise<CreditPolicy>}
 */
export async function saveActiveCreditPolicy(policy, updatedBy = null) {
  const normalized = resolveCreditPolicy(policy)
  const ref = doc(db, CREDIT_POLICY_COLLECTION, ACTIVE_CREDIT_POLICY_ID)

  const payload = {
    id: ACTIVE_CREDIT_POLICY_ID,
    version: normalized.version,
    estadoGeneral: normalized.estadoGeneral,
    indicadoresFinancieros: normalized.indicadoresFinancieros,
    reglasCobertura: normalized.reglasCobertura,
    reglasCredito: normalized.reglasCredito,
    configuracionNosis: normalized.configuracionNosis,
    textos: normalized.textos,
    updatedAt: serverTimestamp(),
    updatedBy: updatedBy ?? "desconocido",
  }

  await setDoc(ref, payload, { merge: true })

  const saved = await getDoc(ref)
  const data = saved.exists() ? saved.data() : payload

  return resolveCreditPolicy({
    ...data,
    updatedAt: timestampToIso(data.updatedAt),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : updatedBy,
  })
}

/**
 * @param {string | null | undefined} updatedBy
 * @returns {Promise<CreditPolicy>}
 */
export async function resetActiveCreditPolicy(updatedBy = null) {
  const defaults = createDefaultCreditPolicy()
  return saveActiveCreditPolicy(defaults, updatedBy)
}
