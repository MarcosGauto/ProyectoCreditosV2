import { db } from "@/service/firebase";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  COEFICIENTES_EMPRESAS_FINANCIACION_COLLECTION,
  parseEmpresaFinanciacionDoc,
} from "@/lib/coeficientes/coeficientesEmpresasModel";
import { COEFICIENTES_EMPRESAS_FINANCIACION_SEED } from "@/lib/coeficientes/coeficientesEmpresasSeed";
import { normalizeTarjetaCodigo } from "@/lib/coeficientes/coeficientesTarjetasModel";
import { archiveEmpresasVigenciaBeforeChange } from "@/lib/coeficientes/coeficientesHistorialService";
import { normalizeHistorialOrigen } from "@/lib/coeficientes/coeficientesHistorialModel";

function empresasCol() {
  return collection(db, COEFICIENTES_EMPRESAS_FINANCIACION_COLLECTION);
}

/**
 * Crea documentos de financiación empresas si no existen (por producto).
 */
export async function seedEmpresasFinanciacionIfMissing() {
  const snap = await getDocs(empresasCol());
  const existing = new Set(snap.docs.map((d) => d.id));

  for (const item of COEFICIENTES_EMPRESAS_FINANCIACION_SEED) {
    const codigo = normalizeTarjetaCodigo(item.productoCodigo);
    if (existing.has(codigo)) continue;

    await setDoc(doc(empresasCol(), codigo), {
      productoCodigo: codigo,
      lineas: item.lineas,
      vigenciaDesde: item.vigenciaDesde ?? null,
      estado: "activa",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * @param {(list: import("./coeficientesEmpresasModel").EmpresaFinanciacion[]) => void} onChange
 */
export function subscribeEmpresasFinanciacion(onChange) {
  let seeded = false;

  return onSnapshot(empresasCol(), async (snap) => {
    if (snap.empty && !seeded) {
      seeded = true;
      try {
        await seedEmpresasFinanciacionIfMissing();
        return;
      } catch (err) {
        console.error("[coeficientesEmpresas] seed", err);
      }
    }

    const list = snap.docs.map((d) => parseEmpresaFinanciacionDoc(d.id, d.data()));
    list.sort((a, b) => a.productoCodigo.localeCompare(b.productoCodigo, "es"));
    onChange(list);
  });
}

/**
 * @param {{
 *   productoCodigo: string;
 *   lineas: import("./coeficientesEmpresasModel").EmpresaFinanciacionLinea[];
 *   vigenciaDesde?: string | null;
 *   updatedBy?: string | null;
 *   origen?: import("./coeficientesHistorialModel").CoeficientesHistorialOrigen;
 *   observaciones?: string | null;
 * }} payload
 */
export async function saveEmpresaFinanciacion(payload) {
  const productoCodigo = normalizeTarjetaCodigo(payload.productoCodigo);
  if (!productoCodigo) {
    throw new Error("Código de producto inválido.");
  }
  if (!payload.lineas?.length) {
    throw new Error("Defina al menos una línea de financiación.");
  }

  const origen = normalizeHistorialOrigen(payload.origen ?? "Edición Manual");
  const observaciones =
    payload.observaciones ??
    `Nueva vigencia empresas ${productoCodigo} desde ${payload.vigenciaDesde || "—"}`;

  await archiveEmpresasVigenciaBeforeChange({
    usuario: payload.updatedBy ?? null,
    origen,
    observaciones,
  });

  await setDoc(
    doc(empresasCol(), productoCodigo),
    {
      productoCodigo,
      lineas: payload.lineas.map((l, idx) => ({
        id: normalizeTarjetaCodigo(l.id) || `${productoCodigo}_${idx + 1}`,
        nombre: String(l.nombre ?? "").trim(),
        plazo: String(l.plazo ?? "").trim(),
        tna: Number(l.tna) || 0,
        comision: Number(l.comision) || 0,
        observaciones: String(l.observaciones ?? "").trim(),
        orden: Number.isFinite(Number(l.orden)) ? Number(l.orden) : idx + 1,
        activo: l.activo !== false,
      })),
      vigenciaDesde: payload.vigenciaDesde ?? null,
      estado: "activa",
      updatedAt: serverTimestamp(),
      updatedBy: payload.updatedBy ?? null,
    },
    { merge: true }
  );
}
