"use client"

import { use, Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { CreditAnalysisReport } from "@/components/financialAnalysis/CreditAnalysisReport"

function CreditInfoContent({ cuit }) {
  const searchParams = useSearchParams()
  const versionId = searchParams.get("versionId")
  const autoDownload = searchParams.get("download") === "1"

  return (
    <CreditAnalysisReport
      cuit={cuit}
      versionId={versionId}
      historical={Boolean(versionId)}
      autoDownloadPdf={autoDownload}
    />
  )
}

export default function CreditInfoPage({ params }) {
  const { cuit } = use(params)

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <Suspense fallback={<p className="text-muted-foreground">Cargando informe…</p>}>
          <CreditInfoContent cuit={cuit} />
        </Suspense>
      </div>
    </main>
  )
}
