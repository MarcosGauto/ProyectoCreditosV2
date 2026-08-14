"use client";

import { useCallback, useEffect, useState } from "react";

import {
  saveEmpresaFinanciacion,
  subscribeEmpresasFinanciacion,
} from "@/lib/coeficientes/coeficientesEmpresasService";

/**
 * @param {{ userEmail?: string | null }} [options]
 */
export function useCoeficientesEmpresas(options = {}) {
  const [financiaciones, setFinanciaciones] = useState(
    /** @type {import("@/lib/coeficientes/coeficientesEmpresasModel").EmpresaFinanciacion[]} */ (
      []
    )
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeEmpresasFinanciacion((list) => {
      setFinanciaciones(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const guardar = useCallback(
    async (payload) => {
      setSaving(true);
      setError(null);
      try {
        await saveEmpresaFinanciacion({
          ...payload,
          updatedBy: options.userEmail ?? null,
        });
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "No se pudo guardar la financiación empresas.";
        setError(msg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [options.userEmail]
  );

  return {
    financiaciones,
    loading,
    saving,
    error,
    guardar,
  };
}
