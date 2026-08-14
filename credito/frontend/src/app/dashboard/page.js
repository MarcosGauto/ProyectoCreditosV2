"use client"

import { useEffect, useState } from "react"

import { DashboardKpiGrid } from "@/components/dashboard/DashboardKpiGrid"
import { DashboardQuickAccess } from "@/components/dashboard/DashboardQuickAccess"
import { DashboardRecentActivity } from "@/components/dashboard/DashboardRecentActivity"
import { useRequireAuth } from "@/hooks/useRequireAuth"
import { fetchDashboardSummary } from "@/lib/dashboard/dashboardService"

export default function DashboardPage() {
  const { user, loading: authLoading } = useRequireAuth()
  const [summary, setSummary] = useState(
    /** @type {import("@/lib/dashboard/dashboardService").DashboardSummary | null} */ (null)
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      return
    }

    let active = true
    setLoading(true)

    fetchDashboardSummary()
      .then((data) => {
        if (active) {
          setSummary(data)
        }
      })
      .catch((error) => {
        console.error("[DashboardPage]", error)
        if (active) {
          setSummary({ kpis: {}, recentActivity: [] })
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [user])

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-primary">
          Plataforma financiera
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          Dashboard operativo
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Vista unificada de calificación crediticia, cuenta corriente, mercado USD,
          financiación, cheques rechazados y coeficientes.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Indicadores</h2>
          <p className="text-sm text-muted-foreground">
            Resumen por módulo. Los valores se actualizan desde Firebase.
          </p>
        </div>
        <DashboardKpiGrid kpis={summary?.kpis ?? {}} loading={loading} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Accesos rápidos</h2>
          <p className="text-sm text-muted-foreground">
            Navegá a cada herramienta del sistema desde un solo lugar.
          </p>
        </div>
        <DashboardQuickAccess />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Actividad reciente</h2>
          <p className="text-sm text-muted-foreground">
            Movimientos consolidados de todos los módulos.
          </p>
        </div>
        <DashboardRecentActivity
          items={summary?.recentActivity ?? []}
          loading={loading}
        />
      </section>
    </div>
  )
}
