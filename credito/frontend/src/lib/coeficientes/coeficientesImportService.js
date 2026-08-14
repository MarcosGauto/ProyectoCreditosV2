import { db } from "@/service/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import {
  COEFICIENTES_NUCLEO_DOC_PATH,
  parseCoeficientesGlobales,
} from "@/lib/coeficientes/coeficientesNucleoModel";
import {
  buildStoredRecords,
} from "@/lib/coeficientes/coeficientesCalculo";
import {
  COEFICIENTES_IMPORTACIONES_COLLECTION,
  migrateLegacyCoefficients,
  normalizeCardName,
  normalizeCuotasLabel,
  parseImportacionDoc,
  sortImportRecords,
} from "@/lib/coeficientes/coeficientesVigentesModel";
import { cuotasPlanMatch, findImportRecordForPlan } from "@/lib/coeficientes/coeficientesTarjetaPlanesModel";
import { CUOTA_YA_EXISTE_ERROR, formatPlanLabelFromCuotas } from "@/lib/coeficientes/coeficientesCuotaManualModel";
import {
  ensureTarjetaPlanDefinition,
  removeTarjetaPlanDefinition,
} from "@/lib/coeficientes/coeficientesTarjetasService";
import { getTarjetasCache } from "@/lib/coeficientes/coeficientesTarjetasCache";
import { isRawBaseTarjeta, isCoefFinalDirectoTarjeta, isManualTarjeta } from "@/lib/coeficientes/coeficientesTarjetasModel";
import { archiveConsumoVigenciaBeforeChange } from "@/lib/coeficientes/coeficientesHistorialService";
import { normalizeHistorialOrigen } from "@/lib/coeficientes/coeficientesHistorialModel";
import {
  appendCuotaComercialVisible,
  removeCuotaComercialVisibleIfGloballyInactive,
} from "@/lib/coeficientes/coeficientesComercialCuotasService";

function nucleoRef() {
  return doc(db, ...COEFICIENTES_NUCLEO_DOC_PATH);
}

function importacionesCol() {
  return collection(db, COEFICIENTES_IMPORTACIONES_COLLECTION);
}

/**
 * @returns {Promise<number>}
 */
export async function fetchBasePrice() {
  const snap = await getDoc(nucleoRef());
  if (!snap.exists()) return 1000;
  const data = snap.data();
  const n = Number(data.basePrice);
  return Number.isFinite(n) ? n : 1000;
}

/**
 * @param {number} basePrice
 */
