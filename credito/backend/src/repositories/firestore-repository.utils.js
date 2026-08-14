import "../admin.js";
import { db } from "../lib/firebase-admin.js";
import { CANONICAL } from "./firestore-paths.js";

/**
 * @param {unknown} cuit
 * @returns {string}
 */
export function normalizeCuit(cuit) {
  return String(cuit);
}

/**
 * @param {string} cuit
 * @returns {import("firebase-admin/firestore").DocumentReference}
 */
export function empresaRef(cuit) {
  return db.collection(CANONICAL.EMPRESAS).doc(normalizeCuit(cuit));
}

/**
 * @param {import("firebase-admin/firestore").QuerySnapshot} snap
 * @returns {Record<string, unknown>[]}
 */
export function snapshotToPlainRows(snap) {
  return snap.docs.map((d) => d.data());
}

/**
 * @param {import("firebase-admin/firestore").DocumentSnapshot} snap
 * @returns {Record<string, unknown> | null}
 */
export function snapshotToPlainDoc(snap) {
  return snap.exists ? snap.data() : null;
}

/**
 * @param {Record<string, unknown>[]} rows
 * @returns {boolean}
 */
export function hasRows(rows) {
  return Array.isArray(rows) && rows.length > 0;
}
