"use client"

import { Loader2, RotateCcw, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * @param {{
 *   title: string;
 *   description?: string;
 *   errors?: Array<{ code: string; message: string; path: string }>;
 *   warnings?: Array<{ code: string; message: string; path: string }>;
 *   onRestore: () => void;
 *   onSave: () => void;
 *   onCancel?: () => void;
 *   canSave?: boolean;
 *   isDirty?: boolean;
 *   saving?: boolean;
 *   children: React.ReactNode;
 * }} props
 */
export function SettingsTabShell({
  title,
  description,
  errors = [],
  warnings = [],
  onRestore,
  onSave,
  onCancel,
  canSave = true,
  isDirty = false,
  saving = false,
  children,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {isDirty ? (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-200">
                Cambios sin guardar
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={onRestore}
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar valores por defecto
          </Button>
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              disabled={!isDirty || saving}
              onClick={onCancel}
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
          ) : null}
          <Button
            type="button"
            variant="primary"
            disabled={!canSave || saving}
            onClick={onSave}
            title={
              !isDirty
                ? "No hay cambios para guardar"
                : !canSave
                  ? "Corregí los errores antes de guardar"
                  : undefined
            }
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>

      {errors.length > 0 ? (
        <div
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 space-y-1"
          role="alert"
        >
          <p className="text-sm font-medium text-red-300">
            No se puede guardar hasta corregir:
          </p>
          <ul className="list-disc list-inside text-sm text-red-200/90 space-y-0.5">
            {errors.map((e) => (
              <li key={`${e.code}:${e.path}`}>{e.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-1">
          <p className="text-sm font-medium text-amber-200">Advertencias</p>
          <ul className="list-disc list-inside text-sm text-amber-100/80 space-y-0.5">
            {warnings.map((w) => (
              <li key={`${w.code}:${w.path}`}>{w.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {children}
    </div>
  )
}

/**
 * @param {{ title: string; children: React.ReactNode; className?: string }} props
 */
export function SettingsSection({ title, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-5 space-y-4 ${className}`}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

/**
 * @param {{
 *   label: string;
 *   children: React.ReactNode;
 *   hint?: string;
 *   className?: string;
 * }} props
 */
export function SettingsField({ label, children, hint, className = "" }) {
  return (
    <label className={`block space-y-1.5 text-sm ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

export const settingsInputClassName =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30"

export const settingsSelectClassName = settingsInputClassName

export const settingsCheckboxClassName =
  "h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary/40"
