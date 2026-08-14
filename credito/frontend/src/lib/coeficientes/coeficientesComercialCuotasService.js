import { db } from "@/service/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import {
  COEFICIENTES_NUCLEO_DOC_PATH,
} from "@/lib/coeficientes/coeficientesNucleoModel";
import {
  isCuotaActivaEnAlgunaImportacion,
  normalizeCuotaComercialKey,
  parseCuotasComercialesVisibles,
  sortCuotasComercialesKeys,
} from "@/lib/coeficientes/coeficientesComercialCuotasModel";

function nucleoRef() {
  return doc(db, ...COEFICIENTES_NUCLEO_DOC_PATH);
}

async function readEffectiveCuotasVisibles() {
  const snap = await getDoc(nucleoRef());
  if (!snap.exists()) {
    return parseCuotasComercialesVisibles(null);
  }
  return parseCuotasComercialesVisibles(snap.data().cuotasComercialesVisibles);
}

/**
 * @param {string[]} keys
 * @param {string | null} [updatedBy]
 */
async function writeCuotasVisibles(keys, updatedBy = null) {
  const normalized = sortCuotasComercialesKeys(keys);
  await setDoc(
    nucleoRef(),
    {
      cuotasComercialesVisibles: normalized,
      cuotasComercialesUpdatedAt: serverTimestamp(),
      ...(updatedBy ? { cuotasComercialesUpdatedBy: updatedBy } : {}),
    },
    { merge: true }
  );
}

/**
 * Agrega una cuota a la planilla comercial si aún no está listada.
 * @param {string | number} cuotaKey
 * @param {string | null} [updatedBy]
 */
export async function appendCuotaComercialVisible(cuotaKey, updatedBy = null) {
  const key = normalizeCuotaComercialKey(cuotaKey);
  if (!key) return;

  const current = await readEffectiveCuotasVisibles();
  if (current.includes(key)) return;

  await writeCuotasVisibles([...current, key], updatedBy);
}

/**
 * Quita la cuota de la planilla comercial si ya no está activa en ninguna importación.
 * @param {string | number} cuotaKey
 * @param {import("./coeficientesVigentesModel").CoeficienteImportacion[]} importaciones
 * @param {string | null} [updatedBy]
 */
export async function removeCuotaComercialVisibleIfGloballyInactive(
  cuotaKey,
  importaciones,
  updatedBy = null
) {
  const key = normalizeCuotaComercialKey(cuotaKey);
  if (!key) return;
  if (isCuotaActivaEnAlgunaImportacion(importaciones, key)) return;

  const current = await readEffectiveCuotasVisibles();
  if (!current.includes(key)) return;

  const next = current.filter((item) => item !== key);
  if (next.length === 0) return;

  await writeCuotasVisibles(next, updatedBy);
}
