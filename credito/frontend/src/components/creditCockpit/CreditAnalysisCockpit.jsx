"use client"

import { useMemo, useState } from "react"
import { FileText } from "lucide-react"
import { useRouter } from "next/navigation"

import { CreditKpiCard } from "@/components/creditCockpit/CreditKpiCard"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { buildCreditCockpitViewModel } from "@/lib/creditCockpit/buildCreditCockpitViewModel"
import { cn } from "@/lib/utils"

const ALERT_STYLES = {
  normal: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  critical: "border-danger/30 bg-danger/10 text-danger",
  info: "border-info/25 bg-info/10 text-info",
}

const ALERT_EMOJI = {
  normal: "🟢",
  warning: "🟡",
  critical: "🔴",
  info: "🔵",
}

const ALERT_LEVEL_ORDER = { critical: 0, warning: 1, info: 2, normal: 3 }

const DOC_ESTADO_CLASS = {
  completo: "text-success",
  pendiente: "text-warning",
  vencido: "text-danger",
  info: "text-info",
}

/**
 * @param {string | null | undefined} iso
 */
function formatUpdatedAt(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    })
  } catch {
    return null
  }
}

/**
 * @param {{
 *   cuit: string;
 *   empresa?: Record<string, unknown> | null;
 *   razonSocialBcra?: string | null;
 *   bcra?: Record<string, unknown> | null;
 *   computed?: Record<string, unknown> | null;
 *   coverageDecision?: Record<string, unknown> | null;
 *   preCalLoading?: boolean;
 *   estadoDocumentalItems?: Array<Record<string, unknown>>;
 *   fechaInicioActividad?: string | Date | null;
 *   montoCreditoOtorgado?: number | null;
 *   uploadPath?: string;
 *   activeTab?: string;
 *   onTabChange?: (tab: string) => void;
 *   tabs?: Array<{ key: string; label: string }>;
 *   headerActions?: import("react").ReactNode;
 *   children?: import("react").ReactNode;
 * }} props
 */
