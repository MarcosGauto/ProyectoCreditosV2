import { db } from "@/service/firebase"
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore"

import {
  COEFICIENTES_NUCLEO_DOC_PATH,
  DEFAULT_COEFICIENTES_GLOBALES,
  parseCoeficientesGlobales,
} from "@/lib/coeficientes/coeficientesNucleoModel"
import { parseCuotasComercialesVisibles } from "@/lib/coeficientes/coeficientesComercialCuotasModel"
import { recalcularImportacionesActivas } from "@/lib/coeficientes/coeficientesImportService"

function nucleoRef() {
  return doc(db, ...COEFICIENTES_NUCLEO_DOC_PATH)
}

/**
 * @param {Record<string, unknown>} data
 */
function formatUpdatedAt(data) {
  const ts = data.updatedAt
  if (ts && typeof ts === "object" && typeof ts.toDate === "function") {
    return ts.toDate().toISOString()
  }
  if (typeof ts === "string") {
    return ts
  }
  return null
}

/**
 * Lee parámetros globales desde el documento existente (sin crear el doc completo).
 *
 * @returns {Promise<{
 *   globales: import("./coeficientesNucleoModel").CoeficientesGlobales;
 *   updatedAt: string | null;
 *   updatedBy: string | null;
 * }>}
 */
export async function fetchCoeficientesGlobales() {
  const snap = await getDoc(nucleoRef())
  if (!snap.exists()) {
    return {
      globales: { ...DEFAULT_COEFICIENTES_GLOBALES },
      cuotasComercialesVisibles: parseCuotasComercialesVisibles(null),
      updatedAt: null,
      updatedBy: null,
    }
  }
  const data = snap.data()
  return {
    globales: parseCoeficientesGlobales(data),
    cuotasComercialesVisibles: parseCuotasComercialesVisibles(
      data.cuotasComercialesVisibles
    ),
    updatedAt: formatUpdatedAt(data),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  }
}

/**
 * @param {(payload: {
 *   globales: import("./coeficientesNucleoModel").CoeficientesGlobales;
 *   updatedAt: string | null;
 *   updatedBy: string | null;
 * }) => void} onChange
 */
export function subscribeCoeficientesGlobales(onChange) {
  return onSnapshot(nucleoRef(), (snap) => {
    if (!snap.exists()) {
      onChange({
        globales: { ...DEFAULT_COEFICIENTES_GLOBALES },
        cuotasComercialesVisibles: parseCuotasComercialesVisibles(null),
        updatedAt: null,
        updatedBy: null,
      })
      return
    }
    const data = snap.data()
    onChange({
      globales: parseCoeficientesGlobales(data),
      cuotasComercialesVisibles: parseCuotasComercialesVisibles(
        data.cuotasComercialesVisibles
      ),
      updatedAt: formatUpdatedAt(data),
      updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
    })
  })
}

/**
 * Persiste solo parámetros globales (merge) en el documento existente.
 *
 * @param {import("./coeficientesNucleoModel").CoeficientesGlobales} globales
 * @param {string | null} [updatedBy]
 */
export async function saveCoeficientesGlobales(globales, updatedBy = null) {
  await setDoc(
    nucleoRef(),
    {
      arancelDeb: globales.arancelDeb,
      arancelCre: globales.arancelCre,
      interes: globales.interes,
      updatedAt: serverTimestamp(),
      ...(updatedBy ? { updatedBy } : {}),
    },
    { merge: true }
  )
  await recalcularImportacionesActivas(globales)
}

/**
 * @param {string[]} cuotasKeys
 * @param {string | null} [updatedBy]
 */
export async function saveCuotasComercialesVisibles(cuotasKeys, updatedBy = null) {
  const normalized = parseCuotasComercialesVisibles(cuotasKeys)
  await setDoc(
    nucleoRef(),
    {
      cuotasComercialesVisibles: normalized,
      cuotasComercialesUpdatedAt: serverTimestamp(),
      ...(updatedBy ? { cuotasComercialesUpdatedBy: updatedBy } : {}),
    },
    { merge: true }
  )
}
