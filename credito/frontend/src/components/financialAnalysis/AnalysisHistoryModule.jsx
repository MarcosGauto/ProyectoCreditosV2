"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, History, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { VersionRepository } from "@/lib/creditAnalysis/repositories/VersionRepository"
import { formatCreditAmount } from "@/lib/creditAnalysisEngine"
import {
  buildCardTrends,
  buildChangeChips,
  buildEvolutionSummary,
  buildHistoryComparison,
  coverageConSinLabel,
  formatHistoryDate,
  getVersionMetrics,
} from "@/components/financialAnalysis/analysisHistoryPresentation"

/**
 * Analysis History — capa de presentación sobre versiones publicadas.
 * Timeline descendente, comparación vs anterior, apertura solo lectura.
 *
 * @param {{ cuit: string }} props
 */
export function AnalysisHistoryModule({ cuit }) {
  const router = useRouter()
  const [items, setItems] = useState(
    /** @type {Record<string, unknown>[]} */ ([])
  )
  const [loading, setLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState(/** @type {unknown} */ (null))
  const [loadingMore, setLoadingMore] = useState(false)

  const loadPage = useCallback(
    async (cursorValue = null, append = false) => {
      if (!cuit) return

      if (append) setLoadingMore(true)
      else setLoading(true)

      try {
        const result = await VersionRepository.listTimeline(cuit, {
          pageSize: 20,
          cursorPublishedAt: cursorValue,
        })
        setItems((prev) =>
          append ? [...prev, ...result.items] : result.items
        )
        setNextCursor(result.nextCursor)
      } catch (error) {
        console.error("[AnalysisHistoryModule]", error)
        if (!append) setItems([])
        setNextCursor(null)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [cuit]
  )

  useEffect(() => {
    void loadPage(null, false)
  }, [loadPage])

  const latest = items[0] ?? null
  const previous = items[1] ?? null
  const comparison = useMemo(
    () => buildHistoryComparison(latest, previous),
    [latest, previous]
  )
  const evolution = useMemo(
    () => buildEvolutionSummary(comparison, { versionCount: items.length }),
    [comparison, items.length]
  )
  const chips = useMemo(() => buildChangeChips(comparison), [comparison])

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando historial…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border/80 bg-muted/50 px-4 py-8 text-center">
        <History className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Todavía no hay versiones publicadas para este CUIT.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Publicá un análisis desde Decisión para empezar el historial.
        </p>
      </div>
    )
  }

  return (
    <section aria-label="Historial de análisis" className="space-y-7">
      <header className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Historial de análisis
        </h2>
        <p className="text-sm text-muted-foreground">
          {items.length} versión{items.length === 1 ? "" : "es"} publicada
          {items.length === 1 ? "" : "s"} · solo lectura
        </p>
      </header>

      {/* Resumen ejecutivo de evolución */}
      <EvolutionSummaryBanner evolution={evolution} />

      {/* Chips de cambios */}
      {chips.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Cambios detectados
          </p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <ChangeChip key={chip.id} chip={chip} />
            ))}
          </div>
        </div>
      )}

      {/* Detalle de comparación (métricas que cambiaron) */}
      {previous && comparison?.hasAnyChange && (
        <ComparisonPanel comparison={comparison} />
      )}

      {/* Timeline visual */}
      <div className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Timeline
        </p>
        <ol className="relative space-y-0">
          {items.map((item, index) => {
            const prev = items[index + 1] ?? null
            return (
              <HistoryVersionCard
                key={String(item.versionId)}
                item={item}
                previous={prev}
                isLatest={index === 0}
                isLast={index === items.length - 1}
                onOpen={() =>
                  router.push(
                    `/dashboard/analysis/${cuit}/history/${item.versionId}`
                  )
                }
                onPdf={() =>
                  router.push(
                    `/dashboard/analysis/${cuit}/credit-info?versionId=${item.versionId}&download=1`
                  )
                }
              />
            )
          })}
        </ol>
      </div>

      {nextCursor && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loadingMore}
          onClick={() => void loadPage(nextCursor, true)}
        >
          {loadingMore ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando…
            </>
          ) : (
            "Cargar más"
          )}
        </Button>
      )}
    </section>
  )
}

function EvolutionSummaryBanner({ evolution }) {
  const toneClass =
    evolution.tone === "up"
      ? "border-emerald-500/25 bg-emerald-500/[0.07]"
      : evolution.tone === "down"
        ? "border-rose-500/25 bg-rose-500/[0.07]"
        : "border-border/80 bg-muted/50"

  const dotClass =
    evolution.tone === "up"
      ? "bg-emerald-400"
      : evolution.tone === "down"
        ? "bg-rose-400"
        : "bg-zinc-500"

  return (
    <div className={`rounded-xl border px-4 py-3.5 sm:px-5 ${toneClass}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Resumen de evolución
      </p>
      <div className="mt-2 flex items-start gap-3">
        <span
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`}
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p className="text-base font-semibold tracking-tight text-foreground">
            {evolution.headline}
          </p>
          <p className="text-sm text-muted-foreground">{evolution.detail}</p>
        </div>
      </div>
    </div>
  )
}

function ChangeChip({ chip }) {
  const className =
    chip.tone === "up"
      ? "rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200"
      : chip.tone === "down"
        ? "rounded-md border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-200"
        : "rounded-md border border-zinc-600/50 bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"

  return <span className={className}>{chip.label}</span>
}

/**
 * @param {{
 *   comparison: NonNullable<ReturnType<typeof buildHistoryComparison>>;
 * }} props
 */
