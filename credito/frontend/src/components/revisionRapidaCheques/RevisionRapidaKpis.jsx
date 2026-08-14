"use client"

import { cn } from "@/lib/utils"

const TONE = {
  good: "border-l-success text-success",
  warn: "border-l-warning text-warning",
  elevated: "border-l-warning text-warning",
  critical: "border-l-danger text-danger",
  neutral: "border-l-muted-foreground/40 text-foreground",
  info: "border-l-info text-info",
}

/**
 * @param {{
 *   kpis: {
 *     bcra: {
 *       peorSituacion: string;
 *       deudaTotal: string;
 *       entidades: string;
 *       tone: string;
 *     };
 *     rechazos: {
 *       cantidad: string;
 *       montoTotal: string;
 *       pendientes: string;
 *     };
 *     credito: {
 *       limiteOtorgado: string;
 *       limiteSugerido: string;
 *       limiteConocido?: string;
 *     };
 *   };
 * }} props
 */
export function RevisionRapidaKpis({ kpis }) {
  return (
    <section className="min-w-0 space-y-3">
      <KpiGroup title="Situación BCRA">
        <Kpi
          label="Peor situación"
          value={kpis.bcra.peorSituacion}
          tone={kpis.bcra.tone}
        />
        <Kpi
          label="Deuda total"
          value={kpis.bcra.deudaTotal}
          tone="info"
          nowrap
        />
        <Kpi label="Entidades" value={kpis.bcra.entidades} tone="neutral" />
      </KpiGroup>

      <KpiGroup title="Cheques rechazados">
        <Kpi label="Cantidad" value={kpis.rechazos.cantidad} tone="neutral" />
        <Kpi
          label="Monto total"
          value={kpis.rechazos.montoTotal}
          tone="info"
          nowrap
        />
        <Kpi
          label="Pend. abono"
          value={kpis.rechazos.pendientes}
          tone="warn"
        />
      </KpiGroup>

      <KpiGroup title="Límite conocido">
        <Kpi
          label="Límite otorgado"
          value={kpis.credito.limiteOtorgado}
          tone="neutral"
          nowrap
        />
        <Kpi
          label="Límite sugerido"
          value={kpis.credito.limiteSugerido}
          tone="info"
          nowrap
        />
      </KpiGroup>
    </section>
  )
}

/**
 * @param {{ title: string; children: import("react").ReactNode }} props
 */
function KpiGroup({ title, children }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{children}</div>
    </div>
  )
}

/**
 * @param {{
 *   label: string;
 *   value: string;
 *   tone?: string;
 *   nowrap?: boolean;
 * }} props
 */
function Kpi({ label, value, tone = "neutral", nowrap = false }) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-md border border-border border-l-[3px] bg-card px-2 py-1.5",
        TONE[tone] ?? TONE.neutral
      )}
    >
      <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-[clamp(0.7rem,1.8vw,0.95rem)] font-bold tabular-nums leading-tight",
          nowrap && "overflow-hidden whitespace-nowrap"
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  )
}
