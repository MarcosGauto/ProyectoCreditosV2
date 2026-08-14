"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"

import SectionHeader from "@/components/dashboard/SectionHeader"
import { DashboardButton } from "@/components/dashboard/DashboardButton"
import { useRequireAuth } from "@/hooks/useRequireAuth"
import {
  CHEQUE_ESTADO_LABEL,
  formatChequeFecha,
  formatChequeImporte,
} from "@/lib/chequesRechazadosModel"
import {
  deleteChequeRechazado,
  fetchChequeRechazadoById,
} from "@/lib/chequesRechazadosService"

function DetailRow({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-background/30 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-1 break-words">{value}</p>
    </div>
  )
}

export default function ChequeRechazadoDetailPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, loading: authLoading } = useRequireAuth()
  const [cheque, setCheque] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadCheque = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchChequeRechazadoById(id)
      setCheque(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!authLoading && user) {
      loadCheque()
    }
  }, [authLoading, user, loadCheque])

  const handleDelete = async () => {
    if (!cheque) {
      return
    }
    if (
      !window.confirm(
        `¿Eliminar el cheque ${cheque.numeroCheque}? Se borrarán también los archivos adjuntos.`
      )
    ) {
      return
    }

    try {
      await deleteChequeRechazado(id)
      router.push("/dashboard/cheques-rechazados")
    } catch (error) {
      console.error(error)
      window.alert("No se pudo eliminar el registro.")
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-muted-foreground">Cargando detalle del cheque…</div>
    )
  }

  if (!cheque) {
    return (
      <div className="text-muted-foreground">
        Cheque no encontrado.{" "}
        <Link href="/dashboard/cheques-rechazados" className="text-red-400">
          Volver al listado
        </Link>
      </div>
    )
  }

  const historial = Array.isArray(cheque.historial) ? [...cheque.historial].reverse() : []

  return (
    <div>
      <SectionHeader
        title={`Cheque ${cheque.numeroCheque}`}
        subtitle={`${cheque.razonSocial} — CUIT ${cheque.cuit}`}
        breadcrumbs={["Dashboard", "Cheques Rechazados", "Detalle"]}
        action={
          <div className="flex gap-2">
            <DashboardButton asChild variant="secondary" size="md">
              <Link href={`/dashboard/cheques-rechazados/${id}/editar`}>
                <Pencil className="w-4 h-4" />
                Editar
              </Link>
            </DashboardButton>
            <DashboardButton
              variant="danger"
              size="md"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </DashboardButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <DetailRow label="CUIT" value={cheque.cuit} />
        <DetailRow label="Razón social" value={cheque.razonSocial} />
        <DetailRow label="Número de cheque" value={cheque.numeroCheque} />
        <DetailRow label="Banco" value={cheque.banco} />
        <DetailRow label="Fecha emisión" value={formatChequeFecha(cheque.fechaEmision)} />
        <DetailRow
          label="Fecha vencimiento"
          value={formatChequeFecha(cheque.fechaVencimiento)}
        />
        <DetailRow label="Fecha rechazo" value={formatChequeFecha(cheque.fechaRechazo)} />
        <DetailRow label="Motivo" value={cheque.motivoRechazo} />
        <DetailRow label="Importe" value={formatChequeImporte(cheque.importe)} />
        <DetailRow
          label="Estado"
          value={CHEQUE_ESTADO_LABEL[cheque.estado] ?? cheque.estado}
        />
        <DetailRow label="Fecha abono" value={formatChequeFecha(cheque.fechaAbono)} />
        <DetailRow label="Observaciones" value={cheque.observaciones || "—"} />
        <DetailRow
          label="Observaciones de pago"
          value={cheque.observacionesPago || "—"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Imagen del cheque</p>
          {cheque.imagenChequeUrl ? (
            cheque.imagenChequeUrl.toLowerCase().includes(".pdf") ? (
              <a
                href={cheque.imagenChequeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Descargar / ver PDF del cheque
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cheque.imagenChequeUrl}
                alt={`Cheque ${cheque.numeroCheque}`}
                className="max-h-80 rounded-xl border border-border object-contain"
              />
            )
          ) : (
            <p className="text-sm text-muted-foreground">Sin imagen cargada.</p>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Nota de débito</p>
          {cheque.notaDebitoUrl ? (
            <a
              href={cheque.notaDebitoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-red-400 hover:text-red-300 text-sm"
            >
              Descargar nota de débito (PDF)
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Sin nota de débito cargada.</p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Historial de modificaciones</p>
        {historial.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin historial registrado.</p>
        ) : (
          <div className="space-y-3">
            {historial.map((entry, index) => (
              <div
                key={`${entry.fecha}-${index}`}
                className="rounded-lg border border-border bg-background/30 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{entry.detalle}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatChequeFecha(entry.fecha)} · {entry.usuario}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{entry.accion}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
