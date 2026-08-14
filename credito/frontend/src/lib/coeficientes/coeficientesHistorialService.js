import { db } from "@/service/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import {
  COEFICIENTES_HISTORIAL_COLLECTION,
  parseHistorialDoc,
} from "@/lib/coeficientes/coeficientesHistorialModel";
import {
  buildConsumoHistorialPayload,
  buildEmpresasHistorialPayload,
} from "@/lib/coeficientes/coeficientesHistorialSnapshot";
import { fetchCoeficientesGlobales } from "@/lib/coeficientes/coeficientesNucleoService";
import {
  COEFICIENTES_IMPORTACIONES_COLLECTION,
  normalizeCardName,
  parseImportacionDoc,
} from "@/lib/coeficientes/coeficientesVigentesModel";
import { COEFICIENTES_EMPRESAS_FINANCIACION_COLLECTION } from "@/lib/coeficientes/coeficientesEmpresasModel";
import { parseEmpresaFinanciacionDoc } from "@/lib/coeficientes/coeficientesEmpresasModel";
import { normalizeTarjetaCodigo } from "@/lib/coeficientes/coeficientesTarjetasModel";

function historialCol() {
  return collection(db, COEFICIENTES_HISTORIAL_COLLECTION);
}

function importacionesCol() {
  return collection(db, COEFICIENTES_IMPORTACIONES_COLLECTION);
}

function empresasCol() {
  return collection(db, COEFICIENTES_EMPRESAS_FINANCIACION_COLLECTION);
}

/**
 * @param {(list: import("./coeficientesHistorialModel").CoeficientesHistorialEntry[]) => void} onChange
 */
export function subscribeHistorialVigencias(onChange) {
  const q = query(historialCol(), orderBy("fechaCreacion", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => parseHistorialDoc(d.id, d.data()));
      onChange(list);
    },
    (err) => {
      console.error("[coeficientesHistorial] subscribe", err);
      onChange([]);
    }
  );
}

/**
 * @returns {Promise<import("./coeficientesHistorialModel").CoeficientesHistorialEntry[]>}
 */
export async function fetchHistorialVigencias() {
  const snap = await getDocs(query(historialCol(), orderBy("fechaCreacion", "desc")));
  return snap.docs.map((d) => parseHistorialDoc(d.id, d.data()));
}

/**
 * @param {string} id
 */
export async function fetchHistorialById(id) {
  const snap = await getDoc(doc(historialCol(), id));
  if (!snap.exists()) return null;
  return parseHistorialDoc(snap.id, snap.data());
}

/**
 * @param {Record<string, unknown>} payload
 */
async function writeHistorialEntry(payload) {
  const ref = doc(historialCol());
  await setDoc(ref, {
    ...payload,
    fechaCreacion: serverTimestamp(),
  });
  return ref.id;
}

/**
 * @returns {Promise<import("./coeficientesVigentesModel").CoeficienteImportacion[]>}
 */
async function fetchImportacionesList() {
  const snap = await getDocs(importacionesCol());
  return snap.docs.map((d) => parseImportacionDoc(d.id, d.data()));
}

/**
 * Archiva el estado vigente de consumo antes de aplicar una nueva vigencia.
 *
 * @param {{
 *   usuario?: string | null;
 *   origen: import("./coeficientesHistorialModel").CoeficientesHistorialOrigen;
 *   observaciones?: string | null;
 *   historialOrigenId?: string | null;
 * }} meta
 * @returns {Promise<string | null>}
 */
export async function archiveConsumoVigenciaBeforeChange(meta) {
  const importaciones = await fetchImportacionesList();
  const { globales } = await fetchCoeficientesGlobales();
  const payload = buildConsumoHistorialPayload(importaciones, globales);
  if (!payload) return null;

  return writeHistorialEntry({
    fechaVigencia: payload.fechaVigencia,
    usuario: meta.usuario ?? null,
    tipo: payload.tipo,
    origen: meta.origen,
    observaciones: meta.observaciones ?? null,
    tarjetaCount: payload.tarjetaCount,
    coeficienteCount: payload.coeficienteCount,
    coeficientes: payload.coeficientes,
    importacionesSnapshot: payload.importacionesSnapshot,
    globalesSnapshot: payload.globalesSnapshot,
    historialOrigenId: meta.historialOrigenId ?? null,
  });
}

/**
 * @returns {Promise<import("./coeficientesEmpresasModel").EmpresaFinanciacion[]>}
 */
async function fetchEmpresasFinanciacion() {
  const snap = await getDocs(empresasCol());
  return snap.docs.map((d) => parseEmpresaFinanciacionDoc(d.id, d.data()));
}

/**
 * @param {{
 *   usuario?: string | null;
 *   origen: import("./coeficientesHistorialModel").CoeficientesHistorialOrigen;
 *   observaciones?: string | null;
 *   historialOrigenId?: string | null;
 * }} meta
 * @returns {Promise<string | null>}
 */
