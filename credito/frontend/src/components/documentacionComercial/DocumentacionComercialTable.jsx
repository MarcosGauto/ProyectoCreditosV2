"use client"

import { Download, Eye, History } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * @typedef {import("@/lib/documentacionComercial/documentacionComercialPresentation").ComercialDocRow} ComercialDocRow
 */

/**
 * @param {{
 *   documentos: ComercialDocRow[];
 *   onHistorial: (row: ComercialDocRow) => void;
 * }} props
 */
export function DocumentacionComercialTable({ documentos, onHistorial }) {
  if (!documentos?.length) {
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
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Vencimiento</th>
              <th className="px-4 py-3 font-medium">Archivo</th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((row) => (
              <tr
                key={row.tipoId}
                className="border-t border-border/80 text-foreground/80"
              >
                <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                <td className="px-4 py-3 whitespace-nowrap">{row.estado.label}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.fecha ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.vencimiento ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.hasFile ? (
                      <>
                        <Button asChild variant="secondary" size="sm">
                          <a
                            href={row.downloadUrl ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" aria-hidden />
                            Ver PDF
                          </a>
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <a
                            href={row.downloadUrl ?? undefined}
                            download={row.nombreArchivo || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="mr-1 h-3.5 w-3.5" aria-hidden />
                            Descargar
                          </a>
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin archivo</span>
                    )}
                    {row.historialCount > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onHistorial(row)}
                      >
                        <History className="mr-1 h-3.5 w-3.5" aria-hidden />
                        Historial ({row.historialCount})
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
