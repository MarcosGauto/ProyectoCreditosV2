"use client"

import { useMemo, useState } from "react"
import { ArrowDownAZ, ArrowUpAZ, Edit3, Loader2, Plus, Save, Search, Trash2, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { useRequireAdmin } from "@/hooks/useRequireAuth"
import { useInflationIndexes } from "@/hooks/useInflationIndexes"
import {
  deleteInflationIndex,
  formatInflationPeriod,
  saveInflationIndex,
} from "@/lib/inflation/inflationIndexService"

const emptyForm = () => ({ period: "", value: "", source: "INDEC" })

export function InflationIndexesSettingsPage() {
  const { user, loading: authLoading, isAdmin } = useRequireAdmin()
  const { indexes, loading, error } = useInflationIndexes()
  const [query, setQuery] = useState("")
  const [ascending, setAscending] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingPeriod, setEditingPeriod] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const visibleIndexes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return indexes
      .filter(
        (item) =>
          !normalizedQuery ||
          item.period.includes(normalizedQuery) ||
          formatInflationPeriod(item.period).includes(normalizedQuery)
      )
      .sort((a, b) =>
        ascending
          ? a.period.localeCompare(b.period)
          : b.period.localeCompare(a.period)
      )
  }, [indexes, query, ascending])

  const resetForm = () => {
    setForm(emptyForm())
    setEditingPeriod(null)
    setMessage("")
  }

  const handleEdit = (item) => {
    setEditingPeriod(item.period)
    setForm({
      period: item.period,
      value: String(item.value).replace(".", ","),
      source: item.source || "INDEC",
    })
    setMessage("")
  }

  const handleSave = async () => {
    if (!isAdmin || !user) return
    setSaving(true)
    setMessage("")
    try {
      const value = Number(form.value.trim().replace(",", "."))
      await saveInflationIndex({
        period: form.period,
        value,
        source: form.source,
        updatedBy: user.uid,
      })
      setMessage(
        editingPeriod
          ? "Índice IPC actualizado."
          : "Índice IPC agregado."
      )
      setForm(emptyForm())
      setEditingPeriod(null)
    } catch (saveError) {
      setMessage(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el índice IPC."
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (period) => {
    if (!isAdmin || !window.confirm(`¿Eliminar el índice IPC de ${formatInflationPeriod(period)}?`)) {
      return
    }
    setMessage("")
    try {
      await deleteInflationIndex(period)
      if (editingPeriod === period) resetForm()
      setMessage("Índice IPC eliminado.")
    } catch (deleteError) {
      setMessage(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar el índice IPC."
      )
    }
  }

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Verificando permisos…
      </div>
    )
  }

  return (
    <div className="space-y-6 text-foreground">
      <div>
        <h1 className="text-2xl font-bold">Índices IPC</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Tabla maestra utilizada por todos los balances. Cargue un índice por
          mes; el coeficiente se calcula automáticamente desde el mes de cierre
          hasta el mes actual.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">
            {editingPeriod ? "Editar índice" : "Agregar índice"}
          </h2>
          {editingPeriod && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Mes</span>
            <Input
              type="month"
              value={form.period}
              disabled={Boolean(editingPeriod)}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, period: event.target.value }))
              }
              className="border-border bg-background/40 text-foreground"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Índice IPC</span>
            <Input
              inputMode="decimal"
              value={form.value}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, value: event.target.value }))
              }
              placeholder="100,25"
              className="border-border bg-background/40 text-foreground"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Fuente</span>
            <Input
              value={form.source}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, source: event.target.value }))
              }
              className="border-border bg-background/40 text-foreground"
            />
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.period || !form.value.trim()}
            className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editingPeriod ? (
              <Save className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {editingPeriod ? "Guardar" : "Agregar"}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-amber-200">{message}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por mes (08/2026 o 2026-08)"
              className="border-border bg-background/40 pl-9 text-foreground"
            />
          </div>
          <button
            type="button"
            onClick={() => setAscending((current) => !current)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-foreground/80 hover:bg-accent/40"
          >
            {ascending ? (
              <ArrowDownAZ className="h-4 w-4" />
            ) : (
              <ArrowUpAZ className="h-4 w-4" />
            )}
            {ascending ? "Más antiguos primero" : "Más recientes primero"}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando índices…
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-red-300">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-background/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Mes</th>
                  <th className="px-4 py-3 text-right">Índice IPC</th>
                  <th className="px-4 py-3">Fuente</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleIndexes.map((item) => (
                  <tr key={item.period} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">
                      {formatInflationPeriod(item.period)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.value.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.source}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="rounded-md p-2 text-blue-300 hover:bg-blue-500/10"
                          title="Editar"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.period)}
                          className="rounded-md p-2 text-red-300 hover:bg-red-500/10"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleIndexes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      No hay índices IPC para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}