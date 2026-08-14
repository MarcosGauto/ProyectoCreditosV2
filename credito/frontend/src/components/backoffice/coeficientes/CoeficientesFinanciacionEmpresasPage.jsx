"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Plus, Save } from "lucide-react";

import { useAuth } from "@/app/context/AuthContext";
import { useCoeficientesEmpresas } from "@/hooks/useCoeficientesEmpresas";
import { useCoeficientesTarjetas } from "@/hooks/useCoeficientesTarjetas";
import { CoeficientesModuleNav } from "@/components/backoffice/coeficientes/CoeficientesModuleNav";
import { numOrPercent } from "@/lib/coeficientes/coeficientesEmpresasModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inputClass =
  "bg-card border-border text-foreground focus-visible:ring-red-500/40";

const tableHeadClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border";
const tableCellClass = "px-4 py-3 border-b border-border/60 text-sm";

/**
 * @param {import("@/lib/coeficientes/coeficientesEmpresasModel").EmpresaFinanciacionLinea} linea
 */
function lineaToDraft(linea) {
  return {
    id: linea.id,
    nombre: linea.nombre,
    plazo: linea.plazo ?? "",
    tna: String(linea.tna),
    comision: String(linea.comision),
    observaciones: linea.observaciones ?? "",
    orden: linea.orden,
    activo: linea.activo,
  };
}

function emptyLineaDraft(orden = 1) {
  return {
    id: "",
    nombre: "",
    plazo: "",
    tna: "",
    comision: "",
    observaciones: "",
    orden,
    activo: true,
  };
}

function formatPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return (
    n.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

function formatUpdatedAt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR");
}

/**
 * @param {{
 *   producto: import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta;
 *   financiacion: import("@/lib/coeficientes/coeficientesEmpresasModel").EmpresaFinanciacion | null;
 *   saving: boolean;
 *   isAdmin: boolean;
 *   onSave: (payload: {
 *     productoCodigo: string;
 *     lineas: import("@/lib/coeficientes/coeficientesEmpresasModel").EmpresaFinanciacionLinea[];
 *     vigenciaDesde: string | null;
 *   }) => Promise<void>;
 * }} props
 */
