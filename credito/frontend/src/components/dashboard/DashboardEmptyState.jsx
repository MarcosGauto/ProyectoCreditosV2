"use client"

import { Inbox } from "lucide-react"

/**
 * @param {{
 *   title?: string;
 *   description?: string;
 *   className?: string;
 * }} props
 */
export function DashboardEmptyState({
  title = "Sin actividad registrada",
  description = "Los movimientos de los módulos aparecerán aquí cuando existan datos en la plataforma.",
  className = "",
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center ${className}`}
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
