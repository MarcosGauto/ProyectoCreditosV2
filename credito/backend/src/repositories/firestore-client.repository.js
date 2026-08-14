import { db } from "../lib/firebase-admin.js";
import { CANONICAL, LEGACY } from "./firestore-paths.js";
import {
  empresaRef,
  normalizeCuit,
  snapshotToPlainDoc,
} from "./firestore-repository.utils.js";

/**
 * Cliente / empresa por CUIT.
 * Canónico: empresas/{cuit}
 * Legacy: clients/{cuit} (API client.service)
 */

async function readCanonical(cuit) {
  const snap = await empresaRef(cuit).get();
  return snapshotToPlainDoc(snap);
}

async function readLegacy(cuit) {
  const snap = await db.collection(LEGACY.CLIENTS).doc(normalizeCuit(cuit)).get();
  if (!snap.exists) {
    return null;
  }
  return { id: snap.id, ...snap.data() };
}

/**
 * @param {string} cuit
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getClientByCuit(cuit) {
  const canonical = await readCanonical(cuit);
  if (canonical) {
    return canonical;
  }
  return readLegacy(cuit);
}
