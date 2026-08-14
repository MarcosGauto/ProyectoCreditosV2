"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Eye,
  History,
  Loader2,
  RotateCcw,
} from "lucide-react";

import { useAuth } from "@/app/context/AuthContext";
import { useCoeficientesGlobales } from "@/hooks/useCoeficientesGlobales";
import { useCoeficientesHistorialVigencias } from "@/hooks/useCoeficientesHistorialVigencias";
import { useCoeficientesTarjetas } from "@/hooks/useCoeficientesTarjetas";
import { useCoeficientesVigentes } from "@/hooks/useCoeficientesVigentes";
import { CoeficientesModuleNav } from "@/components/backoffice/coeficientes/CoeficientesModuleNav";
import {
  compareConsumoHistorialVsVigente,
  formatCompareDiferencia,
  formatHistorialCoef,
  getCompareDiffClass,
} from "@/lib/coeficientes/coeficientesHistorialCompare";
import { buildTablasVigentesDisplayTable } from "@/lib/coeficientes/tablasVigentesDisplay";
import { getTarjetaDisplayLabel } from "@/lib/coeficientes/coeficientesTarjetasModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const tableHeadClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border";
const tableCellClass = "px-4 py-3 border-b border-border/60 text-sm";

const inputClass =
  "bg-card border-border text-foreground focus-visible:ring-red-500/40";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR");
}

function formatDateOnly(value) {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  return value;
}

/**
 * @param {import("@/lib/coeficientes/coeficientesHistorialModel").CoeficientesHistorialEntry} entry
 */
