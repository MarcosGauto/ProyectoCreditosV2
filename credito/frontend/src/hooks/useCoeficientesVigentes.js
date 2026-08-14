"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DEFAULT_COEFICIENTES_GLOBALES } from "@/lib/coeficientes/coeficientesNucleoModel";
import {
  DEFAULT_CUOTAS_COMERCIALES_VISIBLES,
  parseCuotasComercialesVisibles,
} from "@/lib/coeficientes/coeficientesComercialCuotasModel";
import { subscribeCoeficientesGlobales } from "@/lib/coeficientes/coeficientesNucleoService";
import {
  buildVigentesFromImportaciones,
} from "@/lib/coeficientes/coeficientesVigentesModel";
import { enrichVigentesTable, enrichVigenteRow } from "@/lib/coeficientes/coeficientesCalculo";
import {
  fetchBasePrice,
  migrateLegacyDataIfNeeded,
  subscribeImportaciones,
} from "@/lib/coeficientes/coeficientesImportService";
import { subscribeTarjetas, syncImportPlanesFromActiveRecords } from "@/lib/coeficientes/coeficientesTarjetasService";

/**
 * @param {{ autoMigrate?: boolean }} [options]
 */
export function useCoeficientesVigentes(options = {}) {
  const [globales, setGlobales] = useState({ ...DEFAULT_COEFICIENTES_GLOBALES });
  const [cuotasComercialesVisibles, setCuotasComercialesVisibles] = useState(
    /** @type {string[]} */ ([...DEFAULT_CUOTAS_COMERCIALES_VISIBLES])
  );
  const [importaciones, setImportaciones] = useState([]);
  const [tarjetas, setTarjetas] = useState(
    /** @type {import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta[]} */ ([])
  );
  const [basePrice, setBasePrice] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (options.autoMigrate !== false) {
          await migrateLegacyDataIfNeeded();
        }
        const price = await fetchBasePrice();
        if (!cancelled) {
          setBasePrice(price);
        }
      } catch (err) {
        console.error("[useCoeficientesVigentes] init", err);
        if (!cancelled) {
          setError("No se pudieron cargar los coeficientes vigentes.");
        }
      }
    }

    void init();

    const unsubGlobales = subscribeCoeficientesGlobales((payload) => {
      setGlobales(payload.globales);
      setCuotasComercialesVisibles(
        parseCuotasComercialesVisibles(payload.cuotasComercialesVisibles)
      );
    });

    const unsubImports = subscribeImportaciones((list) => {
      setImportaciones(list);
      setLoading(false);
    });

    const unsubTarjetas = subscribeTarjetas((list) => {
      setTarjetas(list);
    });

    return () => {
      cancelled = true;
      unsubGlobales();
      unsubImports();
      unsubTarjetas();
    };
  }, [options.autoMigrate]);

  useEffect(() => {
    if (!importaciones.length) return;

    let cancelled = false;

    async function syncPlanes() {
      const activas = importaciones.filter((imp) => imp.estado === "activa");
      for (const imp of activas) {
        if (cancelled) return;
        try {
          await syncImportPlanesFromActiveRecords(imp.tarjeta, imp);
        } catch (err) {
          console.error(
            "[useCoeficientesVigentes] syncImportPlanes",
            imp.tarjeta,
            err
          );
        }
      }
    }

    void syncPlanes();

    return () => {
      cancelled = true;
    };
  }, [importaciones]);

  const vigentesRaw = useMemo(
    () => buildVigentesFromImportaciones(importaciones, globales, tarjetas),
    [importaciones, globales, tarjetas]
  );

  const vigentes = useMemo(
    () => enrichVigentesTable(vigentesRaw, globales, basePrice),
    [vigentesRaw, globales, basePrice]
  );

  const refreshBasePrice = useCallback(async () => {
    const price = await fetchBasePrice();
    setBasePrice(price);
  }, []);

  return {
    globales,
    cuotasComercialesVisibles,
    importaciones,
    tarjetas,
    vigentes,
    vigentesRaw,
    basePrice,
    loading,
    error,
    refreshBasePrice,
    enrichRow: (row) => enrichVigenteRow(row, globales, basePrice),
  };
}
