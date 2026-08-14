"use client";

import { useMemo, useState } from "react";
import { Bug } from "lucide-react";

import { buildCalculoDebug, formatInteresFactor } from "@/lib/coeficientes/coeficientesCalculo";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const inputClass =
  "bg-card border-border text-foreground focus-visible:ring-red-500/40";

function formatCoef(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

/**
 * @param {{
 *   vigentes: Array<{
 *     tarjeta: string;
 *     cuotas: string | number;
 *     coeficienteBaseImportado?: number;
 *     coeficienteBase?: number;
 *   }>;
 *   globales: { arancelDeb: number; arancelCre: number; interes: number };
 *   pvp: number;
 * }} props
 */
export function CoeficientesDebugPanel({ vigentes, globales, pvp }) {
  const options = useMemo(() => {
    return vigentes.map((row, idx) => ({
      id: `${row.tarjeta}-${row.cuotas}-${idx}`,
      label: `${row.tarjeta} · ${row.cuotas} cuota${row.cuotas === 1 ? "" : "s"}`,
      row,
    }));
  }, [vigentes]);

  const [selectedId, setSelectedId] = useState("");
  const [debugPvp, setDebugPvp] = useState(pvp);

  const selected = options.find((o) => o.id === selectedId) ?? options[0];

  const debug = useMemo(() => {
    if (!selected) return null;
    const baseImportado =
      selected.row.coeficienteBaseImportado ??
      selected.row.coeficienteBase ??
      0;
    return buildCalculoDebug(
      selected.row.cuotas,
      baseImportado,
      globales,
      debugPvp,
      selected.row.tarjeta
    );
  }, [selected, globales, debugPvp]);

  if (!vigentes.length) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-500/20 flex items-center gap-2">
        <Bug className="h-4 w-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-amber-200">
          Panel de depuración de cálculos
        </h2>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Tarjeta / Cuotas</Label>
            <select
              className={`w-full h-10 rounded-md px-3 ${inputClass}`}
              value={selected?.id ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">PVP de prueba</Label>
            <Input
              type="number"
              step="0.01"
              className={inputClass}
              value={debugPvp}
              onChange={(e) => setDebugPvp(Number(e.target.value))}
            />
          </div>
        </div>

        {debug && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <DebugCell label="Coeficiente Base (adquirente)" value={formatCoef(debug.coeficienteBaseImportado)} />
            {!debug.sinArancelNiInteres && (
              <DebugCell
                label="Interés Adicional (factor)"
                value={formatInteresFactor(debug.interesAdicional)}
              />
            )}
            <DebugCell
              label="Coeficiente Final"
              value={
                debug.sinArancelNiInteres
                  ? `${Number(debug.coeficienteFinal).toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}%`
                  : formatCoef(debug.coeficienteFinal)
              }
              highlight
            />
            <DebugCell label="Precio Financiado" value={formatMoney(debug.precioFinanciado)} />
            <DebugCell label="Valor Cuota" value={formatMoney(debug.valorCuota)} />
            <DebugCell label="Tasa Directa" value={`${debug.tasaDirecta}%`} />
          </div>
        )}

        {debug && (
          <div className="rounded-lg border border-border bg-background/40 p-4 text-xs font-mono text-muted-foreground space-y-2">
            <p>
              <span className="text-muted-foreground">Coeficiente Final:</span>{" "}
              {debug.formulaFinal}
            </p>
            <p>
              <span className="text-muted-foreground">Precio Financiado:</span>{" "}
              {debug.formulaPrecio}
            </p>
            <p>
              <span className="text-muted-foreground">Tasa Directa:</span>{" "}
              {debug.formulaTasaDirecta}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * @param {{ label: string; value: string; highlight?: boolean }} props
 */
function DebugCell({ label, value, highlight = false }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p
        className={`text-sm font-medium tabular-nums ${
          highlight ? "text-red-300" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
