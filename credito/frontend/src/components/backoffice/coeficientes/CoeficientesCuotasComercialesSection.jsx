"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, Loader2, Plus, Save } from "lucide-react";

import { useAuth } from "@/app/context/AuthContext";
import { useCuotasComercialesVisibles } from "@/hooks/useCuotasComercialesVisibles";
import { useCoeficientesGlobales } from "@/hooks/useCoeficientesGlobales";
import { useCoeficientesTarjetas } from "@/hooks/useCoeficientesTarjetas";
import { CoeficientesAgregarCuotaModal } from "@/components/backoffice/coeficientes/CoeficientesAgregarCuotaModal";
import {
  CUOTAS_COMERCIALES_PRESETS,
  collectExtraCuotasFromData,
  cuotaComercialKeyToDisplay,
  isCuotaComercialSintetica,
  sortCuotasComercialesKeys,
} from "@/lib/coeficientes/coeficientesComercialCuotasModel";
import { Button } from "@/components/ui/button";

/**
 * @param {{
 *   vigentesRows: Array<{ cuotas: string | number }>;
 * }} props
 */
export function CoeficientesCuotasComercialesSection({ vigentesRows }) {
  const { user, isAdmin } = useAuth();
  const { globales } = useCoeficientesGlobales();
  const { tarjetas } = useCoeficientesTarjetas();
  const { cuotasVisibles, loading, saving, error, guardar } =
    useCuotasComercialesVisibles({ userEmail: user?.email ?? null });

  const [draft, setDraft] = useState(/** @type {string[]} */ ([]));
  const [message, setMessage] = useState(/** @type {string | null} */ (null));
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setDraft(sortCuotasComercialesKeys(cuotasVisibles));
  }, [cuotasVisibles]);

  const orderedDraft = useMemo(
    () => sortCuotasComercialesKeys(draft),
    [draft]
  );

  const extraCuotas = useMemo(
    () => collectExtraCuotasFromData(vigentesRows),
    [vigentesRows]
  );

  const allOptions = useMemo(() => {
    const presetKeys = new Set(CUOTAS_COMERCIALES_PRESETS.map((p) => p.key));
    const extras = extraCuotas.filter((e) => !presetKeys.has(e.key));
    return [...CUOTAS_COMERCIALES_PRESETS, ...extras];
  }, [extraCuotas]);

  const toggleCuota = (key) => {
    setDraft((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      return sortCuotasComercialesKeys(next);
    });
  };

  const handleSave = async () => {
    if (!isAdmin || orderedDraft.length === 0) return;
    setMessage(null);
    try {
      await guardar(orderedDraft);
      setMessage("Cuotas visibles en planilla comercial guardadas.");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "No se pudo guardar la configuración."
      );
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando cuotas comerciales…
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 text-red-400" />
        <div>
          <h2 className="text-sm font-semibold text-foreground/80">
            Cuotas visibles en planilla comercial
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Grupo Núcleo S.A. · Coeficientes Comerciales. Débito y 1 cuota usan
            aranceles globales; el resto proviene de coeficientes vigentes según
            cuotas activadas aquí. El orden en planilla es automático: Débito,
            cuotas numéricas y Plan Z al final.
          </p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {(error || message) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              error || message?.includes("No se")
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-green-500/30 bg-green-500/10 text-green-200"
            }`}
          >
            {error ?? message}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {allOptions.map((opt) => {
            const checked = draft.includes(opt.key);
            const isSintetica = isCuotaComercialSintetica(opt.key);
            return (
              <label
                key={opt.key}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                  checked
                    ? "border-red-500/40 bg-red-500/10 text-red-100"
                    : "border-border bg-card text-muted-foreground hover:border-zinc-600"
                } ${!isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                title={
                  isSintetica
                    ? opt.key === "DEBITO"
                      ? "Valor desde Arancel Débito (globales)"
                      : "Valor desde Arancel Crédito (globales)"
                    : undefined
                }
              >
                <input
                  type="checkbox"
                  className="rounded border-zinc-600"
                  checked={checked}
                  disabled={!isAdmin}
                  onChange={() => toggleCuota(opt.key)}
                />
                {opt.label}
              </label>
            );
          })}
        </div>

        {orderedDraft.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Orden en planilla comercial
            </p>
            <ul className="space-y-1">
              {orderedDraft.map((key) => {
                const label =
                  allOptions.find((o) => o.key === key)?.label ??
                  String(cuotaComercialKeyToDisplay(key));
                return (
                  <li
                    key={key}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{key}</span>
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-border text-foreground/80"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar cuota
            </Button>
            <Button
              type="button"
              disabled={saving || orderedDraft.length === 0}
              onClick={() => void handleSave()}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar cuotas comerciales
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Solo administradores pueden modificar esta configuración.
          </p>
        )}
      </div>

      <CoeficientesAgregarCuotaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        tarjetas={tarjetas}
        globales={globales}
        userEmail={user?.email ?? null}
      />
    </section>
  );
}
