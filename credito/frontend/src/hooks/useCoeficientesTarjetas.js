"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createTarjeta,
  subscribeTarjetas,
  updateTarjeta,
} from "@/lib/coeficientes/coeficientesTarjetasService";
import {
  getConsumoTarjetasActivas,
  getEmpresasTarjetasActivas,
  getImportTarjetas,
  getManualTarjetas,
  getTarjetasActivas,
} from "@/lib/coeficientes/coeficientesTarjetasModel";

/**
 * @param {{ userEmail?: string | null }} [options]
 */
export function useCoeficientesTarjetas(options = {}) {
  const [tarjetas, setTarjetas] = useState(
    /** @type {import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta[]} */ ([])
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeTarjetas((list) => {
      setTarjetas(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const guardarNueva = useCallback(
    async (payload) => {
      setSaving(true);
      setError(null);
      try {
        await createTarjeta({
          ...payload,
          updatedBy: options.userEmail ?? null,
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "No se pudo crear la tarjeta.";
        setError(msg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [options.userEmail]
  );

  const guardarEdicion = useCallback(
    async (codigo, payload) => {
      setSaving(true);
      setError(null);
      try {
        await updateTarjeta(codigo, {
          ...payload,
          updatedBy: options.userEmail ?? null,
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "No se pudo actualizar la tarjeta.";
        setError(msg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [options.userEmail]
  );

  return {
    tarjetas,
    activasTarjetas: getTarjetasActivas(tarjetas),
    consumoTarjetas: getConsumoTarjetasActivas(tarjetas),
    empresasTarjetas: getEmpresasTarjetasActivas(tarjetas),
    importTarjetas: getImportTarjetas(tarjetas),
    manualTarjetas: getManualTarjetas(tarjetas),
    loading,
    saving,
    error,
    guardarNueva,
    guardarEdicion,
  };
}
