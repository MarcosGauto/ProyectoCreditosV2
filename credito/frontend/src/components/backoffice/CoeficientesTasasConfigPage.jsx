"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Percent, Save } from "lucide-react"

import { useAuth } from "@/app/context/AuthContext"
import { useCoeficientesGlobales } from "@/hooks/useCoeficientesGlobales"
import { DEFAULT_COEFICIENTES_GLOBALES } from "@/lib/coeficientes/coeficientesNucleoModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function formatUpdatedAt(iso) {
  if (!iso) {
    return "—"
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleString("es-AR")
}

const inputClass =
  "bg-card border-border text-foreground focus-visible:ring-red-500/40"

export function CoeficientesTasasConfigPage() {
  const { user, role } = useAuth()
  const isAdmin = role === "admin"
  const { globales, updatedAt, updatedBy, loading, saving, error, saveGlobales } =
    useCoeficientesGlobales({ userEmail: user?.email ?? null })

  const [draft, setDraft] = useState({ ...DEFAULT_COEFICIENTES_GLOBALES })
  const [message, setMessage] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (!loading) {
      setDraft(globales)
    }
  }, [globales, loading])

  const handleSave = async () => {
    if (!isAdmin) {
      return
    }
    setMessage(null)
    try {
      await saveGlobales(draft)
      setMessage("Parámetros globales guardados correctamente.")
    } catch {
      setMessage("Error al guardar los parámetros.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando parámetros globales…
      </div>
    )
  }

  return (
    <div className="text-foreground space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-5 h-5 text-red-400" />
            <h1 className="text-2xl font-bold">Coeficientes y Tasas</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Parámetros globales del sistema de tarjetas. Se aplican automáticamente
            en el cálculo de coeficientes, cuotas y precios financiados.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Última modificación: {formatUpdatedAt(updatedAt)} · Usuario:{" "}
            {updatedBy ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/dashboard">Volver al dashboard</Link>
          </Button>
          {isAdmin && (
            <Button
              type="button"
              variant="primary"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar cambios
            </Button>
          )}
        </div>
      </div>

      {(error || message) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-green-500/30 bg-green-500/10 text-green-200"
          }`}
        >
          {error ?? message}
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Solo administradores pueden modificar estos parámetros. Los valores se
          muestran en modo lectura.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Parámetros globales de tarjetas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="arancel-deb" className="text-muted-foreground">
              Arancel Débito (%)
            </Label>
            <Input
              id="arancel-deb"
              type="number"
              step="0.01"
              className={inputClass}
              value={draft.arancelDeb}
              readOnly={!isAdmin}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  arancelDeb: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arancel-cre" className="text-muted-foreground">
              Arancel Crédito (%)
            </Label>
            <Input
              id="arancel-cre"
              type="number"
              step="0.01"
              className={inputClass}
              value={draft.arancelCre}
              readOnly={!isAdmin}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  arancelCre: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interes" className="text-muted-foreground">
              Interés (%)
            </Label>
            <Input
              id="interes"
              type="number"
              step="0.01"
              className={inputClass}
              value={draft.interes}
              readOnly={!isAdmin}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  interes: Number(e.target.value),
                }))
              }
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Estos valores se leen desde el mismo documento de coeficientes (
          <code className="text-muted-foreground">coeficientes/coeficientesNucleo</code>
          ). La pantalla{" "}
          <Link
            href="/dashboard/creditCalculator"
            className="text-sky-300 hover:text-sky-200"
          >
            Coeficientes Tarjetas
          </Link>{" "}
          los utiliza en tiempo real para recalcular tablas operativas.
        </p>
      </section>
    </div>
  )
}
