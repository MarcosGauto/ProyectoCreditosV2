"use client"

import { useEffect, useState } from "react"

import { PortfolioDashboard } from "@/components/portfolio/PortfolioDashboard"
import { useRequireAuth } from "@/hooks/useRequireAuth"
import { fetchPortfolioDashboard } from "@/lib/portfolio/portfolioService"

export default function CarteraPage() {
  const { user, loading: authLoading } = useRequireAuth()
  const [data, setData] = useState(
    /** @type {Awaited<ReturnType<typeof fetchPortfolioDashboard>> | null} */ (
      null
    )
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    let active = true
    setLoading(true)

    fetchPortfolioDashboard()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((error) => {
        console.error("[CarteraPage]", error)
        if (active) setData(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user])

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-3 space-y-6 duration-500">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Cartera
        </h1>
        <p className="text-sm text-muted-foreground">
          ¿Sobre qué clientes tengo que actuar hoy?
        </p>
      </header>

      <PortfolioDashboard data={data} loading={loading} />
    </div>
  )
}
