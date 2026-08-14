"use client"

import { BALANCE_COLUMN_VISUAL_ORDER } from "@/lib/balanceContableModel"
import { formatCreditAmount } from "@/lib/creditAnalysisEngine"
import {
  PREQUALIFICATION_RUBROS,
  formatInflationFactorDisplay,
} from "@/lib/scoring/prequalification"

/**
 * @param {Array<{ anio?: string; columna?: string }>} rows
 */
function sortRowsForVisualColumnOrder(rows) {
  return [...rows].sort((a, b) => {
    const colA = /** @type {keyof typeof BALANCE_COLUMN_VISUAL_ORDER | undefined} */ (
      a.columna
    )
    const colB = /** @type {keyof typeof BALANCE_COLUMN_VISUAL_ORDER | undefined} */ (
      b.columna
    )
    if (colA && colB && colA in BALANCE_COLUMN_VISUAL_ORDER && colB in BALANCE_COLUMN_VISUAL_ORDER) {
      return BALANCE_COLUMN_VISUAL_ORDER[colA] - BALANCE_COLUMN_VISUAL_ORDER[colB]
    }
    return Number(a.anio) - Number(b.anio)
  })
}

/** @type {Record<string, string>} */
const ACTUALIZADO_COLUMN_LABELS = {
  ventas: "Ventas actualizadas",
  compras: "Compras actualizadas",
  costos: "Costos actualizados",
}

/**
 * @param {{
 *   tablas: Record<string, Array<{
 *     anio: string;
 *     promedioMensual: number | null;
 *     coefInflacion: number | null;
 *     inflacionAcumuladaPct: number | null;
 *     valorActualizado: number | null;
 *     creditoCalculado: number | null;
 *   }>>;
 *   rubroLabels?: Record<string, string>;
 * }} props
 */
export function PrequalificationExcelTable({ tablas, rubroLabels = {} }) {
  return (
    <div className="space-y-5">
      {PREQUALIFICATION_RUBROS.map((rubro) => {
        const rows = sortRowsForVisualColumnOrder(tablas?.[rubro] ?? [])
        if (rows.length === 0) {
          return null
        }

        const title = rubroLabels[rubro] ?? rubro
        const actualizadoLabel =
          ACTUALIZADO_COLUMN_LABELS[rubro] ?? "Valor actualizado"

        return (
          <div key={rubro} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-xs text-left">
                <thead>
                  <tr className="bg-muted text-muted-foreground uppercase tracking-wider">
                    <th className="px-3 py-2 font-semibold">Año</th>
                    <th className="px-3 py-2 font-semibold text-right">
                      {rubro === "ventas"
                        ? "Promedio mensual"
                        : "Promedio mensual"}
                    </th>
                    <th className="px-3 py-2 font-semibold text-right">
                      Coeficiente IPC
                    </th>
                    <th className="px-3 py-2 font-semibold text-right">
                      {actualizadoLabel}
                    </th>
                    <th className="px-3 py-2 font-semibold text-right">
                      Crédito calculado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${rubro}-${row.anio}-${row.fechaCierre ?? ""}`}
                      className="border-t border-border text-foreground"
                    >
                      <td className="px-3 py-2 tabular-nums">{row.anio}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCreditAmount(row.promedioMensual)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground/80">
                        {formatInflationFactorDisplay(row.coefInflacion)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCreditAmount(
                          row.ventasActualizadas ?? row.valorActualizado
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-red-300/90">
                        {formatCreditAmount(row.creditoCalculado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
