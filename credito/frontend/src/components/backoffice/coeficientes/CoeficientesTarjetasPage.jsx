"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, Plus, Save, Upload, X } from "lucide-react";

import { useAuth } from "@/app/context/AuthContext";
import { useCoeficientesTarjetas } from "@/hooks/useCoeficientesTarjetas";
import { CoeficientesModuleNav } from "@/components/backoffice/coeficientes/CoeficientesModuleNav";
import { AVAILABLE_PARSERS } from "@/lib/coeficientes/coeficientesTarjetasModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inputClass =
  "bg-card border-border text-foreground focus-visible:ring-red-500/40";

const tableHeadClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border";
const tableCellClass = "px-4 py-3 border-b border-border/60 text-sm";

const emptyPlan = () => ({ cuotas: "", label: "" });

/**
 * @returns {{
 *   codigo: string;
 *   nombre: string;
 *   tipoCarga: "automatica" | "manual";
 *   parser: string;
 *   manualPlanes: { cuotas: string; label: string }[];
 *   orden: string;
 *   activo: boolean;
 * }}
 */
function emptyForm() {
  return {
    codigo: "",
    nombre: "",
    tipoCarga: "automatica",
    parser: AVAILABLE_PARSERS[0]?.key ?? "",
    manualPlanes: [emptyPlan()],
    orden: "900",
    activo: true,
  };
}

