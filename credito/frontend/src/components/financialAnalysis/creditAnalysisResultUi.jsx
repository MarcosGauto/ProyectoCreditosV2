import { SEMAPHORE_STYLES } from "@/config/creditAnalysis"
import { CONSULTAS_ULTIMOS_MESES } from "@/lib/nosisModel"
import {
  formatCreditAmount,
} from "@/lib/creditAnalysisEngine"
import {
  formatBalanceVariationPercent,
} from "@/lib/balanceAnalysis"

export const ESTADO_GENERAL_LABEL = {
  good: "Bueno",
  medium: "Medio",
  risky: "Riesgoso",
  unknown: "Sin evaluar",
}

export const TAB_KEYS = [
  "resumen",
  "financiero",
  "analisisIA",
  "balance",
  "nosis",
  "credito",
  "decision",
]

export const TAB_LABELS = {
  resumen: "Resumen",
  financiero: "Financiero",
  analisisIA: "Análisis IA",
  balance: "Análisis balance",
  nosis: "NOSIS",
  credito: "Crédito",
  decision: "Decisión",
}

/**
 * @param {string | null | undefined} iso
 */
export function formatAnalysisDate(iso) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    })
  } catch {
    return String(iso)
  }
}

/**
 * @param {import("@/lib/balance/balanceGeminiAnalysis").BalanceGeminiAnalysisResult | null | undefined} analisis
 */
export function hasAnalisisIAContent(analisis) {
  if (!analisis || typeof analisis !== "object") {
    return false
  }
  if (typeof analisis.texto === "string" && analisis.texto.trim()) {
    return true
  }
  if (Array.isArray(analisis.lineas) && analisis.lineas.length > 0) {
    return true
  }
  return (
    (analisis.fortalezas?.length ?? 0) > 0 ||
    (analisis.debilidades?.length ?? 0) > 0 ||
    (analisis.monitorear?.length ?? 0) > 0
  )
}

/**
 * @param {string} raw
 * @returns {number | null}
 */
export function parseMontoCreditoInput(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return null
  }
  const normalized = String(raw)
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
  const value = Number(normalized)
  return Number.isFinite(value) && value >= 0 ? value : null
}

export function MetricRow({
  label,
  value,
  semaphore,
  valueClassName,
  hideSemaphoreBadge = false,
}) {
  const sem =
    semaphore && SEMAPHORE_STYLES[semaphore]
      ? SEMAPHORE_STYLES[semaphore]
      : null

  return (
    <div className="bg-muted border border-border rounded-xl px-4 py-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`ml-auto text-sm font-semibold tabular-nums break-all text-right ${
          valueClassName ?? "text-foreground"
        }`}
      >
        {value}
      </span>
      {sem && !hideSemaphoreBadge && (
        <span className={`text-xs ${sem.className}`}>
          {sem.emoji} {sem.label}
        </span>
      )}
    </div>
  )
}

export function HighlightRow({ label, value }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <span className="text-sm font-semibold text-danger">{label}</span>
      <span className="ml-auto text-lg font-bold text-foreground tabular-nums break-all text-right">
        {value || "—"}
      </span>
    </div>
  )
}

export function BalanceEvolutionCard({
  label,
  ejercicioAnterior,
  valorAnterior,
  ejercicioActual,
  valorActual,
  variacionPct,
  semaphore,
}) {
  const sem =
    semaphore && SEMAPHORE_STYLES[semaphore]
      ? SEMAPHORE_STYLES[semaphore]
      : null

  return (
    <div className="bg-muted border border-border rounded-xl px-4 py-3 space-y-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {sem && (
          <span className={`text-xs ml-auto ${sem.className}`}>
            {sem.emoji} {sem.label}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {ejercicioActual}: {formatCreditAmount(valorActual)}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {ejercicioAnterior}: {formatCreditAmount(valorAnterior)}
      </p>
      <p className="text-xs font-medium text-foreground tabular-nums">
        Variación: {formatBalanceVariationPercent(variacionPct)}
      </p>
    </div>
  )
}

export function PatrimonioNetoEvolutionSummary({ resumen }) {
  const sem =
    SEMAPHORE_STYLES[resumen.estadoEvolucionPatrimonial] ??
    SEMAPHORE_STYLES.unknown
  const resultado =
    ESTADO_GENERAL_LABEL[resumen.estadoEvolucionPatrimonial] ?? "Sin dato"

  return (
    <div className="bg-muted border border-border rounded-xl px-4 py-3 space-y-2">
      <p className="text-sm font-semibold text-foreground">Evolución Patrimonial</p>
      <p className="text-xs text-muted-foreground tabular-nums">
        PN actual: {formatCreditAmount(resumen.patrimonioActual)}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        PN anterior: {formatCreditAmount(resumen.patrimonioAnterior)}
      </p>
      <p className="text-xs font-medium text-foreground tabular-nums">
        Variación: {formatBalanceVariationPercent(resumen.variacionPct)}
      </p>
      <p className="text-xs pt-1">
        <span className="text-muted-foreground">Resultado: </span>
        <span className={`font-semibold uppercase ${sem.className}`}>
          {sem.emoji} {resultado}
        </span>
      </p>
    </div>
  )
}
