"use client"

import { useState } from "react"
import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Tabla de cheques rechazados estilo Nosis: agrupada por mes, expandible.
 * Solo presenta datos reales de `chequesRechazados`.
 *
 * @param {{
 *   cheques: {
 *     cantidad: number;
 *     groups?: Array<{
 *       key: string;
 *       label: string;
 *       cantidad: number;
 *       monto: string;
 *       items: Array<{
 *         id: string;
 *         numeroCheque: string;
 *         fecha: string;
 *         fechaPago: string;
 *         banco: string;
 *         importe: string;
 *         causal: string;
 *         estado: string;
 *       }>;
 *     }>;
 *     rows?: Array<{
 *       id: string;
 *       fecha: string;
 *       importe: string;
 *       banco: string;
 *       estado: string;
 *     }>;
 *   };
 * }} props
 */
export function RevisionRapidaChequesRechazados({ cheques }) {
  const groups = cheques.groups ?? []
  const [openKeys, setOpenKeys] = useState(() => new Set())

  const toggle = (key) => {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-panel-elevated px-3 py-2 text-center sm:px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-foreground/80 sm:text-xs">
          Cheques rechazados
        </h2>
      </div>

      {cheques.cantidad === 0 ? (
        <div className="px-3 py-4 text-sm font-medium text-emerald-300 sm:px-4">
          🟢 Sin cheques rechazados registrados en poder de la institución
        </div>
      ) : (
        <div className="w-full min-w-0 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-[11px] sm:text-xs">
            <thead>
              <tr className="border-b border-border bg-panel text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="w-8 px-1.5 py-1.5 font-semibold" aria-label="Expandir" />
                <th className="px-2 py-1.5 font-semibold">Periodo / Cheque N°</th>
                <th className="px-2 py-1.5 font-semibold">Fecha rechazo</th>
                <th className="px-2 py-1.5 text-right font-semibold">Cantidad</th>
                <th className="px-2 py-1.5 text-right font-semibold">Monto</th>
                <th className="px-2 py-1.5 font-semibold">Causal</th>
                <th className="px-2 py-1.5 font-semibold">Fecha pago</th>
                <th className="px-2 py-1.5 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const open = openKeys.has(group.key)
                return (
                  <GroupBlock
                    key={group.key}
                    group={group}
                    open={open}
                    onToggle={() => toggle(group.key)}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/**
 * @param {{
 *   group: {
 *     key: string;
 *     label: string;
 *     cantidad: number;
 *     monto: string;
 *     items: Array<{
 *       id: string;
 *       numeroCheque: string;
 *       fecha: string;
 *       fechaPago: string;
 *       banco: string;
 *       importe: string;
 *       causal: string;
 *       estado: string;
 *     }>;
 *   };
 *   open: boolean;
 *   onToggle: () => void;
 * }} props
 */
function GroupBlock({ group, open, onToggle }) {
  return (
    <>
      <tr
        className={cn(
          "border-b border-border bg-muted",
          open && "bg-accent"
        )}
      >
        <td className="px-1.5 py-1">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={open ? `Ocultar ${group.label}` : `Ver ${group.label}`}
            className="inline-flex h-5 w-5 items-center justify-center rounded border border-border bg-background text-foreground/80 hover:border-sky-500/40 hover:text-sky-300"
          >
            {open ? (
              <Minus className="h-3 w-3" aria-hidden />
            ) : (
              <Plus className="h-3 w-3" aria-hidden />
            )}
          </button>
        </td>
        <td className="px-2 py-1.5 font-semibold text-foreground">
          {group.label}
        </td>
        <td className="px-2 py-1.5 text-muted-foreground">—</td>
        <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-foreground">
          {group.cantidad}
        </td>
        <td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold tabular-nums text-foreground">
          {group.monto}
        </td>
        <td className="px-2 py-1.5 text-muted-foreground">—</td>
        <td className="px-2 py-1.5 text-muted-foreground">—</td>
        <td className="px-2 py-1.5 text-muted-foreground">—</td>
      </tr>

      {open
        ? group.items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border bg-muted/80"
            >
              <td className="px-1.5 py-1" />
              <td className="px-2 py-1.5">
                <span className="font-medium tabular-nums text-foreground">
                  {item.numeroCheque}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground" title={item.banco}>
                  {item.banco}
                </span>
              </td>
              <td className="whitespace-nowrap px-2 py-1.5 text-foreground/80">
                {item.fecha}
              </td>
              <td className="px-2 py-1.5 text-right text-muted-foreground">1</td>
              <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-foreground">
                {item.importe}
              </td>
              <td
                className="max-w-[10rem] truncate px-2 py-1.5 text-muted-foreground"
                title={item.causal}
              >
                {item.causal}
              </td>
              <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                {item.fechaPago}
              </td>
              <td className="whitespace-nowrap px-2 py-1.5 capitalize text-foreground/80">
                {item.estado}
              </td>
            </tr>
          ))
        : null}
    </>
  )
}
