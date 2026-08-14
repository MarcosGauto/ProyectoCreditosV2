"use client"

import { Loader2 } from "lucide-react"
import {
  formatSc1Amount,
  formatSc1ConfidencePct,
  formatSc1Number,
  formatSc1Term,
  labelConfidenceLevel,
  labelDecisionCode,
  labelLimitOrigin,
  labelPipelineStage,
  labelStepCode,
} from "@/components/workspace/sc1CockpitPresentation"
import {
  formatSc1Estado,
  formatSc1NivelInterno,
  getSc1EstadoDef,
  resolveSc1EstadoId,
} from "@/components/workspace/sc1EstadoPresentation"

/**
 * Bloque SC-1.0 reutilizable (Cockpit live / Historial snapshot).
 * Orden de lectura: decisión (Estado) → detalle técnico.
 *
 * @param {{
 *   sc1?: Record<string, unknown> | null;
 *   runtime?: { loading?: boolean; error?: string | null; ready?: boolean } | null;
 *   variant?: "live" | "history";
 * }} props
 */
export function Sc1ComparisonBlock({
  sc1 = null,
  runtime = null,
  variant = "live",
}) {
  const loading = Boolean(runtime?.loading)
  const error = runtime?.error ?? null
  const score = /** @type {Record<string, any> | null} */ (
    sc1?.ownCreditScore ?? null
  )
  const limit = /** @type {Record<string, any> | null} */ (
    sc1?.suggestedLimit ?? null
  )

  const isHistory = variant === "history"

  return (
    <section
      aria-label={isHistory ? "SC-1.0 histórico" : "Comparación SC-1.0"}
      className="space-y-5 border-t border-border/80 pt-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {isHistory ? "Snapshot publicado" : "Comparación interna"}
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            SC-1.0
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isHistory
              ? "Datos congelados al publicar — sin recalcular."
              : "Resultado paralelo — no reemplaza el veredicto operativo legacy."}
          </p>
        </div>
        {loading ? (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Calculando SC-1.0…
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
          role="alert"
        >
          No se pudo calcular SC-1.0: {error}
        </div>
      ) : null}

      {!loading && !score && !limit && !error ? (
        <p className="text-sm text-muted-foreground">Sin resultado SC-1.0 todavía.</p>
      ) : null}

      {(score || limit) && (
        <div className="space-y-5">
          <DecisionFirstPanel score={score} limit={limit} />
          {limit?.trace ? <TracePanel trace={limit.trace} /> : null}
        </div>
      )}
    </section>
  )
}

/**
 * Panel orientado al analista: Estado primero, luego detalle.
 *
 * @param {{
 *   score: Record<string, any> | null;
 *   limit: Record<string, any> | null;
 * }} props
 */