function ProductoEmpresasPanel({ producto, financiacion, saving, isAdmin, onSave }) {
  const [vigenciaDesde, setVigenciaDesde] = useState(
    () => financiacion?.vigenciaDesde ?? new Date().toISOString().slice(0, 10)
  );
  const [draft, setDraft] = useState(() =>
    financiacion?.lineas?.length
      ? financiacion.lineas.map(lineaToDraft)
      : [emptyLineaDraft()]
  );
  const [message, setMessage] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    setDraft(
      financiacion?.lineas?.length
        ? financiacion.lineas.map(lineaToDraft)
        : [emptyLineaDraft()]
    );
    if (financiacion?.vigenciaDesde) {
      setVigenciaDesde(financiacion.vigenciaDesde);
    }
  }, [financiacion, producto.codigo]);

  const handleSave = async () => {
    if (!isAdmin) return;
    setMessage(null);

    const lineas = draft
      .filter((l) => String(l.nombre).trim())
      .map((l, idx) => ({
        id: String(l.id || `${producto.codigo}_${idx + 1}`).trim(),
        nombre: String(l.nombre).trim(),
        plazo: String(l.plazo ?? "").trim(),
        tna: numOrPercent(l.tna),
        comision: numOrPercent(l.comision),
        observaciones: String(l.observaciones ?? "").trim(),
        orden: Number(l.orden) || idx + 1,
        activo: l.activo !== false,
      }));

    if (!lineas.length) {
      setMessage("Defina al menos una línea con nombre.");
      return;
    }

    try {
      await onSave({
        productoCodigo: producto.codigo,
        lineas,
        vigenciaDesde: vigenciaDesde || null,
        origen: "Edición Manual",
        observaciones: `Edición empresas ${producto.codigo} desde ${vigenciaDesde || "—"}`,
      });
      setMessage("Financiación guardada.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  };

  const readOnlyRows = !isAdmin && financiacion?.lineas?.length;

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{producto.nombre}</h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{producto.codigo}</p>
        </div>
        {financiacion?.updatedAt && (
          <p className="text-xs text-muted-foreground">
            Actualizado: {formatUpdatedAt(financiacion.updatedAt)}
            {financiacion.updatedBy ? ` · ${financiacion.updatedBy}` : ""}
          </p>
        )}
      </div>

      {readOnlyRows ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={tableHeadClass}>Línea</th>
                <th className={tableHeadClass}>Plazo</th>
                <th className={tableHeadClass}>TNA</th>
                <th className={tableHeadClass}>Comisión</th>
                <th className={tableHeadClass}>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {financiacion.lineas
                .filter((l) => l.activo)
                .map((l) => (
                  <tr key={l.id}>
                    <td className={`${tableCellClass} text-foreground/80`}>{l.nombre}</td>
                    <td className={`${tableCellClass} text-muted-foreground`}>
                      {l.plazo || "—"}
                    </td>
                    <td className={`${tableCellClass} tabular-nums`}>
                      {formatPct(l.tna)}
                    </td>
                    <td className={`${tableCellClass} tabular-nums`}>
                      {formatPct(l.comision)}
                    </td>
                    <td className={`${tableCellClass} text-muted-foreground`}>
                      {l.observaciones || "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label className="text-muted-foreground">Vigencia desde</Label>
            <Input
              type="date"
              className={inputClass}
              value={vigenciaDesde}
              disabled={!isAdmin}
              onChange={(e) => setVigenciaDesde(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">Líneas de financiación</Label>
              {isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((d) => [...d, emptyLineaDraft(d.length + 1)])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Línea
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {draft.map((linea, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 rounded-xl border border-border/80 bg-card"
                >
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs text-muted-foreground">Nombre</Label>
                    <Input
                      className={inputClass}
                      placeholder="ej. 90 días"
                      value={linea.nombre}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setDraft((d) => {
                          const next = [...d];
                          next[idx] = { ...next[idx], nombre: e.target.value };
                          return next;
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Plazo</Label>
                    <Input
                      className={inputClass}
                      placeholder="ej. 90 días"
                      value={linea.plazo}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setDraft((d) => {
                          const next = [...d];
                          next[idx] = { ...next[idx], plazo: e.target.value };
                          return next;
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">TNA %</Label>
                    <Input
                      className={inputClass}
                      placeholder="34"
                      value={linea.tna}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setDraft((d) => {
                          const next = [...d];
                          next[idx] = { ...next[idx], tna: e.target.value };
                          return next;
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Comisión %</Label>
                    <Input
                      className={inputClass}
                      placeholder="1,80"
                      value={linea.comision}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setDraft((d) => {
                          const next = [...d];
                          next[idx] = { ...next[idx], comision: e.target.value };
                          return next;
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Observaciones</Label>
                    <Input
                      className={inputClass}
                      placeholder="Opcional"
                      value={linea.observaciones}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setDraft((d) => {
                          const next = [...d];
                          next[idx] = {
                            ...next[idx],
                            observaciones: e.target.value,
                          };
                          return next;
                        })
                      }
                    />
                  </div>
                  {isAdmin && draft.length > 1 && (
                    <div className="sm:col-span-2 lg:col-span-6 flex justify-end">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-red-400"
                        onClick={() =>
                          setDraft((d) => d.filter((_, i) => i !== idx))
                        }
                      >
                        Quitar línea
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isAdmin && (
            <Button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar {producto.nombre}
            </Button>
          )}

          {message && (
            <p
              className={`text-sm ${
                message.includes("guardada")
                  ? "text-green-300"
                  : "text-red-300"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function CoeficientesFinanciacionEmpresasPage() {
  const { user, isAdmin } = useAuth();
  const { empresasTarjetas, loading: loadingTarjetas } = useCoeficientesTarjetas();
  const {
    financiaciones,
    loading: loadingFin,
    saving,
    error,
    guardar,
  } = useCoeficientesEmpresas({ userEmail: user?.email ?? null });

  const financiacionByProducto = useMemo(() => {
    /** @type {Map<string, import("@/lib/coeficientes/coeficientesEmpresasModel").EmpresaFinanciacion>} */
    const map = new Map();
    for (const f of financiaciones) {
      map.set(f.productoCodigo, f);
    }
    return map;
  }, [financiaciones]);

  const loading = loadingTarjetas || loadingFin;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando financiación empresas…
      </div>
    );
  }

  return (
    <div className="text-foreground space-y-6">
      <CoeficientesModuleNav />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-red-400" />
          <h1 className="text-2xl font-bold">Financiación Empresas</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Productos de financiación para empresas (Pactar, Pymenación, BNA Conecta).
          Se administran por separado de las tarjetas de consumo: no participan en
          tablas vigentes, planilla comercial ni cálculos por cuotas.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Solo administradores pueden editar los valores. Los datos vigentes se
          muestran en modo lectura.
        </div>
      )}

      {empresasTarjetas.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-8 text-center text-muted-foreground">
          No hay productos empresas configurados en el catálogo.
        </div>
      ) : (
        <div className="space-y-6">
          {empresasTarjetas.map((producto) => (
            <ProductoEmpresasPanel
              key={producto.codigo}
              producto={producto}
              financiacion={financiacionByProducto.get(producto.codigo) ?? null}
              saving={saving}
              isAdmin={Boolean(isAdmin)}
              onSave={guardar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
