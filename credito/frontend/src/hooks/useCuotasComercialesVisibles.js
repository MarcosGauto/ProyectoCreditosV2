"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_CUOTAS_COMERCIALES_VISIBLES,
  parseCuotasComercialesVisibles,
} from "@/lib/coeficientes/coeficientesComercialCuotasModel";
import {
  saveCuotasComercialesVisibles,
  subscribeCoeficientesGlobales,
} from "@/lib/coeficientes/coeficientesNucleoService";

/**
 * @param {{ userEmail?: string | null }} [options]
 */
export function useCuotasComercialesVisibles(options = {}) {
  const [cuotasVisibles, setCuotasVisibles] = useState(
    /** @type {string[]} */ ([...DEFAULT_CUOTAS_COMERCIALES_VISIBLES])
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeCoeficientesGlobales((payload) => {
      setCuotasVisibles(
        parseCuotasComercialesVisibles(payload.cuotasComercialesVisibles)
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const guardar = useCallback(
    async (keys) => {
      setSaving(true);
      setError(null);
      try {
        await saveCuotasComercialesVisibles(keys, options.userEmail ?? null);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "No se pudo guardar la configuración de cuotas.";
        setError(msg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [options.userEmail]
  );

  return {
    cuotasVisibles,
    loading,
    saving,
    error,
    guardar,
  };
}
