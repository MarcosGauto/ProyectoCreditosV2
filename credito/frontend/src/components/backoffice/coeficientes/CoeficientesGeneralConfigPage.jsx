"use client";

import { useEffect, useState } from "react";
import { Loader2, Percent, Save } from "lucide-react";

import { useAuth } from "@/app/context/AuthContext";
import { useCoeficientesGlobales } from "@/hooks/useCoeficientesGlobales";
import { DEFAULT_COEFICIENTES_GLOBALES } from "@/lib/coeficientes/coeficientesNucleoModel";
import { CoeficientesModuleNav } from "@/components/backoffice/coeficientes/CoeficientesModuleNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatUpdatedAt(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("es-AR");
}

const inputClass =
  "bg-card border-border text-foreground focus-visible:ring-red-500/40";

export function CoeficientesGeneralConfigPage() {
  const { user, role, isAdmin } = useAuth();
  const { globales, updatedAt, updatedBy, loading, saving, error, saveGlobales } =
    useCoeficientesGlobales({ userEmail: user?.email ?? null });

  const [draft, setDraft] = useState({ ...DEFAULT_COEFICIENTES_GLOBALES });
  const [message, setMessage] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!loading) {
      setDraft(globales);
    }
  }, [globales, loading]);

  const handleSave = async () => {
    if (!isAdmin) return;
    setMessage(null);
    try {
      await saveGlobales(draft);
      setMessage("Parámetros globales guardados. Las tablas vigentes se recalculan automáticamente.");
    } catch {
      setMessage("Error al guardar los parámetros.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando configuración…
      </div>
    );
  }

  return (
    <div className="text-foreground space-y-6">
      <CoeficientesModuleNav />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-5 h-5 text-red-400" />
            <h1 className="text-2xl font-bold">Configuración General</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Parámetros globales del sistema de tarjetas. El interés adicional solo
            aplica a financiaciones de 2 cuotas o más.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Última modificación: {formatUpdatedAt(updatedAt)} · Usuario:{" "}
            {updatedBy ?? "—"}
          </p>
        </div>
        {isAdmin && (
          <Button
            type="button"
            variant="primary"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar cambios
          </Button>
        )}
      </div>

      {(error || message) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-green-500/30 bg-green-500/10 text-green-200"
          }`}
        >
          {error ?? message}
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Solo administradores pueden modificar estos parámetros.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-3xl">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Parámetros globales
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="arancel-deb" className="text-muted-foreground">
              Arancel Débito (%)
            </Label>
            <Input
              id="arancel-deb"
              type="number"
              step="0.01"
              className={inputClass}
              value={draft.arancelDeb}
              readOnly={!isAdmin}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  arancelDeb: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arancel-cre" className="text-muted-foreground">
              Arancel Crédito (%)
            </Label>
            <Input
              id="arancel-cre"
              type="number"
              step="0.01"
              className={inputClass}
              value={draft.arancelCre}
              readOnly={!isAdmin}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  arancelCre: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interes" className="text-muted-foreground">
              Interés Adicional (factor)
            </Label>
            <Input
              id="interes"
              type="number"
              step="0.01"
              min="1"
              className={inputClass}
              value={draft.interes}
              readOnly={!isAdmin}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  interes: Number(e.target.value),
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              1 = sin recargo · 1,05 = +5% · 1,14 = +14%
            </p>
          </div>
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          <li>Débito: coeficiente final = arancel débito.</li>
          <li>Crédito 1 cuota: coeficiente final = arancel crédito.</li>
          <li>
            Desde 2 cuotas: coeficiente final = (coeficiente base + arancel crédito) ×
            interés adicional.
          </li>
          <li>
            Ejemplo: (24,84 + 1,8) × 1,14 = 30,37
          </li>
        </ul>
      </section>
    </div>
  );
}
