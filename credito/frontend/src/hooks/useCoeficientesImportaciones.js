"use client";

import { useCallback, useEffect, useState } from "react";

import {
  deleteImportacionRecord,
  fetchImportacionById,
  restoreImportacion,
  saveImportacion,
  setImportacionRecordActivo,
  subscribeImportaciones,
  upsertImportacionRecord,
} from "@/lib/coeficientes/coeficientesImportService";

/**
 * @param {{ userEmail?: string | null }} [options]
 */
export function useCoeficientesImportaciones(options = {}) {
  const [importaciones, setImportaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    const unsub = subscribeImportaciones((list) => {
      setImportaciones(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const importar = useCallback(
    async (payload) => {
      setSaving(true);
      setError(null);
      try {
        const id = await saveImportacion({
          ...payload,
          importedBy: options.userEmail ?? null,
        });
        return id;
      } catch (err) {
        console.error("[useCoeficientesImportaciones] importar", err);
        const message =
          err instanceof Error ? err.message : "Error al importar coeficientes.";
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [options.userEmail]
  );

  const restaurar = useCallback(async (importId) => {
    setSaving(true);
    setError(null);
    try {
      await restoreImportacion(importId);
    } catch (err) {
      console.error("[useCoeficientesImportaciones] restaurar", err);
      setError("No se pudo restaurar la importación.");
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const verDetalle = useCallback(async (importId) => {
    return fetchImportacionById(importId);
  }, []);

  const completarCuota = useCallback(
    async (payload) => {
      setSaving(true);
      setError(null);
      try {
        await upsertImportacionRecord({
          ...payload,
          importedBy: options.userEmail ?? null,
        });
      } catch (err) {
        console.error("[useCoeficientesImportaciones] completarCuota", err);
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo guardar el coeficiente.";
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [options.userEmail]
  );

  const toggleActivaCuota = useCallback(
    async (payload) => {
      setSaving(true);
      setError(null);
      try {
        await setImportacionRecordActivo({
          ...payload,
          importedBy: options.userEmail ?? null,
        });
      } catch (err) {
        console.error("[useCoeficientesImportaciones] toggleActivaCuota", err);
        const message =
          err instanceof Error ? err.message : "No se pudo actualizar la cuota.";
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [options.userEmail]
  );

  const eliminarCuota = useCallback(
    async (payload) => {
      setSaving(true);
      setError(null);
      try {
        await deleteImportacionRecord({
          ...payload,
          importedBy: options.userEmail ?? null,
        });
      } catch (err) {
        console.error("[useCoeficientesImportaciones] eliminarCuota", err);
        const message =
          err instanceof Error ? err.message : "No se pudo eliminar la cuota.";
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [options.userEmail]
  );

  return {
    importaciones,
    loading,
    saving,
    error,
    importar,
    restaurar,
    verDetalle,
    completarCuota,
    toggleActivaCuota,
    eliminarCuota,
  };
}
