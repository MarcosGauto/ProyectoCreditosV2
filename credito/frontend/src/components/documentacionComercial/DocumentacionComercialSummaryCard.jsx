"use client"

/**
 * @typedef {import("@/lib/documentacionComercial/documentacionComercialPresentation").ComercialVista} ComercialVista
 */

/**
 * @param {{ vista: NonNullable<ComercialVista> }} props
 */
export function DocumentacionComercialSummaryCard({ vista }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{vista.cliente}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">CUIT</p>
          <p className="mt-1 font-mono text-lg text-foreground">{vista.cuitFormatted}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Documentación
        </p>
        <ul className="space-y-1.5 text-sm">
          {vista.resumen.map((row) => (
            <li
              key={row.tipoId}
              className="flex items-baseline justify-between gap-4 text-muted-foreground"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium text-foreground">
                {row.estado.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
