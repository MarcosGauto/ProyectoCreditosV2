"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  Download,
  FileSearch,
  History,
  Inbox,
  Loader2,
  Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  applyPortfolioFilter,
  buildPortfolioKpis,
  buildPortfolioNews,
  filterPortfolioRows,
  formatPortfolioCuit,
  PORTFOLIO_FILTER_CHIPS,
  PORTFOLIO_KPI_DEFS,
  portfolioFilterTitle,
} from "@/lib/portfolio/portfolioPresentation"
import {
  applyPortfolioSc1Filters,
  EMPTY_PORTFOLIO_SC1_FILTERS,
  formatPortfolioSc1Confidence,
  formatPortfolioSc1Estado,
  formatPortfolioSc1EstadoPlain,
  formatPortfolioSc1Limit,
  formatPortfolioSc1Score,
  hasActivePortfolioSc1Filters,
  PORTFOLIO_SC1_CONFIDENCE_OPTIONS,
  PORTFOLIO_SC1_ESTADO_OPTIONS,
} from "@/lib/portfolio/portfolioSc1Presentation"

/**
 * @typedef {import("@/lib/portfolio/portfolioPresentation").PortfolioFilterId} PortfolioFilterId
 * @typedef {import("@/lib/portfolio/portfolioPresentation").PortfolioRow} PortfolioRow
 * @typedef {import("@/lib/portfolio/portfolioSc1Presentation").PortfolioSc1FilterState} PortfolioSc1FilterState
 */

/**
 * Bandeja de trabajo — experiencia de uso diaria (solo presentación).
 *
 * @param {{
 *   data: Awaited<ReturnType<typeof import("@/lib/portfolio/portfolioService").fetchPortfolioDashboard>> | null;
 *   loading?: boolean;
 * }} props
 */
