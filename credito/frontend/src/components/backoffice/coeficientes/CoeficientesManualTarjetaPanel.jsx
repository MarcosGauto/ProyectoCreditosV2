"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Loader2, PenLine, Save } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/app/context/AuthContext";
import { useCoeficientesGlobales } from "@/hooks/useCoeficientesGlobales";
import { useCoeficientesImportaciones } from "@/hooks/useCoeficientesImportaciones";
import {
  calcularCoefFinalDirecto,
  calcularCoefPorcentajeDesdeBase,
  calcularManualTarjetaCoeficienteFinal,
  formatCoefPorcentajeDisplay,
} from "@/lib/coeficientes/coeficientesCalculo";
import {
  buildManualDraftFromRecords,
  draftToManualRecords,
  getManualPlanesEditables,
  isManualCoeficienteUnico,
  MANUAL_COEF_UNIFICADO_KEY,
} from "@/lib/coeficientes/coeficientesManualTarjetaModel";
import { isPlanRecordPendiente } from "@/lib/coeficientes/coeficientesTarjetaPlanesModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inputClass =
  "bg-card border-border text-foreground focus-visible:ring-red-500/40";

const tableHeadClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border";
const tableCellClass = "px-4 py-3 border-b border-border/60 text-sm";

function formatCoefBase(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR");
}

/**
 * @param {string} raw
 * @param {import("@/lib/coeficientes/coeficientesCalculo").CoeficientesGlobales} globales
 * @param {import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta} tarjeta
 */
function previewCoefFromDraft(raw, globales, tarjeta) {
  if (tarjeta.coefFinalDirecto) {
    const n = Number(String(raw ?? "").replace(",", ".").trim());
    if (!Number.isFinite(n) || n <= 0 || n >= 100) {
      return { pct: null, final: null };
    }
    const value = parseFloat(n.toFixed(2));
    return { pct: value, final: value };
  }

  const n = Number(String(raw ?? "").replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 1 || (n >= 10 && n <= 100)) {
    return { pct: null, final: null };
  }
  const pct = calcularCoefPorcentajeDesdeBase(n);
  const final = calcularManualTarjetaCoeficienteFinal(n, globales);
  return { pct, final };
}

/**
 * @param {{
 *   tarjeta: import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta;
 *   importaciones: import("@/lib/coeficientes/coeficientesVigentesModel").CoeficienteImportacion[];
 * }} props
 */
