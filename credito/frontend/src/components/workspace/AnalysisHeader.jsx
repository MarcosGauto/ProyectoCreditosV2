"use client"

import { ArrowLeft, Clock3, History, Loader2, Save } from "lucide-react"

import { UploadButton } from "@/components/financialAnalysis/UploadButton"

/**
 * @param {Date | null | undefined} date
 */
export function formatAutosaveClock(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return "Sin guardado automático"
  }
  try {
    return date.toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    })
  } catch {
    return "Sin guardado automático"
  }
}

/**
 * Barra de identidad compacta — sin KPIs (van en AnalysisSummaryCards).
 *
 * @param {{
 *   razonSocial?: string | null;
 *   cuit: string;
 *   analisisEstadoLabel?: string;
 *   analisisEstadoClassName?: string;
 *   analisisEstadoEmoji?: string;
 *   lastAutosavedAt?: Date | null;
 *   hasUnpublishedChanges?: boolean;
 *   saving?: boolean;
 *   canSave?: boolean;
 *   saveDisabledReason?: string | null;
 *   onSave?: () => void;
 *   onViewHistory?: () => void;
 *   historyActive?: boolean;
 *   onBack?: () => void;
 * }} props
 */
export function AnalysisHeader({
  razonSocial = null,
  cuit,
  analisisEstadoLabel = "En revisión",
  analisisEstadoClassName = "border-border/80 bg-muted/80 text-muted-foreground",
  analisisEstadoEmoji = "",
  lastAutosavedAt = null,
  hasUnpublishedChanges = false,
  saving = false,
  canSave = true,
  saveDisabledReason = null,
  onSave,
  onViewHistory,
  historyActive = false,
  onBack,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-xl">
      <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:min-h-[48px] sm:items-center sm:justify-between sm:gap-3 sm:px-4 lg:px-5">
        <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground transition hover:border-border hover:text-foreground sm:mt-0"
              aria-label="Volver al dashboard"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="max-w-full truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
                {razonSocial || "Empresa sin razón social"}
              </h1>
              <span
                className={`inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${analisisEstadoClassName}`}
              >
                {analisisEstadoEmoji ? (
                  <span aria-hidden>{analisisEstadoEmoji}</span>
                ) : null}
                {analisisEstadoLabel}
              </span>
              {hasUnpublishedChanges && (
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200/90">
                  Sin publicar
                </span>
              )}
            </div>
            <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
              CUIT {cuit}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 pl-10 sm:pl-0">
          <div className="mr-auto hidden min-w-0 items-center gap-1 text-[11px] text-muted-foreground sm:mr-0 sm:flex">
            <Clock3 className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {formatAutosaveClock(lastAutosavedAt)}
            </span>
          </div>

          {onViewHistory && (
            <UploadButton
              variant={historyActive ? "primary" : "secondary"}
              size="sm"
              onClick={onViewHistory}
              className="shrink-0"
            >
              <History className="mr-1 inline h-3.5 w-3.5" />
              Historial
            </UploadButton>
          )}

          {onSave && (
            <span title={saveDisabledReason ?? undefined} className="shrink-0">
              <UploadButton
                variant="primary"
                size="sm"
                disabled={!canSave || saving}
                onClick={onSave}
                className="min-w-[7rem] shadow-md shadow-red-950/25 sm:min-w-[8.5rem]"
              >
                {saving ? (
                  <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1 inline h-3.5 w-3.5" />
                )}
                {saving ? "…" : "Publicar"}
              </UploadButton>
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