export function CoeficientesTarjetasPage() {
  const { user, isAdmin } = useAuth();
  const {
    consumoTarjetas: tarjetas,
    loading,
    saving,
    error,
    guardarNueva,
    guardarEdicion,
  } = useCoeficientesTarjetas({ userEmail: user?.email ?? null });

  const [showForm, setShowForm] = useState(false);
  const [editingCodigo, setEditingCodigo] = useState(/** @type {string | null} */ (null));
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(/** @type {string | null} */ (null));

  const editingTarjeta = useMemo(
    () => tarjetas.find((t) => t.codigo === editingCodigo) ?? null,
    [tarjetas, editingCodigo]
  );

  useEffect(() => {
    if (!editingTarjeta) return;
    setForm({
      codigo: editingTarjeta.codigo,
      nombre: editingTarjeta.nombre,
      tipoCarga: editingTarjeta.tipoCarga,
      parser: editingTarjeta.parser ?? AVAILABLE_PARSERS[0]?.key ?? "",
      manualPlanes: editingTarjeta.manualPlanes.map((p) => ({
        cuotas: String(p.cuotas),
        label: p.label,
      })),
      orden: String(editingTarjeta.orden),
      activo: editingTarjeta.activo,
    });
    setShowForm(true);
  }, [editingTarjeta]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingCodigo(null);
    setShowForm(false);
    setMessage(null);
  };

  const handleToggleActivo = async (tarjeta) => {
    if (!isAdmin) return;
    setMessage(null);
    try {
      await guardarEdicion(tarjeta.codigo, {
        nombre: tarjeta.nombre,
        tipoCarga: tarjeta.tipoCarga,
        parser: tarjeta.parser,
        manualPlanes: tarjeta.manualPlanes,
        orden: tarjeta.orden,
        activo: !tarjeta.activo,
      });
      setMessage(
        `Tarjeta "${tarjeta.nombre}" ${tarjeta.activo ? "desactivada" : "activada"}.`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo actualizar.");
    }
  };

  const handleSubmit = async () => {
    if (!isAdmin) return;
    setMessage(null);

    const manualPlanes = form.manualPlanes
      .filter((p) => p.cuotas.trim() && p.label.trim())
      .map((p) => {
        const n = Number(p.cuotas.replace(",", "."));
        return {
          cuotas: Number.isFinite(n) && n > 0 ? n : p.cuotas.trim(),
          label: p.label.trim(),
        };
      });

    const payload = {
      nombre: form.nombre.trim(),
      tipoCarga: form.tipoCarga,
      parser: form.tipoCarga === "automatica" ? form.parser : null,
      manualPlanes: form.tipoCarga === "manual" ? manualPlanes : [],
      orden: Number(form.orden) || 900,
      activo: form.activo,
    };

    try {
      if (editingCodigo) {
        await guardarEdicion(editingCodigo, payload);
        setMessage(`Tarjeta "${form.nombre}" actualizada.`);
      } else {
        await guardarNueva({ codigo: form.codigo, ...payload });
        setMessage(`Tarjeta "${form.nombre}" creada.`);
      }
      resetForm();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando tarjetas…
      </div>
    );
  }

  return (
    <div className="text-foreground space-y-6">
      <CoeficientesModuleNav />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-red-400" />
            <h1 className="text-2xl font-bold">Tarjetas (Consumo)</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Tarjetas de consumo del módulo de coeficientes. Los productos de
            financiación empresas se administran en{" "}
            <Link
              href="/dashboard/ajustes/coeficientes/financiacion-empresas"
              className="text-red-300 hover:text-red-200"
            >
              Financiación Empresas
            </Link>
            .
          </p>
        </div>
        {isAdmin && !showForm && (
          <Button
            type="button"
            onClick={() => {
              setForm(emptyForm());
              setEditingCodigo(null);
              setShowForm(true);
            }}
            className="bg-red-600 hover:bg-red-500 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Tarjeta
          </Button>
        )}
      </div>

      {(error || message) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            error || message?.includes("No se") || message?.includes("inválid")
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-green-500/30 bg-green-500/10 text-green-200"
          }`}
        >
          {error ?? message}
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Solo administradores pueden gestionar tarjetas.
        </div>
      )}

      {showForm && isAdmin && (
        <section className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground/80">
              {editingCodigo ? `Editar ${editingCodigo}` : "Nueva tarjeta"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="text-muted-foreground hover:text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Nombre</Label>
              <Input
                className={inputClass}
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="ej. Mi Tarjeta"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Código interno</Label>
              <Input
                className={inputClass}
                value={form.codigo}
                readOnly={Boolean(editingCodigo)}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                placeholder="ej. MI_TARJETA"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Orden</Label>
              <Input
                type="number"
                className={inputClass}
                value={form.orden}
                onChange={(e) =>
                  setForm((f) => ({ ...f, orden: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 text-sm text-muted-foreground pb-2">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, activo: e.target.checked }))
                  }
                  className="rounded border-zinc-600"
                />
                Activo
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">Tipo de carga</Label>
            <div className="flex flex-wrap gap-4">
              {[
                { value: "automatica", label: "Automática (importación)" },
                { value: "manual", label: "Manual (Tablas Vigentes)" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <input
                    type="radio"
                    name="tipoCarga"
                    checked={form.tipoCarga === opt.value}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        tipoCarga: /** @type {"automatica" | "manual"} */ (opt.value),
                      }))
                    }
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {form.tipoCarga === "automatica" && (
            <div className="space-y-2 max-w-md">
              <Label className="text-muted-foreground">Parser</Label>
              <select
                className={`w-full h-10 rounded-md px-3 ${inputClass}`}
                value={form.parser}
                onChange={(e) =>
                  setForm((f) => ({ ...f, parser: e.target.value }))
                }
              >
                {AVAILABLE_PARSERS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Los coeficientes se importan en{" "}
                <Link
                  href="/dashboard/ajustes/coeficientes/importar"
                  className="text-red-300 hover:text-red-200"
                >
                  Importar Coeficientes
                </Link>
                .
              </p>
            </div>
          )}

          {form.tipoCarga === "manual" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Planes manuales</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      manualPlanes: [...f.manualPlanes, emptyPlan()],
                    }))
                  }
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Plan
                </Button>
              </div>
              <div className="space-y-2">
                {form.manualPlanes.map((plan, idx) => (
                  <div key={idx} className="flex flex-wrap gap-2 items-center">
                    <Input
                      className={`${inputClass} max-w-[140px]`}
                      placeholder="Cuotas"
                      value={plan.cuotas}
                      onChange={(e) =>
                        setForm((f) => {
                          const next = [...f.manualPlanes];
                          next[idx] = { ...next[idx], cuotas: e.target.value };
                          return { ...f, manualPlanes: next };
                        })
                      }
                    />
                    <Input
                      className={`${inputClass} max-w-[200px]`}
                      placeholder="Etiqueta"
                      value={plan.label}
                      onChange={(e) =>
                        setForm((f) => {
                          const next = [...f.manualPlanes];
                          next[idx] = { ...next[idx], label: e.target.value };
                          return { ...f, manualPlanes: next };
                        })
                      }
                    />
                    {form.manualPlanes.length > 1 && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-red-400 text-xs"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            manualPlanes: f.manualPlanes.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            className="bg-red-600 hover:bg-red-500 text-white"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {editingCodigo ? "Guardar cambios" : "Crear tarjeta"}
          </Button>
        </section>
      )}

      <section className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={tableHeadClass}>Nombre</th>
                <th className={tableHeadClass}>Código</th>
                <th className={tableHeadClass}>Tipo</th>
                <th className={tableHeadClass}>Parser / Planes</th>
                <th className={tableHeadClass}>Orden</th>
                <th className={tableHeadClass}>Estado</th>
                {isAdmin && <th className={tableHeadClass} />}
              </tr>
            </thead>
            <tbody>
              {tarjetas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No hay tarjetas configuradas.
                  </td>
                </tr>
              ) : (
                tarjetas.map((t) => (
                  <tr key={t.codigo} className="hover:bg-muted/40">
                    <td className={`${tableCellClass} text-foreground/80 font-medium`}>
                      {t.nombre}
                    </td>
                    <td className={`${tableCellClass} font-mono text-muted-foreground`}>
                      {t.codigo}
                    </td>
                    <td className={tableCellClass}>
                      {t.tipoCarga === "manual" ? "Manual" : "Automática"}
                    </td>
                    <td className={`${tableCellClass} text-muted-foreground text-xs`}>
                      {t.tipoCarga === "manual"
                        ? t.manualPlanes.map((p) => p.label).join(", ")
                        : t.parser}
                    </td>
                    <td className={tableCellClass}>{t.orden}</td>
                    <td className={tableCellClass}>
                      {isAdmin ? (
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={t.activo}
                            disabled={saving}
                            onChange={() => void handleToggleActivo(t)}
                            className="rounded border-zinc-600"
                          />
                          <span
                            className={
                              t.activo ? "text-green-400" : "text-muted-foreground"
                            }
                          >
                            {t.activo ? "Activa" : "Inactiva"}
                          </span>
                        </label>
                      ) : (
                        <span
                          className={
                            t.activo ? "text-green-400" : "text-muted-foreground"
                          }
                        >
                          {t.activo ? "Activa" : "Inactiva"}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className={tableCellClass}>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            className="text-xs text-red-300 hover:text-red-200"
                            onClick={() => setEditingCodigo(t.codigo)}
                          >
                            Editar
                          </button>
                          {t.tipoCarga === "automatica" && t.activo && (
                            <Link
                              href="/dashboard/ajustes/coeficientes/importar"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground/80"
                            >
                              <Upload className="h-3 w-3" />
                              Importar
                            </Link>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
