import { db } from "../lib/firebase-admin.js";
import { CANONICAL, LEGACY } from "./firestore-paths.js";
import {
  empresaRef,
  hasRows,
  normalizeCuit,
  snapshotToPlainRows,
} from "./firestore-repository.utils.js";

/**
 * Balances para calificación (lista de filas sin id, compatible con getLatestBalance).
 * Canónico: empresas/{cuit}/balances
 * Legacy: balances/{cuit}/items, luego balances where cuit ==
 */

async function readCanonical(cuit) {
  const snap = await empresaRef(cuit)
    .collection(CANONICAL.SUBCOLLECTIONS.BALANCES)
    .get();
  return snapshotToPlainRows(snap);
}

async function readLegacySubcollection(cuit) {
  const snap = await db
    .collection(LEGACY.BALANCES)
    .doc(normalizeCuit(cuit))
    .collection(LEGACY.BALANCE_ITEMS)
    .get();
  return snapshotToPlainRows(snap);
}

async function readLegacyFlatQuery(cuit) {
  const snap = await db
    .collection(LEGACY.BALANCES)
    .where("cuit", "==", normalizeCuit(cuit))
    .get();
  return snapshotToPlainRows(snap);
}

/**
 * @param {string} cuit
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function listBalancesByCuit(cuit) {
  const canonical = await readCanonical(cuit);
  if (hasRows(canonical)) {
    return canonical;
  }

  const legacyItems = await readLegacySubcollection(cuit);
  if (hasRows(legacyItems)) {
    return legacyItems;
  }

  return readLegacyFlatQuery(cuit);
}
