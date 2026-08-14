"use client"

import { Suspense } from "react"

import { RevisionRapidaChequesPage } from "@/components/revisionRapidaCheques/RevisionRapidaChequesPage"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Cargando revisión rápida…
        </div>
      }
    >
      <RevisionRapidaChequesPage />
    </Suspense>
  )
}
