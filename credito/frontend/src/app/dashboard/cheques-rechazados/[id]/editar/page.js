"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import SectionHeader from "@/components/dashboard/SectionHeader"
import { ChequeRechazadoForm } from "@/components/chequesRechazados/ChequeRechazadoForm"
import { useRequireAuth } from "@/hooks/useRequireAuth"
import {
  fetchChequeRechazadoById,
  updateChequeRechazado,
} from "@/lib/chequesRechazadosService"

export default function EditarChequeRechazadoPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, loading: authLoading } = useRequireAuth()
  const [cheque, setCheque] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  const handleSubmit = async (payload) => {
    setSaving(true)
    try {
      await updateChequeRechazado(id, {
        ...payload,
        usuario: user?.email || user?.uid || "desconocido",
      })
      router.push(`/dashboard/cheques-rechazados/${id}`)
    } catch (error) {
      console.error(error)
      window.alert(
        error instanceof Error ? error.message : "No se pudo actualizar el cheque."
      )
    } finally {
      setSaving(false)
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
    return <div className="text-muted-foreground">Cargando datos del cheque…</div>
  }

  if (!cheque) {
    return <div className="text-muted-foreground">Cheque no encontrado.</div>
  }

  return (
    <div>
      <SectionHeader
        title="Editar cheque rechazado"
        subtitle={`${cheque.razonSocial} — Cheque ${cheque.numeroCheque}`}
        breadcrumbs={["Dashboard", "Cheques Rechazados", "Editar"]}
      />

      <div className="rounded-3xl border border-border bg-card p-6">
        <ChequeRechazadoForm
          mode="edit"
          initialData={cheque}
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/dashboard/cheques-rechazados/${id}`)}
        />
      </div>
    </div>
  )
}
