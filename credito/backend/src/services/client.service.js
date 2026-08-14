import "../admin.js";
import { db } from "../lib/firebase-admin.js";

const COLLECTION = "clients";

/**
 * @param {unknown} cuit
 * @returns {string}
 */
function docId(cuit) {
  return String(cuit);
}

/**
 * Quita claves con valor `undefined` (Firestore Admin no los acepta en update/set).
 * @param {Record<string, unknown>} data
 */
function sanitizeForWrite(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

/**
 * @param {import("firebase-admin/firestore").DocumentSnapshot} snap
 */
function snapshotToClient(snap) {
  return { id: snap.id, ...snap.data() };
}

/**
 * @param {string} cuit
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getByCuit(cuit) {
  const snap = await db.collection(COLLECTION).doc(docId(cuit)).get();
  if (!snap.exists) {
    return null;
  }
  return snapshotToClient(snap);
}

/**
 * @param {string} cuit
 * @param {Record<string, unknown>} data
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function update(cuit, data) {
  const ref = db.collection(COLLECTION).doc(docId(cuit));
  const existing = await ref.get();
  if (!existing.exists) {
    return null;
  }

  const payload = sanitizeForWrite(data);
  if (Object.keys(payload).length === 0) {
    return snapshotToClient(existing);
  }

  await ref.update(payload);
  const after = await ref.get();
  return snapshotToClient(after);
}

/**
 * @param {string} cuit
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function remove(cuit) {
  const ref = db.collection(COLLECTION).doc(docId(cuit));
  const snap = await ref.get();
  if (!snap.exists) {
    return null;
  }

  const removed = snapshotToClient(snap);
  await ref.delete();
  return removed;
}