function HistorialDetailPanel({ entry }) {
  if (entry.tipo === "Empresas") {
    return (
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px]">
          <thead className="bg-muted/80">
            <tr>
              <th className={tableHeadClass}>Producto</th>
              <th className={tableHeadClass}>Línea</th>
              <th className={tableHeadClass}>Plazo</th>
              <th className={tableHeadClass}>TNA</th>
              <th className={tableHeadClass}>Comisión</th>
            </tr>
          </thead>
          <tbody>
            {entry.coeficientes.map((row, idx) => (
              <tr key={`${row.productoCodigo}-${row.lineaId}-${idx}`}>
                <td className={tableCellClass}>{row.productoCodigo}</td>
                <td className={tableCellClass}>{row.lineaNombre}</td>
                <td className={tableCellClass}>{row.plazo || "—"}</td>
                <td className={tableCellClass}>{formatHistorialCoef(row.tna)}%</td>
                <td className={tableCellClass}>
                  {formatHistorialCoef(row.comision)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px]">
        <thead className="bg-muted/80">
          <tr>
            <th className={tableHeadClass}>Tarjeta</th>
            <th className={tableHeadClass}>Cuota</th>
            <th className={tableHeadClass}>Coef. Final</th>
          </tr>
        </thead>
        <tbody>
          {entry.coeficientes.map((row, idx) => (
            <tr key={`${row.tarjeta}-${row.cuotas}-${idx}`}>
              <td className={tableCellClass}>{row.tarjeta}</td>
              <td className={tableCellClass}>{row.cuotas}</td>
              <td className={tableCellClass}>
                {formatHistorialCoef(row.coefFinalDisplay)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * @param {{
 *   entry: import("@/lib/coeficientes/coeficientesHistorialModel").CoeficientesHistorialEntry;
 *   vigenteDisplay: ReturnType<typeof buildTablasVigentesDisplayTable>;
 *   tarjetas: import("@/lib/coeficientes/coeficientesTarjetasModel").CoeficienteTarjeta[];
 * }} props
 */
function ComparePanel({ entry, vigenteDisplay, tarjetas }) {
  const [tarjetaFilter, setTarjetaFilter] = useState("");

  const compare = useMemo(() => {
    if (entry.tipo !== "Consumo") return null;
    return compareConsumoHistorialVsVigente(
      /** @type {import("@/lib/coeficientes/coeficientesHistorialModel").CoeficientesHistorialConsumoRow[]} */ (
        entry.coeficientes
      ),
      vigenteDisplay,
      tarjetaFilter
    );
  }, [entry, vigenteDisplay, tarjetaFilter]);

  if (entry.tipo !== "Consumo") {
    return (
      <p className="text-sm text-muted-foreground">
        La comparación detallada está disponible solo para vigencias de Consumo.
      </p>
    );
  }

  if (!compare) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">Filtrar tarjeta</Label>
          <select
            className={`${inputClass} rounded-md h-9 px-3 text-sm min-w-[180px]`}
            value={tarjetaFilter}
            onChange={(e) => setTarjetaFilter(e.target.value)}
          >
            <option value="">Todas</option>
            {compare.tarjetas.map((t) => (
              <option key={t} value={t}>
                {getTarjetaDisplayLabel(t, tarjetas)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px]">
          <thead className="bg-muted/80">
            <tr>
              <th className={tableHeadClass}>Tarjeta</th>
              <th className={tableHeadClass}>Cuota</th>
              <th className={tableHeadClass}>Histórica</th>
              <th className={tableHeadClass}>Vigente</th>
              <th className={tableHeadClass}>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {compare.rows.map((row) => (
              <tr key={`${row.tarjeta}-${row.cuotas}`}>
                <td className={tableCellClass}>
                  {getTarjetaDisplayLabel(row.tarjeta, tarjetas)}
                </td>
                <td className={tableCellClass}>{row.cuotas}</td>
                <td className={tableCellClass}>
                  {formatHistorialCoef(row.historico)}
                </td>
                <td className={tableCellClass}>
                  {formatHistorialCoef(row.vigente)}
                </td>
                <td
                  className={`${tableCellClass} font-medium ${getCompareDiffClass(row.cambio)}`}
                >
                  {formatCompareDiferencia(row.diferencia, row.cambio)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CoeficientesHistorialVigenciasPage() {
  const { user, isAdmin } = useAuth();
  const { tarjetas } = useCoeficientesTarjetas();
  const { globales } = useCoeficientesGlobales();
  const { vigentesRaw } = useCoeficientesVigentes();
  const { entries, loading, saving, error, verDetalle, restaurar } =
    useCoeficientesHistorialVigencias({ userEmail: user?.email ?? null });

  const [detail, setDetail] = useState(
    /** @type {import("@/lib/coeficientes/coeficientesHistorialModel").CoeficientesHistorialEntry | null} */ (
      null
    )
  );
  const [mode, setMode] = useState(/** @type {"detail" | "compare" | null} */ (null));
  const [message, setMessage] = useState(/** @type {string | null} */ (null));
  const [restoreVigencia, setRestoreVigencia] = useState(
    () => new Date().toISOString().slice(0, 10)
  );

  const vigenteDisplay = useMemo(
    () => buildTablasVigentesDisplayTable(vigentesRaw, globales),
    [vigentesRaw, globales]
  );

  const handleView = async (id) => {
    const data = await verDetalle(id);
    setDetail(data);
    setMode("detail");
  };

  const handleCompare = async (id) => {
    const data = await verDetalle(id);
    setDetail(data);
    setMode("compare");
  };

  const handleRestore = async (id) => {
    if (!isAdmin) return;
    if (
      !confirm(
        "¿Restaurar esta vigencia como nueva versión vigente? Se conservará el historial actual y se creará un nuevo registro."
      )
    ) {
      return;
    }
    setMessage(null);
    try {
      await restaurar(id, restoreVigencia || null);
      setMessage("Vigencia restaurada correctamente.");
      setDetail(null);
      setMode(null);
    } catch {
      setMessage("No se pudo restaurar la vigencia.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando historial de vigencias…
      </div>
    );
  }

  return (
    <div className="text-foreground space-y-6">
      <CoeficientesModuleNav />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <History className="w-5 h-5 text-red-400" />
          <h1 className="text-2xl font-bold">Historial de Vigencias</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Consulte versiones anteriores de coeficientes, compárelas con la vigente
          y restáurelas como nueva vigencia sin modificar el historial.
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

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[900px]">
          <thead className="bg-muted/80">
            <tr>
              <th className={tableHeadClass}>Fecha vigencia</th>
              <th className={tableHeadClass}>Fecha creación</th>
              <th className={tableHeadClass}>Usuario</th>
              <th className={tableHeadClass}>Tipo</th>
              <th className={tableHeadClass}>Origen</th>
              <th className={tableHeadClass}>Tarjetas</th>
              <th className={tableHeadClass}>Coeficientes</th>
              <th className={tableHeadClass}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  Aún no hay vigencias archivadas. Se registrarán automáticamente
                  al guardar una nueva vigencia.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/40">
                  <td className={tableCellClass}>
                    {formatDateOnly(entry.fechaVigencia)}
                  </td>
                  <td className={tableCellClass}>
                    {formatDate(entry.fechaCreacion)}
                  </td>
                  <td className={tableCellClass}>{entry.usuario ?? "—"}</td>
                  <td className={tableCellClass}>{entry.tipo}</td>
                  <td className={tableCellClass}>{entry.origen}</td>
                  <td className={tableCellClass}>{entry.tarjetaCount}</td>
                  <td className={tableCellClass}>{entry.coeficienteCount}</td>
                  <td className={tableCellClass}>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-border"
                        onClick={() => handleView(entry.id)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Ver
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-border"
                        onClick={() => handleCompare(entry.id)}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
                        Comparar
                      </Button>
                      {isAdmin && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-amber-700/50 text-amber-200"
                          disabled={saving}
                          onClick={() => handleRestore(entry.id)}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
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

      {detail && mode && (
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {mode === "compare" ? "Comparar con vigente" : "Detalle de vigencia"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Vigencia {formatDateOnly(detail.fechaVigencia)} ·{" "}
                {detail.tipo} · {detail.origen}
                {detail.observaciones ? ` · ${detail.observaciones}` : ""}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setDetail(null);
                setMode(null);
              }}
            >
              Cerrar
            </Button>
          </div>

          {mode === "detail" ? (
            <HistorialDetailPanel entry={detail} />
          ) : (
            <ComparePanel
              entry={detail}
              vigenteDisplay={vigenteDisplay}
              tarjetas={tarjetas}
            />
          )}

          {isAdmin && (
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-border">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Vigencia al restaurar
                </Label>
                <Input
                  type="date"
                  className={inputClass}
                  value={restoreVigencia}
                  onChange={(e) => setRestoreVigencia(e.target.value)}
                />
              </div>
              <Button
                type="button"
                disabled={saving}
                onClick={() => handleRestore(detail.id)}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                Restaurar como nueva vigencia
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
