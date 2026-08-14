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

import { setTarjetasCache } from "@/lib/coeficientes/coeficientesTarjetasCache";
import { COEFICIENTES_TARJETAS_SEED } from "@/lib/coeficientes/coeficientesTarjetasSeed";
import { COEFICIENTES_EMPRESAS_TARJETAS_SEED } from "@/lib/coeficientes/coeficientesEmpresasSeed";
import { seedEmpresasFinanciacionIfMissing } from "@/lib/coeficientes/coeficientesEmpresasService";
import { formatPlanLabelFromCuotas } from "@/lib/coeficientes/coeficientesCuotaManualModel";
import {
  cuotasPlanMatch,
  DEFAULT_IMPORT_PLANES_BY_CODIGO,
  getTarjetaPlanesEsperados,
  tarjetaPermiteCuotaComercial,
} from "@/lib/coeficientes/coeficientesTarjetaPlanesModel";
import { compareCuotas, normalizeCuotasLabel } from "@/lib/coeficientes/coeficientesVigentesModel";
import {
  COEFICIENTES_TARJETAS_COLLECTION,
  normalizeTarjetaCodigo,
  parseTarjetaDoc,
  sortTarjetas,
} from "@/lib/coeficientes/coeficientesTarjetasModel";

function tarjetasCol() {
  return collection(db, COEFICIENTES_TARJETAS_COLLECTION);
}

/**
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} list
 */
function publishCache(list) {
  setTarjetasCache(list);
}

/**
 * @returns {Promise<boolean>}
 */