export function PortfolioDashboard({ data, loading = false }) {
  const router = useRouter()
  const searchRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState(
    /** @type {PortfolioFilterId} */ ("today")
  )
  const [sc1Filters, setSc1Filters] = useState(
    /** @type {PortfolioSc1FilterState} */ ({ ...EMPTY_PORTFOLIO_SC1_FILTERS })
  )

  const allRows = data?.rows ?? []
  const kpis = useMemo(() => buildPortfolioKpis(allRows), [allRows])
  const news = useMemo(() => buildPortfolioNews(allRows), [allRows])
  const hasAnySc1 = useMemo(
    () => allRows.some((r) => r.hasSc1),
    [allRows]
  )

  const tableRows = useMemo(() => {
    const searched = filterPortfolioRows(allRows, query)
    const legacyFiltered = applyPortfolioFilter(searched, filter)
    return applyPortfolioSc1Filters(legacyFiltered, sc1Filters)
  }, [allRows, query, filter, sc1Filters])

  const firstMatch = tableRows[0] ?? filterPortfolioRows(allRows, query)[0]
  const isTodayEmpty =
    filter === "today" &&
    tableRows.length === 0 &&
    !query.trim() &&
    !hasActivePortfolioSc1Filters(sc1Filters)

  const openAnalysis = (cuit) => {
    router.push(`/dashboard/analysis/${cuit}`)
  }

  const exportCsv = () => {
    const header = [
      "Empresa",
      "Nombre comercial",
      "CUIT",
      "Estado operativo",
      "Score SC-1.0",
      "Estado SC-1.0",
      "Confidence",
      "Limite sugerido SC-1.0",
      "Prioridad",
      "Proxima accion",
      "Tiempo estimado",
    ]
    const lines = tableRows.map((r) =>
      [
        csvEscape(r.razonSocial),
        csvEscape(r.nombreComercial ?? ""),
        r.cuit,
        csvEscape(r.statusLabel),
        r.sc1Score != null ? String(r.sc1Score) : "",
        csvEscape(
          r.sc1Category ? formatPortfolioSc1EstadoPlain(r.sc1Category) : ""
        ),
        r.sc1Confidence != null ? String(r.sc1Confidence) : "",
        r.sc1SuggestedLimit != null ? String(r.sc1SuggestedLimit) : "",
        r.priorityLabel,
        csvEscape(r.nextAction),
        r.estimatedTimeLabel,
      ].join(",")
    )
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cartera-${filter}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando bandeja…
      </div>
    )
  }

  if (!data || data.analyzedCount === 0) {
    return (
      <EmptyInbox
        title="Todavía no hay cartera publicada"
        body="Publicá un análisis desde el Decision Cockpit para empezar a trabajar la bandeja."
        ctaLabel="Nuevo análisis"
        onCta={() => router.push("/dashboard/documentation")}
      />
    )
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[520px] flex-col gap-4">
      {/* Header tools: buscador + acciones secundarias */}
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-lg">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por empresa, CUIT o nombre comercial..."
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-ring"
          />
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => router.push("/dashboard/documentation")}
          >
            <FileSearch className="mr-1.5 h-3.5 w-3.5" />
            Nuevo análisis
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            disabled={!firstMatch}
            onClick={() => firstMatch && openAnalysis(firstMatch.cuit)}
          >
            <History className="mr-1.5 h-3.5 w-3.5" />
            Historial
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={exportCsv}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Exportar
          </Button>
        </div>
      </div>

      {/* 4 KPIs = filtros */}
      <div className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-secondary sm:grid-cols-4">
        {PORTFOLIO_KPI_DEFS.map((def) => {
          const value = def.getValue(kpis)
          const active = filter === def.filterId
          const emphasize = Boolean(def.emphasis && value > 0)
          return (
            <button
              key={def.id}
              type="button"
              onClick={() =>
                setFilter((prev) =>
                  prev === def.filterId ? "today" : def.filterId
                )
              }
              className={
                active
                  ? "bg-secondary px-4 py-3 text-left"
                  : "bg-card px-4 py-3 text-left transition hover:bg-muted"
              }
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {def.label}
              </p>
              <p
                className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${
                  emphasize && def.emphasis === "risk"
                    ? "text-rose-300"
                    : emphasize && def.emphasis === "warn"
                      ? "text-amber-300"
                      : "text-foreground"
                }`}
              >
                {value}
              </p>
            </button>
          )
        })}
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5">
        {PORTFOLIO_FILTER_CHIPS.map((chip) => {
          const active = filter === chip.id
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              className={
                active
                  ? "rounded-full bg-zinc-100 px-3 py-1 text-[12px] font-medium text-zinc-900"
                  : "rounded-full px-3 py-1 text-[12px] text-muted-foreground transition hover:bg-muted hover:text-foreground/80"
              }
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {hasAnySc1 ? (
        <div className="flex shrink-0 flex-wrap items-end gap-2 rounded-xl border border-border/80 bg-muted/50 px-3 py-2.5">
          <p className="w-full text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-auto sm:mr-1 sm:self-center">
            SC-1.0
          </p>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">Estado SC-1.0</span>
            <select
              value={sc1Filters.category ?? ""}
              onChange={(e) =>
                setSc1Filters((prev) => ({
                  ...prev,
                  category: e.target.value || null,
                }))
              }
              className="h-8 min-w-[9rem] rounded-md border border-border bg-card px-2 text-[12px] text-foreground/80 outline-none focus:border-ring"
            >
              <option value="">Todos</option>
              {PORTFOLIO_SC1_ESTADO_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">Confidence</span>
            <select
              value={sc1Filters.confidence ?? ""}
              onChange={(e) =>
                setSc1Filters((prev) => ({
                  ...prev,
                  confidence:
                    /** @type {PortfolioSc1FilterState["confidence"]} */ (
                      e.target.value || null
                    ),
                }))
              }
              className="h-8 min-w-[6.5rem] rounded-md border border-border bg-card px-2 text-[12px] text-foreground/80 outline-none focus:border-ring"
            >
              <option value="">Todas</option>
              {PORTFOLIO_SC1_CONFIDENCE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">Score min</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              placeholder="—"
              value={sc1Filters.scoreMin ?? ""}
              onChange={(e) => {
                const raw = e.target.value
                setSc1Filters((prev) => ({
                  ...prev,
                  scoreMin:
                    raw === "" || !Number.isFinite(Number(raw))
                      ? null
                      : Number(raw),
                }))
              }}
              className="h-8 w-[4.5rem] rounded-md border border-border bg-card px-2 text-[12px] tabular-nums text-foreground/80 outline-none focus:border-ring"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">Score max</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              placeholder="—"
              value={sc1Filters.scoreMax ?? ""}
              onChange={(e) => {
                const raw = e.target.value
                setSc1Filters((prev) => ({
                  ...prev,
                  scoreMax:
                    raw === "" || !Number.isFinite(Number(raw))
                      ? null
                      : Number(raw),
                }))
              }}
              className="h-8 w-[4.5rem] rounded-md border border-border bg-card px-2 text-[12px] tabular-nums text-foreground/80 outline-none focus:border-ring"
            />
          </label>
          {hasActivePortfolioSc1Filters(sc1Filters) ? (
            <button
              type="button"
              onClick={() =>
                setSc1Filters({ ...EMPTY_PORTFOLIO_SC1_FILTERS })
              }
              className="h-8 self-end rounded-md px-2 text-[12px] text-muted-foreground transition hover:text-foreground/80"
            >
              Limpiar SC-1.0
            </button>
          ) : null}
        </div>
      ) : null}

      {news.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1">
          {news.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openAnalysis(item.cuit)}
              className={`text-left text-[12px] hover:underline ${
                item.tone === "down"
                  ? "text-rose-300"
                  : item.tone === "up"
                    ? "text-emerald-300"
                    : "text-muted-foreground"
              }`}
            >
              {item.text}
            </button>
          ))}
        </div>
      )}

      {/* Bandeja */}
      <section className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex shrink-0 items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {filter === "today"
              ? "Mi bandeja de trabajo"
              : portfolioFilterTitle(filter)}
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {tableRows.length}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-muted/40">
          {isTodayEmpty ? (
            <EmptyInbox
              embedded
              title="No hay clientes que requieran intervención hoy."
              body="Aprovechá para realizar nuevos análisis o revisar clientes publicados."
              ctaLabel="Ver cartera completa"
              onCta={() => setFilter("all")}
              secondaryLabel="Nuevo análisis"
              onSecondary={() => router.push("/dashboard/documentation")}
              success
            />
          ) : tableRows.length === 0 ? (
            <EmptyInbox
              embedded
              title="Sin resultados"
              body={
                query.trim()
                  ? "Probá otro CUIT, razón social o nombre comercial."
                  : "Ningún cliente en este filtro."
              }
              ctaLabel="Mi trabajo hoy"
              onCta={() => {
                setQuery("")
                setFilter("today")
              }}
            />
          ) : (
            <>
              {/* Mobile cards */}
              <ul className="flex flex-col gap-3 p-3 md:hidden">
                {tableRows.map((row) => (
                  <MobileCard
                    key={row.cuit}
                    row={row}
                    onOpen={() => openAnalysis(row.cuit)}
                  />
                ))}
              </ul>

              {/* Desktop table */}
              <table className="hidden w-full min-w-[860px] text-left md:table">
                <thead className="sticky top-0 z-10 border-b border-border bg-card">
                  <tr className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="px-4 py-3.5 font-medium">Empresa</th>
                    <th className="px-4 py-3.5 font-medium">Estado</th>
                    {hasAnySc1 ? (
                      <>
                        <th className="px-4 py-3.5 font-medium">Score SC-1.0</th>
                        <th className="px-4 py-3.5 font-medium">
                          Estado SC-1.0
                        </th>
                        <th className="px-4 py-3.5 font-medium">Confidence</th>
                        <th className="px-4 py-3.5 font-medium">
                          Límite sugerido
                        </th>
                      </>
                    ) : null}
                    <th className="px-4 py-3.5 font-medium">Prioridad</th>
                    <th className="px-4 py-3.5 font-medium">Próxima acción</th>
                    <th className="px-4 py-3.5 font-medium">Tiempo</th>
                    <th className="px-4 py-3.5 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {tableRows.map((row) => (
                    <DesktopRow
                      key={row.cuit}
                      row={row}
                      showSc1={hasAnySc1}
                      onOpen={() => openAnalysis(row.cuit)}
                    />
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

/**
 * @param {{ row: PortfolioRow; onOpen: () => void; showSc1?: boolean }} props
 */
function DesktopRow({ row, onOpen, showSc1 = false }) {
  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      className="cursor-pointer transition-colors hover:bg-muted/80"
    >
      <td className="px-4 py-5">
        <p className="text-[15px] font-semibold tracking-tight text-foreground">
          {row.razonSocial}
        </p>
        <p className="mt-0.5 text-[12px] tabular-nums text-muted-foreground">
          {formatPortfolioCuit(row.cuit)}
          {row.nombreComercial &&
            row.nombreComercial !== row.razonSocial && (
              <span className="text-muted-foreground"> · {row.nombreComercial}</span>
            )}
        </p>
      </td>
      <td className="px-4 py-5">
        <StatusBadge label={row.statusLabel} tone={row.statusTone} />
      </td>
      {showSc1 ? (
        <>
          <td className="px-4 py-5 text-[13px] tabular-nums text-foreground/80">
            {formatPortfolioSc1Score(row.sc1Score)}
          </td>
          <td className="px-4 py-5 text-[13px] text-muted-foreground">
            {row.sc1Category
              ? formatPortfolioSc1Estado(row.sc1Category)
              : "—"}
          </td>
          <td className="px-4 py-5 text-[13px] tabular-nums text-muted-foreground">
            {formatPortfolioSc1Confidence(row.sc1Confidence)}
          </td>
          <td className="px-4 py-5 text-[13px] tabular-nums text-muted-foreground">
            {formatPortfolioSc1Limit(row.sc1SuggestedLimit)}
          </td>
        </>
      ) : null}
      <td className="px-4 py-5">
        <PriorityBadge priority={row.priority} label={row.priorityLabel} />
      </td>
      <td className="px-4 py-5">
        <ActionPill action={row.nextAction} tone={row.actionTone} />
      </td>
      <td className="px-4 py-5">
        <TimeBadge
          icon={row.estimatedTimeIcon}
          label={row.estimatedTimeLabel}
        />
      </td>
      <td className="px-4 py-5 text-right">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-9 px-3.5 text-[13px] font-semibold"
          onClick={(e) => {
            e.stopPropagation()
            onOpen()
          }}
        >
          Abrir análisis
        </Button>
      </td>
    </tr>
  )
}

/**
 * @param {{ row: PortfolioRow; onOpen: () => void }} props
 */
function MobileCard({ row, onOpen }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-3.5 rounded-xl border border-border bg-card px-4 py-4 text-left transition hover:border-border hover:bg-muted/80 active:bg-muted"
      >
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">
            {row.razonSocial}
          </p>
          <p className="mt-0.5 text-[12px] tabular-nums text-muted-foreground">
            {formatPortfolioCuit(row.cuit)}
          </p>
        </div>

        <StatusBadge label={row.statusLabel} tone={row.statusTone} />

        {row.hasSc1 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
            <span>
              SC-1.0{" "}
              <span className="tabular-nums text-foreground/80">
                {formatPortfolioSc1Score(row.sc1Score)}
              </span>
            </span>
            {row.sc1Category ? (
              <span>
                Estado{" "}
                <span className="text-foreground/80">
                  {formatPortfolioSc1Estado(row.sc1Category)}
                </span>
              </span>
            ) : null}
            <span>
              Conf.{" "}
              <span className="tabular-nums text-foreground/80">
                {formatPortfolioSc1Confidence(row.sc1Confidence)}
              </span>
            </span>
            <span>
              Lím.{" "}
              <span className="tabular-nums text-foreground/80">
                {formatPortfolioSc1Limit(row.sc1SuggestedLimit)}
              </span>
            </span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={row.priority} label={row.priorityLabel} />
          <TimeBadge
            icon={row.estimatedTimeIcon}
            label={row.estimatedTimeLabel}
          />
        </div>

        <ActionPill action={row.nextAction} tone={row.actionTone} fullWidth />

        <span className="text-[12px] font-medium text-muted-foreground">
          Abrir análisis →
        </span>
      </button>
    </li>
  )
}

function PriorityBadge({ priority, label }) {
  const prefix =
    priority === "high" ? "🔴" : priority === "medium" ? "🟠" : "🟢"
  const className =
    priority === "high"
      ? "inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/20 px-3.5 py-2 text-[13px] font-bold text-rose-100"
      : priority === "medium"
        ? "inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3.5 py-2 text-[13px] font-bold text-amber-100"
        : "inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3.5 py-2 text-[13px] font-bold text-emerald-100"

  return (
    <span className={className}>
      <span aria-hidden>{prefix}</span>
      {label}
    </span>
  )
}

function ActionPill({ action, tone, fullWidth = false }) {
  if (action === "—") {
    return <span className="text-[13px] text-muted-foreground">—</span>
  }

  const className =
    tone === "danger"
      ? "inline-flex items-center justify-center rounded-lg border border-rose-500/50 bg-rose-500/25 px-4 py-2.5 text-[13px] font-bold text-rose-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      : tone === "warn"
        ? "inline-flex items-center justify-center rounded-lg border border-amber-500/50 bg-amber-500/25 px-4 py-2.5 text-[13px] font-bold text-amber-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        : "inline-flex items-center justify-center rounded-lg border border-zinc-600 bg-muted px-4 py-2.5 text-[13px] font-semibold text-foreground"

  return (
    <span className={`${className} ${fullWidth ? "w-full" : ""}`}>{action}</span>
  )
}

function StatusBadge({ label, tone }) {
  const className =
    tone === "danger"
      ? "inline-flex rounded-full border border-rose-500/35 bg-rose-500/15 px-2.5 py-1 text-[12px] font-semibold text-rose-200"
      : tone === "warn"
        ? "inline-flex rounded-full border border-amber-500/35 bg-amber-500/15 px-2.5 py-1 text-[12px] font-semibold text-amber-200"
        : tone === "ok"
          ? "inline-flex rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-[12px] font-semibold text-emerald-200"
          : tone === "info"
            ? "inline-flex rounded-full border border-sky-500/35 bg-sky-500/15 px-2.5 py-1 text-[12px] font-semibold text-sky-200"
            : "inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-[12px] font-medium text-muted-foreground"

  return <span className={className}>{label}</span>
}

function TimeBadge({ icon, label }) {
  if (!label || label === "—") {
    return <span className="text-[12px] text-muted-foreground">—</span>
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/80 px-2.5 py-1.5 text-[12px] font-medium tabular-nums text-muted-foreground">
      {icon ? <span aria-hidden>{icon}</span> : null}
      {label}
    </span>
  )
}

function EmptyInbox({
  title,
  body,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
  embedded = false,
  success = false,
}) {
  return (
    <div
      className={
        embedded
          ? "flex h-full min-h-[280px] flex-col items-center justify-center gap-3 px-6 py-16 text-center"
          : "flex flex-col items-center justify-center gap-3 rounded-xl border border-border px-6 py-16 text-center"
      }
    >
      {success ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
        </div>
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted">
          <Inbox className="h-7 w-7 text-muted-foreground" />
        </div>
      )}
      <p className="max-w-sm text-base font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {ctaLabel && onCta && (
          <Button type="button" size="sm" variant="secondary" onClick={onCta}>
            {ctaLabel}
          </Button>
        )}
        {secondaryLabel && onSecondary && (
          <Button type="button" size="sm" variant="ghost" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * @param {string} value
 */
function csvEscape(value) {
  const s = String(value ?? "")
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
