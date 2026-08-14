"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";

import {
  CUOTA_MANUAL_TIPOS,
  CUOTA_YA_EXISTE_ERROR,
  resolveCuotasFromManualForm,
} from "@/lib/coeficientes/coeficientesCuotaManualModel";
import { parseManualCoeficienteBase } from "@/lib/coeficientes/coeficientesManualTarjetaModel";
import {
  calcularPrecioFinanciado,
  calcularTasaDirecta,
  calcularValorCuota,
  formatCoefPorcentajeDisplay,
} from "@/lib/coeficientes/coeficientesCalculo";
import { buildTablasVigentesDisplayRow } from "@/lib/coeficientes/tablasVigentesDisplay";
import { getTarjetaDisplayLabel } from "@/lib/coeficientes/coeficientesTarjetasModel";
import { saveManualCuotaPlan } from "@/lib/coeficientes/coeficientesImportService";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inputClass =
  "bg-card border-border text-foreground focus-visible:ring-red-500/40";

/**
 * @param {{
 *   open: boolean;
 *   onOpenChange: (open: boolean) => void;
 *   tarjetas: import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta[];
 *   globales: import("@/lib/coeficientes/coeficientesCalculo").CoeficientesGlobales;
 *   basePrice?: number;
 *   userEmail?: string | null;
 *   defaultTarjeta?: string;
 *   onSaved?: () => void;
 * }} props
 */
export function CoeficientesAgregarCuotaModal({
  open,
  onOpenChange,
  tarjetas,
  globales,
  basePrice = 1000,
  userEmail = null,
  defaultTarjeta = "",
  onSaved,
}) {
  const consumoTarjetas = useMemo(
    () => tarjetas.filter((t) => t.activo && t.categoria !== "EMPRESAS"),
    [tarjetas]
  );

  const [tarjetaCodigo, setTarjetaCodigo] = useState(defaultTarjeta);
  const [tipo, setTipo] = useState("NUMERICA");
  const [numeroCuota, setNumeroCuota] = useState("");
  const [textoLibre, setTextoLibre] = useState("");
  const [coefBaseDraft, setCoefBaseDraft] = useState("");
  const [activa, setActiva] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!open) return;
    setTarjetaCodigo(defaultTarjeta || consumoTarjetas[0]?.codigo || "");
    setTipo("NUMERICA");
    setNumeroCuota("");
    setTextoLibre("");
    setCoefBaseDraft("");
    setActiva(true);
    setError(null);
  }, [open, defaultTarjeta, consumoTarjetas]);

  const preview = useMemo(() => {
    try {
      const { cuotas } = resolveCuotasFromManualForm({
        tipo: /** @type {import("@/lib/coeficientes/coeficientesCuotaManualModel").CuotaManualTipo} */ (
          tipo
        ),
        numeroCuota,
        textoLibre,
      });
      const base = parseManualCoeficienteBase(coefBaseDraft);
      if (base == null) return null;

      const display = buildTablasVigentesDisplayRow(
        {
          tarjeta: tarjetaCodigo,
          cuotas,
          coeficienteBase: base,
          coeficienteBaseImportado: base,
        },
        globales
      );

      const coefFinal = Number(display.coefFinalDisplay);
      if (!Number.isFinite(coefFinal)) return null;

      return {
        coefPorcentaje: display.coefPorcentajeDisplay,
        coefFinal,
        tasaDirecta: calcularTasaDirecta(coefFinal),
        precioFinanciado: calcularPrecioFinanciado(basePrice, coefFinal),
        valorCuota: calcularValorCuota(basePrice, coefFinal, cuotas),
      };
    } catch {
      return null;
    }
  }, [
    tipo,
    numeroCuota,
    textoLibre,
    coefBaseDraft,
    tarjetaCodigo,
    globales,
    basePrice,
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!tarjetaCodigo) {
      setError("Seleccione una tarjeta.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { cuotas, label } = resolveCuotasFromManualForm({
        tipo: /** @type {import("@/lib/coeficientes/coeficientesCuotaManualModel").CuotaManualTipo} */ (
          tipo
        ),
        numeroCuota,
        textoLibre,
      });
      const coeficienteBase = parseManualCoeficienteBase(coefBaseDraft);
      if (coeficienteBase == null) {
        throw new Error("Ingrese un coeficiente base válido.");
      }

      await saveManualCuotaPlan({
        tarjeta: tarjetaCodigo,
        cuotas,
        planLabel: label,
        coeficienteBase,
        activo: activa,
        globales,
        importedBy: userEmail,
      });

      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo guardar la cuota.";
      setError(msg === CUOTA_YA_EXISTE_ERROR ? CUOTA_YA_EXISTE_ERROR : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-red-400" />
            Agregar cuota
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Tarjeta</Label>
            <select
              className={`${inputClass} w-full h-10 rounded-md px-3 text-sm`}
              value={tarjetaCodigo}
              onChange={(e) => setTarjetaCodigo(e.target.value)}
            >
              {consumoTarjetas.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {getTarjetaDisplayLabel(t.codigo, consumoTarjetas)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Tipo de cuota</Label>
            <select
              className={`${inputClass} w-full h-10 rounded-md px-3 text-sm`}
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              {CUOTA_MANUAL_TIPOS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {tipo === "NUMERICA" && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Número de cuotas</Label>
              <Input
                type="number"
                min={2}
                step={1}
                className={inputClass}
                placeholder="ej. 2"
                value={numeroCuota}
                onChange={(e) => setNumeroCuota(e.target.value)}
              />
            </div>
          )}

          {tipo === "OTRO" && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Nombre del plan</Label>
              <Input
                className={inputClass}
                placeholder="ej. Promoción especial"
                value={textoLibre}
                onChange={(e) => setTextoLibre(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Coeficiente Base</Label>
            <Input
              type="text"
              inputMode="decimal"
              className={inputClass}
              placeholder="ej. 1.1148"
              value={coefBaseDraft}
              onChange={(e) => setCoefBaseDraft(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Activa</Label>
            <select
              className={`${inputClass} w-full h-10 rounded-md px-3 text-sm`}
              value={activa ? "si" : "no"}
              onChange={(e) => setActiva(e.target.value === "si")}
            >
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>

          {preview && (
            <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-muted-foreground mb-2">Vista previa</p>
              <p>
                Coef. %:{" "}
                {formatCoefPorcentajeDisplay(preview.coefPorcentaje) ?? "—"}
              </p>
              <p>
                Coef. Final:{" "}
                {formatCoefPorcentajeDisplay(preview.coefFinal) ?? "—"}
              </p>
              <p>
                Tasa directa:{" "}
                {preview.tasaDirecta != null
                  ? `${Number(preview.tasaDirecta).toLocaleString("es-AR", { minimumFractionDigits: 2 })}%`
                  : "—"}
              </p>
              <p>
                Precio financiado:{" "}
                {preview.precioFinanciado != null
                  ? `$${Number(preview.precioFinanciado).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                  : "—"}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Guardar cuota
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
