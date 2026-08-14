import { db } from "../lib/firebase-admin.js";
import { CANONICAL, LEGACY } from "./firestore-paths.js";
import {
  empresaRef,
  normalizeCuit,
  snapshotToPlainDoc,
  snapshotToPlainRows,
} from "./firestore-repository.utils.js";

/**
 * Snapshot BCRA para scoring (`situacion_general`).
 * Canónico: empresas/{cuit}/bcra_reports (último reporte por fetchedAt o createdAt)
 * Legacy: bcra/{cuit}
 */

/**
 * @param {Record<string, unknown>} report
 * @returns {Record<string, unknown> | null}
 */
function reportToScoringShape(report) {
  if (report.situacion_general != null) {
    return { situacion_general: Number(report.situacion_general) || 0 };
  }

  const entidades = Array.isArray(report.entidades) ? report.entidades : [];
  if (entidades.length === 0) {
    return null;
  }

  const maxSituacion = entidades.reduce((max, e) => {
    const s = Number(/** @type {{ situacion?: unknown }} */ (e).situacion) || 1;
    return Math.max(max, s);
  }, 1);

  return { situacion_general: maxSituacion };
}

/**
 * @param {Record<string, unknown>[]} reports
 * @returns {Record<string, unknown> | null}
 */
function pickLatestReport(reports) {
  if (reports.length === 0) {
    return null;
  }

  const sorted = [...reports].sort((a, b) => {
    const ta = Number(a.fetchedAt ?? a.createdAt ?? 0);
    const tb = Number(b.fetchedAt ?? b.createdAt ?? 0);
    return tb - ta;
  });

  return sorted[0];
}

async function readCanonical(cuit) {
  const snap = await empresaRef(cuit)
    .collection(CANONICAL.SUBCOLLECTIONS.BCRA_REPORTS)
    .get();
  const reports = snapshotToPlainRows(snap);
  const latest = pickLatestReport(reports);
  if (!latest) {
    return null;
  }
  return reportToScoringShape(latest);
}

async function readLegacy(cuit) {
  const snap = await db.collection(LEGACY.BCRA).doc(normalizeCuit(cuit)).get();
  const data = snapshotToPlainDoc(snap);
  if (!data) {
    return null;
  }
  return reportToScoringShape(data) ?? data;
}

/**
 * @param {string} cuit
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getBcraByCuit(cuit) {
  const canonical = await readCanonical(cuit);
  if (canonical) {
    return canonical;
  }

  return readLegacy(cuit);
}
