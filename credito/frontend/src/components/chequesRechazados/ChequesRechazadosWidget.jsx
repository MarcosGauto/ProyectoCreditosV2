"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Banknote, CheckCircle2, Clock3 } from "lucide-react"

import StatCard from "@/components/dashboard/Stat-card"
import { DashboardButton } from "@/components/dashboard/DashboardButton"
import { fetchChequesRechazadosSummary } from "@/lib/chequesRechazadosService"
import { formatChequeFecha, formatChequeImporte } from "@/lib/chequesRechazadosModel"

export function ChequesRechazadosWidget() {
  const [summary, setSummary] = useState(
    /** @type {{ total: number; pendientes: number; abonados: number; montoPendiente: number; ultimoRechazo: string | null } | null} */ (
      null
    )
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchChequesRechazadosSummary()
      .then((data) => {
        if (active) {
          setSummary(data)
        }
      })
      .catch((error) => {
        console.error("[ChequesRechazadosWidget]", error)
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-muted-foreground">
        Cargando resumen de cheques rechazados…
      </div>
    )
  }

  const data = summary ?? {
    total: 0,
    pendientes: 0,
    abonados: 0,
    montoPendiente: 0,
    ultimoRechazo: null,
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cheques Rechazados</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Resumen de incidencias comerciales registradas
          </p>
        </div>
        <DashboardButton asChild variant="primary" size="md">
          <Link href="/dashboard/cheques-rechazados">Ver módulo</Link>
        </DashboardButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total de casos"
          value={String(data.total)}
          icon={Banknote}
          description="Registros históricos"
        />
        <StatCard
          title="Pendientes"
          value={String(data.pendientes)}
          icon={Clock3}
          trend={data.pendientes > 0 ? "down" : undefined}
          trendValue={data.pendientes > 0 ? "Requiere seguimiento" : undefined}
        />
        <StatCard
          title="Abonados"
          value={String(data.abonados)}
          icon={CheckCircle2}
          description="Regularizados"
        />
        <StatCard
          title="Monto pendiente"
          value={formatChequeImporte(data.montoPendiente)}
          icon={AlertTriangle}
          trend={data.montoPendiente > 0 ? "down" : undefined}
          trendValue={
            data.montoPendiente > 5_000_000 ? "Riesgo elevado" : undefined
          }
        />
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Último rechazo registrado</p>
          <p className="text-lg font-semibold text-foreground">
            {formatChequeFecha(data.ultimoRechazo)}
          </p>
        </div>
        <DashboardButton asChild variant="secondary" size="md">
          <Link href="/dashboard/cheques-rechazados/nuevo">Nuevo registro</Link>
        </DashboardButton>
      </div>
    </section>
  )
}
