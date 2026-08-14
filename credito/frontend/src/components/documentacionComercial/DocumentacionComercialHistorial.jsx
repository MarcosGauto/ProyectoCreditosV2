"use client"

import { Download, Eye, X } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * @typedef {import("@/lib/documentacionComercial/documentacionComercialPresentation").ComercialDocRow} ComercialDocRow
 */

/**
 * @param {{
 *   open: boolean;
 *   row: ComercialDocRow | null;
 *   onClose: () => void;
 * }} props
 */
export function DocumentacionComercialHistorial({ open, row, onClose }) {
  if (!open || !row) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-background/60"
        aria-label="Cerrar historial"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[80vh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Historial — {row.label}
            </h3>
            <p className="text-xs text-muted-foreground">
              Versiones anteriores (se ocultan en la vista principal)
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
          {row.historial.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay versiones anteriores.
            </p>
          ) : (
            row.historial.map((version) => (
              <div
                key={version.id}
                className="rounded-xl border border-border bg-muted/50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <p className="truncate text-foreground/80">
                      {version.nombreArchivo ?? "Documento"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Fecha: {version.fecha ?? "—"}
                      {version.vencimiento
                        ? ` · Vence: ${version.vencimiento}`
                        : ""}
                    </p>
                  </div>
                  {version.downloadUrl ? (
                    <div className="flex shrink-0 gap-1">
                      <Button asChild variant="secondary" size="sm">
                        <a
                          href={version.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <a
                          href={version.downloadUrl}
                          download={version.nombreArchivo || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