export async function seedDefaultTarjetasIfEmpty() {
  const snap = await getDocs(tarjetasCol());
  if (!snap.empty) return false;

  const batch = writeBatch(db);
  for (const item of COEFICIENTES_TARJETAS_SEED) {
    const codigo = normalizeTarjetaCodigo(item.codigo);
    const ref = doc(tarjetasCol(), codigo);
    batch.set(ref, {
      ...item,
      codigo,
      categoria: item.categoria ?? "CONSUMO",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return true;
}

/**
 * Agrega productos EMPRESAS al catálogo si aún no existen.
 */
export async function seedMissingEmpresasTarjetas() {
  const snap = await getDocs(tarjetasCol());
  const existing = new Set(snap.docs.map((d) => d.id));

  for (const item of COEFICIENTES_EMPRESAS_TARJETAS_SEED) {
    const codigo = normalizeTarjetaCodigo(item.codigo);
    if (existing.has(codigo)) continue;

    await setDoc(doc(tarjetasCol(), codigo), {
      ...item,
      codigo,
      categoria: "EMPRESAS",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * @param {(list: import("./coeficientesTarjetasModel").CoeficienteTarjeta[]) => void} onChange
 */
export function subscribeTarjetas(onChange) {
  let seeded = false;
  let empresasSeeded = false;

  return onSnapshot(tarjetasCol(), async (snap) => {
    if (snap.empty && !seeded) {
      seeded = true;
      try {
        await seedDefaultTarjetasIfEmpty();
        return;
      } catch (err) {
        console.error("[coeficientesTarjetas] seed", err);
      }
    }

    if (!empresasSeeded) {
      empresasSeeded = true;
      try {
        await seedMissingEmpresasTarjetas();
        await seedEmpresasFinanciacionIfMissing();
      } catch (err) {
        console.error("[coeficientesTarjetas] empresas seed", err);
      }
    }

    const list = sortTarjetas(
      snap.docs.map((d) => parseTarjetaDoc(d.id, d.data()))
    );
    publishCache(list);
    onChange(list);
  });
}

/**
 * @returns {Promise<import("./coeficientesTarjetasModel").CoeficienteTarjeta[]>}
 */
export async function fetchTarjetas() {
  await seedDefaultTarjetasIfEmpty();
  await seedMissingEmpresasTarjetas();
  await seedEmpresasFinanciacionIfMissing();
  const snap = await getDocs(tarjetasCol());
  const list = sortTarjetas(snap.docs.map((d) => parseTarjetaDoc(d.id, d.data())));
  publishCache(list);
  return list;
}

/**
 * @param {{
 *   codigo: string;
 *   nombre: string;
 *   categoria?: import("./coeficientesTarjetasModel").CategoriaTarjeta;
 *   tipoCarga: import("./coeficientesTarjetasModel").TipoCargaTarjeta;
 *   parser?: string | null;
 *   manualPlanes?: import("./coeficientesTarjetasModel").ManualPlanDefinition[];
 *   orden?: number;
 *   activo?: boolean;
 *   updatedBy?: string | null;
 * }} payload
 */
export async function createTarjeta(payload) {
  const codigo = normalizeTarjetaCodigo(payload.codigo);
  if (!codigo) {
    throw new Error("Código interno inválido.");
  }

  const existing = await getDocs(tarjetasCol());
  if (existing.docs.some((d) => d.id === codigo)) {
    throw new Error(`Ya existe una tarjeta con código "${codigo}".`);
  }

  const tipoCarga = payload.tipoCarga === "manual" ? "manual" : "automatica";
  const categoria = payload.categoria === "EMPRESAS" ? "EMPRESAS" : "CONSUMO";
  const data = {
    codigo,
    nombre: String(payload.nombre ?? codigo).trim(),
    categoria,
    tipoCarga,
    parser:
      tipoCarga === "manual"
        ? null
        : normalizeTarjetaCodigo(payload.parser ?? ""),
    manualPlanes: tipoCarga === "manual" ? (payload.manualPlanes ?? []) : [],
    orden:
      Number.isFinite(Number(payload.orden)) && payload.orden != null
        ? Number(payload.orden)
        : 900,
    activo: payload.activo !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: payload.updatedBy ?? null,
  };

  if (tipoCarga === "automatica" && !data.parser) {
    throw new Error("Seleccione un parser para la carga automática.");
  }
  if (
    categoria === "CONSUMO" &&
    tipoCarga === "manual" &&
    (!data.manualPlanes || data.manualPlanes.length === 0)
  ) {
    throw new Error("Defina al menos un plan manual.");
  }

  await setDoc(doc(tarjetasCol(), codigo), data);
  return codigo;
}

/**
 * @param {string} codigo
 * @param {{
 *   nombre?: string;
 *   categoria?: import("./coeficientesTarjetasModel").CategoriaTarjeta;
 *   tipoCarga?: import("./coeficientesTarjetasModel").TipoCargaTarjeta;
 *   parser?: string | null;
 *   manualPlanes?: import("./coeficientesTarjetasModel").ManualPlanDefinition[];
 *   orden?: number;
 *   activo?: boolean;
 *   updatedBy?: string | null;
 * }} payload
 */
export async function updateTarjeta(codigo, payload) {
  const id = normalizeTarjetaCodigo(codigo);
  const tipoCarga = payload.tipoCarga === "manual" ? "manual" : "automatica";

  /** @type {Record<string, unknown>} */
  const data = {
    updatedAt: serverTimestamp(),
    updatedBy: payload.updatedBy ?? null,
  };

  if (payload.nombre != null) data.nombre = String(payload.nombre).trim();
  if (payload.categoria != null) {
    data.categoria = payload.categoria === "EMPRESAS" ? "EMPRESAS" : "CONSUMO";
  }
  if (payload.tipoCarga != null) data.tipoCarga = tipoCarga;
  if (payload.orden != null) data.orden = Number(payload.orden);
  if (payload.activo != null) data.activo = payload.activo;

  if (tipoCarga === "manual") {
    data.parser = null;
    if (payload.manualPlanes != null) {
      data.manualPlanes = payload.manualPlanes;
    }
  } else if (payload.parser != null) {
    data.parser = normalizeTarjetaCodigo(payload.parser);
  }

  if (tipoCarga === "automatica" && payload.parser === "") {
    throw new Error("Seleccione un parser para la carga automática.");
  }
  const categoria =
    payload.categoria === "EMPRESAS" ? "EMPRESAS" : "CONSUMO";
  if (
    categoria === "CONSUMO" &&
    tipoCarga === "manual" &&
    payload.manualPlanes != null &&
    payload.manualPlanes.length === 0
  ) {
    throw new Error("Defina al menos un plan manual.");
  }

  await setDoc(doc(tarjetasCol(), id), data, { merge: true });
}

/**
 * Registra un plan en la tarjeta (importPlanes o manualPlanes) si aún no existe.
 *
 * @param {string} codigo
 * @param {{ cuotas: string | number; label: string }} plan
 * @param {string | null} [updatedBy]
 */
export async function ensureTarjetaPlanDefinition(codigo, plan, updatedBy = null) {
  const id = normalizeTarjetaCodigo(codigo);
  const ref = doc(tarjetasCol(), id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Tarjeta no encontrada.");
  }

  const tarjeta = parseTarjetaDoc(snap.id, snap.data());
  const actuales = getTarjetaPlanesEsperados(tarjeta);
  if (actuales.some((p) => cuotasPlanMatch(p.cuotas, plan.cuotas))) {
    return;
  }

  const field = tarjeta.tipoCarga === "manual" ? "manualPlanes" : "importPlanes";
  const base =
    field === "manualPlanes"
      ? [...(tarjeta.manualPlanes ?? [])]
      : tarjeta.importPlanes?.length
        ? [...tarjeta.importPlanes]
        : [...(DEFAULT_IMPORT_PLANES_BY_CODIGO[tarjeta.codigo] ?? [])];

  base.push({
    cuotas: plan.cuotas,
    label: plan.label || formatPlanLabelFromCuotas(plan.cuotas),
  });

  base.sort((a, b) =>
    compareCuotas(
      normalizeCuotasLabel(a.cuotas),
      normalizeCuotasLabel(b.cuotas)
    )
  );

  await setDoc(
    ref,
    {
      [field]: base,
      updatedAt: serverTimestamp(),
      ...(updatedBy ? { updatedBy } : {}),
    },
    { merge: true }
  );
}

/**
 * Registra en `importPlanes` las cuotas activas fuera del plan por defecto (ej. 24 en AMEX/CABAL).
 * @param {string} codigo
 * @param {import("./coeficientesVigentesModel").CoeficienteImportacion | null} activeImport
 * @param {string | null} [updatedBy]
 */
export async function syncImportPlanesFromActiveRecords(
  codigo,
  activeImport,
  updatedBy = null
) {
  if (!activeImport?.records?.length) return;

  const id = normalizeTarjetaCodigo(codigo);
  const snap = await getDoc(doc(tarjetasCol(), id));
  if (!snap.exists()) return;

  const tarjeta = parseTarjetaDoc(snap.id, snap.data());
  if (tarjeta.tipoCarga === "manual") return;

  for (const record of activeImport.records) {
    if (record.activo === false) continue;
    const base = Number(record.coeficienteBase ?? 0);
    if (!Number.isFinite(base) || base <= 0) continue;
    if (tarjetaPermiteCuotaComercial(tarjeta, record.cuotas)) continue;

    await ensureTarjetaPlanDefinition(
      codigo,
      {
        cuotas: record.cuotas,
        label: formatPlanLabelFromCuotas(record.cuotas),
      },
      updatedBy
    );
  }
}

/**
 * @param {string} codigo
 * @param {string | number} cuotas
 * @param {string | null} [updatedBy]
 */
export async function removeTarjetaPlanDefinition(codigo, cuotas, updatedBy = null) {
  const id = normalizeTarjetaCodigo(codigo);
  const ref = doc(tarjetasCol(), id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const tarjeta = parseTarjetaDoc(snap.id, snap.data());
  const defaults = DEFAULT_IMPORT_PLANES_BY_CODIGO[tarjeta.codigo] ?? [];
  if (defaults.some((p) => cuotasPlanMatch(p.cuotas, cuotas))) {
    return;
  }

  const field = tarjeta.tipoCarga === "manual" ? "manualPlanes" : "importPlanes";
  const current = field === "manualPlanes" ? tarjeta.manualPlanes : tarjeta.importPlanes;
  if (!current?.length) return;

  const next = current.filter((p) => !cuotasPlanMatch(p.cuotas, cuotas));
  if (next.length === current.length) return;

  await setDoc(
    ref,
    {
      [field]: next,
      updatedAt: serverTimestamp(),
      ...(updatedBy ? { updatedBy } : {}),
    },
    { merge: true }
  );
}