export async function archiveEmpresasVigenciaBeforeChange(meta) {
  const financiaciones = await fetchEmpresasFinanciacion();
  const payload = buildEmpresasHistorialPayload(financiaciones);
  if (!payload) return null;

  return writeHistorialEntry({
    fechaVigencia: payload.fechaVigencia,
    usuario: meta.usuario ?? null,
    tipo: payload.tipo,
    origen: meta.origen,
    observaciones: meta.observaciones ?? null,
    tarjetaCount: payload.tarjetaCount,
    coeficienteCount: payload.coeficienteCount,
    coeficientes: payload.coeficientes,
    empresasSnapshot: payload.empresasSnapshot,
    globalesSnapshot: null,
    historialOrigenId: meta.historialOrigenId ?? null,
  });
}

/**
 * Desactiva importaciones activas de una tarjeta (uso interno restauración).
 * @param {string} tarjeta
 */
async function deactivateActiveImportsForCard(tarjeta) {
  const normalized = normalizeCardName(tarjeta);
  const snap = await getDocs(importacionesCol());
  const batch = writeBatch(db);
  let pending = 0;

  snap.docs.forEach((d) => {
    const data = d.data();
    if (
      normalizeCardName(data.tarjeta) === normalized &&
      data.estado === "activa"
    ) {
      batch.update(d.ref, { estado: "historica" });
      pending += 1;
    }
  });

  if (pending > 0) {
    await batch.commit();
  }
}

/**
 * Restaura una vigencia histórica como nueva vigencia (sin modificar el registro histórico).
 *
 * @param {string} historialId
 * @param {{ usuario?: string | null; vigenciaDesde?: string | null }} options
 */
export async function restoreVigenciaFromHistorial(historialId, options = {}) {
  const entry = await fetchHistorialById(historialId);
  if (!entry) {
    throw new Error("Registro de historial no encontrado.");
  }

  const vigenciaDesde =
    options.vigenciaDesde ??
    new Date().toISOString().slice(0, 10);

  if (entry.tipo === "Consumo") {
    if (!entry.importacionesSnapshot?.length) {
      throw new Error("El registro histórico no contiene datos restaurables.");
    }

    await archiveConsumoVigenciaBeforeChange({
      usuario: options.usuario ?? null,
      origen: "Restauración",
      observaciones: `Estado previo a restaurar vigencia del ${entry.fechaVigencia ?? "—"} (historial ${historialId})`,
      historialOrigenId: historialId,
    });

    for (const snap of entry.importacionesSnapshot) {
      const tarjeta = normalizeCardName(snap.tarjeta);
      if (!tarjeta || !snap.records?.length) continue;

      await deactivateActiveImportsForCard(tarjeta);

      const ref = doc(importacionesCol());
      await setDoc(ref, {
        tarjeta,
        records: snap.records,
        recordCount: snap.records.length,
        vigenciaDesde: snap.vigenciaDesde ?? vigenciaDesde,
        importedBy: options.usuario ?? null,
        importedAt: serverTimestamp(),
        estado: "activa",
        interesAdicionalGlobal: entry.globalesSnapshot?.interes ?? null,
        restauradoDesdeHistorialId: historialId,
      });
    }

    return;
  }

  if (!entry.empresasSnapshot?.length) {
    throw new Error("El registro histórico no contiene datos restaurables.");
  }

  await archiveEmpresasVigenciaBeforeChange({
    usuario: options.usuario ?? null,
    origen: "Restauración",
    observaciones: `Estado previo a restaurar vigencia del ${entry.fechaVigencia ?? "—"} (historial ${historialId})`,
    historialOrigenId: historialId,
  });

  for (const snap of entry.empresasSnapshot) {
    const productoCodigo = normalizeTarjetaCodigo(snap.productoCodigo);
    if (!productoCodigo || !snap.lineas?.length) continue;

    await setDoc(
      doc(empresasCol(), productoCodigo),
      {
        productoCodigo,
        lineas: snap.lineas.map((l, idx) => ({
          id: normalizeTarjetaCodigo(l.id) || `${productoCodigo}_${idx + 1}`,
          nombre: String(l.nombre ?? "").trim(),
          plazo: String(l.plazo ?? "").trim(),
          tna: Number(l.tna) || 0,
          comision: Number(l.comision) || 0,
          observaciones: String(l.observaciones ?? "").trim(),
          orden: Number.isFinite(Number(l.orden)) ? Number(l.orden) : idx + 1,
          activo: l.activo !== false,
        })),
        vigenciaDesde: snap.vigenciaDesde ?? vigenciaDesde,
        estado: "activa",
        updatedAt: serverTimestamp(),
        updatedBy: options.usuario ?? null,
        restauradoDesdeHistorialId: historialId,
      },
      { merge: true }
    );
  }
}
