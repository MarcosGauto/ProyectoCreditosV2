"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Search } from "lucide-react"

import { useAuth } from "@/app/context/AuthContext"
import { canAccess } from "@/lib/auth/permissions"
import { Button } from "@/components/ui/button"
import { normalizeCuit } from "@/lib/chequesRechazadosModel"

import { RevisionRapidaHeader } from "@/components/revisionRapidaCheques/RevisionRapidaHeader"
import { RevisionRapidaKpis } from "@/components/revisionRapidaCheques/RevisionRapidaKpis"
import { RevisionRapidaChequeForm } from "@/components/revisionRapidaCheques/RevisionRapidaChequeForm"
import { RevisionRapidaBcra } from "@/components/revisionRapidaCheques/RevisionRapidaBcra"
import { RevisionRapidaChequesRechazados } from "@/components/revisionRapidaCheques/RevisionRapidaChequesRechazados"
import { RevisionRapidaAlerts } from "@/components/revisionRapidaCheques/RevisionRapidaAlerts"
import { RevisionRapidaCharts } from "@/components/revisionRapidaCheques/RevisionRapidaCharts"
import { RevisionRapidaBcraHeatmap } from "@/components/revisionRapidaCheques/RevisionRapidaBcraHeatmap"
import { loadRevisionRapidaCheques } from "@/lib/revisionRapidaCheques/loadRevisionRapidaCheques"
import { buildRevisionRapidaViewModel } from "@/lib/revisionRapidaCheques/buildRevisionRapidaViewModel"

const INPUT =
  "w-full min-w-0 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/35"

/**
 * Permite dígitos, guiones, puntos y espacios al tipear/pegar.
 * @param {string} raw
 */
function sanitizeCuitInput(raw) {
  return String(raw ?? "").replace(/[^\d\-.\s]/g, "")
}

export function RevisionRapidaChequesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { role, displayName } = useAuth()
  const allowed =
    canAccess(role, "CALIFICACION_CREDITICIA") ||
    canAccess(role, "CONSULTAS")

  const [cuitInput, setCuitInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [bundle, setBundle] = useState(
    /** @type {Awaited<ReturnType<typeof loadRevisionRapidaCheques>> | null} */ (
      null
    )
  )
  const [cheque, setCheque] = useState({
    importe: "",
    vencimiento: "",
    tipo: "",
    banco: "",
  })
  const [autoLoaded, setAutoLoaded] = useState(false)

  const runSearch = useCallback(
    async (rawCuit) => {
      const normalized = normalizeCuit(rawCuit)
      if (normalized.length !== 11) {
        setError(
          "Ingresá un CUIT válido de 11 dígitos (con o sin guiones), p. ej. 30-71592848-1 o 30715928481."
        )
        setBundle(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const data = await loadRevisionRapidaCheques(rawCuit, {
          refreshBcra: true,
          queriedBy: displayName ?? null,
        })
        if (!data.ok) {
          setBundle(null)
          setError(data.error || "No se pudo cargar el CUIT.")
          return
        }
        setBundle(data)
        setCuitInput(
          String(rawCuit).includes("-")
            ? sanitizeCuitInput(rawCuit)
            : normalized
        )
        router.replace(
          `/dashboard/revision-rapida-cheques?cuit=${normalized}`,
          { scroll: false }
        )
      } catch (err) {
        console.error("[RevisionRapidaCheques]", err)
        setBundle(null)
        setError(
          err instanceof Error ? err.message : "Error al cargar la revisión."
        )
      } finally {
        setLoading(false)
      }
    },
    [displayName, router]
  )

  useEffect(() => {
    if (autoLoaded) return
    const q = searchParams?.get("cuit")
    if (!q) {
      setAutoLoaded(true)
      return
    }
    const normalized = normalizeCuit(q)
    if (normalized.length === 11) {
      setCuitInput(sanitizeCuitInput(q))
      setAutoLoaded(true)
      void runSearch(q)
    } else {
      setAutoLoaded(true)
    }
  }, [searchParams, autoLoaded, runSearch])

  const model = useMemo(() => {
    if (!bundle || !bundle.ok) return null
    return buildRevisionRapidaViewModel({
      cuit: bundle.cuit,
      empresaExists: bundle.empresaExists,
      empresa: bundle.empresa,
      latest: bundle.latest,
      chequesRechazados: bundle.chequesRechazados,
      bcraReports: bundle.bcraReports,
      normalized: bundle.normalized,
      metrics: bundle.metrics,
      bcraError: bundle.bcraError,
      lastBcraFetchedAt: bundle.lastBcraFetchedAt,
      liveBcra: bundle.liveBcra,
      chequeInput: cheque,
    })
  }, [bundle, cheque])

  if (!allowed) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        No tenés permiso para acceder a esta consulta.
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="min-w-0">
        <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
          Revisión rápida de cheques
        </h1>
        <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground sm:text-sm">
          Consulta objetiva de BCRA y cheques rechazados. No aprueba ni rechaza
          operaciones.
        </p>
      </div>

      <form
        className="flex w-full min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-end sm:p-4"
        onSubmit={(e) => {
          e.preventDefault()
          void runSearch(cuitInput)
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            CUIT
          </span>
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            placeholder="30-71592848-1 o 30715928481"
            value={cuitInput}
            onChange={(e) => setCuitInput(sanitizeCuitInput(e.target.value))}
            className={INPUT}
          />
          <span className="mt-1 block text-[10px] text-muted-foreground">
            Acepta con o sin guiones
          </span>
        </label>
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="h-11 shrink-0 sm:min-w-[8.5rem]"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Consultar
        </Button>
      </form>

      {error ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </div>
      ) : null}

      {model ? (
        <div className="space-y-3">
          <RevisionRapidaHeader
            header={model.header}
            cuit={model.cuit}
            empresaExists={model.empresaExists}
            bcraError={model.bcraError}
          />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 lg:items-start">
            <div className="min-w-0 space-y-3 lg:col-span-3">
              <RevisionRapidaKpis kpis={model.kpis} />
              <RevisionRapidaChequeForm
                values={cheque}
                onChange={(patch) =>
                  setCheque((prev) => ({ ...prev, ...patch }))
                }
                escenarioReady={model.cheque.escenarioReady}
              />
            </div>
            <div className="min-w-0 lg:col-span-2">
              <RevisionRapidaAlerts
                alerts={model.alerts}
                escenario={model.escenario}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12 xl:items-stretch">
            <RevisionRapidaBcraHeatmap
              heatmap={model.charts.heatmap}
              className="xl:col-span-7"
            />
            <RevisionRapidaBcra
              bcraTable={model.bcraTable}
              className="xl:col-span-5"
            />
          </div>

          <RevisionRapidaCharts charts={model.charts} />

          <RevisionRapidaChequesRechazados cheques={model.cheques} />
        </div>
      ) : null}
    </div>
  )
}