export function CreditAnalysisCockpit({
  cuit,
  empresa = null,
  razonSocialBcra = null,
  bcra = null,
  computed = null,
  coverageDecision = null,
  preCalLoading = false,
  estadoDocumentalItems = [],
  fechaInicioActividad = null,
  montoCreditoOtorgado = null,
  uploadPath,
  activeTab = "resumen",
  onTabChange,
  tabs = [],
  headerActions = null,
  children = null,
}) {
  const router = useRouter()
  const [docsOpen, setDocsOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [selectedAlertId, setSelectedAlertId] = useState(/** @type {string | null} */ (null))

  const model = useMemo(
    () =>
      buildCreditCockpitViewModel({
        cuit,
        empresa,
        razonSocialBcra,
        bcra,
        computed,
        coverageDecision,
        preCalLoading,
        estadoDocumentalItems,
        fechaInicioActividad,
        montoCreditoOtorgado,
      }),
    [
      cuit,
      empresa,
      razonSocialBcra,
      bcra,
      computed,
      coverageDecision,
      preCalLoading,
      estadoDocumentalItems,
      fechaInicioActividad,
      montoCreditoOtorgado,
    ]
  )

  const docsPath = uploadPath || `/dashboard/analysis/${cuit}/upload`
  const updatedLabel = formatUpdatedAt(model.updatedAt)
  const sortedAlerts = useMemo(
    () =>
      [...model.alerts].sort(
        (a, b) =>
          (ALERT_LEVEL_ORDER[a.level] ?? 9) - (ALERT_LEVEL_ORDER[b.level] ?? 9)
      ),
    [model.alerts]
  )
  const showResumen = activeTab === "resumen" || tabs.length === 0

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-card">
      {/* ── Cabecera compacta ── */}
      <header className="border-b border-border px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="rounded border border-info/25 bg-info/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-info">
                Legajo digital
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Perfil crediticio
              </span>
            </div>
            <h2
              className="truncate text-lg font-black leading-tight tracking-tight text-foreground sm:text-xl lg:text-2xl"
              title={
                model.razonSocial !== "—"
                  ? model.razonSocial
                  : "Análisis crediticio"
              }
            >
              {model.razonSocial !== "—"
                ? model.razonSocial
                : "Análisis crediticio"}
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
              CUIT {model.cuit}
              {model.emptyComputed
                ? " · Indicadores pendientes de cálculo"
                : null}
              {updatedLabel ? (
                <span className="text-muted-foreground"> · Act. {updatedLabel}</span>
              ) : null}
            </p>
          </div>
          {headerActions ? (
            <div className="flex shrink-0 items-start pt-0.5">{headerActions}</div>
          ) : null}
        </div>
      </header>

      {/* ── KPIs ── */}
      <div className="border-b border-border px-2.5 py-2 sm:px-4 sm:py-2.5">
        <div className="grid w-full min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-6">
          {model.profileCards.map((card) => (
            <div key={card.id} className="min-w-0">
              <CreditKpiCard {...card} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs (mismo shell) ── */}
      {tabs.length > 0 && onTabChange ? (
        <nav
          className="border-b border-border bg-muted/80"
          aria-label="Secciones del legajo"
        >
          <div className="flex w-full min-w-0 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange(tab.key)}
                  className={cn(
                    "relative shrink-0 border-b-2 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors sm:px-3 sm:py-2 sm:text-[11px]",
                    active
                      ? "border-info text-info"
                      : "border-transparent text-muted-foreground hover:text-foreground/80"
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>
      ) : null}

      {/* ── Contenido tab activa (mismo shell) ── */}
      <div className="min-w-0">
        {showResumen ? (
          <div className="grid grid-cols-1 gap-2 p-2.5 sm:grid-cols-2 sm:gap-2.5 sm:p-3 lg:p-4">
            <Panel title="Información general">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {model.generalInfo.map((item) => (
                  <div key={item.label} className="min-w-0">
                    <dt className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd
                      className="mt-px truncate text-xs font-medium text-foreground sm:text-[13px]"
                      title={item.value}
                    >
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel
              title="Documentación comercial"
              action={
                <button
                  type="button"
                  onClick={() => setDocsOpen(true)}
                  className="text-[10px] font-medium text-info hover:text-info/80"
                >
                  Ver detalle →
                </button>
              }
            >
              {model.documentation.length === 0 ? (
                <p className="text-xs text-muted-foreground">No disponible</p>
              ) : (
                <ul className="space-y-1.5">
                  {model.documentation.map((row) => (
                    <li
                      key={row.label}
                      className="flex min-w-0 items-center justify-between gap-2 text-xs"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                        <FileText className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{row.label}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block whitespace-nowrap text-[10px] text-foreground/80">
                          {row.fecha}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-semibold uppercase",
                            DOC_ESTADO_CLASS[row.estado] ?? "text-muted-foreground"
                          )}
                        >
                          {row.estadoLabel}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Análisis de crédito">
              <dl className="space-y-1">
                {model.analysisRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex min-w-0 items-baseline justify-between gap-2 border-b border-border pb-1 last:border-0 last:pb-0"
                  >
                    <dt className="min-w-0 truncate text-[11px] text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="min-w-0 max-w-[55%] text-right sm:max-w-[50%]">
                      <span className="block overflow-hidden whitespace-nowrap text-xs font-semibold tabular-nums text-foreground sm:text-[13px]">
                        {row.value}
                      </span>
                      {row.note ? (
                        <span className="mt-px block truncate text-[9px] text-muted-foreground">
                          {row.note}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel
              title="Alertas"
              action={
                sortedAlerts.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAlertId(null)
                      setAlertsOpen(true)
                    }}
                    className="text-[10px] font-medium text-info hover:text-info/80"
                  >
                    Ver todas →
                  </button>
                ) : null
              }
            >
              {sortedAlerts.length === 0 ? (
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs",
                    ALERT_STYLES.normal
                  )}
                >
                  <span aria-hidden>🟢</span> Normal
                </div>
              ) : (
                <ul className="space-y-1">
                  {sortedAlerts.slice(0, 6).map((alert) => (
                    <li key={alert.id} className="min-w-0">
                      <button
                        type="button"
                        title={alert.detail}
                        onClick={() => {
                          setSelectedAlertId(alert.id)
                          setAlertsOpen(true)
                        }}
                        className={cn(
                          "flex w-full min-w-0 items-start gap-1.5 rounded border px-2 py-1 text-left text-[11px] font-medium transition hover:brightness-110",
                          ALERT_STYLES[alert.level] ?? ALERT_STYLES.info
                        )}
                      >
                        <span aria-hidden className="shrink-0">
                          {ALERT_EMOJI[alert.level] ?? "🔵"}
                        </span>
                        <span className="min-w-0 truncate">
                          <span className="font-semibold">{alert.title}</span>
                          {alert.detail ? (
                            <span className="ml-1 opacity-70">{alert.detail}</span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        ) : children ? (
          <div className="min-w-0 overflow-x-auto p-2.5 sm:p-3 lg:p-4">
            {children}
          </div>
        ) : null}
      </div>

      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent className="max-w-lg border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>Documentación comercial</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Estado documental del CUIT sin abandonar el análisis.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3 text-sm">
            {(model.documentationAll.length
              ? model.documentationAll
              : model.documentation
            ).map((item) => (
              <li
                key={item.label}
                className="rounded-xl border border-border px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-foreground/80">
                    {item.status ?? item.estadoLabel ?? "—"}
                  </span>
                </div>
                {item.subtitle ? (
                  <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDocsOpen(false)
                router.push(docsPath)
              }}
            >
              Abrir carga / detalle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={alertsOpen} onOpenChange={setAlertsOpen}>
        <DialogContent className="max-w-lg border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>Alertas del análisis</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Ordenadas por severidad a partir de datos existentes.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {sortedAlerts.map((alert) => (
              <li
                key={alert.id}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm",
                  ALERT_STYLES[alert.level] ?? ALERT_STYLES.info,
                  selectedAlertId === alert.id ? "ring-1 ring-ring/30" : null
                )}
              >
                <p className="font-semibold">
                  {ALERT_EMOJI[alert.level] ?? "🔵"} {alert.title}
                </p>
                {alert.detail ? (
                  <p className="mt-1 text-xs opacity-80">{alert.detail}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </section>
  )
}

/**
 * @param {{
 *   title: string;
 *   action?: import("react").ReactNode;
 *   children: import("react").ReactNode;
 * }} props
 */
function Panel({ title, action = null, children }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card/90 p-2.5 sm:p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  )
}