function ComparisonPanel({ comparison }) {
  const estadoChanged = comparison.estado.filter(
    (r) => r.trend === "up" || r.trend === "down"
  )
  const ratiosChanged = comparison.ratios.filter(
    (r) => r.trend === "up" || r.trend === "down"
  )
  const hasDocs =
    comparison.documentacion.agregados.length > 0 ||
    comparison.documentacion.faltantes.length > 0

  return (
    <div className="space-y-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Detalle vs versión anterior
      </p>

      {estadoChanged.length > 0 && (
        <ComparisonGroup title="Estado">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {estadoChanged.map((r) => (
              <MetricDeltaCard key={r.key} row={r} />
            ))}
          </div>
        </ComparisonGroup>
      )}

      {ratiosChanged.length > 0 && (
        <ComparisonGroup title="Ratios">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ratiosChanged.map((r) => (
              <MetricDeltaCard key={r.key} row={r} />
            ))}
          </div>
        </ComparisonGroup>
      )}

      {hasDocs && (
        <ComparisonGroup title="Documentación">
          <div className="space-y-2 text-sm">
            {comparison.documentacion.agregados.length > 0 && (
              <p className="text-muted-foreground">
                Documentos agregados:{" "}
                <span className="text-foreground/80">
                  {comparison.documentacion.agregados.join(", ")}
                </span>
              </p>
            )}
            {comparison.documentacion.faltantes.length > 0 && (
              <p className="text-muted-foreground">
                Documentos faltantes:{" "}
                <span className="text-foreground/80">
                  {comparison.documentacion.faltantes.join(", ")}
                </span>
              </p>
            )}
          </div>
        </ComparisonGroup>
      )}

      {comparison.decision.length > 0 && (
        <ComparisonGroup title="Decisión">
          <ul className="space-y-1.5">
            {comparison.decision.map((item) => (
              <li key={item.id} className="text-sm font-medium text-foreground/80">
                {item.label}
              </li>
            ))}
          </ul>
        </ComparisonGroup>
      )}
    </div>
  )
}

function ComparisonGroup({ title, children }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

function MetricDeltaCard({ row }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/50 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {row.label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
        {row.currentLabel}
      </p>
      <p
        className={
          row.trend === "up"
            ? "mt-1.5 text-[11px] font-medium text-emerald-400"
            : row.trend === "down"
              ? "mt-1.5 text-[11px] font-medium text-rose-400"
              : "mt-1.5 text-[11px] text-muted-foreground"
        }
      >
        {row.trendLabel}
      </p>
    </div>
  )
}

function HistoryVersionCard({
  item,
  previous,
  isLatest,
  isLast,
  onOpen,
  onPdf,
}) {
  const metrics = getVersionMetrics(item)
  const trends = previous ? buildCardTrends(item, previous) : []
  const changedTrends = trends.filter(
    (t) => t.trend === "up" || t.trend === "down"
  )
  const cardChips = previous
    ? buildChangeChips(buildHistoryComparison(item, previous)).slice(0, 4)
    : []

  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      {/* Eje visual del timeline */}
      <div className="relative flex w-5 flex-col items-center">
        <span
          className={
            isLatest
              ? "relative z-10 mt-3 h-3 w-3 shrink-0 rounded-full bg-zinc-50 shadow-[0_0_0_4px_rgba(255,255,255,0.12)]"
              : "relative z-10 mt-3.5 h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-600 ring-2 ring-zinc-900"
          }
          aria-hidden
        />
        {!isLast && (
          <span
            className="absolute top-6 bottom-0 w-px bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-900"
            aria-hidden
          />
        )}
      </div>

      <div
        className={
          isLatest
            ? "min-w-0 flex-1 rounded-xl border border-zinc-100/20 bg-muted/80 px-3.5 py-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] sm:px-4"
            : "min-w-0 flex-1 rounded-lg border border-border/80 bg-muted/50 px-3 py-3 sm:px-4"
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={
                  isLatest
                    ? "text-[15px] font-semibold tracking-tight text-foreground"
                    : "text-sm font-semibold text-foreground"
                }
              >
                {formatHistoryDate(item.publishedAt, "long")}
              </p>
              <span className="rounded-md border border-border/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                v{String(item.versionNumber ?? "—")}
              </span>
              {isLatest && (
                <span className="rounded-md border border-border bg-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
                  Versión actual
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Analista:{" "}
              <span className="text-muted-foreground">
                {String(item.publishedBy ?? "—")}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="secondary" onClick={onOpen}>
              Abrir análisis
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onPdf}>
              <FileText className="mr-1 h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
          <Meta
            label="Score"
            value={metrics.score != null ? String(metrics.score) : "—"}
          />
          <Meta
            label="Cobertura"
            value={coverageConSinLabel(metrics.resultadoCobertura)}
          />
          <Meta
            label="Línea sugerida"
            value={
              metrics.linea != null ? formatCreditAmount(metrics.linea) : "—"
            }
          />
        </div>

        {(cardChips.length > 0 || changedTrends.length > 0) && (
          <div className="mt-3 space-y-2 border-t border-border/70 pt-2.5">
            {cardChips.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {cardChips.map((chip) => (
                  <ChangeChip key={chip.id} chip={chip} />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {changedTrends.map((d) => (
                  <span key={d.key} className="text-[11px] text-muted-foreground">
                    {d.label}{" "}
                    <span
                      className={
                        d.trend === "up"
                          ? "font-medium text-emerald-400"
                          : "font-medium text-rose-400"
                      }
                    >
                      {d.trendLabel}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function Meta({ label, value }) {
  return (
    <span className="text-muted-foreground">
      {label}{" "}
      <span className="font-medium tabular-nums text-foreground/80">{value}</span>
    </span>
  )
}

/** @deprecated Preferir AnalysisHistoryModule */
export function AnalysisTimelinePanel(props) {
  return <AnalysisHistoryModule {...props} />
}