export async function saveBasePrice(basePrice) {
  await setDoc(
    nucleoRef(),
    { basePrice: Number(basePrice) || 0, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * @param {(list: import("./coeficientesVigentesModel").CoeficienteImportacion[]) => void} onChange
 */
export function subscribeImportaciones(onChange) {
  return onSnapshot(importacionesCol(), (snap) => {
    const list = snap.docs.map((d) => parseImportacionDoc(d.id, d.data()));
    list.sort((a, b) => {
      const ta = a.importedAt ? new Date(a.importedAt).getTime() : 0;
      const tb = b.importedAt ? new Date(b.importedAt).getTime() : 0;
      return tb - ta;
    });
    onChange(list);
  });
}

/**
 * @returns {Promise<import("./coeficientesVigentesModel").CoeficienteImportacion[]>}
 */
export async function fetchImportaciones() {
  const snap = await getDocs(importacionesCol());
  const list = snap.docs.map((d) => parseImportacionDoc(d.id, d.data()));
  list.sort((a, b) => {
    const ta = a.importedAt ? new Date(a.importedAt).getTime() : 0;
    const tb = b.importedAt ? new Date(b.importedAt).getTime() : 0;
    return tb - ta;
  });
  return list;
}

/**
 * @param {string} id
 */
export async function fetchImportacionById(id) {
  const snap = await getDoc(doc(importacionesCol(), id));
  if (!snap.exists()) return null;
  return parseImportacionDoc(snap.id, snap.data());
}

/**
 * Desactiva importaciones activas previas de la misma tarjeta.
 *
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
 * @param {{
 *   tarjeta: string;
 *   records: import("./coeficientesVigentesModel").CoeficienteImportRecord[];
 *   vigenciaDesde: string;
 *   importedBy?: string | null;
 *   globales: import("./coeficientesCalculo").CoeficientesGlobales;
 *   origen?: import("./coeficientesHistorialModel").CoeficientesHistorialOrigen;
 *   observaciones?: string | null;
 * }} payload
 */
export async function saveImportacion(payload) {
  const tarjeta = normalizeCardName(payload.tarjeta);
  const sortedInput = sortImportRecords(
    payload.records.map((r) => ({
      cuotas: r.cuotas,
      coeficienteBase: r.coeficienteBase,
    }))
  );

  const records = isRawBaseImportAcquirer(tarjeta)
    ? sortedInput.map((r) => ({
        cuotas: r.cuotas,
        coeficienteBase: r.coeficienteBase,
      }))
    : buildStoredRecords(sortedInput, payload.globales);

  if (!tarjeta) {
    throw new Error("Debe indicar la tarjeta.");
  }
  if (!records.length) {
    throw new Error("No hay registros para importar.");
  }

  const origen = normalizeHistorialOrigen(payload.origen ?? "Edición Manual");
  const observaciones =
    payload.observaciones ??
    `Nueva vigencia ${tarjeta} desde ${payload.vigenciaDesde || "—"}`;

  await archiveConsumoVigenciaBeforeChange({
    usuario: payload.importedBy ?? null,
    origen,
    observaciones,
  });

  await deactivateActiveImportsForCard(tarjeta);

  const ref = doc(importacionesCol());
  await setDoc(ref, {
    tarjeta,
    records,
    recordCount: records.length,
    vigenciaDesde: payload.vigenciaDesde || null,
    importedBy: payload.importedBy ?? null,
    importedAt: serverTimestamp(),
    estado: "activa",
    interesAdicionalGlobal: payload.globales.interes,
  });

  return ref.id;
}

/**
 * Completa o actualiza un único plan/cuota en la importación vigente (sin reimportar el archivo).
 *
 * @param {{
 *   importId: string;
 *   tarjeta: string;
 *   cuotas: string | number;
 *   coeficienteBase: number;
 *   globales: import("./coeficientesCalculo").CoeficientesGlobales;
 *   importedBy?: string | null;
 *   activo?: boolean;
 * }} payload
 */
export async function upsertImportacionRecord(payload) {
  const tarjeta = normalizeCardName(payload.tarjeta);
  const normalizedCuotas = normalizeCuotasLabel(payload.cuotas);
  const coeficienteBase = Number(payload.coeficienteBase);

  if (!tarjeta) {
    throw new Error("Debe indicar la tarjeta.");
  }
  if (!Number.isFinite(coeficienteBase) || coeficienteBase <= 0) {
    throw new Error("Ingrese un coeficiente base válido.");
  }

  const snap = await getDoc(doc(importacionesCol(), payload.importId));
  if (!snap.exists()) {
    throw new Error("Importación no encontrada.");
  }

  const current = parseImportacionDoc(snap.id, snap.data());
  if (current.estado !== "activa") {
    throw new Error("Solo se puede editar la importación vigente.");
  }
  if (normalizeCardName(current.tarjeta) !== tarjeta) {
    throw new Error("La importación no corresponde a esta tarjeta.");
  }

  /** @type {import("./coeficientesVigentesModel").CoeficienteImportRecord[]} */
  let records = [...current.records];
  const idx = records.findIndex((r) =>
    cuotasPlanMatch(r.cuotas, normalizedCuotas)
  );

  const inputRecord = { cuotas: normalizedCuotas, coeficienteBase };
  const storedBase = isRawBaseImportAcquirer(tarjeta)
    ? inputRecord
    : buildStoredRecords([inputRecord], payload.globales)[0];

  const stored = {
    ...storedBase,
    activo: payload.activo === false ? false : true,
  };

  if (idx >= 0) {
    records[idx] = stored;
  } else {
    records.push(stored);
  }

  records = sortImportRecords(records);

  await setDoc(
    doc(importacionesCol(), payload.importId),
    {
      records,
      recordCount: records.length,
      importedAt: serverTimestamp(),
      ...(payload.importedBy ? { importedBy: payload.importedBy } : {}),
    },
    { merge: true }
  );

  if (idx < 0 && stored.activo !== false) {
    await appendCuotaComercialVisible(normalizedCuotas, payload.importedBy ?? null);
  }

  if (stored.activo !== false) {
    await ensureTarjetaPlanDefinition(
      tarjeta,
      {
        cuotas: normalizedCuotas,
        label: formatPlanLabelFromCuotas(normalizedCuotas),
      },
      payload.importedBy ?? null
    );
  }
}

/**
 * @param {{
 *   importId: string;
 *   tarjeta: string;
 *   cuotas: string | number;
 *   activo: boolean;
 *   importedBy?: string | null;
 * }} payload
 */
export async function setImportacionRecordActivo(payload) {
  const tarjeta = normalizeCardName(payload.tarjeta);
  const normalizedCuotas = normalizeCuotasLabel(payload.cuotas);

  const snap = await getDoc(doc(importacionesCol(), payload.importId));
  if (!snap.exists()) {
    throw new Error("Importación no encontrada.");
  }

  const current = parseImportacionDoc(snap.id, snap.data());
  if (current.estado !== "activa") {
    throw new Error("Solo se puede editar la importación vigente.");
  }

  const idx = current.records.findIndex((r) =>
    cuotasPlanMatch(r.cuotas, normalizedCuotas)
  );
  if (idx < 0) {
    throw new Error("Cuota no encontrada.");
  }

  const records = [...current.records];
  records[idx] = {
    ...records[idx],
    activo: payload.activo === true,
  };

  await setDoc(
    doc(importacionesCol(), payload.importId),
    {
      records,
      importedAt: serverTimestamp(),
      ...(payload.importedBy ? { importedBy: payload.importedBy } : {}),
    },
    { merge: true }
  );

  const all = await fetchImportaciones();
  if (payload.activo) {
    await ensureTarjetaPlanDefinition(
      tarjeta,
      {
        cuotas: normalizedCuotas,
        label: formatPlanLabelFromCuotas(normalizedCuotas),
      },
      payload.importedBy ?? null
    );
    await appendCuotaComercialVisible(normalizedCuotas, payload.importedBy ?? null);
  } else {
    await removeCuotaComercialVisibleIfGloballyInactive(
      normalizedCuotas,
      all,
      payload.importedBy ?? null
    );
  }
}

/**
 * @param {{
 *   importId: string;
 *   tarjeta: string;
 *   cuotas: string | number;
 *   importedBy?: string | null;
 * }} payload
 */
export async function deleteImportacionRecord(payload) {
  const tarjeta = normalizeCardName(payload.tarjeta);
  const normalizedCuotas = normalizeCuotasLabel(payload.cuotas);

  const snap = await getDoc(doc(importacionesCol(), payload.importId));
  if (!snap.exists()) {
    throw new Error("Importación no encontrada.");
  }

  const current = parseImportacionDoc(snap.id, snap.data());
  if (current.estado !== "activa") {
    throw new Error("Solo se puede editar la importación vigente.");
  }

  const records = current.records.filter(
    (r) => !cuotasPlanMatch(r.cuotas, normalizedCuotas)
  );

  if (records.length === current.records.length) {
    throw new Error("Cuota no encontrada.");
  }

  await setDoc(
    doc(importacionesCol(), payload.importId),
    {
      records: sortImportRecords(records),
      recordCount: records.length,
      importedAt: serverTimestamp(),
      ...(payload.importedBy ? { importedBy: payload.importedBy } : {}),
    },
    { merge: true }
  );

  await removeTarjetaPlanDefinition(tarjeta, normalizedCuotas, payload.importedBy ?? null);

  const all = await fetchImportaciones();
  await removeCuotaComercialVisibleIfGloballyInactive(
    normalizedCuotas,
    all,
    payload.importedBy ?? null
  );
}

/**
 * Alta manual de cuota en la importación vigente (misma colección que importaciones).
 *
 * @param {{
 *   tarjeta: string;
 *   cuotas: string | number;
 *   planLabel: string;
 *   coeficienteBase: number;
 *   activo?: boolean;
 *   globales: import("./coeficientesCalculo").CoeficientesGlobales;
 *   importedBy?: string | null;
 * }} payload
 */
export async function saveManualCuotaPlan(payload) {
  const tarjeta = normalizeCardName(payload.tarjeta);
  const normalizedCuotas = normalizeCuotasLabel(payload.cuotas);
  const coeficienteBase = Number(payload.coeficienteBase);

  if (!tarjeta) {
    throw new Error("Seleccione una tarjeta.");
  }
  if (!Number.isFinite(coeficienteBase) || coeficienteBase <= 0) {
    throw new Error("Ingrese un coeficiente base válido.");
  }

  const all = await fetchImportaciones();
  const active = all.find(
    (imp) => imp.tarjeta === tarjeta && imp.estado === "activa"
  );

  if (active) {
    const exists = findImportRecordForPlan(active.records, normalizedCuotas);
    if (exists) {
      throw new Error(CUOTA_YA_EXISTE_ERROR);
    }

    await upsertImportacionRecord({
      importId: active.id,
      tarjeta,
      cuotas: normalizedCuotas,
      coeficienteBase,
      globales: payload.globales,
      importedBy: payload.importedBy ?? null,
      activo: payload.activo !== false,
    });
  } else {
    await saveImportacion({
      tarjeta,
      records: [{ cuotas: normalizedCuotas, coeficienteBase }],
      vigenciaDesde: new Date().toISOString().slice(0, 10),
      importedBy: payload.importedBy ?? null,
      globales: payload.globales,
      origen: "Edición Manual",
      observaciones: `Alta manual de cuota ${payload.planLabel}`,
    });
  }

  await ensureTarjetaPlanDefinition(
    tarjeta,
    { cuotas: normalizedCuotas, label: payload.planLabel },
    payload.importedBy ?? null
  );

  if (payload.activo !== false) {
    await appendCuotaComercialVisible(normalizedCuotas, payload.importedBy ?? null);
  }
}

/**
 * @param {string} tarjeta
 */
export function isRawBaseImportAcquirer(tarjeta) {
  const normalized = normalizeCardName(tarjeta);
  if (!normalized) return false;
  const cache = getTarjetasCache();
  if (isRawBaseTarjeta(normalized, cache)) return true;
  if (isCoefFinalDirectoTarjeta(normalized, cache)) return true;
  return isManualTarjeta(normalized, cache);
}

/**
 * Recalcula registros de todas las importaciones activas al cambiar parámetros globales.
 *
 * @param {import("./coeficientesCalculo").CoeficientesGlobales} globales
 */
export async function recalcularImportacionesActivas(globales) {
  const snap = await getDocs(importacionesCol());
  const batch = writeBatch(db);
  let pending = 0;

  snap.docs.forEach((d) => {
    const data = d.data();
    if (data.estado !== "activa" || !Array.isArray(data.records)) {
      return;
    }

    if (isRawBaseImportAcquirer(data.tarjeta)) {
      return;
    }

    const recalculated = buildStoredRecords(
      data.records.map((row) => ({
        cuotas: row.cuotas,
        coeficienteBase:
          normalizeInstallmentKind(row.cuotas) === "FINANCIADO"
            ? row.coeficienteBase
            : 0,
      })),
      globales
    );

    batch.update(d.ref, {
      records: recalculated,
      recordCount: recalculated.length,
      interesAdicionalGlobal: globales.interes,
    });
    pending += 1;
  });

  if (pending > 0) {
    await batch.commit();
  }
}

/**
 * @param {unknown} cuotas
 */
function normalizeInstallmentKind(cuotas) {
  const raw = String(cuotas ?? "")
    .trim()
    .toUpperCase();
  if (raw === "DÉBITO" || raw === "DEBITO") return "ARANCEL";
  if (raw === "1" || raw === "1 CUOTA") return "ARANCEL";
  return "FINANCIADO";
}

/**
 * @param {string} importId
 */
export async function restoreImportacion(importId) {
  const targetSnap = await getDoc(doc(importacionesCol(), importId));
  if (!targetSnap.exists()) {
    throw new Error("Importación no encontrada.");
  }

  const target = parseImportacionDoc(targetSnap.id, targetSnap.data());
  await deactivateActiveImportsForCard(target.tarjeta);

  await setDoc(
    doc(importacionesCol(), importId),
    { estado: "activa" },
    { merge: true }
  );
}

/**
 * Migra datos legacy del documento nucleo si no hay importaciones.
 */
export async function migrateLegacyDataIfNeeded() {
  const existing = await getDocs(importacionesCol());
  if (!existing.empty) return false;

  const nucleoSnap = await getDoc(nucleoRef());
  if (!nucleoSnap.exists()) return false;

  const data = nucleoSnap.data();
  const batches = migrateLegacyCoefficients(data.coefficients);
  if (!batches.length) return false;

  for (const batch of batches) {
    if (!batch.records.length) continue;
    const globales = parseCoeficientesGlobales(data);
    await saveImportacion({
      tarjeta: batch.tarjeta,
      records: batch.records,
      vigenciaDesde: new Date().toISOString().slice(0, 10),
      importedBy: "migración automática",
      globales,
    });
  }

  return true;
}
