import { db } from "../lib/firebase-admin.js";
import { CANONICAL, LEGACY } from "./firestore-paths.js";
import {
  empresaRef,
  hasRows,
  normalizeCuit,
  snapshotToPlainDoc,
  snapshotToPlainRows,
} from "./firestore-repository.utils.js";

/**
 * Payload fiscal IIBB para scoring (`declaraciones.length`).
 * Canónico: empresas/{cuit}/iibb
 * Legacy: iibb/{cuit} doc, luego iibb where cuit ==
 */

/**
 * @param {Record<string, unknown>[]} rows
 * @returns {{ declaraciones: unknown[] }}
 */
function rowsToFiscalPayload(rows) {
  return { declaraciones: rows };
}

async function readCanonical(cuit) {
  const snap = await empresaRef(cuit)
    .collection(CANONICAL.SUBCOLLECTIONS.IIBB)
    .get();
  const rows = snapshotToPlainRows(snap);
  if (!hasRows(rows)) {
    return null;
  }
  return rowsToFiscalPayload(rows);
}

async function readLegacyDoc(cuit) {
  const snap = await db.collection(LEGACY.IIBB).doc(normalizeCuit(cuit)).get();
  const data = snapshotToPlainDoc(snap);
  if (!data) {
    return null;
  }
  if (Array.isArray(data.declaraciones)) {
    return { declaraciones: data.declaraciones };
  }
  return { declaraciones: [] };
}

async function readLegacyQuery(cuit) {
  const snap = await db
    .collection(LEGACY.IIBB)
    .where("cuit", "==", normalizeCuit(cuit))
    .get();
  const rows = snapshotToPlainRows(snap);
  if (!hasRows(rows)) {
    return null;
  }
  return rowsToFiscalPayload(rows);
}

/**
 * @param {string} cuit
 * @returns {Promise<{ declaraciones: unknown[] } | null>}
 */
export async function getIibbFiscalByCuit(cuit) {
  const canonical = await readCanonical(cuit);
  if (canonical) {
    return canonical;
  }

  const legacyDoc = await readLegacyDoc(cuit);
  if (legacyDoc) {
    return legacyDoc;
  }

  return readLegacyQuery(cuit);
}
