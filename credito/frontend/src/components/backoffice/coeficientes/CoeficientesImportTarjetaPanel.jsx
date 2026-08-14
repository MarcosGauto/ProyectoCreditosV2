"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, History, Loader2, PenLine, Save, Trash2 } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/app/context/AuthContext";
import { useCoeficientesGlobales } from "@/hooks/useCoeficientesGlobales";
import { useCoeficientesImportaciones } from "@/hooks/useCoeficientesImportaciones";
import {
  enrichVigenteRow,
  formatCoefPorcentajeDisplay,
} from "@/lib/coeficientes/coeficientesCalculo";
import { parseManualCoeficienteBase } from "@/lib/coeficientes/coeficientesManualTarjetaModel";
import {
  buildTarjetaPlanesVigentesRows,
  countPlanesPendientes,
  isPlanArancelGlobalCuotas,
  planCuotasKey,
} from "@/lib/coeficientes/coeficientesTarjetaPlanesModel";
import { buildTablasVigentesDisplayRow } from "@/lib/coeficientes/tablasVigentesDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const inputClass =
  "bg-card border-border text-foreground focus-visible:ring-amber-500/40 h-8 text-sm tabular-nums";

const tableHeadClass =
  "px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border";
const tableCellClass = "px-3 py-3 border-b border-border/60 text-sm tabular-nums";

function formatCoefBase(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR");
}

/**
 * @param {import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta} tarjeta
 * @param {string | number} cuotas
 * @param {number | null} coeficienteBase
 * @param {import("@/lib/coeficientes/coeficientesCalculo").CoeficientesGlobales} globales
 * @param {number} basePrice
 */
function buildPlanPreview(tarjeta, cuotas, coeficienteBase, globales, basePrice) {
  if (coeficienteBase == null || coeficienteBase <= 0) {
    return null;
  }

  const vigenteRow = {
    tarjeta: tarjeta.codigo,
    cuotas,
    coeficienteBase,
    coeficienteBaseImportado: coeficienteBase,
  };

  const display = buildTablasVigentesDisplayRow(vigenteRow, globales);
  const enriched = enrichVigenteRow(vigenteRow, globales, basePrice);

  return { display, enriched };
}

/**
 * @param {{
 *   tarjeta: import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta;
 *   importaciones: import("@/lib/coeficientes/coeficientesVigentesModel").CoeficienteImportacion[];
 *   basePrice?: number;
 * }} props
 */
