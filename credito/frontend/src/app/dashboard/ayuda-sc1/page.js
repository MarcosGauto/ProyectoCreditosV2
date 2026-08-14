"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { HelpCenterTab } from "@/components/settings/help/HelpCenterTab"
import { getHelpDocById } from "@/lib/sc1Help/sc1HelpCatalog"

function AyudaSc1Content() {
  const searchParams = useSearchParams()
  const topic = searchParams.get("topic")
  const sectionParam = searchParams.get("section")

  const { initialDocId, initialSection } = useMemo(() => {
    const doc = topic ? getHelpDocById(topic) : null
    return {
      initialDocId: doc?.id ?? null,
      initialSection: sectionParam || doc?.defaultSection || null,
    }
  }, [topic, sectionParam])

  return (
    <HelpCenterTab
      initialDocId={initialDocId}
      initialSection={initialSection}
    />
  )
}

/**
 * Página dedicada del Centro de Ayuda SC-1.0 (solo lectura).
 * Query: ?topic=<id>&section=<slug>
 */
export default function AyudaSc1Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Cargando Centro de Ayuda…</p>
        }
      >
        <AyudaSc1Content />
      </Suspense>
    </div>
  )
}
