"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { SEMAPHORE_STYLES } from "@/config/creditAnalysis"
import { formatCreditAmount } from "@/lib/creditAnalysisEngine"
import { formatChequeFecha } from "@/lib/chequesRechazadosModel"
import { getComportamientoComercialLabel } from "@/lib/comportamientoComercialScore"

/**
 * @param {{
 *   data: ReturnType<import("@/lib/comportamientoComercialScore").analyzeComportamientoComercial> | null;
 *   cuit?: string;
 * }} props
 */
export function ComportamientoComercialCard({ data, cuit }) {
  if (!data) {
    return null
  }

  const sem = SEMAPHORE_STYLES[data.semaforo] ?? SEMAPHORE_STYLES.unknown

  return (
    <div className="bg-muted border border-border rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Comportamiento comercial
          </p>
          <p className="text-lg font-bold text-foreground mt-1">
            Cheques rechazados con la empresa
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${sem.className}`}>
            {sem.emoji} {getComportamientoComercialLabel(data.semaforo)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Score comportamiento:{" "}
            <span className="text-foreground font-semibold tabular-nums">
              {data.scoreComportamiento > 0 ? "+" : ""}
              {data.scoreComportamiento} pts
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Rechazados" value={String(data.cantidadRechazados)} />
        <Metric label="Pendientes" value={String(data.cantidadPendientes)} />
        <Metric label="Abonados" value={String(data.cantidadAbonados)} />
        <Metric
          label="Último rechazo"
          value={formatChequeFecha(data.fechaUltimoRechazo)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Metric
          label="Monto total rechazado"
          value={formatCreditAmount(data.montoTotalRechazado)}
        />
        <Metric
          label="Monto pendiente"
          value={formatCreditAmount(data.montoTotalPendiente)}
          highlight={data.montoTotalPendiente > 0}
        />
        <Metric
          label="Monto regularizado"
          value={formatCreditAmount(data.montoTotalRegularizado)}
        />
      </div>

      {cuit && (
        <div className="pt-2 border-t border-border">
          <Link
            href={`/dashboard/cheques-rechazados?cuit=${cuit}`}
            className="inline-flex items-center gap-2 text-xs text-red-400 hover:text-red-300"
          >
            Ver registros del cliente
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, highlight = false }) {
  return (
    <div className="rounded-lg border border-border bg-background/30 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`text-sm font-semibold mt-1 tabular-nums ${
          highlight ? "text-yellow-300" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  )
}
