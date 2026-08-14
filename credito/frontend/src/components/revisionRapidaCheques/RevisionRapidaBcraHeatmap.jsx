"use client"

import { cn } from "@/lib/utils"

const TONE = {
  good: {
    cell: "bg-emerald-500/15 text-emerald-900 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-50 dark:ring-emerald-400/30",
    badge: "bg-emerald-500 text-white",
    bar: "bg-emerald-400",
  },
  warn: {
    cell: "bg-amber-400/20 text-amber-950 ring-1 ring-inset ring-amber-500/35 dark:bg-amber-400/15 dark:text-amber-50 dark:ring-amber-300/35",
    badge: "bg-amber-400 text-slate-900",
    bar: "bg-amber-400",
  },
  elevated: {
    cell: "bg-[#e85d9a]/15 text-pink-950 ring-1 ring-inset ring-pink-500/30 dark:text-pink-50 dark:ring-pink-400/30",
    badge: "bg-[#e85d9a] text-white",
    bar: "bg-[#e85d9a]",
  },
  critical: {
    cell: "bg-red-600/15 text-red-950 ring-1 ring-inset ring-red-500/35 dark:bg-red-600/18 dark:text-red-50",
    badge: "bg-red-600 text-white",
    bar: "bg-red-500",
  },
  neutral: {
    cell: "bg-slate-500/15 text-slate-800 ring-1 ring-inset ring-slate-400/30 dark:text-slate-100 dark:ring-slate-400/25",
    badge: "bg-slate-500 text-white",
    bar: "bg-slate-400",
  },
}

/**
 * Grilla BCRA: color + número de situación por banco.
 *
 * @param {{
 *   heatmap: {
 *     months: Array<{
 *       key: string;
 *       year: string;
 *       monthNum: number;
 *       peorSituacion: number;
 *       peorTone: string;
 *       endeudamientoLabel: string;
 *     }>;
 *     yearGroups: Array<{ year: string; count: number }>;
 *     entityRows: Array<{
 *       fullName: string;
 *       shortName: string;
 *       cells: Array<{
 *         montoLabel: string;
 *         situacion: number;
 *         tone: string;
 *       } | null>;
 *     }>;
 *     monthCount: number;
 *   };
 *   className?: string;
 * }} props
 */
