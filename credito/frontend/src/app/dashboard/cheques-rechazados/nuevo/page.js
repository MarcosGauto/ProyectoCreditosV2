"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import SectionHeader from "@/components/dashboard/SectionHeader"
import { ChequeRechazadoForm } from "@/components/chequesRechazados/ChequeRechazadoForm"
import { useRequireAuth } from "@/hooks/useRequireAuth"
import { createChequeRechazado } from "@/lib/chequesRechazadosService"

export default function NuevoChequeRechazadoPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useRequireAuth()
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (payload) => {
    setSaving(true)
    try {
      const created = await createChequeRechazado({
        ...payload,
        usuario: user?.email || user?.uid || "desconocido",
      })
      router.push(`/dashboard/cheques-rechazados/${created.id}`)
    } catch (error) {
      console.error(error)
      window.alert(
        error instanceof Error ? error.message : "No se pudo registrar el cheque."
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

  return (
    <div>
      <SectionHeader
        title="Alta de cheque rechazado"
        subtitle="Registrá un nuevo cheque rechazado asociado a un cliente."
        breadcrumbs={["Dashboard", "Cheques Rechazados", "Nuevo"]}
      />

      <div className="rounded-3xl border border-border bg-card p-6">
        <ChequeRechazadoForm
          mode="create"
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/cheques-rechazados")}
        />
      </div>
    </div>
  )
}
