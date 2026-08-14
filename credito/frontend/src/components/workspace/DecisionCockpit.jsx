"use client"

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileStack,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react"

import {
  buildDecisionFactorGroups,
  getDecisionRiskLevelLabel,
  getDocumentacionStatusList,
  hasCoverageFromResultado,
} from "@/components/workspace/decisionCockpitPresentation"

/**
 * Centro de Decisión Crediticia — listo para uso.
 * Solo presentación sobre señales existentes.
 */
export function DecisionCockpit({
  resultadoCoberturaLabel = "Sin evaluar",
  resultadoCobertura = null,
  estadoGeneral = "unknown",
  estadoGeneralLabel = "Sin evaluar",
  scoreFinanciero = null,
  lineaSugeridaLabel = "—",
  lineaLoading = false,
  documentalCompletitud = null,
  estadoDocumentalItems = null,
  checklist = null,
  motivosExclusion = null,
  displayWarnings = null,
  dictamenPatrimonial = null,
  nosisAlertas = null,
  analisisBalanceIA = null,
  onGoDocumentation,
}) {
  const canSell = hasCoverageFromResultado(resultadoCobertura)
  const riskLevel = getDecisionRiskLevelLabel(estadoGeneral)
  const factors = buildDecisionFactorGroups({
    checklist,
    motivosExclusion,
    displayWarnings,
    estadoGeneral,
    resultadoCobertura,
    documentalCompletitud,
    dictamenPatrimonial,
    nosisAlertas,
    iaFortalezas: analisisBalanceIA?.fortalezas,
    iaDebilidades: analisisBalanceIA?.debilidades,
    iaMonitorear: analisisBalanceIA?.monitorear,
  })
  const docs = getDocumentacionStatusList(estadoDocumentalItems)
  const pendingCount = docs.filter((d) => !d.ok).length
  const tone = resolveTone(estadoGeneral, canSell)

  return (
    <section
      aria-label="Centro de decisión crediticia"
      className="space-y-7"
    >
      {/* Nivel 1 — Veredicto + Línea */}
      <div className="space-y-5">
        <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0 space-y-2.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Veredicto
            </p>
            <div className="flex items-start gap-3">
              <span
                className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`}
                aria-hidden
              />
              <div className="min-w-0">
                <h2 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
                  {canSell ? "Puedo venderle" : "No puedo venderle"}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  <span className="text-muted-foreground">{resultadoCoberturaLabel}</span>
                  <span className="mx-2 text-zinc-700" aria-hidden>
                    ·
                  </span>
                  Riesgo {riskLevel}
                  {scoreFinanciero != null && (
                    <>
                      <span className="mx-2 text-zinc-700" aria-hidden>
                        ·
                      </span>
                      Score {scoreFinanciero}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border/60 pt-4 lg:border-t-0 lg:pt-0 lg:text-right">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Línea sugerida
            </p>
            <div
              className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl"
              aria-live="polite"
            >
              {lineaLoading ? (
                <Loader2
                  className="inline h-7 w-7 animate-spin text-muted-foreground"
                  aria-label="Calculando línea"
                />
              ) : (
                lineaSugeridaLabel
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Límite recomendado</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-7 gap-y-2 border-y border-border/60 py-3 text-sm">
          <MetaItem label="Estado" value={estadoGeneralLabel} tone={tone.text} />
          <MetaItem label="Riesgo" value={riskLevel} tone={tone.text} />
          <MetaItem
            label="Cobertura"
            value={canSell ? "Sí" : "No"}
            tone={canSell ? "text-emerald-400" : "text-rose-400"}
          />
          <MetaItem
            label="Score"
            value={scoreFinanciero != null ? String(scoreFinanciero) : "—"}
          />
        </div>
      </div>

      {/* Nivel 2 — Problemas / A favor / Docs */}
      <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-5 md:col-span-2 lg:col-span-5">
          <SectionLabel
            icon={ShieldAlert}
            title="Problemas"
            count={factors.blocking.length + factors.risk.length}
            accent={
              factors.blocking.length + factors.risk.length > 0
                ? "text-amber-400"
                : undefined
            }
          />
          <FactorGroup
            title="Bloqueantes"
            items={factors.blocking}
            empty="Sin bloqueantes"
            variant="blocking"
          />
          <FactorGroup
            title="Riesgos"
            items={factors.risk}
            empty="Sin riesgos detectados"
            variant="risk"
          />
        </div>

        <div className="space-y-3 lg:col-span-4">
          <SectionLabel
            icon={CheckCircle2}
            title="A favor"
            count={factors.positive.length}
            accent={
              factors.positive.length > 0 ? "text-emerald-400" : undefined
            }
          />
          {factors.positive.length === 0 ? (
            <EmptyLine text="Sin factores a favor" />
          ) : (
            <ul className="space-y-2">
              {factors.positive.slice(0, 8).map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-2.5 text-[13px] leading-snug text-muted-foreground"
                >
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
                    strokeWidth={2.5}
                  />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 lg:col-span-3">
          <SectionLabel icon={FileStack} title="Documentación" />
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {documentalCompletitud != null ? `${documentalCompletitud}%` : "—"}
            </span>
            {pendingCount > 0 ? (
              <span className="text-xs text-muted-foreground">
                {pendingCount} pendiente{pendingCount === 1 ? "" : "s"}
              </span>
            ) : docs.length > 0 ? (
              <span className="text-xs text-emerald-500/90">Completa</span>
            ) : null}
          </div>
          {docs.length === 0 ? (
            <EmptyLine text="Sin datos documentales" />
          ) : (
            <ul className="space-y-1.5">
              {docs.map((doc) => (
                <li
                  key={doc.label}
                  className="flex items-center gap-2 text-[13px]"
                >
                  {doc.ok ? (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <X
                      className="h-3.5 w-3.5 shrink-0 text-rose-400"
                      strokeWidth={2.5}
                    />
                  )}
                  <span className={doc.ok ? "text-muted-foreground" : "text-foreground/80"}>
                    {doc.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {pendingCount > 0 && onGoDocumentation && (
            <button
              type="button"
              onClick={onGoDocumentation}
              className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              <FileStack className="h-3 w-3" />
              Completar documentación
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function FactorGroup({ title, items, empty, variant }) {
  const Icon = variant === "blocking" ? X : AlertTriangle
  const iconClass =
    variant === "blocking" ? "text-rose-400" : "text-amber-400"

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>
      {items.length === 0 ? (
        <EmptyLine text={empty} />
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 6).map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 text-[13px] leading-snug text-muted-foreground"
            >
              <Icon
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${iconClass}`}
                strokeWidth={2.5}
              />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function resolveTone(estadoGeneral, canSell) {
  if (!canSell || estadoGeneral === "risky") {
    return { dot: "bg-rose-400", text: "text-rose-400" }
  }
  if (estadoGeneral === "medium") {
    return { dot: "bg-amber-400", text: "text-amber-400" }
  }
  if (estadoGeneral === "good") {
    return { dot: "bg-emerald-400", text: "text-emerald-400" }
  }
  return { dot: "bg-zinc-500", text: "text-muted-foreground" }
}

function MetaItem({ label, value, tone = "text-foreground/80" }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${tone}`}>{value}</span>
    </div>
  )
}

function SectionLabel({ icon: Icon, title, count, accent }) {
  return (
    <div className="flex items-center gap-2">
      <Icon
        className={`h-3.5 w-3.5 ${accent ?? "text-muted-foreground"}`}
        strokeWidth={2}
      />
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>
      {typeof count === "number" && (
        <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
      )}
    </div>
  )
}

function EmptyLine({ text }) {
  return <p className="text-[13px] text-muted-foreground">{text}</p>
}