export function CoeficientesImportTarjetaPanel({
  tarjeta,
  importaciones,
  basePrice = 1000,
}) {
  const { user, isAdmin } = useAuth();
  const { globales } = useCoeficientesGlobales();
  const { completarCuota, toggleActivaCuota, eliminarCuota, saving, error } =
    useCoeficientesImportaciones({
      userEmail: user?.email ?? null,
    });

  const activeImport = useMemo(
    () =>
      importaciones.find(
        (imp) => imp.tarjeta === tarjeta.codigo && imp.estado === "activa"
      ) ?? null,
    [importaciones, tarjeta.codigo]
  );

  const historial = useMemo(
    () =>
      importaciones.filter((imp) => imp.tarjeta === tarjeta.codigo).slice(0, 5),
    [importaciones, tarjeta.codigo]
  );

  const planRows = useMemo(
    () => buildTarjetaPlanesVigentesRows(tarjeta, activeImport),
    [tarjeta, activeImport]
  );

  const pendientesCount = useMemo(
    () => countPlanesPendientes(tarjeta, activeImport),
    [tarjeta, activeImport]
  );

  const [editingKeys, setEditingKeys] = useState(
    /** @type {Set<string>} */ (new Set())
  );
  const [drafts, setDrafts] = useState(/** @type {Record<string, string>} */ ({}));
  const [savingKey, setSavingKey] = useState(/** @type {string | null} */ (null));
  const [message, setMessage] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    setEditingKeys(new Set());
    setDrafts({});
    setMessage(null);
  }, [activeImport?.id]);

  if (!activeImport) {
    return null;
  }

  const startEdit = (key, initial = "") => {
    setEditingKeys((prev) => new Set(prev).add(key));
    setDrafts((prev) => ({ ...prev, [key]: initial }));
  };

  const handleSaveRow = async (key, cuotas, record) => {
    if (!isAdmin || !activeImport) return;
    setMessage(null);

    let coeficienteBase;
    try {
      coeficienteBase = parseManualCoeficienteBase(drafts[key]);
      if (coeficienteBase == null) {
        throw new Error("Ingrese un coeficiente base válido.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Valor inválido.");
      return;
    }

    setSavingKey(key);
    try {
      await completarCuota({
        importId: activeImport.id,
        tarjeta: tarjeta.codigo,
        cuotas,
        coeficienteBase,
        globales,
        activo: record?.activo !== false,
      });
      setEditingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setMessage(`Plan guardado correctamente (${tarjeta.nombre}).`);
    } catch {
      /* error en hook */
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleActiva = async (cuotas, activo) => {
    if (!isAdmin || !activeImport) return;
    setMessage(null);
    try {
      await toggleActivaCuota({
        importId: activeImport.id,
        tarjeta: tarjeta.codigo,
        cuotas,
        activo,
      });
      setMessage(
        activo
          ? "Cuota activada correctamente."
          : "Cuota desactivada correctamente."
      );
    } catch {
      /* error en hook */
    }
  };

  const handleDelete = async (cuotas, label) => {
    if (!isAdmin || !activeImport) return;
    if (
      !confirm(
        `¿Eliminar la cuota "${label}" de ${tarjeta.nombre}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setMessage(null);
    try {
      await eliminarCuota({
        importId: activeImport.id,
        tarjeta: tarjeta.codigo,
        cuotas,
      });
      setMessage(`Cuota "${label}" eliminada.`);
    } catch {
      /* error en hook */
    }
  };

  return (
    <section
      className={`rounded-2xl border overflow-hidden ${
        pendientesCount > 0
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border bg-muted/40"
      }`}
    >
      <div className="px-5 py-4 border-b border-border/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-sky-300" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {tarjeta.nombre} — importación vigente
            </h2>
            {pendientesCount > 0 && (
              <p className="text-xs text-amber-200/90 mt-0.5 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {pendientesCount} plan{pendientesCount === 1 ? "" : "es"} pendiente
                {pendientesCount === 1 ? "" : "s"} de completar
              </p>
            )}
          </div>
        </div>
        <Link
          href="/dashboard/ajustes/coeficientes/historial"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/80"
        >
          <History className="h-3.5 w-3.5" />
          Ver historial
        </Link>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-muted-foreground max-w-3xl">
          Todos los planes esperados para esta tarjeta. Si la importación no detectó
          alguna cuota, complete el coeficiente base aquí sin volver a importar el
          archivo.
        </p>

        {(error || message) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              error || message?.includes("No se") || message?.includes("válid")
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-green-500/30 bg-green-500/10 text-green-200"
            }`}
          >
            {error ?? message}
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>
            Vigencia:{" "}
            <span className="text-muted-foreground">{activeImport.vigenciaDesde ?? "—"}</span>
          </span>
          <span>
            Actualizado:{" "}
            <span className="text-muted-foreground">{formatDate(activeImport.importedAt)}</span>
          </span>
          <span>
            Registros importados:{" "}
            <span className="text-muted-foreground">{activeImport.recordCount}</span>
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr>
                <th className={tableHeadClass}>Cuotas</th>
                <th className={tableHeadClass}>Estado</th>
                <th className={tableHeadClass}>Coef. Base</th>
                <th className={tableHeadClass}>Coef. %</th>
                <th className={tableHeadClass}>Coef. Final</th>
                <th className={tableHeadClass}>Tasa directa</th>
                <th className={tableHeadClass}>Precio financiado</th>
                <th className={tableHeadClass}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {planRows.map(({ plan, record, pendiente, cuotas, inactiva }) => {
                const key = planCuotasKey(plan.cuotas);
                const isArancel = isPlanArancelGlobalCuotas(cuotas);
                const isEditing = editingKeys.has(key);
                const draftValue = drafts[key] ?? "";
                const currentBase =
                  record?.coeficienteBase != null &&
                  Number(record.coeficienteBase) > 0
                    ? Number(record.coeficienteBase)
                    : null;

                let previewBase = currentBase;
                if (isEditing && draftValue.trim()) {
                  try {
                    previewBase = parseManualCoeficienteBase(draftValue);
                  } catch {
                    previewBase = null;
                  }
                }

                const preview = previewBase
                  ? buildPlanPreview(
                      tarjeta,
                      cuotas,
                      previewBase,
                      globales,
                      basePrice
                    )
                  : isArancel
                    ? buildPlanPreview(tarjeta, cuotas, 0, globales, basePrice)
                    : null;

                const rowSaving = savingKey === key;

                return (
                  <tr
                    key={key}
                    className={
                      pendiente
                        ? "bg-amber-500/10 hover:bg-amber-500/15"
                        : inactiva
                          ? "opacity-50 hover:bg-muted/30"
                          : "hover:bg-muted/40"
                    }
                  >
                    <td className={`${tableCellClass} text-muted-foreground font-medium`}>
                      {plan.label}
                    </td>
                    <td className={tableCellClass}>
                      {pendiente ? (
                        <span className="inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-200">
                          Pendiente
                        </span>
                      ) : inactiva ? (
                        <span className="inline-flex items-center rounded-md border border-zinc-600 bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Inactiva
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-300">
                          Activa
                        </span>
                      )}
                    </td>
                    <td className={tableCellClass}>
                      {isArancel ? (
                        <span className="text-muted-foreground text-xs">Arancel global</span>
                      ) : isEditing && isAdmin ? (
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="ej. 1.0487"
                          className={`${inputClass} max-w-[140px]`}
                          value={draftValue}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        formatCoefBase(currentBase)
                      )}
                    </td>
                    <td className={`${tableCellClass} text-muted-foreground`}>
                      {formatCoefPorcentajeDisplay(
                        preview?.display?.coefPorcentajeDisplay
                      )}
                    </td>
                    <td className={`${tableCellClass} text-red-300 font-medium`}>
                      {formatCoefPorcentajeDisplay(
                        preview?.display?.coefFinalDisplay
                      )}
                    </td>
                    <td className={tableCellClass}>
                      {preview?.enriched?.tasaDirecta != null
                        ? `${Number(preview.enriched.tasaDirecta).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                        : "—"}
                    </td>
                    <td className={tableCellClass}>
                      {preview?.enriched?.precioFinanciado != null
                        ? formatMoney(preview.enriched.precioFinanciado)
                        : "—"}
                    </td>
                    <td className={tableCellClass}>
                      {isArancel || !isAdmin ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {isEditing ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={rowSaving || saving}
                              onClick={() => void handleSaveRow(key, plan.cuotas, record)}
                              className="h-8 bg-amber-600 hover:bg-amber-500 text-foreground"
                            >
                              {rowSaving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Save className="h-3.5 w-3.5 mr-1" />
                                  Guardar
                                </>
                              )}
                            </Button>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={saving}
                                onClick={() =>
                                  startEdit(
                                    key,
                                    currentBase != null ? String(currentBase) : ""
                                  )
                                }
                                className="h-8 border-border text-foreground/80"
                              >
                                {pendiente ? "Completar" : "Editar"}
                              </Button>
                              {!pendiente && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={saving}
                                  onClick={() =>
                                    void handleToggleActiva(
                                      plan.cuotas,
                                      inactiva
                                    )
                                  }
                                  className="h-8 border-border text-muted-foreground"
                                >
                                  {inactiva ? "Activar" : "Desactivar"}
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={saving || pendiente}
                                onClick={() =>
                                  void handleDelete(plan.cuotas, plan.label)
                                }
                                className="h-8 border-red-900/50 text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {historial.length > 1 && (
          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Historial reciente
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              {historial.map((imp) => (
                <li key={imp.id} className="flex flex-wrap gap-x-3">
                  <span
                    className={
                      imp.estado === "activa"
                        ? "text-green-400"
                        : "text-muted-foreground"
                    }
                  >
                    {imp.estado === "activa" ? "Vigente" : "Histórica"}
                  </span>
                  <span>{formatDate(imp.importedAt)}</span>
                  <span>{imp.recordCount} registros</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
