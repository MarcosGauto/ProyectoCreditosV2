"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Ruta legacy: la calificación vive en `/dashboard/analysis/[cuit]`.
 */
export default function QualificationRedirectPage({ params }) {
  const { cuit } = use(params)
  const router = useRouter()

  useEffect(() => {
    if (!cuit) return
    router.replace(`/dashboard/analysis/${cuit}`)
  }, [cuit, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Redirigiendo al análisis…
    </div>
  )
}
