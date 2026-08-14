"use client"

import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { displayAmountCompact } from "@/lib/revisionRapidaCheques/buildRevisionRapidaViewModel"

const BAR = {
  good: "bg-emerald-500",
  warn: "bg-amber-400",
  elevated: "bg-[#e85d9a]",
  critical: "bg-red-600",
  neutral: "bg-slate-500",
}

const SIT_LABEL = {
  1: "Sit. 1",
  2: "Sit. 2",
  3: "Sit. 3",
  4: "Sit. 4+",
}

const DEFAULT_VISIBLE = 8
const CHART_H = 180

/**
 * Gráficos objetivos: endeudamiento BCRA, situación, cheques rechazados.
 *
 * @param {{
 *   charts: {
 *     stacked?: {
 *       bars: Array<{
 *         key: string;
 *         label: string;
 *         year: string;
 *         total: number;
 *         totalLabel: string;
 *         segments: Array<{ sit: number; monto: number; tone: string }>;
 *       }>;
 *       maxTotal: number;
 *       hasHistory: boolean;
 *     };
 *     composition: {
 *       entidades: Array<{
 *         entidad: string;
 *         situacion: number;
 *         monto: number;
 *         tone: string;
 *       }>;
 *       maxMonto: number;
 *       deudaTotal: string;
 *     };
 *     situationDistribution: Array<{
 *       situacion: number;
 *       count: number;
 *       tone: string;
 *     }>;
 *     maxSitCount: number;
 *     chequesHistory?: Array<{
 *       key: string;
 *       label: string;
 *       cantidad: number;
 *       monto: number;
 *       montoLabel: string;
 *     }>;
 *     maxChequesMonto?: number;
 *     maxChequesCantidad?: number;
 *   };
 * }} props
 */
