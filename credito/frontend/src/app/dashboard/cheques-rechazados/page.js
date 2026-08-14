"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"

import SectionHeader from "@/components/dashboard/SectionHeader"
import { ChequesRechazadosTable } from "@/components/chequesRechazados/ChequesRechazadosTable"
import { DashboardButton } from "@/components/dashboard/DashboardButton"
import { Input } from "@/components/ui/input"
import { useRequireAuth } from "@/hooks/useRequireAuth"
import {
  CHEQUE_ESTADO_LABEL,
  parseChequeImporte,
} from "@/lib/chequesRechazadosModel"
import {
  deleteChequeRechazado,
  fetchAllChequesRechazados,
} from "@/lib/chequesRechazadosService"

const DEFAULT_FILTERS = {
  cuit: "",
  razonSocial: "",
  estado: "",
  fechaRechazo: "",
  importe: "",
}

/**
 * @param {string | null | undefined} isoDate
 * @returns {string}
 */
function toDateFilterKey(isoDate) {
  if (!isoDate) {
    return ""
  }
  try {
    return new Date(isoDate).toISOString().slice(0, 10)
  } catch {
    return ""
  }
}

function ChequesRechazadosContent() {
  const { user, loading: authLoading } = useRequireAuth()
  const searchParams = useSearchParams()

  const [cheques, setCheques] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    cuit: searchParams.get("cuit") ?? "",
  })

  const loadCheques = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAllChequesRechazados()
      setCheques(data)
    } catch (error) {
      console.error("[ChequesRechazadosPage]", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      loadCheques()
    }
  }, [authLoading, user, loadCheques])

  const filteredCheques = useMemo(() => {
    return cheques.filter((cheque) => {
      if (filters.cuit && !String(cheque.cuit).includes(filters.cuit.replace(/\D/g, ""))) {
        return false
      }
      if (
        filters.razonSocial &&
        !String(cheque.razonSocial)
          .toLowerCase()
          .includes(filters.razonSocial.toLowerCase())
      ) {
        return false
      }
      if (filters.estado && cheque.estado !== filters.estado) {
        return false
      }
      if (filters.fechaRechazo) {
        if (toDateFilterKey(cheque.fechaRechazo) !== filters.fechaRechazo) {
          return false
        }
      }
      if (filters.importe) {
        const importe = Number(cheque.importe) || 0
        const filterImporte = parseChequeImporte(filters.importe)
        if (importe !== filterImporte) {
          return false
        }
      }
      return true
    })
  }, [cheques, filters])

  const handleClearFilters = () => {
    setFilters({ ...DEFAULT_FILTERS })
  }

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some((value) => String(value).trim() !== "")
  }, [filters])

  const handleDelete = async (cheque) => {
    const label = `${cheque.numeroCheque} — ${cheque.razonSocial}`
    if (!window.confirm(`¿Eliminar el cheque ${label}? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      await deleteChequeRechazado(String(cheque.id))
      await loadCheques()
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

  return (
    <div>
      <SectionHeader
        title="Cheques Rechazados"
        subtitle="Registro y seguimiento de cheques rechazados de clientes para evaluación de riesgo crediticio."
        breadcrumbs={["Dashboard", "Cheques Rechazados"]}
        action={
          <DashboardButton asChild variant="primary" size="md">
            <Link href="/dashboard/cheques-rechazados/nuevo">
              <Plus className="w-4 h-4" />
              Nuevo registro
            </Link>
          </DashboardButton>
        }
      />

      <div className="rounded-3xl border border-border bg-card p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm font-semibold text-foreground">Filtros</p>
          <DashboardButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
          >
            Limpiar filtros
          </DashboardButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input
            placeholder="CUIT"
            value={filters.cuit}
            onChange={(e) => setFilters((prev) => ({ ...prev, cuit: e.target.value }))}
            className="bg-background border-border text-foreground placeholder:text-muted-foreground"
          />
          <Input
            placeholder="Razón Social"
            value={filters.razonSocial}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, razonSocial: e.target.value }))
            }
            className="bg-background border-border text-foreground placeholder:text-muted-foreground"
          />
          <select
            value={filters.estado}
            onChange={(e) => setFilters((prev) => ({ ...prev, estado: e.target.value }))}
            className="h-10 rounded-md border border-border bg-background px-3 text-foreground text-sm"
            aria-label="Estado"
          >
            <option value="">Todos</option>
            {Object.entries(CHEQUE_ESTADO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="filtro-fecha-rechazo"
              className="text-xs text-muted-foreground"
            >
              Fecha de rechazo
            </label>
            <Input
              id="filtro-fecha-rechazo"
              type="date"
              value={filters.fechaRechazo}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, fechaRechazo: e.target.value }))
              }
              className="bg-background border-border text-foreground "
            />
          </div>
          <div className="flex flex-col justify-end">
            <Input
              placeholder="Importe del rechazo"
              inputMode="decimal"
              value={filters.importe}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, importe: e.target.value }))
              }
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <ChequesRechazadosTable
        cheques={filteredCheques}
        loading={loading}
        onDelete={handleDelete}
      />
    </div>
  )
}

export default function ChequesRechazadosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <ChequesRechazadosContent />
    </Suspense>
  )
}
