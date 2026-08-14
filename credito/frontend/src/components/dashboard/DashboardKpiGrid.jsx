"use client"

import Link from "next/link"

import StatCard from "@/components/dashboard/Stat-card"
import { DASHBOARD_KPI_DEFINITIONS } from "@/lib/dashboard/dashboardConfig"

/**
 * @param {{
 *   kpis: Record<string, import("@/lib/dashboard/dashboardService").DashboardKpiValue>;
 *   loading?: boolean;
 * }} props
 */
export function DashboardKpiGrid({ kpis, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {DASHBOARD_KPI_DEFINITIONS.map((definition) => (
          <div
            key={definition.id}
            className="h-[168px] animate-pulse rounded-3xl border border-border bg-muted/60 p-6"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {DASHBOARD_KPI_DEFINITIONS.map((definition) => {
        const kpi = kpis[definition.id]
        const value = kpi?.hasData ? kpi.value : kpi?.emptyLabel ?? "—"
        const description = kpi?.hasData
          ? kpi.description
          : kpi?.description ?? "Módulo disponible"

        const card = (
          <StatCard
            title={definition.title}
            value={value}
            icon={definition.icon}
            description={description}
            trend={!kpi?.hasData ? undefined : kpi.value === "Activo" ? "up" : undefined}
            trendValue={!kpi?.hasData ? undefined : kpi.value === "Activo" ? "Herramienta lista" : undefined}
          />
        )

        if (!definition.href) {
          return <div key={definition.id}>{card}</div>
        }

        return (
          <Link
            key={definition.id}
            href={definition.href}
            className="block transition-transform duration-200 hover:-translate-y-0.5"
          >
            {card}
          </Link>
        )
      })}
    </div>
  )
}
