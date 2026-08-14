"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchHistorialById,
  restoreVigenciaFromHistorial,
  subscribeHistorialVigencias,
} from "@/lib/coeficientes/coeficientesHistorialService";

/**
 * @param {{ userEmail?: string | null }} [options]
 */
export function useCoeficientesHistorialVigencias(options = {}) {
  const [entries, setEntries] = useState(
    /** @type {import("@/lib/coeficientes/coeficientesHistorialModel").CoeficientesHistorialEntry[]} */ (
      []
    )
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    const unsub = subscribeHistorialVigencias((list) => {
      setEntries(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const verDetalle = useCallback(async (id) => {
    return fetchHistorialById(id);
  }, []);

  const restaurar = useCallback(
    async (historialId, vigenciaDesde = null) => {
      setSaving(true);
      setError(null);
      try {
        await restoreVigenciaFromHistorial(historialId, {
          usuario: options.userEmail ?? null,
          vigenciaDesde,
        });
      } catch (err) {
        console.error("[useCoeficientesHistorialVigencias] restaurar", err);
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo restaurar la vigencia.";
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [options.userEmail]
  );

  return {
    entries,
    loading,
    saving,
    error,
    verDetalle,
    restaurar,
  };
}
