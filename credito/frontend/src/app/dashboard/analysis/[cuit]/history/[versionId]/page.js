"use client"



import { use, useEffect, useState } from "react"

import { useRouter } from "next/navigation"

import { ArrowLeft, Loader2 } from "lucide-react"



import { Button } from "@/components/ui/button"

import { CreditAnalysisResult } from "@/components/financialAnalysis/CreditAnalysisResult"

import { loadPublishedAnalysisVersion } from "@/lib/creditAnalysis/migrateLegacyAnalysis"

import { useRequireAuth } from "@/hooks/useRequireAuth"



export default function HistoricalAnalysisPage({ params }) {

  const { user, loading: authLoading } = useRequireAuth()

  const { cuit, versionId } = use(params)

  const router = useRouter()

  const [version, setVersion] = useState(

    /** @type {Record<string, unknown> | null} */ (null)

  )

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState(/** @type {string | null} */ (null))



  useEffect(() => {

    if (authLoading || !user) return


    let active = true



    const load = async () => {

      if (!cuit || !versionId) {

        setLoading(false)

        return

      }



      setLoading(true)

      setError(null)



      try {

        const data = await loadPublishedAnalysisVersion(cuit, versionId)

        if (!active) {

          return

        }

        if (!data) {

          setError("Versión no encontrada.")

          setVersion(null)

          return

        }

        setVersion(data)

      } catch (loadError) {

        if (!active) {

          return

        }

        setError(

          loadError instanceof Error

            ? loadError.message

            : "No se pudo cargar la versión."

        )

      } finally {

        if (active) {

          setLoading(false)

        }

      }

    }



    load()



    return () => {

      active = false

    }

  }, [cuit, versionId, authLoading, user])



  if (authLoading || !user) {

    return (

      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">

        Verificando sesión…

      </div>

    )

  }



  if (loading) {

    return (

      <main className="min-h-screen bg-background flex items-center justify-center">

        <Loader2 className="h-8 w-8 animate-spin text-primary" />

      </main>

    )

  }



  if (error || !version) {

    return (

      <main className="min-h-screen bg-background text-foreground p-8">

        <p className="mb-4 text-danger">{error ?? "Versión no disponible."}</p>

        <Button variant="secondary" onClick={() => router.back()}>

          <ArrowLeft className="h-4 w-4 mr-2" />

          Volver

        </Button>

      </main>

    )

  }



  return (

    <main className="min-h-screen bg-background text-foreground px-6 py-8">

      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div>

            <p className="text-xs uppercase tracking-widest text-muted-foreground">

              Análisis histórico

            </p>

            <h1 className="text-2xl font-bold">

              Versión {version.versionNumber ?? "—"}

            </h1>

          </div>

          <Button variant="secondary" onClick={() => router.back()}>

            <ArrowLeft className="h-4 w-4 mr-2" />

            Volver al análisis

          </Button>

        </div>



        <CreditAnalysisResult

          cuit={cuit}

          readOnly

          historicalVersion={version}

        />

      </div>

    </main>

  )

}

