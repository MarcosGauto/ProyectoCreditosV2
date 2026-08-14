"use client"

import { HelpCircle } from "lucide-react"
import { SC1_HELP_TOPICS } from "@/lib/sc1Help/sc1HelpCatalog"

/**
 * Botón contextual (?) — abre el Centro de Ayuda en la sección indicada.
 *
 * @param {{
 *   topicId: keyof typeof SC1_HELP_TOPICS | string;
 *   onOpenHelp?: (payload: { docId: string; section: string }) => void;
 *   className?: string;
 * }} props
 */
export function SettingsHelpButton({ topicId, onOpenHelp, className = "" }) {
  const topic = SC1_HELP_TOPICS[topicId]
  if (!topic || typeof onOpenHelp !== "function") return null

  return (
    <button
      type="button"
      title={`Ayuda: ${topic.label}`}
      aria-label={`Abrir ayuda: ${topic.label}`}
      onClick={() =>
        onOpenHelp({ docId: topic.docId, section: topic.section })
      }
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-600/80 bg-muted/60 text-xs font-semibold text-foreground/80 transition hover:border-sky-500/50 hover:text-sky-200 ${className}`}
    >
      <HelpCircle className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">?</span>
    </button>
  )
}