export function RevisionRapidaBcraHeatmap({ heatmap, className }) {
  const months = heatmap?.months ?? []
  const yearGroups = heatmap?.yearGroups ?? []
  const entityRows = heatmap?.entityRows ?? []

  if (months.length === 0) {
    return (
      <section
        className={cn(
          "flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-4",
          className
        )}
      >
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Situación BCRA
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">No disponible</p>
      </section>
    )
  }

  const title =
    months.length === 1
      ? `Situación BCRA · ${months[0].key}`
      : `Situación BCRA · ${months.length} períodos`

  /** Filas resumen con el mismo layout que bancos */
  const summaryRows = [
    {
      key: "situacion",
      label: "Situación",
      cells: months.map((m) => ({
        amount: String(m.peorSituacion),
        sit: m.peorSituacion,
        tone: m.peorTone,
      })),
    },
    {
      key: "deuda",
      label: "Deuda",
      cells: months.map((m) => ({
        amount: m.endeudamientoLabel,
        sit: m.peorSituacion,
        tone: m.peorTone,
      })),
    },
  ]

  return (
    <section
      className={cn(
        "flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Badge = situación · montos completos
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Legend tone="good" n={1} />
          <Legend tone="warn" n={2} />
          <Legend tone="elevated" n={3} />
          <Legend tone="critical" n={4} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-3">
        <table className="w-full border-separate border-spacing-y-1 text-xs">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 rounded-l-md bg-panel-elevated px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Entidad
              </th>
              {yearGroups.map((g, gi) => (
                <th
                  key={g.year}
                  colSpan={g.count}
                  className={cn(
                    "bg-panel-elevated px-2 py-2 text-center text-[10px] font-semibold text-muted-foreground",
                    gi === yearGroups.length - 1 && "rounded-r-md"
                  )}
                >
                  {g.year}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-30 bg-card px-3 py-1.5 text-left text-[10px] font-medium text-muted-foreground">
                Mes
              </th>
              {months.map((m) => (
                <th
                  key={`m-${m.key}`}
                  className="min-w-[7.5rem] bg-card px-1.5 py-1.5 text-center text-[11px] font-semibold tabular-nums text-muted-foreground"
                  title={m.key}
                >
                  {m.monthNum || m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row) => (
              <HeatRow
                key={row.key}
                label={row.label}
                labelClassName="font-medium text-foreground"
                cells={row.cells}
                months={months}
              />
            ))}

            {entityRows.map((row) => (
              <HeatRow
                key={row.fullName}
                label={row.shortName}
                labelTitle={row.fullName}
                cells={row.cells.map((cell) =>
                  cell
                    ? {
                        amount: cell.montoLabel,
                        sit: cell.situacion,
                        tone: cell.tone,
                      }
                    : null
                )}
                months={months}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/**
 * @param {{
 *   label: string;
 *   labelTitle?: string;
 *   labelClassName?: string;
 *   months: Array<{ key: string }>;
 *   cells: Array<{
 *     amount: string;
 *     sit: number;
 *     tone: string;
 *   } | null>;
 * }} props
 */
function HeatRow({ label, labelTitle, labelClassName, months, cells }) {
  return (
    <tr>
      <td
        className={cn(
          "sticky left-0 z-10 max-w-[9rem] truncate rounded-l-lg bg-panel px-3 py-1 text-[12px] text-foreground/80",
          labelClassName
        )}
        title={labelTitle ?? label}
      >
        {label}
      </td>
      {cells.map((cell, idx) => {
        const monthKey = months[idx]?.key ?? idx
        const isLast = idx === cells.length - 1
        if (!cell) {
          return (
            <td
              key={`${label}-empty-${monthKey}`}
              className={cn(
                "bg-panel/40 px-2 py-1 text-center text-muted-foreground",
                isLast && "rounded-r-lg"
              )}
            >
              —
            </td>
          )
        }
        return (
          <td
            key={`${label}-${monthKey}`}
            className={cn("bg-panel/40 p-1", isLast && "rounded-r-lg")}
          >
            <BankCell
              amount={cell.amount}
              sit={cell.sit}
              tone={cell.tone}
              title={`${label} · Sit. ${cell.sit} · ${cell.amount}`}
            />
          </td>
        )
      })}
    </tr>
  )
}

/**
 * @param {{ tone: string; n: number }} props
 */
function Legend({ tone, n }) {
  const t = TONE[tone] ?? TONE.neutral
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[10px] font-bold tabular-nums",
        t.badge
      )}
      title={`Situación ${n}`}
    >
      {n}
    </span>
  )
}

/**
 * Misma celda para situación, deuda y bancos.
 * @param {{
 *   amount: string;
 *   sit: number;
 *   tone: string;
 *   title?: string;
 * }} props
 */
function BankCell({ amount, sit, tone, title }) {
  const t = TONE[tone] ?? TONE.neutral
  return (
    <div
      className={cn(
        "relative flex h-10 w-full items-center justify-between gap-1.5 overflow-hidden rounded-lg pl-2.5 pr-2",
        t.cell
      )}
      title={title}
    >
      <span
        className={cn("absolute inset-y-1.5 left-0 w-0.5 rounded-full", t.bar)}
        aria-hidden
      />
      <span
        className={cn(
          "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 text-[10px] font-bold tabular-nums",
          t.badge
        )}
      >
        {sit}
      </span>
      <span className="min-w-0 truncate text-right text-[12px] font-semibold tabular-nums tracking-tight">
        {amount}
      </span>
    </div>
  )
}
