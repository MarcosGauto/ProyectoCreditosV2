import { db } from "../lib/firebase-admin.js";
import { CANONICAL, LEGACY } from "./firestore-paths.js";
import {
  empresaRef,
  hasRows,
  normalizeCuit,
  snapshotToPlainRows,
} from "./firestore-repository.utils.js";

/**
 * Cheques para métricas de rechazo.
 * Canónico: empresas/{cuit}/cheques
 * Legacy: cheques/{cuit}/items
 */

async function readCanonical(cuit) {
  const snap = await empresaRef(cuit)
    .collection(CANONICAL.SUBCOLLECTIONS.CHEQUES)
    .get();
  return snapshotToPlainRows(snap);
}

async function readLegacySubcollection(cuit) {
  const snap = await db
    .collection(LEGACY.CHEQUES)
    .doc(normalizeCuit(cuit))
    .collection(LEGACY.CHEQUE_ITEMS)
    .get();
  return snapshotToPlainRows(snap);
}

/**
 * @param {string} cuit
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function listChequesByCuit(cuit) {
  const canonical = await readCanonical(cuit);
  if (hasRows(canonical)) {
    return canonical;
  }

  return readLegacySubcollection(cuit);
}
