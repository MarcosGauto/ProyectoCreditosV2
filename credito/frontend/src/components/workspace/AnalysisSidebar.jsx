"use client"

import { ANALYSIS_WORKSPACE_SECTIONS } from "@/components/workspace/constants"

/**
 * Navegación horizontal de secciones — sticky, scrollable en móvil.
 *
 * @param {{
 *   sections?: typeof ANALYSIS_WORKSPACE_SECTIONS;
 *   activeSection: string;
 *   onChange: (id: string) => void;
 * }} props
 */
export function AnalysisSidebar({
  sections = ANALYSIS_WORKSPACE_SECTIONS,
  activeSection,
  onChange,
}) {
  return (
    <nav
      className="-mx-1 flex h-11 items-stretch gap-0 overflow-x-auto overscroll-x-contain px-1 scrollbar-thin [-ms-overflow-style:none] [scrollbar-width:thin]"
      aria-label="Navegación del análisis"
    >
      {sections.map((section) => {
        const active = section.id === activeSection
        const Icon = section.icon
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={`group relative inline-flex h-full shrink-0 items-center gap-1.5 px-2.5 text-xs transition sm:px-3 sm:text-[13px] ${
              active
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground/80"
            }`}
          >
            <Icon
              className={`h-3.5 w-3.5 shrink-0 ${
                active
                  ? "text-red-400"
                  : "text-muted-foreground group-hover:text-muted-foreground"
              }`}
              aria-hidden
            />
            <span className="whitespace-nowrap">{section.label}</span>
            <span
              className={`absolute inset-x-1 bottom-0 h-0.5 rounded-full transition ${
                active ? "bg-red-500" : "bg-transparent group-hover:bg-zinc-700"
              }`}
              aria-hidden
            />
          </button>
        )
      })}
    </nav>
  )
}
