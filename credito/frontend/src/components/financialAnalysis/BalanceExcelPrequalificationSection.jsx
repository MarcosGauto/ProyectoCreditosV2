"use client"

import { useMemo } from "react"
import { Loader2 } from "lucide-react"

import {
  BALANCE_PREQUAL_RUBRO_CONFIG,
  buildBalanceSlotPrequalificationTables,
  formatCoeficienteIpcDisplay,
  formatPrequalTableMoney,
  getBalanceFactorActualizacion,
} from "@/lib/balancePrequalificationPreview"

/**
 * @param {{
 *   ejercicio: string;
 *   values: Record<string, string>;
 *   inflation: import("@/lib/inflation/balanceInflation").InflationFactorResult | null;
 *   inflationLoading?: boolean;
 *   coeficiente: number | null;
 *   storedFactor?: number | null;
 * }} props
 */
export function BalanceExcelPrequalificationSection({
  ejercicio,
  values,
  inflation,
  inflationLoading = false,
  coeficiente,
  storedFactor = null,
}) {
  const factor = useMemo(() => {
    if (inflation?.factorInflacion != null) {
      return getBalanceFactorActualizacion({
        factorActualizacion: inflation.factorInflacion,
      })
    }
    if (storedFactor != null) {
      return getBalanceFactorActualizacion({ factorActualizacion: storedFactor })
    }
    return 1
  }, [inflation?.factorInflacion, storedFactor])

  const preview = useMemo(
    () =>
      buildBalanceSlotPrequalificationTables({
        ejercicio,
        values,
        inflationFactor: factor,
        coeficiente,
      }),
    [ejercicio, values, factor, coeficiente]
  )

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-red-400/90">
          Pre-calificación Excel
        </p>
        {inflationLoading && (
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Actualizando IPC…
          </span>
        )}
      </div>

      {!coeficiente && (
        <p className="text-xs text-amber-300 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          Seleccionar tipo de empresa
        </p>
      )}

      {BALANCE_PREQUAL_RUBRO_CONFIG.map(({ key, label }) => {
        const row = preview.rubros[key]
        if (!row) {
          return null
        }

        return (
          <div key={key} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <div className="overflow-x-auto rounded-xl border border-border bg-muted">
              <table className="w-full min-w-[560px] text-xs">
                <thead>
                  <tr className="bg-background/40 text-muted-foreground uppercase tracking-wider border-b border-border">
                    <th className="px-3 py-2.5 text-left font-semibold">Año</th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      {key === "ventas"
                        ? "Promedio mensual "
                        : "Promedio mensual"}
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Coeficiente IPC
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Valor actualizado
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Crédito calculado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border text-foreground">
                    <td className="px-3 py-3 tabular-nums font-medium">
                      {row.anio}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatPrequalTableMoney(row.promedioMensual)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground/80">
                      {formatCoeficienteIpcDisplay(row.coefInflacion)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatPrequalTableMoney(row.valorActualizado)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-red-300/90">
                      {formatPrequalTableMoney(row.creditoCalculado)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      <div className="rounded-xl border-2 border-red-500/30 bg-red-500/10 px-4 py-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-red-200">
          Pre calificación
        </span>
        <span className="text-lg font-bold text-foreground tabular-nums">
          {coeficiente
            ? formatPrequalTableMoney(preview.preCalificacion)
            : "—"}
        </span>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Por rubro: mensual = anual ÷ 12 · actualizado = mensual × IPC · crédito =
        actualizado × coeficiente (referencia en tabla). En el análisis completo,
        pre calificación = PROMEDIO.SI(ventas contables, IVA, IIBB) × coeficiente
        × 1,1575.
      </p>
    </div>
  )
}
