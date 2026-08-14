"use client"

import { cn } from "@/lib/utils"

const ROW_TONE = {
  good: "text-emerald-300",
  warn: "text-amber-300",
  elevated: "text-orange-300",
  critical: "text-red-300",
  neutral: "text-foreground",
}

/**
 * @param {{
 *   bcraTable: {
 *     rows: Array<{
 *       entidad: string;
 *       situacion: number;
 *       deuda: string;
 *       deudaCompact: string;
 *       tone: string;
 *     }>;
 *   };
 *   className?: string;
 * }} props
 */
export function RevisionRapidaBcra({ bcraTable, className }) {
  return (
    <section
      className={cn(
        "flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-3 sm:p-4",
        className
      )}
    >
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Detalle BCRA por entidad
      </h2>

      {bcraTable.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos BCRA disponibles</p>
      ) : (
        <div className="min-h-0 w-full flex-1 overflow-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-2 py-2.5 font-semibold">Entidad</th>
                <th className="px-2 py-2.5 text-right font-semibold">Sit.</th>
                <th className="px-2 py-2.5 text-right font-semibold">Deuda</th>
              </tr>
            </thead>
            <tbody>
              {bcraTable.rows.map((row) => (
                <tr
                  key={`${row.entidad}-${row.situacion}-${row.deuda}`}
                  className="border-b border-border"
                >
                  <td
                    className="max-w-[14rem] truncate px-2 py-2.5 text-foreground/80"
                    title={row.entidad}
                  >
                    {row.entidad}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2.5 text-right font-semibold tabular-nums",
                      ROW_TONE[row.tone] ?? ROW_TONE.neutral
                    )}
                  >
                    {row.situacion}
                  </td>
                  <td
                    className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-foreground"
                    title={row.deuda}
                  >
                    {row.deudaCompact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
