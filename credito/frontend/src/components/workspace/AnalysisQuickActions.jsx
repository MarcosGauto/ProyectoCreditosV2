"use client"

import {
  FileDown,
  GitCompare,
  History,
  RefreshCw,
  Save,
} from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * @param {{
 *   onSave?: () => void;
 *   onGeneratePdf?: () => void;
 *   onViewHistory?: () => void;
 *   onCompareVersion?: () => void;
 *   onRecalculate?: () => void;
 *   saving?: boolean;
 *   canSave?: boolean;
 *   saveDisabledReason?: string | null;
 *   pdfDisabled?: boolean;
 *   pdfDisabledReason?: string | null;
 *   compareDisabled?: boolean;
 *   compareDisabledReason?: string | null;
 *   recalculateDisabled?: boolean;
 *   recalculateDisabledReason?: string | null;
 * }} props
 */
export function AnalysisQuickActions({
  onSave,
  onGeneratePdf,
  onViewHistory,
  onCompareVersion,
  onRecalculate,
  saving = false,
  canSave = true,
  saveDisabledReason = null,
  pdfDisabled = false,
  pdfDisabledReason = null,
  compareDisabled = false,
  compareDisabledReason = null,
  recalculateDisabled = false,
  recalculateDisabledReason = null,
}) {
  return (
    <aside className="rounded-xl border border-border/90 bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Acciones rápidas
      </p>
      <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-1">
        {onSave && (
          <ActionButton
            onClick={onSave}
            disabled={!canSave || saving}
            title={saveDisabledReason ?? undefined}
            variant="primary"
          >
            <Save className="mr-2 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {saving ? "Publicando…" : "Guardar análisis"}
            </span>
          </ActionButton>
        )}
        {onGeneratePdf && (
          <ActionButton
            onClick={onGeneratePdf}
            disabled={pdfDisabled}
            title={pdfDisabledReason ?? undefined}
          >
            <FileDown className="mr-2 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Generar PDF</span>
          </ActionButton>
        )}
        {onViewHistory && (
          <ActionButton onClick={onViewHistory}>
            <History className="mr-2 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Ver historial</span>
          </ActionButton>
        )}
        {onCompareVersion && (
          <ActionButton
            onClick={onCompareVersion}
            disabled={compareDisabled}
            title={compareDisabledReason ?? undefined}
          >
            <GitCompare className="mr-2 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Comparar versión</span>
          </ActionButton>
        )}
        {onRecalculate && (
          <ActionButton
            onClick={onRecalculate}
            disabled={recalculateDisabled}
            title={recalculateDisabledReason ?? undefined}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Recalcular</span>
          </ActionButton>
        )}
      </div>
    </aside>
  )
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  title,
  variant = "secondary",
}) {
  return (
    <Button
      type="button"
      variant={variant}
      className="h-9 w-full justify-start rounded-lg text-xs"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  )
}
