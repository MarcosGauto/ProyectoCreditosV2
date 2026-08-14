"use client"

import Link from "next/link"
import { Eye, Pencil, Trash2 } from "lucide-react"

import { DashboardButton } from "@/components/dashboard/DashboardButton"
import {
  CHEQUE_ESTADO_LABEL,
  formatChequeFecha,
  formatChequeImporte,
} from "@/lib/chequesRechazadosModel"

/**
 * @param {{
 *   cheques: import("@/lib/chequesRechazadosModel").ChequeRechazadoDoc[];
 *   loading?: boolean;
 *   onDelete: (cheque: import("@/lib/chequesRechazadosModel").ChequeRechazadoDoc) => void;
 * }} props
 */
export function ChequesRechazadosTable({ cheques, loading = false, onDelete }) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
        Cargando cheques rechazados…
      </div>
    )
  }

  if (!cheques.length) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
        No hay cheques rechazados registrados.
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-card border-b border-border">
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">CUIT</th>
              <th className="px-4 py-3 font-semibold">Razón social</th>
              <th className="px-4 py-3 font-semibold">Nº cheque</th>
              <th className="px-4 py-3 font-semibold">Fecha rechazo</th>
              <th className="px-4 py-3 font-semibold">Importe</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cheques.map((cheque) => (
              <tr
                key={cheque.id}
                className="border-t border-border/80 hover:bg-accent/40"
              >
                <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                  {cheque.cuit}
                </td>
                <td className="px-4 py-3 text-sm text-foreground max-w-[200px] truncate">
                  {cheque.razonSocial}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {cheque.numeroCheque}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                  {formatChequeFecha(cheque.fechaRechazo)}
                </td>
                <td className="px-4 py-3 text-sm text-foreground tabular-nums">
                  {formatChequeImporte(cheque.importe)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex text-xs font-semibold px-2 py-1 rounded-full border ${
                      cheque.estado === "abonado"
                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                        : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                    }`}
                  >
                    {CHEQUE_ESTADO_LABEL[cheque.estado] ?? cheque.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <DashboardButton
                      asChild
                      variant="secondary"
                      size="icon"
                      title="Ver detalle"
                    >
                      <Link href={`/dashboard/cheques-rechazados/${cheque.id}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </DashboardButton>
                    <DashboardButton
                      asChild
                      variant="secondary"
                      size="icon"
                      title="Editar"
                    >
                      <Link href={`/dashboard/cheques-rechazados/${cheque.id}/editar`}>
                        <Pencil className="w-4 h-4" />
                      </Link>
                    </DashboardButton>
                    <DashboardButton
                      variant="danger"
                      size="icon"
                      title="Eliminar"
                      onClick={() => onDelete(cheque)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </DashboardButton>
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