function DecisionFirstPanel({ score, limit }) {
  const final = score?.finalScore ?? {}
  const confidence = score?.confidence ?? {}
  const nivelInterno = formatSc1NivelInterno(final.categoryCode)
  const estadoId = resolveSc1EstadoId(final.categoryCode, final.categoryLabel)
  const estadoDef = getSc1EstadoDef(estadoId)
  const estadoLabel = formatSc1Estado(final.categoryCode, final.categoryLabel)

  const amount = limit?.suggestedLimit ?? {}
  const decision = limit?.decision ?? {}
  const coverage = readCoveragePresentation(score)
  const motivos = collectMotivosPrincipales(score, limit)

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      {/* 1. Estado — protagonista */}
      <div className="border-b border-border/80 pb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Estado
        </p>
        {estadoDef && estadoLabel !== "—" ? (
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            <span aria-hidden className="mr-2">
              {estadoDef.emoji}
            </span>
            {estadoDef.label}
          </p>
        ) : (
          <p className="mt-2 text-xl font-semibold text-muted-foreground">—</p>
        )}
        {estadoDef?.meaning ? (
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            {estadoDef.meaning}
          </p>
        ) : null}
      </div>

      {/* 2–4. Score · Nivel interno · Confianza */}
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-[11px] text-muted-foreground">Score</dt>
          <dd className="mt-0.5 text-lg font-medium tabular-nums text-foreground">
            {final.value != null
              ? `${formatSc1Number(final.value)} puntos`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-zinc-700">Nivel interno</dt>
          <dd className="mt-0.5 text-sm tabular-nums text-muted-foreground">
            {nivelInterno ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Confianza</dt>
          <dd className="mt-0.5 text-[15px] text-foreground/80">
            {labelConfidenceLevel(confidence.level, confidence.label)}
            {confidence.value != null ? (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({formatSc1ConfidencePct(confidence.value)})
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      {/* 5–7. Límite · Cobertura · Motivos */}
      <div className="mt-5 grid grid-cols-1 gap-5 border-t border-border/80 pt-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Límite sugerido
            </p>
            {limit ? (
              <dl className="mt-2 space-y-2 text-sm">
                <MetricRow
                  label="Monto"
                  value={formatSc1Amount(amount.value, amount.currency)}
                  strong
                />
                <MetricRow label="Plazo" value={formatSc1Term(limit.term)} />
                <MetricRow
                  label="Decisión"
                  value={
                    decision.code
                      ? labelDecisionCode(decision.code)
                      : "—"
                  }
                />
                <MetricRow
                  label="Origen"
                  value={labelLimitOrigin(limit.limitOrigin)}
                />
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Sin límite SC-1.0</p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Cobertura
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {coverage.label}
              {coverage.detail ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {coverage.detail}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Motivos principales
          </p>
          {motivos.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Sin motivos destacados en el resultado.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {motivos.map((m, i) => (
                <li
                  key={`${m}-${i}`}
                  className="text-[13px] leading-snug text-muted-foreground"
                >
                  <span className="mr-1.5 text-muted-foreground">·</span>
                  {m}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * @param {Record<string, any> | null} score
 */
function readCoveragePresentation(score) {
  const breakdown = Array.isArray(score?.breakdown) ? score.breakdown : []
  const cov = breakdown.find(
    (d) =>
      d?.dimensionId === "coverage" ||
      String(d?.label || "")
        .toLowerCase()
        .includes("cobertura")
  )
  if (!cov) {
    return { label: "—", detail: null }
  }
  const status = typeof cov.status === "string" ? cov.status : null
  const scoreVal =
    cov.score != null && Number.isFinite(Number(cov.score))
      ? formatSc1Number(cov.score)
      : null
  const label =
    status === "UNKNOWN" || status === "SKIPPED"
      ? "Sin evaluación clara"
      : status === "CRITICAL" || status === "WARNING"
        ? "Atención en cobertura"
        : status === "EXCELLENT" || status === "GOOD"
          ? "Cobertura favorable"
          : status === "FAIR"
            ? "Cobertura regular"
            : "Cobertura"

  const detailParts = []
  if (scoreVal != null) detailParts.push(`Puntaje dim.: ${scoreVal}`)
  if (cov.metricValue != null && cov.metricValue !== "") {
    detailParts.push(String(cov.metricValue))
  }
  return {
    label,
    detail: detailParts.length ? detailParts.join(" · ") : null,
  }
}

/**
 * @param {Record<string, any> | null} score
 * @param {Record<string, any> | null} limit
 * @returns {string[]}
 */
function collectMotivosPrincipales(score, limit) {
  /** @type {string[]} */
  const out = []
  const pushFinding = (f) => {
    const text =
      typeof f === "string"
        ? f
        : typeof f?.text === "string"
          ? f.text
          : null
    if (text && text.trim() && !out.includes(text.trim())) {
      out.push(text.trim())
    }
  }

  for (const f of score?.weaknesses ?? []) pushFinding(f)
  for (const f of score?.observations ?? []) pushFinding(f)
  for (const j of limit?.justifications ?? []) {
    if (typeof j?.text === "string") pushFinding(j.text)
  }
  for (const w of limit?.warnings ?? []) {
    if (typeof w?.text === "string") pushFinding(w.text)
  }

  return out.slice(0, 6)
}

/**
 * @param {{ label: string; value: string; strong?: boolean }} props
 */
function MetricRow({ label, value, strong = false }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd
        className={
          strong
            ? "text-[15px] font-semibold tabular-nums text-foreground"
            : "text-[13px] text-muted-foreground"
        }
      >
        {value}
      </dd>
    </div>
  )
}

/**
 * @param {{ trace: Record<string, any> }} props
 */
function TracePanel({ trace }) {
  const steps = Array.isArray(trace.steps) ? [...trace.steps] : []
  steps.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <Panel title="Detalle técnico (trazabilidad)">
      <p className="mb-3 text-xs text-muted-foreground">
        Información adicional para auditoría. No es el camino principal de
        decisión del analista.
      </p>
      {steps.length === 0 ? (
        <Empty text="Sin pasos en la traza" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-[12px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Etapa</th>
                <th className="py-2 pr-3 font-medium">Código</th>
                <th className="py-2 pr-3 font-medium">Prev</th>
                <th className="py-2 pr-3 font-medium">Nuevo</th>
                <th className="py-2 pr-3 font-medium">Resultado</th>
                <th className="py-2 font-medium">Regla</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <tr
                  key={step.id ?? `${step.order}-${step.code}`}
                  className="border-b border-border/50 text-muted-foreground"
                >
                  <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                    {step.order ?? "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="text-muted-foreground">
                      {labelPipelineStage(step.stage)}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="text-muted-foreground">
                      {labelStepCode(step.code)}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono tabular-nums">
                    {formatTraceValue(step.previousValue)}
                  </td>
                  <td className="py-2 pr-3 font-mono tabular-nums text-foreground/80">
                    {formatTraceValue(step.newValue ?? step.value)}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">
                    {step.resultCode ?? "—"}
                  </td>
                  <td className="py-2 font-mono text-[11px] text-muted-foreground">
                    {step.ruleId ??
                      (Array.isArray(step.ruleIds) && step.ruleIds[0]) ??
                      "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

/**
 * @param {unknown} value
 */
function formatTraceValue(value) {
  if (value == null || value === "") return "—"
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatSc1Number(value, 2)
  }
  if (typeof value === "string") {
    const estado = formatSc1Estado(value)
    if (estado !== "—") return estado
  }
  return String(value)
}

/**
 * @param {{ title: string; children: React.ReactNode }} props
 */
function Panel({ title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h4>
      <div className="mt-3">{children}</div>
    </div>
  )
}

/** @param {{ text: string }} props */
function Empty({ text }) {
  return <p className="text-sm text-muted-foreground">{text}</p>
}

