"use client"

import { useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  XCircle,
} from "lucide-react"

/**
 * @param {import("@/lib/balance/balanceContableValidation").BalanceValidationChecklistItem} item
 */
function ChecklistIcon({ item }) {
  const status = item.status ?? (item.ok ? "green" : "red")

  if (status === "green" || item.ok) {
    return (
      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
    )
  }

  if (status === "yellow") {
    return (
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
    )
  }

  return <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
}

/**
 * @param {import("@/lib/balance/balanceContableValidation").BalanceValidationChecklistItem} item
 */
function itemTextClass(item) {
  const status = item.status ?? (item.ok ? "green" : "red")
  if (status === "green") return "text-foreground/80"
  if (status === "yellow") return "text-amber-100"
  return "text-red-200"
}

/**
 * @param {{
 *   validation: import("@/lib/balance/balanceContableValidation").BalanceContableValidationResult | null;
 *   compact?: boolean;
 *   defaultOpen?: boolean;
 * }} props
 */
export function BalanceValidationChecklist({
  validation,
  compact = false,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (!validation) {
    return null
  }

  const { checklist, canScoreFinancial, status, errors, warnings } = validation

  if (checklist.length === 0) {
    return null
  }

  const borderClass =
    status === "green"
      ? "border-emerald-500/25 bg-emerald-500/5"
      : status === "yellow"
        ? "border-amber-500/30 bg-amber-500/10"
        : "border-red-500/30 bg-red-500/10"

  const summary =
    status === "green"
      ? "El balance cumple las validaciones para calcular el score financiero."
      : canScoreFinancial
        ? "Hay advertencias menores. El score financiero puede calcularse."
        : "Corrija los ítems marcados antes de calcular el score financiero."

  return (
    <div className={`overflow-hidden rounded-xl border ${borderClass}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <span className="flex min-w-0 items-start gap-2">
          {status === "green" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          ) : status === "yellow" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          )}
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-100">
              <ClipboardList className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              Checklist del balance
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {open ? summary : "Desplegar para ver validaciones del balance"}
            </span>
          </span>
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div
          className={`space-y-3 border-t border-border ${compact ? "px-3 pb-3 pt-3" : "px-4 pb-4 pt-3"}`}
        >
          <p className="text-xs text-muted-foreground">{summary}</p>

          <ul className="space-y-1.5">
            {checklist.map((item) => {
              const isSection = item.id.startsWith("section_")

              if (isSection) {
                return (
                  <li
                    key={item.id}
                    className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {item.label}
                  </li>
                )
              }

              return (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <ChecklistIcon item={item} />
                  <span className={itemTextClass(item)}>
                    {item.ok ? "✓" : "✗"} {item.label}
                    {item.detail ? (
                      <span className="mt-0.5 block whitespace-pre-line font-mono text-xs text-muted-foreground">
                        {item.detail}
                      </span>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>

          {!compact && errors.length > 0 && (
            <ul className="list-disc space-y-1 whitespace-pre-line border-t border-red-500/20 pl-5 pt-3 text-xs text-red-200/90">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}

          {!compact && warnings.length > 0 && (
            <ul className="list-disc space-y-1 whitespace-pre-line pl-5 text-xs text-amber-200/80">
              {warnings.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