export function CoeficientesManualTarjetaPanel({ tarjeta, importaciones }) {
  const { user, isAdmin } = useAuth();
  const { globales } = useCoeficientesGlobales();
  const { importar, saving, error } = useCoeficientesImportaciones({
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
      importaciones
        .filter((imp) => imp.tarjeta === tarjeta.codigo)
        .slice(0, 5),
    [importaciones, tarjeta.codigo]
  );

  const planesEditables = useMemo(
    () => getManualPlanesEditables(tarjeta),
    [tarjeta]
  );
  const coefUnico = isManualCoeficienteUnico(tarjeta);

  const [vigenciaDesde, setVigenciaDesde] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [draft, setDraft] = useState(() =>
    buildManualDraftFromRecords(tarjeta, [])
  );
  const [message, setMessage] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    setDraft(buildManualDraftFromRecords(tarjeta, activeImport?.records ?? []));
    if (activeImport?.vigenciaDesde) {
      setVigenciaDesde(activeImport.vigenciaDesde);
    }
  }, [activeImport, tarjeta]);

  const handleSave = async () => {
    if (!isAdmin) return;
    setMessage(null);

    try {
      const records = draftToManualRecords(tarjeta, draft);
      await importar({
        tarjeta: tarjeta.codigo,
        records,
        vigenciaDesde,
        globales,
        origen: "Edición Manual",
        observaciones: `Edición manual ${tarjeta.codigo} desde ${vigenciaDesde}`,
      });
      setMessage(
        `Coeficientes ${tarjeta.nombre} guardados. La versión anterior pasó al historial.`
      );
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "No se pudieron guardar los coeficientes."
      );
    }
  };

  return (
    <section className="rounded-2xl border border-orange-500/25 bg-orange-500/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-orange-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-orange-300" />
          <h2 className="text-sm font-semibold text-orange-100">
            {tarjeta.nombre} — carga manual
          </h2>
        </div>
        <Link
          href="/dashboard/ajustes/coeficientes/historial"
          className="inline-flex items-center gap-1.5 text-xs text-orange-200/80 hover:text-orange-100"
        >
          <History className="h-3.5 w-3.5" />
          Ver historial completo
        </Link>
      </div>

      <div className="p-5 space-y-5">
        <p className="text-sm text-muted-foreground max-w-3xl">
          {tarjeta.coefFinalDirecto
            ? "Ingrese el coeficiente final directamente (ej. 7,85). Ese valor es el Coef. Final en tablas y comercial, sin arancel ni interés adicional."
            : "Planes definidos en configuración de tarjetas. Débito y 1 cuota usan arancel global (no se cargan aquí). Ingrese el coeficiente base multiplicador (ej. 1,0971 → Coef. % 9,71)."}
        </p>

        {(error || message) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              error || message?.includes("válido") || message?.includes("No se")
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-green-500/30 bg-green-500/10 text-green-200"
            }`}
          >
            {error ?? message}
          </div>
        )}

        {!isAdmin && (
          <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            Solo administradores pueden editar coeficientes manuales.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Fecha de vigencia</Label>
            <Input
              type="date"
              className={inputClass}
              value={vigenciaDesde}
              readOnly={!isAdmin}
              onChange={(e) => setVigenciaDesde(e.target.value)}
            />
          </div>
          {activeImport && (
            <div className="space-y-1 text-xs text-muted-foreground self-end pb-2">
              <p>
                Vigente desde:{" "}
                <span className="text-muted-foreground">
                  {activeImport.vigenciaDesde ?? "—"}
                </span>
              </p>
              <p>
                Última actualización:{" "}
                <span className="text-muted-foreground">
                  {formatDate(activeImport.importedAt)}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          {coefUnico ? (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Coef. Final % (todas las cuotas)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="ej. 7,85"
                    className={`${inputClass} tabular-nums`}
                    value={draft[MANUAL_COEF_UNIFICADO_KEY] ?? ""}
                    readOnly={!isAdmin}
                    onChange={(e) =>
                      setDraft({ [MANUAL_COEF_UNIFICADO_KEY]: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 self-end pb-2">
                  <p className="text-xs text-muted-foreground">Planes</p>
                  <p className="text-sm text-muted-foreground">
                    {planesEditables.map((p) => p.label).join(" · ")}
                  </p>
                </div>
              </div>
              {activeImport && (
                <p className="text-xs text-muted-foreground">
                  Vigente actual:{" "}
                  <span className="text-muted-foreground tabular-nums">
                    {formatCoefPorcentajeDisplay(
                      calcularCoefFinalDirecto(
                        activeImport.records.find(
                          (r) =>
                            r.coeficienteBase != null &&
                            Number(r.coeficienteBase) > 0
                        )?.coeficienteBase ?? 0
                      )
                    )}
                    %
                  </span>
                </p>
              )}
            </div>
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={tableHeadClass}>Plan</th>
                <th className={tableHeadClass}>Estado</th>
                <th className={tableHeadClass}>Coef. Base</th>
                <th className={tableHeadClass}>Coef. %</th>
                <th className={tableHeadClass}>Coef. Final</th>
                <th className={tableHeadClass}>Vigente actual</th>
              </tr>
            </thead>
            <tbody>
              {planesEditables.map((plan) => {
                const key = String(plan.cuotas);
                const current = activeImport?.records.find(
                  (r) => String(r.cuotas) === key
                );
                const preview = previewCoefFromDraft(draft[key], globales, tarjeta);
                const pendiente = isPlanRecordPendiente(current, plan);
                return (
                  <tr
                    key={key}
                    className={
                      pendiente
                        ? "bg-amber-500/10 hover:bg-amber-500/15"
                        : "hover:bg-muted/40"
                    }
                  >
                    <td className={`${tableCellClass} text-muted-foreground font-medium`}>
                      {plan.label}
                    </td>
                    <td className={tableCellClass}>
                      {pendiente ? (
                        <span className="text-xs font-medium text-amber-300">
                          Pendiente
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Completo</span>
                      )}
                    </td>
                    <td className={tableCellClass}>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="ej. 1.0971"
                        className={`${inputClass} max-w-[160px] tabular-nums`}
                        value={draft[key] ?? ""}
                        readOnly={!isAdmin}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className={`${tableCellClass} tabular-nums text-muted-foreground`}>
                      {formatCoefPorcentajeDisplay(preview.pct)}
                    </td>
                    <td className={`${tableCellClass} tabular-nums text-orange-200/90`}>
                      {formatCoefPorcentajeDisplay(preview.final)}
                    </td>
                    <td className={`${tableCellClass} tabular-nums text-muted-foreground`}>
                      {formatCoefBase(current?.coeficienteBase)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>

        {isAdmin && (
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-500 text-foreground"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar coeficientes {tarjeta.nombre}
          </Button>
        )}

        {historial.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Historial reciente {tarjeta.nombre}
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              {historial.map((imp) => (
                <li key={imp.id} className="flex flex-wrap gap-x-3 gap-y-1">
                  <span
                    className={
                      imp.estado === "activa"
                        ? "text-green-400 font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {imp.estado === "activa" ? "Vigente" : "Histórica"}
                  </span>
                  <span>Vigencia: {imp.vigenciaDesde ?? "—"}</span>
                  <span>{formatDate(imp.importedAt)}</span>
                  <span>{imp.recordCount} planes</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