export function RevisionRapidaCharts({ charts }) {
  const [expanded, setExpanded] = useState(false)
  const stackedBars = charts?.stacked?.bars ?? []
  const maxTotal = Math.max(1, Number(charts?.stacked?.maxTotal) || 1)
  const entities = charts?.composition?.entidades ?? []
  const situationDistribution = charts?.situationDistribution ?? []
  const maxSitCount = Math.max(1, Number(charts?.maxSitCount) || 1)
  const maxMonto = Math.max(1, Number(charts?.composition?.maxMonto) || 1)
  const chequesHistory = charts?.chequesHistory ?? []
  const maxChequesMonto = Math.max(1, Number(charts?.maxChequesMonto) || 1)

  const visible = useMemo(
    () => (expanded ? entities : entities.slice(0, DEFAULT_VISIBLE)),
    [expanded, entities]
  )

  const yTicks = useMemo(() => {
    const top = maxTotal
    const step = top / 4
    return [0, step, step * 2, step * 3, top].map((v) => ({
      value: v,
      label: displayAmountCompact(v),
    }))
  }, [maxTotal])

  return (
    <div className="space-y-3">
      <section className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {stackedBars.length === 1
                ? "Endeudamiento BCRA · último período"
                : `Endeudamiento BCRA · ${Math.min(24, Math.max(stackedBars.length, 1))} períodos`}
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Deuda por situación · solo períodos con datos reales
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            {[1, 2, 3, 4].map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span
                  className={cn(
                    "inline-block h-2.5 w-2.5 rounded-sm",
                    BAR[
                      s === 1
                        ? "good"
                        : s === 2
                          ? "warn"
                          : s === 3
                            ? "elevated"
                            : "critical"
                    ]
                  )}
                />
                {SIT_LABEL[s]}
              </span>
            ))}
          </div>
        </div>

        {stackedBars.length === 0 ? (
          <p className="text-sm text-muted-foreground">No disponible</p>
        ) : (
          <div className="w-full min-w-0 overflow-x-auto">
            <div className="flex min-w-[16rem] gap-2">
              <div
                className="relative flex w-12 shrink-0 flex-col justify-between text-right text-[9px] tabular-nums text-chart-axis sm:w-14"
                style={{ height: CHART_H }}
              >
                {[...yTicks].reverse().map((t) => (
                  <span key={t.value} className="leading-none">
                    {t.label}
                  </span>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="relative flex items-end gap-0.5 border-b border-l border-border sm:gap-1"
                  style={{ height: CHART_H }}
                >
                  {[0.25, 0.5, 0.75].map((f) => (
                    <div
                      key={f}
                      className="pointer-events-none absolute right-0 left-0 border-t border-chart-grid"
                      style={{ bottom: `${f * 100}%` }}
                    />
                  ))}
                  {stackedBars.map((bar) => {
                    const hPx = Math.max(
                      2,
                      Math.round((bar.total / maxTotal) * CHART_H)
                    )
                    return (
                      <div
                        key={bar.key}
                        className="relative z-[1] flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                        title={`${bar.key}: ${bar.totalLabel}`}
                      >
                        <div
                          className="flex w-full max-w-[1.75rem] flex-col-reverse overflow-hidden rounded-t-[2px] sm:max-w-[2.25rem]"
                          style={{ height: hPx, minHeight: 2 }}
                        >
                          {bar.segments.map((seg) => {
                            const segH = Math.max(
                              1,
                              Math.round((seg.monto / bar.total) * hPx)
                            )
                            return (
                              <div
                                key={`${bar.key}-${seg.sit}`}
                                className={cn(
                                  "w-full",
                                  BAR[seg.tone] ?? BAR.neutral
                                )}
                                style={{ height: segH }}
                                title={`Sit. ${seg.sit}: ${displayAmountCompact(seg.monto)}`}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-1 flex gap-0.5 sm:gap-1">
                  {stackedBars.map((bar) => (
                    <div
                      key={`lbl-${bar.key}`}
                      className="min-w-0 flex-1 truncate text-center text-[9px] text-chart-label"
                      title={bar.key}
                    >
                      {bar.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Composición actual por entidad
          </h2>
          {entities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No disponible</p>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                Deuda total:{" "}
                <span className="font-semibold tabular-nums text-sky-700 dark:text-sky-200">
                  {charts.composition.deudaTotal}
                </span>
              </p>
              <ul className="space-y-2.5">
                {visible.map((row) => {
                  const ratio = Number(row.monto) / maxMonto
                  const pct = Math.max(
                    3,
                    Math.round((Number.isFinite(ratio) ? ratio : 0) * 100)
                  )
                  return (
                    <li
                      key={`${row.entidad}-${row.monto}-${row.situacion}`}
                      className="min-w-0"
                    >
                      <div className="mb-1 flex justify-between gap-2 text-[11px]">
                        <span
                          className="min-w-0 truncate text-foreground/80"
                          title={row.entidad}
                        >
                          {row.entidad}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          Sit. {row.situacion}
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-sm bg-chart-track">
                        <div
                          className={cn(
                            "h-full rounded-sm",
                            BAR[row.tone] ?? BAR.neutral
                          )}
                          style={{ width: `${pct}%`, minWidth: 4 }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
              {entities.length > DEFAULT_VISIBLE ? (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-2 text-[11px] font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
                >
                  {expanded
                    ? "Ver principales"
                    : `Ver todas (${entities.length})`}
                </button>
              ) : null}
            </>
          )}
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Distribución por situación
          </h2>
          {situationDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">No disponible</p>
          ) : (
            <div className="w-full min-w-0">
              <div
                className="flex w-full items-end gap-2 sm:gap-3"
                style={{ height: 140 }}
              >
                {situationDistribution.map((row) => {
                  const ratio = Number(row.count) / maxSitCount
                  const barPx = Math.max(
                    6,
                    Math.round((Number.isFinite(ratio) ? ratio : 0) * 140)
                  )
                  return (
                    <div
                      key={row.situacion}
                      className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                      title={`Situación ${row.situacion}: ${row.count}`}
                    >
                      <span className="mb-1 text-[10px] font-semibold tabular-nums text-foreground/80">
                        {row.count}
                      </span>
                      <div
                        className={cn(
                          "w-full max-w-[3rem] rounded-t-sm",
                          BAR[row.tone] ?? BAR.neutral
                        )}
                        style={{ height: barPx, minHeight: 6 }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="mt-1.5 flex gap-2 sm:gap-3">
                {situationDistribution.map((row) => (
                  <div
                    key={`sit-${row.situacion}`}
                    className="min-w-0 flex-1 text-center text-[10px] text-muted-foreground"
                  >
                    Sit. {row.situacion}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Cheques rechazados · historial
        </h2>
        {chequesHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin rechazos registrados</p>
        ) : (
          <div className="w-full min-w-0 overflow-x-auto">
            <div
              className="flex min-w-[16rem] items-end gap-2"
              style={{ height: 140 }}
            >
              {chequesHistory.map((row) => {
                const ratio = row.monto / maxChequesMonto
                const barPx = Math.max(
                  6,
                  Math.round((Number.isFinite(ratio) ? ratio : 0) * 140)
                )
                return (
                  <div
                    key={row.key}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                    title={`${row.label}: ${row.cantidad} · ${row.montoLabel}`}
                  >
                    <span className="mb-1 text-[9px] font-semibold tabular-nums text-foreground/80">
                      {row.cantidad}
                    </span>
                    <div
                      className="w-full max-w-[2.5rem] rounded-t-sm bg-amber-500/80"
                      style={{ height: barPx, minHeight: 6 }}
                    />
                    <span
                      className="mt-1 w-full truncate text-center text-[9px] text-muted-foreground"
                      title={row.label}
                    >
                      {row.label.replace(/^(\w+)\s/, "$1 ").slice(0, 10)}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Altura = monto · número = cantidad de rechazos por mes
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
