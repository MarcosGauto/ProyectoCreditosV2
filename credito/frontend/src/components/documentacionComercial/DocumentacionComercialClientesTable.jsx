"use client"

import { Button } from "@/components/ui/button"

/**
 * @typedef {import("@/service/documentacionComercialService").DocumentacionComercialGridRow} DocumentacionComercialGridRow
 */

/**
 * Grilla de clientes — Documentación Comercial.
 *
 * @param {{
 *   rows: DocumentacionComercialGridRow[];
 *   loading?: boolean;
 *   selectedCuit?: string | null;
 *   onVer: (cuit: string) => void;
 * }} props
 */
export function DocumentacionComercialClientesTable({
  rows,
  loading = false,
  selectedCuit = null,
  onVer,
}) {
  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border bg-card">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-border bg-card px-4 py-16 text-center text-muted-foreground">
        No hay documentación disponible.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/80 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">CUIT</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">IVA</th>
              <th className="px-4 py-3 font-medium">IIBB</th>
              <th className="px-4 py-3 font-medium">Última actualización</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const active = row.cuit === selectedCuit
              return (
                <tr
                  key={row.id}
                  className={`border-t border-border/80 ${
                    active ? "bg-secondary/40" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.cliente}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.cuitFormatted}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {row.balance.label}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {row.iva.label}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {row.iibb.label}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.ultimaActualizacion ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onVer(row.cuit)}
                    >
                      Ver
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
