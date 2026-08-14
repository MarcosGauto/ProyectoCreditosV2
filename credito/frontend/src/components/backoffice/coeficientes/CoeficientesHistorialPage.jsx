"use client";

import { useMemo, useState } from "react";
import { Eye, History, Loader2, RotateCcw } from "lucide-react";

import { useAuth } from "@/app/context/AuthContext";
import { useCoeficientesGlobales } from "@/hooks/useCoeficientesGlobales";
import { useCoeficientesImportaciones } from "@/hooks/useCoeficientesImportaciones";
import { CoeficientesModuleNav } from "@/components/backoffice/coeficientes/CoeficientesModuleNav";
import {
  enrichImportacionRecords,
  calcularManualTarjetaCoeficienteFinal,
  formatInteresFactor,
} from "@/lib/coeficientes/coeficientesCalculo";
import { isManualTarjeta } from "@/lib/coeficientes/coeficientesTarjetasModel";
import { useCoeficientesTarjetas } from "@/hooks/useCoeficientesTarjetas";
import { getTarjetaDisplayLabel } from "@/lib/coeficientes/coeficientesTarjetasModel";
import { Button } from "@/components/ui/button";

const tableHeadClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border";
const tableCellClass = "px-4 py-3 border-b border-border/60 text-sm";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR");
}

export function CoeficientesHistorialPage() {
  const { user, isAdmin } = useAuth();
  const { globales } = useCoeficientesGlobales();
  const { tarjetas } = useCoeficientesTarjetas();
  const { importaciones, loading, saving, error, restaurar, verDetalle } =
    useCoeficientesImportaciones({ userEmail: user?.email ?? null });

  const [detail, setDetail] = useState(
    /** @type {import("@/lib/coeficientes/coeficientesVigentesModel").CoeficienteImportacion | null} */ (
      null
    )
  );
  const [message, setMessage] = useState(/** @type {string | null} */ (null));

  const detailRecords = useMemo(() => {
    if (!detail) return [];
    if (isManualTarjeta(detail.tarjeta, tarjetas)) {
      return detail.records.map((row) => {
        const base = Number(row.coeficienteBase) || 0;
        const interesAdicional = globales.interes;
        const coeficienteFinal = calcularManualTarjetaCoeficienteFinal(
          base,
          globales
        );
        return {
          ...row,
          coeficienteBase: base,
          interesAdicional,
          coeficienteFinal,
        };
      });
    }
    return enrichImportacionRecords(detail.records, globales);
  }, [detail, globales, tarjetas]);

  const handleView = async (id) => {
    const data = await verDetalle(id);
    setDetail(data);
  };

  const handleRestore = async (id) => {
    if (!isAdmin) return;
    if (!confirm("¿Restaurar esta importación como vigente para la tarjeta?")) {
      return;
    }
    setMessage(null);
    try {
      await restaurar(id);
      setMessage("Importación restaurada correctamente.");
      setDetail(null);
    } catch {
      setMessage("No se pudo restaurar la importación.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando historial…
      </div>
    );
  }

  return (
    <div className="text-foreground space-y-6">
      <CoeficientesModuleNav />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <History className="w-5 h-5 text-red-400" />
          <h1 className="text-2xl font-bold">Historial de Importaciones</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Consulte importaciones anteriores y restaure una versión vigente por tarjeta.
          El Coef. Final se calcula con los parámetros globales vigentes.
        </p>
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

      <section className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={tableHeadClass}>Fecha importación</th>
                <th className={tableHeadClass}>Usuario</th>
                <th className={tableHeadClass}>Tarjeta</th>
                <th className={tableHeadClass}>Registros</th>
                <th className={tableHeadClass}>Estado</th>
                <th className={tableHeadClass}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {importaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No hay importaciones registradas.
                  </td>
                </tr>
              ) : (
                importaciones.map((imp) => (
                  <tr key={imp.id} className="hover:bg-muted/40">
                    <td className={tableCellClass}>{formatDate(imp.importedAt)}</td>
                    <td className={tableCellClass}>{imp.importedBy ?? "—"}</td>
                    <td className={tableCellClass}>
                      {getTarjetaDisplayLabel(imp.tarjeta, tarjetas)}
                    </td>
                    <td className={`${tableCellClass} tabular-nums`}>
                      {imp.recordCount}
                    </td>
                    <td className={tableCellClass}>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          imp.estado === "activa"
                            ? "bg-green-500/15 text-green-300"
                            : "bg-zinc-700/50 text-muted-foreground"
                        }`}
                      >
                        {imp.estado === "activa" ? "Activa" : "Histórica"}
                      </span>
                    </td>
                    <td className={tableCellClass}>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void handleView(imp.id)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Ver
                        </Button>
                        {isAdmin && imp.estado !== "activa" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={saving}
                            onClick={() => void handleRestore(imp.id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Restaurar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detail && (
        <section className="rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-card flex flex-wrap justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground/80">
                Detalle — {getTarjetaDisplayLabel(detail.tarjeta, tarjetas)}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Vigencia desde: {detail.vigenciaDesde ?? "—"} · Importado:{" "}
                {formatDate(detail.importedAt)}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDetail(null)}
            >
              Cerrar
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={tableHeadClass}>Cuotas</th>
                  <th className={tableHeadClass}>Coef. Base</th>
                  <th className={tableHeadClass}>Int. Adic.</th>
                  <th className={tableHeadClass}>Coef. Final</th>
                </tr>
              </thead>
              <tbody>
                {detailRecords.map((row, idx) => (
                  <tr key={idx}>
                    <td className={tableCellClass}>{row.cuotas}</td>
                    <td className={`${tableCellClass} tabular-nums`}>
                      {row.coeficienteBase.toLocaleString("es-AR", {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })}
                    </td>
                    <td className={tableCellClass}>
                      {row.interesAdicional > 1
                        ? formatInteresFactor(row.interesAdicional)
                        : "—"}
                    </td>
                    <td className={`${tableCellClass} tabular-nums text-red-300`}>
                      {row.coeficienteFinal.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
