import { db } from "../lib/firebase-admin.js";
import { LEGACY } from "./firestore-paths.js";
import { normalizeCuit, snapshotToPlainDoc } from "./firestore-repository.utils.js";

/**
 * Read model de calificación crediticia.
 * Persistencia actual (legacy/canónica del motor): qualification/{cuit}
 *
 * TODO migración: versionado, historial en subcolección runs, o alias desde results/{cuit}
 */

/**
 * @param {string} cuit
 * @param {Record<string, unknown>} data
 */
export async function saveQualificationByCuit(cuit, data) {
  await db.collection(LEGACY.QUALIFICATION).doc(normalizeCuit(cuit)).set(data);
}

/**
 * @param {string} cuit
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getQualificationByCuit(cuit) {
  const snap = await db.collection(LEGACY.QUALIFICATION).doc(normalizeCuit(cuit)).get();
  return snapshotToPlainDoc(snap);
}
