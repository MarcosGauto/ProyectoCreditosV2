"use client"

import { useState } from "react"
import {
  Activity,
  AlertTriangle,
  Gauge,
  Landmark,
  Scale,
  Wallet,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const TONE_STYLES = {
  good: {
    card: "border-l-success border-border bg-success/5",
    value: "text-success",
    icon: "text-success/70",
  },
  warn: {
    card: "border-l-warning border-border bg-warning/5",
    value: "text-warning",
    icon: "text-warning/70",
  },
  debt: {
    card: "border-l-orange-400/80 border-border bg-orange-500/5",
    value: "text-warning",
    icon: "text-orange-500/80",
  },
  critical: {
    card: "border-l-danger border-border bg-danger/5",
    value: "text-danger",
    icon: "text-danger/70",
  },
  info: {
    card: "border-l-info border-border bg-info/5",
    value: "text-info",
    icon: "text-info/70",
  },
  neutral: {
    card: "border-l-muted-foreground/40 border-border bg-card",
    value: "text-foreground",
    icon: "text-muted-foreground",
  },
}

const ICONS = {
  score: Gauge,
  bcra: Landmark,
  facturacion: Wallet,
  endeudamiento: Activity,
  limite: Scale,
  criterio: AlertTriangle,
}

/**
 * @param {{
 *   label: string;
 *   value: string;
 *   hint?: string | null;
 *   tone?: keyof typeof TONE_STYLES;
 *   icon?: keyof typeof ICONS;
 *   tooltip?: string;
 *   detailTitle?: string;
 *   detailRows?: Array<{ label: string; value: string }>;
 * }} props
 */
export function CreditKpiCard({
  label,
  value,
  hint = null,
  tone = "neutral",
  icon,
  tooltip,
  detailTitle,
  detailRows = [],
}) {
  const [open, setOpen] = useState(false)
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.neutral
  const hasDetail = detailRows.length > 0
  const Icon = (icon && ICONS[icon]) || InfoFallback

  return (
    <>
      <button
        type="button"
        title={tooltip || String(value)}
        onClick={() => hasDetail && setOpen(true)}
        className={cn(
          "flex w-full min-w-0 flex-col justify-center gap-0.5 overflow-hidden rounded-md border border-l-[3px] px-2 py-1.5 text-left transition sm:px-2.5 sm:py-2",
          styles.card,
          hasDetail
            ? "cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            : "cursor-default"
        )}
      >
        <div className="flex min-w-0 items-center justify-between gap-1">
          <p className="min-w-0 truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <Icon
            className={cn("hidden h-3 w-3 shrink-0 sm:block", styles.icon)}
            aria-hidden
          />
        </div>

        <p
          className={cn(
            "min-w-0 overflow-hidden whitespace-nowrap font-bold tabular-nums leading-none tracking-tight",
            "text-[clamp(0.75rem,2.4vw,1.05rem)] lg:text-[clamp(0.85rem,0.7vw+0.55rem,1.1rem)]",
            styles.value
          )}
        >
          {value}
        </p>

        {hint ? (
          <p className="min-w-0 truncate text-[9px] leading-tight text-muted-foreground sm:text-[10px]">
            {hint}
          </p>
        ) : null}
      </button>

      {hasDetail ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg border-border bg-card text-foreground">
            <DialogHeader>
              <DialogTitle>{detailTitle || label}</DialogTitle>
              {tooltip ? (
                <DialogDescription className="text-muted-foreground">
                  {tooltip}
                </DialogDescription>
              ) : null}
            </DialogHeader>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <tbody>
                  {detailRows.map((row) => (
                    <tr
                      key={row.label}
                      className="border-t border-border first:border-t-0"
                    >
                      <td className="px-3 py-2.5 text-muted-foreground">{row.label}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums text-foreground">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}

function InfoFallback({ className }) {
  return <Gauge className={className} aria-hidden />
}
