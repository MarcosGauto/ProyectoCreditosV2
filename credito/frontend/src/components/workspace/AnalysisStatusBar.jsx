"use client"

/**
 * @param {{
 *   saving?: boolean;
 *   saveStatus?: string;
 *   hasUnpublishedChanges?: boolean;
 *   hasPendingChanges?: boolean;
 *   hasConflict?: boolean;
 *   recoveredFromDraft?: boolean;
 *   publishBlockReason?: string | null;
 *   draftSaveLabel?: string | null;
 *   onReloadDraft?: () => void;
 *   reloadLabel?: string;
 * }} props
 */
export function AnalysisStatusBar({
  saving = false,
  saveStatus = "idle",
  hasUnpublishedChanges = false,
  hasPendingChanges = false,
  hasConflict = false,
  recoveredFromDraft = false,
  publishBlockReason = null,
  draftSaveLabel = null,
  onReloadDraft,
  reloadLabel = "Recargar borrador",
}) {
  const pills = []

  if (saving) pills.push({ tone: "info", label: "Publicando" })
  if (!saving && (saveStatus === "pending" || saveStatus === "saving")) {
    pills.push({ tone: "muted", label: "Guardando borrador…" })
  }
  if (!saving && saveStatus === "saved" && !hasPendingChanges) {
    pills.push({ tone: "success", label: "Borrador guardado" })
  }
  if (!saving && saveStatus === "error") {
    pills.push({
      tone: "danger",
      label: draftSaveLabel || "Error al guardar",
    })
  }
  if (hasUnpublishedChanges) {
    pills.push({ tone: "warning", label: "Cambios sin publicar" })
  }
  if (
    hasPendingChanges &&
    saveStatus !== "pending" &&
    saveStatus !== "saving"
  ) {
    pills.push({ tone: "muted", label: "Cambios locales pendientes" })
  }
  if (recoveredFromDraft) {
    pills.push({ tone: "info", label: "Borrador restaurado" })
  }
  if (hasConflict) pills.push({ tone: "danger", label: "Conflicto" })
  if (publishBlockReason) {
    pills.push({ tone: "warning", label: publishBlockReason })
  }

  if (pills.length === 0 && !hasConflict) {
    return null
  }

  return (
    <div className="space-y-2 border-b border-border/70 bg-background px-5 py-2.5 lg:px-6">
      <div className="flex flex-wrap items-center gap-2">
        {pills.map((pill) => (
          <StatusPill key={`${pill.tone}-${pill.label}`} tone={pill.tone}>
            {pill.label}
          </StatusPill>
        ))}
      </div>

      {hasConflict && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3.5 py-2.5"
          role="alert"
        >
          <p className="text-xs text-amber-100/85">
            El borrador fue actualizado en otra sesión. Recargá antes de
            continuar.
          </p>
          {onReloadDraft && (
            <button
              type="button"
              onClick={onReloadDraft}
              className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
            >
              {reloadLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StatusPill({ tone = "muted", children }) {
  const tones = {
    muted: "border-border/80 bg-muted/80 text-muted-foreground",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    danger: "border-rose-500/25 bg-rose-500/10 text-rose-300",
    info: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${tones[tone] ?? tones.muted}`}
      role="status"
    >
      {children}
    </span>
  )
}
