"use client"

import {
  FileDown,
  FileStack,
  History,
  Save,
} from "lucide-react"

/**
 * Rail de acciones del flujo principal.
 * Sin duplicar Historial/Comparar. PDF descarga en un gesto vía credit-info?download=1.
 */
export function DecisionCockpitActions({
  onPublish,
  onGeneratePdf,
  onViewHistory,
  onGoDocumentation,
  publishing = false,
  canPublish = true,
  publishDisabledReason = null,
  pdfDisabled = false,
  pdfDisabledReason = null,
  nextStepHint = null,
}) {
  return (
    <aside className="space-y-3 xl:space-y-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Qué hacer ahora
        </p>
        {nextStepHint && (
          <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
            {nextStepHint}
          </p>
        )}
      </div>

      <div className="flex flex-row gap-1 overflow-x-auto pb-0.5 xl:flex-col xl:overflow-visible">
        {onPublish && (
          <ActionRow
            onClick={onPublish}
            disabled={!canPublish || publishing}
            title={publishDisabledReason ?? undefined}
            primary
          >
            <Save className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate">
              {publishing ? "Publicando…" : (
                <>
                  <span className="xl:hidden">Publicar</span>
                  <span className="hidden xl:inline">Publicar análisis</span>
                </>
              )}
            </span>
          </ActionRow>
        )}
        {onGeneratePdf && (
          <ActionRow
            onClick={onGeneratePdf}
            disabled={pdfDisabled}
            title={pdfDisabledReason ?? undefined}
          >
            <FileDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate">
              <span className="xl:hidden">PDF</span>
              <span className="hidden xl:inline">Descargar PDF</span>
            </span>
          </ActionRow>
        )}
        {onViewHistory && (
          <ActionRow onClick={onViewHistory}>
            <History className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate">Historial</span>
          </ActionRow>
        )}
        {onGoDocumentation && (
          <ActionRow onClick={onGoDocumentation}>
            <FileStack className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate">
              <span className="xl:hidden">Docs</span>
              <span className="hidden xl:inline">Ir a documentación</span>
            </span>
          </ActionRow>
        )}
      </div>
    </aside>
  )
}

function ActionRow({
  children,
  onClick,
  disabled = false,
  title,
  primary = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={
        primary
          ? "inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-zinc-100 px-3 text-left text-[13px] font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 xl:w-full"
          : "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-left text-[13px] text-muted-foreground transition hover:bg-muted hover:text-foreground/80 disabled:cursor-not-allowed disabled:opacity-40 xl:w-full"
      }
    >
      {children}
    </button>
  )
}
