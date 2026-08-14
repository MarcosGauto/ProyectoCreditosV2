"use client"

import Link from "next/link"
import {
  Banknote,
  Calculator,
  CreditCard,
  DollarSign,
  Scale,
  Wallet,
} from "lucide-react"

import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { formatDashboardActivityDate } from "@/lib/dashboard/dashboardService"

/** @type {Record<string, { label: string; icon: import("lucide-react").LucideIcon; color: string }>} */
const MODULE_META = {
  cuenta_corriente: {
    label: "Cuenta Corriente",
    icon: Wallet,
    color: "text-info bg-info/10 border-info/20",
  },
  usd: {
    label: "USD",
    icon: DollarSign,
    color: "text-success bg-success/10 border-success/20",
  },
  financing: {
    label: "Financiación",
    icon: Calculator,
    color: "text-violet-700 bg-violet-500/10 border-violet-500/20 dark:text-violet-300",
  },
  calificacion: {
    label: "Calificación",
    icon: Scale,
    color: "text-primary bg-primary/10 border-primary/20",
  },
  cheques: {
    label: "Cheques",
    icon: Banknote,
    color: "text-warning bg-warning/10 border-warning/20",
  },
  coeficientes: {
    label: "Coeficientes",
    icon: CreditCard,
    color: "text-info bg-info/10 border-info/20",
  },
}

/**
 * @param {{
 *   items: import("@/lib/dashboard/dashboardService").DashboardActivityItem[];
 *   loading?: boolean;
 * }} props
 */
export function DashboardRecentActivity({ items, loading = false }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-2xl border border-border bg-muted/60"
          />
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <DashboardEmptyState
        title="Sin actividad reciente"
        description="Cuando registres calificaciones, cheques rechazados, cotizaciones USD u operaciones de cuenta corriente, verás el historial unificado aquí."
      />
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const meta = MODULE_META[item.module] ?? MODULE_META.calificacion
        const Icon = meta.icon
        const content = (
          <div className="flex items-start gap-4 rounded-2xl border border-border bg-card px-4 py-4 shadow-card transition-colors hover:border-primary/20 hover:bg-accent/40">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta.color}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {meta.label}
                </span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {formatDashboardActivityDate(item.timestamp)}
                </span>
              </div>
              <p className="truncate text-sm font-semibold text-foreground">
                {item.title}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {item.subtitle}
              </p>
            </div>
          </div>
        )

        if (!item.href) {
          return <div key={item.id}>{content}</div>
        }

        return (
          <Link key={item.id} href={item.href} className="block">
            {content}
          </Link>
        )
      })}
    </div>
  )
}
