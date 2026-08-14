"use client"

import { Loader2 } from "lucide-react"

/**
 * Fila compacta de KPIs (responsive hasta 6 columnas en desktop).
 *
 * @param {{
 *   items: {
 *     id: string;
 *     label: string;
 *     value: import("react").ReactNode;
 *     hint?: import("react").ReactNode;
 *     tone?: "neutral"|"good"|"warn"|"risk"|"accent";
 *     loading?: boolean;
 *   }[];
 * }} props
 */
export function AnalysisSummaryCards({ items = [] }) {
  return (
    <section aria-label="Resumen de indicadores">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <SummaryCard key={item.id} {...item} />
        ))}
      </div>
    </section>
  )
}

const TONE_BORDER = {
  neutral: "border-border/90",
  good: "border-emerald-500/20",
  warn: "border-amber-500/20",
  risk: "border-rose-500/20",
  accent: "border-zinc-600/80",
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "neutral",
  loading = false,
}) {
  return (
    <div
      className={`flex min-h-[76px] flex-col justify-between rounded-lg border bg-muted/60 px-2 py-2 sm:min-h-[84px] sm:px-2.5 ${TONE_BORDER[tone] ?? TONE_BORDER.neutral}`}
    >
      <p className="shrink-0 truncate text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <div className="flex min-h-[1.15rem] items-center overflow-hidden text-[13px] font-semibold tracking-tight text-foreground tabular-nums sm:text-sm">
        <span className="truncate">{loading ? null : value}</span>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      <div className="h-3.5 shrink-0 truncate text-[10px] leading-[14px] text-muted-foreground">
        {hint != null && hint !== "" ? hint : "\u00A0"}
      </div>
    </div>
  )
}
