"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    collection,
    doc,
    getDoc,
    getDocFromServer,
    getDocs,
} from "firebase/firestore"
import { db } from "@/service/firebase"
import { fetchFinancialDocumentation } from "@/lib/fetchAnalysisFirestore"

import { ExistingDataViewer } from "@/components/financialAnalysis/ExistingDataViewer"
import {
    normalizeBcraReport,
    computeBcraMetrics,
    pickBestBcraSource,
    pickLatestBcraDocument,
} from "@/lib/normalizeBcraReport"
import { loadBcraData, loadBcraError, saveBcraData, saveBcraError } from "@/lib/bcraStorage"
import { fetchBcraByCuit } from "@/lib/fetchBcra"
import {
    buildEstadoDocumentalItems,
    getLatestDocument,
    summarizeEstadoDocumentalItems,
} from "@/lib/getLatestDocumentPeriod"
import { buildBalanceFinancialSummary } from "@/lib/balanceFinancialSummary"
import { buildFiscalFinancialSummary } from "@/lib/fiscalFinancialSummary"
import { hasBalanceAttachment } from "@/lib/balanceLocalUpload"
import { hasFiscalAttachment } from "@/lib/fiscalLocalUpload"
import { BalancePairPanel } from "@/components/financialAnalysis/BalancePairPanel"
import { IvaIndicatorsForm } from "@/components/financialAnalysis/IvaIndicatorsForm"
import { IibbIndicatorsForm } from "@/components/financialAnalysis/IibbIndicatorsForm"
import { useAuth } from "@/app/context/AuthContext"
import { SHOW_FINANCIAL_INDICATORS } from "@/lib/featureFlags"
import { CreditAnalysisResult } from "@/components/financialAnalysis/CreditAnalysisResult"
import { getCoeficienteTipoEmpresa } from "@/lib/scoring/prequalification"
import { useAnalysisTipoEmpresa } from "@/hooks/useAnalysisTipoEmpresa"
import { SucursalesGallery } from "@/components/financialAnalysis/SucursalesGallery"
import { EmpresaWebsiteCard } from "@/components/financialAnalysis/EmpresaWebsiteCard"
import {
    getEmpresaWebsiteUrl,
    mergeEmpresaWebsiteIntoEmpresa,
} from "@/lib/empresaWebsite"

import { Button } from "@/components/ui/button"

import {
    ArrowLeft,
    ShieldCheck,
    Building2,
    FileText,
    AlertCircle,
    RefreshCw,
    Loader2,
} from "lucide-react"

const EMPTY_ANALYSIS_DATA = {
    empresa: null,
    iva: [],
    iibb: [],
    balances: [],
    balanceContable: null,
    locales: [],
    nosis: [],
    bcra: [],
}

export default function AnalysisPage({ params }) {
    const { cuit } = use(params)

    const router = useRouter()
    const { user } = useAuth()

    const [data, setData] = useState(EMPTY_ANALYSIS_DATA)
    const [loading, setLoading] = useState(true)
    const [sessionBcra, setSessionBcra] = useState(null)
    const [bcraErrorInfo, setBcraErrorInfo] = useState(
        /** @type {{ message?: string; code?: string; error?: string } | null} */ (null)
    )
    const [bcraRefreshing, setBcraRefreshing] = useState(false)
    const [selectedIvaId, setSelectedIvaId] = useState(null)
    const [selectedIibbId, setSelectedIibbId] = useState(null)
    const usuario =
        user?.email || user?.displayName || user?.uid || "desconocido"

    const {
        tipoEmpresa,
        coeficienteEmpresa,
        handleTipoEmpresa,
        loaded: analysisEmpresaLoaded,
    } = useAnalysisTipoEmpresa(cuit)

    const fetchEmpresaFromFirestore = useCallback(async () => {
        const empresaRef = doc(db, "empresas", cuit)
        try {
            const empresaSnap = await getDocFromServer(empresaRef)
            return empresaSnap.exists()
                ? { id: empresaSnap.id, ...empresaSnap.data() }
                : null
        } catch {
            const empresaSnap = await getDoc(empresaRef)
            return empresaSnap.exists()
                ? { id: empresaSnap.id, ...empresaSnap.data() }
                : null
        }
    }, [cuit])

    const refreshFinancialDocs = useCallback(async () => {
        if (!cuit) {
            return
        }

        const [financial, empresa] = await Promise.all([
            fetchFinancialDocumentation(cuit),
            fetchEmpresaFromFirestore(),
        ])

        setData((prev) => {
            const prevWebsite = getEmpresaWebsiteUrl(prev.empresa)
            const fetchedWebsite = getEmpresaWebsiteUrl(empresa)

            let nextEmpresa = empresa ?? prev.empresa
            if (prevWebsite && !fetchedWebsite) {
                nextEmpresa = mergeEmpresaWebsiteIntoEmpresa(
                    nextEmpresa,
                    prevWebsite
                )
            }

            return {
                ...prev,
                empresa: nextEmpresa,
                iva: financial.iva,
                iibb: financial.iibb,
                balances: financial.balances,
                balanceContable: financial.balanceContable ?? null,
                locales: financial.locales,
                nosis: financial.nosis ?? [],
            }
        })
    }, [cuit, fetchEmpresaFromFirestore])

    const handleEmpresaWebsiteSaved = useCallback(({ paginaWeb }) => {
        if (!paginaWeb) {
            return
        }

        setData((prev) => ({
            ...prev,
            empresa: mergeEmpresaWebsiteIntoEmpresa(prev.empresa, paginaWeb),
        }))
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            if (!cuit) return

            setLoading(true)

            try {
                console.log("DB", db)
                console.log("CUIT", cuit)
                
                const bcraRef = collection(db, "empresas", cuit, "bcra_reports")
                
                console.log("BCRA REF OK")

                console.log("ANTES DE fetchFinancialDocumentation", cuit)

const financial = await fetchFinancialDocumentation(cuit)

console.log("DESPUÉS DE fetchFinancialDocumentation", financial)
const [empresaData, bcraSnap] = await Promise.all([
    fetchEmpresaFromFirestore(),
    getDocs(bcraRef),
])

console.log("FINANCIAL RAW", financial)
                const nextData = {
                    empresa: empresaData,
                    iva: financial.iva,
                    iibb: financial.iibb,
                    balances: financial.balances,
                    balanceContable: financial.balanceContable ?? null,
                    locales: financial.locales,
                    nosis: financial.nosis ?? [],
                    bcra: bcraSnap.docs.map((d) => ({
                        id: d.id,
                        ...d.data(),
                    })),
                    financialSources: financial.sources,
                }

                setData(nextData)

                console.log("[Firestore → AnalysisPage] financial sources", financial.sources)
                console.log("[Firestore → AnalysisPage] docs por colección:", {
                    iva: financial.iva.length,
                    iibb: financial.iibb.length,
                    balances: financial.balances.length,
                    locales: financial.locales.length,
                })
            } catch (error) {
                console.error("Error cargando datos:", error)
                setData(EMPTY_ANALYSIS_DATA)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [cuit, fetchEmpresaFromFirestore])

    useEffect(() => {
        if (loading || !cuit || typeof window === "undefined") {
            return
        }
        setSessionBcra(loadBcraData(cuit))
        setBcraErrorInfo(loadBcraError(cuit))
    }, [cuit, loading])

    const handleRefreshBcra = useCallback(async () => {
        if (!cuit || bcraRefreshing) {
            return
        }

        setBcraRefreshing(true)
        try {
            const result = await fetchBcraByCuit(cuit)

            if (!result.ok) {
                const message =
                    result.error?.message ||
                    result.error?.error ||
                    "No se pudo consultar el BCRA."

                saveBcraError(cuit, {
                    error: result.error?.error,
                    message,
                    code: result.error?.code,
                })
                setSessionBcra(null)
                setBcraErrorInfo(loadBcraError(cuit))
                return
            }

            saveBcraData(cuit, result.data ?? {})
            setSessionBcra(result.data ?? {})
            setBcraErrorInfo(null)
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Error de red al contactar el servidor."

            saveBcraError(cuit, {
                error: "Error de red",
                message,
                code: "NETWORK_ERROR",
            })
            setSessionBcra(null)
            setBcraErrorInfo(loadBcraError(cuit))
        } finally {
            setBcraRefreshing(false)
        }
    }, [cuit, bcraRefreshing])

    const analysisData = data ?? EMPTY_ANALYSIS_DATA

    useEffect(() => {
        if (loading || !cuit) return

        console.log("analysisData", analysisData)
        console.log("IVA docs", analysisData.iva)
        console.log("IIBB docs", analysisData.iibb)
        console.log("BALANCES docs", analysisData.balances)
        console.log("LOCALES docs", analysisData.locales)

        const hasFinancialDocs = [
            analysisData.iva,
            analysisData.iibb,
            analysisData.balances,
            analysisData.locales,
        ].some((arr) => arr?.length > 0)

        console.log("[AnalysisPage → ExistingDataViewer]", {
            hasFinancialDocs,
            ivaCount: analysisData.iva?.length ?? 0,
            iibbCount: analysisData.iibb?.length ?? 0,
            balancesCount: analysisData.balances?.length ?? 0,
            localesCount: analysisData.locales?.length ?? 0,
        })
    }, [loading, cuit, analysisData])

    if (!cuit) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
                Error: CUIT inválido
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="space-y-4 text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">
                        Analizando información financiera...
                    </p>
                </div>
            </div>
        )
    }

    const uploadPath = `/dashboard/analysis/${cuit}/upload`
    const creditInfoPath = `/dashboard/analysis/${cuit}/credit-info`

    const latestBcra = pickLatestBcraDocument(analysisData.bcra)
    const bcraError = bcraErrorInfo

    const resolvedSessionBcra =
        sessionBcra ??
        (typeof window !== "undefined" ? loadBcraData(cuit) : null)

    const latestBcraData = pickBestBcraSource(latestBcra, resolvedSessionBcra)
    const normalizedBcra = normalizeBcraReport(latestBcraData)
    const {
        entidades,
        peorSituacion,
        deudaTotal,
        entidadesConAtraso,
        tieneProblemas,
        maxDiasAtraso,
        tieneJudiciales,
        tieneRefinanciaciones,
        hasBcra,
    } = computeBcraMetrics(normalizedBcra)

    const periodoBcra = normalizedBcra.periodo
    const razonSocial =
        normalizedBcra.denominacion ||
        analysisData.empresa?.razonSocial ||
        analysisData.empresa?.nombre ||
        analysisData.empresa?.nombreComercial ||
        analysisData.empresa?.denominacion ||
        null
    const showBcraFetchError = Boolean(bcraError) && !hasBcra

    const riskConfig = {
        1: {
            label: tieneProblemas
                ? "Observado"
                : "Normal",
            dot: tieneProblemas
                ? "bg-yellow-400"
                : "bg-emerald-400",
            text: tieneProblemas
                ? "text-yellow-400"
                : "text-emerald-400",
            border: tieneProblemas
                ? "border-yellow-500/20"
                : "border-emerald-500/20",
            bg: tieneProblemas
                ? "bg-yellow-500/5"
                : "bg-emerald-500/5",
        },

        2: {
            label: "Riesgo Bajo",
            dot: "bg-yellow-400",
            text: "text-yellow-400",
            border: "border-yellow-500/20",
            bg: "bg-yellow-500/5",
        },

        3: {
            label: "Riesgo Medio",
            dot: "bg-orange-400",
            text: "text-orange-400",
            border: "border-orange-500/20",
            bg: "bg-orange-500/5",
        },

        4: {
            label: "Riesgo Alto",
            dot: "bg-red-500",
            text: "text-red-400",
            border: "border-red-500/20",
            bg: "bg-red-500/5",
        },

        5: {
            label: "Irrecuperable",
            dot: "bg-rose-500",
            text: "text-rose-400",
            border: "border-rose-500/20",
            bg: "bg-rose-500/5",
        },
    }

    const currentRisk =
        riskConfig[peorSituacion] || riskConfig[1]

    const hasFinancialDocs = [
        analysisData.iva,
        analysisData.iibb,
        analysisData.balances,
        analysisData.locales,
    ].some((arr) => arr?.length > 0)

    const canCalify =
        (analysisData.iva?.length ?? 0) > 0 &&
        (analysisData.iibb?.length ?? 0) > 0 &&
        (analysisData.balances?.length ?? 0) > 0

    const estadoDocumentalItems = buildEstadoDocumentalItems({
        iva: analysisData.iva,
        iibb: analysisData.iibb,
        balances: analysisData.balances,
        locales: analysisData.locales,
        nosis: analysisData.nosis,
        empresa: analysisData.empresa,
    })

    const estadoDocumentalResumen =
        summarizeEstadoDocumentalItems(estadoDocumentalItems)

    const balanceFinancialSummary = SHOW_FINANCIAL_INDICATORS
        ? buildBalanceFinancialSummary(
            analysisData.balances,
            analysisData.balanceContable,
            {
              iva: analysisData.iva,
              iibb: analysisData.iibb,
            }
          )
        : null

    const fiscalFinancialSummary = SHOW_FINANCIAL_INDICATORS
        ? buildFiscalFinancialSummary(
              analysisData.iva,
              analysisData.iibb,
              analysisData.balances,
              coeficienteEmpresa,
              analysisData.balanceContable
          )
        : null

    const latestIva = getLatestDocument(analysisData.iva)
    const ivaForIndicators = SHOW_FINANCIAL_INDICATORS
        ? (analysisData.iva.find((item) => item.id === selectedIvaId) ?? latestIva)
        : null

    const latestIibb = getLatestDocument(analysisData.iibb)
    const iibbForIndicators = SHOW_FINANCIAL_INDICATORS
        ? (analysisData.iibb.find((item) => item.id === selectedIibbId) ??
          latestIibb)
        : null

    const hasData =
        hasFinancialDocs ||
        !!latestBcraData ||
        analysisData.bcra?.length > 0 ||
        Boolean(analysisData.empresa)

    const canShowQualification = hasData || hasBcra || showBcraFetchError




    return (
        <main className="min-h-screen bg-background text-foreground">
            <div className="w-full px-6 py-8 xl:px-12">

                {showBcraFetchError && (
                    <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-danger">
                                    No se pudo consultar el BCRA
                                </p>
                                <p className="text-sm text-foreground/80 mt-1">
                                    {bcraError.message ||
                                        "La consulta al Central de Deudores falló. Podés continuar con la calificación e intentar actualizar los datos más tarde."}
                                </p>
                                {bcraError.code && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Código: {bcraError.code}
                                    </p>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleRefreshBcra}
                                disabled={bcraRefreshing}
                                className="shrink-0"
                            >
                                {bcraRefreshing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Consultando…
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Reintentar consulta BCRA
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* HEADER de navegación (el perfil vive en el cockpit) */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        {!canShowQualification ? (
                            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                                LEGAJO DIGITAL
                            </span>
                        ) : null}
                        {periodoBcra ? (
                            <span className="text-sm text-muted-foreground">
                                Período BCRA {periodoBcra}
                            </span>
                        ) : null}
                        {hasBcra ? (
                            <span
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${currentRisk.border} ${currentRisk.bg} ${currentRisk.text}`}
                            >
                                <span
                                    className={`h-2 w-2 rounded-full ${currentRisk.dot}`}
                                />
                                {currentRisk.label}
                            </span>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row shrink-0">
                        {hasBcra && latestBcraData ? (
                            <Button
                                variant="primary"
                                onClick={() => router.push(creditInfoPath)}
                            >
                                Ver análisis completo
                            </Button>
                        ) : null}
                        <Button
                            variant="secondary"
                            onClick={() => router.push("/dashboard")}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Dashboard
                        </Button>
                    </div>
                </div>

                {/* Cockpit a ancho completo — KPIs en una fila */}
                {canShowQualification ? (
                    <div className="mb-6 w-full min-w-0">
                        <CreditAnalysisResult
                            cuit={cuit}
                            empresa={analysisData.empresa}
                            balances={analysisData.balances}
                            balanceContable={analysisData.balanceContable}
                            iva={analysisData.iva}
                            iibb={analysisData.iibb}
                            nosis={analysisData.nosis}
                            bcra={{
                              peorSituacion,
                              entidadesConAtraso,
                              maxDiasAtraso,
                              tieneRefinanciaciones,
                              tieneJudiciales,
                            }}
                            bcraReports={[
                              ...(analysisData.bcra ?? []),
                              ...(resolvedSessionBcra ? [resolvedSessionBcra] : []),
                            ]}
                            razonSocial={razonSocial}
                            analista={usuario}
                            tipoEmpresa={tipoEmpresa}
                            coeficienteEmpresa={coeficienteEmpresa}
                            analysisEmpresaLoaded={analysisEmpresaLoaded}
                            onTipoEmpresaChange={handleTipoEmpresa}
                            estadoDocumentalItems={estadoDocumentalItems}
                            uploadPath={uploadPath}
                            bcraCockpit={{
                              peorSituacion,
                              deudaTotal,
                              hasBcra,
                              riskLabel: currentRisk.label,
                              periodo: periodoBcra,
                              entidadesCount: entidades.length,
                              entidadesConAtraso,
                            }}
                        />
                    </div>
                ) : null}

                {/* GRID */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                    {/* LEFT */}
                    <div
                      className={
                        SHOW_FINANCIAL_INDICATORS
                          ? "xl:col-span-8 space-y-6"
                          : "xl:col-span-9 space-y-6"
                      }
                    >

                        {canShowQualification ? (
                            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
                                <ExistingDataViewer data={analysisData} />
                                {!canCalify && hasFinancialDocs && (
                                    <p className="px-6 pb-6 text-sm text-muted-foreground">
                                        Completá IVA, IIBB y balances para
                                        habilitar la calificación.
                                    </p>
                                )}
                                {!hasFinancialDocs && (
                                    <div className="px-6 pb-6">
                                        <Button
                                            variant="primary"
                                            onClick={() => router.push(uploadPath)}
                                        >
                                            Cargar documentación
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {!canShowQualification ? (
                            <>
                                {/* HERO */}
                                <div className="rounded-3xl border border-border bg-card p-10 shadow-card">

                                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-danger/20 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger">
                                        <AlertCircle className="w-4 h-4" />
                                        LEGAJO VACÍO
                                    </div>

                                    <h2 className="text-5xl font-black tracking-tight leading-tight mb-4">
                                        Comenzar análisis financiero
                                    </h2>

                                    <p className="text-muted-foreground text-lg max-w-3xl leading-relaxed">
                                        Todavía no existe documentación cargada para este CUIT.
                                        Podés comenzar subiendo balances, IVA, IIBB y reportes financieros
                                        para generar la calificación crediticia.
                                    </p>

                                    <div className="flex flex-wrap gap-4 mt-8">

                                        <Button
                                            variant="secondary"
                                            size="lg"
                                            onClick={() =>
                                                router.push("/dashboard")
                                            }
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Volver al Dashboard
                                        </Button>

                                        <Button
                                            variant="primary"
                                            size="lg"
                                            onClick={() => router.push(uploadPath)}
                                        >
                                            Cargar Documentación
                                        </Button>
                                    </div>
                                </div>

                            </>
                        ) : null}
                    </div>

{/* RIGHT SIDEBAR */}
<div
  className={
    SHOW_FINANCIAL_INDICATORS
      ? "xl:col-span-4 space-y-6"
      : "xl:col-span-3 space-y-4"
  }
>


  {/* ESTADO DOCUMENTAL */}
  <div className="bg-card border border-border rounded-3xl shadow-xl p-5">

    <div className="flex items-center justify-between gap-2 mb-4">
      <h3 className="font-bold text-foreground text-lg">Estado Documental</h3>
      {!SHOW_FINANCIAL_INDICATORS && (
        <Button
          size="sm"
          variant="primary"
          className="shrink-0"
          onClick={() => router.push(uploadPath)}
        >
          Cargar docs
        </Button>
      )}
    </div>

    <div className="rounded-xl border border-border bg-muted px-4 py-4 space-y-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Confirmados</span>
        <span className="font-semibold text-green-400 tabular-nums">
          ✔ {estadoDocumentalResumen.confirmados}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Opcionales</span>
        <span className="font-semibold text-foreground/80 tabular-nums">
          ⚪ {estadoDocumentalResumen.opcionales}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm pt-1 border-t border-border">
        <span className="text-muted-foreground">Completitud</span>
        <span className="font-semibold text-foreground tabular-nums">
          📊 {estadoDocumentalResumen.completitud}%
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Detalle por categoría en el panel principal.
      </p>
    </div>

    {!SHOW_FINANCIAL_INDICATORS && (
      <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
        Los indicadores financieros y fiscales se gestionan en{" "}
        <button
          type="button"
          className="text-red-400 hover:underline"
          onClick={() => router.push(uploadPath)}
        >
          carga documental
        </button>
        .
      </p>
    )}
  </div>

  <SucursalesGallery
    cuit={cuit}
    empresa={analysisData.empresa}
    localesDocs={analysisData.locales}
    usuario={usuario}
    onUpdated={refreshFinancialDocs}
  />

  <EmpresaWebsiteCard
    cuit={cuit}
    empresa={analysisData.empresa}
    onUpdated={handleEmpresaWebsiteSaved}
  />

  {SHOW_FINANCIAL_INDICATORS && (
    <BalancePairPanel
      cuit={cuit}
      balanceContable={analysisData.balanceContable}
      usuario={usuario}
      compact
      tipoEmpresa={tipoEmpresa}
      coeficienteEmpresa={coeficienteEmpresa}
      onSaved={refreshFinancialDocs}
    />
  )}

  {SHOW_FINANCIAL_INDICATORS && ivaForIndicators && (
    <div className="space-y-3">
      {analysisData.iva.length > 1 && (
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            IVA a editar
          </span>
          <select
            value={ivaForIndicators.id}
            onChange={(event) => setSelectedIvaId(event.target.value)}
            className="w-full h-10 rounded-xl border border-border bg-muted px-3 text-sm text-foreground"
          >
            {analysisData.iva.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre || item.periodo || item.id}
              </option>
            ))}
          </select>
        </label>
      )}

      <IvaIndicatorsForm
        cuit={cuit}
        ivaDoc={ivaForIndicators}
        tipoEmpresa={tipoEmpresa || undefined}
        coeficiente={coeficienteEmpresa}
        fileKind={
          /\.(xlsx|xls)$/i.test(String(ivaForIndicators.nombre ?? ""))
            ? "excel"
            : /\.pdf$/i.test(String(ivaForIndicators.nombre ?? ""))
              ? "pdf"
              : "other"
        }
        usuario={usuario}
        compact
        storageDisabled={!hasFiscalAttachment(ivaForIndicators)}
        onSaved={async () => {
          await refreshFinancialDocs()
        }}
      />
    </div>
  )}

  {SHOW_FINANCIAL_INDICATORS && iibbForIndicators && (
    <div className="space-y-3">
      {analysisData.iibb.length > 1 && (
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            IIBB a editar
          </span>
          <select
            value={iibbForIndicators.id}
            onChange={(event) => setSelectedIibbId(event.target.value)}
            className="w-full h-10 rounded-xl border border-border bg-muted px-3 text-sm text-foreground"
          >
            {analysisData.iibb.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre || item.periodo || item.id}
              </option>
            ))}
          </select>
        </label>
      )}

      <IibbIndicatorsForm
        cuit={cuit}
        iibbDoc={iibbForIndicators}
        fileKind={
          /\.(xlsx|xls)$/i.test(String(iibbForIndicators.nombre ?? ""))
            ? "excel"
            : /\.pdf$/i.test(String(iibbForIndicators.nombre ?? ""))
              ? "pdf"
              : "other"
        }
        usuario={usuario}
        compact
        storageDisabled={!hasFiscalAttachment(iibbForIndicators)}
        onSaved={async () => {
          await refreshFinancialDocs()
        }}
      />
    </div>
  )}

  {SHOW_FINANCIAL_INDICATORS && balanceFinancialSummary && fiscalFinancialSummary && (
  <>
  {/* RESUMEN FISCAL */}
  <div className="bg-card border border-border rounded-3xl p-6 shadow-xl">
    <h3 className="font-bold text-lg mb-5">Resumen Fiscal</h3>

    <div className="mb-6 rounded-2xl border border-border bg-muted p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Ventas consolidadas (Excel)
      </p>
      <div className="space-y-2">
        {fiscalFinancialSummary.ventasConsolidadas.rows.map((row) => (
          <div
            key={`ventas-${row.label}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3"
          >
            <span className="text-sm text-foreground/80">{row.label}</span>
            <span className="text-sm font-semibold text-foreground tabular-nums text-right">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>

    {!fiscalFinancialSummary.iva.hasDoc &&
      !fiscalFinancialSummary.iibb.hasDoc && (
        <p className="text-sm text-muted-foreground">
          No hay declaraciones fiscales cargadas.
        </p>
      )}

    {fiscalFinancialSummary.ivaDeclarationsTable.length > 0 && (
      <div className="mb-6 overflow-x-auto rounded-2xl border border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-4 pb-2">
          Declaraciones IVA confirmadas
        </p>
        <table className="w-full min-w-[720px] text-xs text-left">
          <thead>
            <tr className="bg-muted text-muted-foreground uppercase tracking-wider">
              <th className="px-3 py-2 font-semibold">Período</th>
              <th className="px-3 py-2 font-semibold text-right">Saldo técnico</th>
              <th className="px-3 py-2 font-semibold text-right">Ventas 10,5%</th>
              <th className="px-3 py-2 font-semibold text-right">Ventas 21%</th>
              <th className="px-3 py-2 font-semibold text-right">Promedio IVA</th>
              <th className="px-3 py-2 font-semibold text-right">Crédito asumible</th>
            </tr>
          </thead>
          <tbody>
            {fiscalFinancialSummary.ivaDeclarationsTable.map((row) => (
              <tr
                key={row.id}
                className="border-t border-border text-foreground"
              >
                <td className="px-3 py-2 tabular-nums">{row.periodo}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.saldoTecnico}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.ventasIVA105}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.ventasIVA21}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-blue-200">
                  {row.promedioIVA}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-red-300/90">
                  {row.creditoAsumibleIVA}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {fiscalFinancialSummary.iva.hasDoc && (
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          IVA — último período: {fiscalFinancialSummary.iva.periodo}
        </p>
        {!fiscalFinancialSummary.iva.isConfirmed && (
          <p className="text-xs text-yellow-400/90 mb-3">
            Indicadores IVA pendientes de confirmación.
          </p>
        )}
        <div className="space-y-2">
          {fiscalFinancialSummary.iva.rows.map((row) => (
            <div
              key={`iva-${row.label}`}
              className="flex items-center justify-between gap-4 bg-muted border border-border rounded-xl px-4 py-3"
            >
              <span className="text-sm text-foreground/80">{row.label}</span>
              <span className="text-sm font-semibold text-foreground tabular-nums text-right">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    {fiscalFinancialSummary.iibb.hasDoc && (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          IIBB — último período: {fiscalFinancialSummary.iibb.periodo}
        </p>
        {!fiscalFinancialSummary.iibb.isConfirmed && (
          <p className="text-xs text-yellow-400/90 mb-3">
            Indicadores IIBB pendientes de confirmación.
          </p>
        )}
        <div className="space-y-2">
          {fiscalFinancialSummary.iibb.rows.map((row) => (
            <div
              key={`iibb-${row.label}`}
              className="flex items-center justify-between gap-4 bg-muted border border-border rounded-xl px-4 py-3"
            >
              <span className="text-sm text-foreground/80">{row.label}</span>
              <span className="text-sm font-semibold text-foreground tabular-nums text-right">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>

  {/* RESUMEN FINANCIERO */}
  <div className="bg-card border border-border rounded-3xl p-6 shadow-xl">

    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <h3 className="font-bold text-lg">
        Resumen Financiero
      </h3>
      <div className="flex flex-wrap gap-2">
        {balanceFinancialSummary.validationBadge && (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${balanceFinancialSummary.validationBadge.className}`}
          >
            {balanceFinancialSummary.validationBadge.label}
          </span>
        )}
        {balanceFinancialSummary.sourceBadge && (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${balanceFinancialSummary.sourceBadge.className}`}
          >
            {balanceFinancialSummary.sourceBadge.label}
          </span>
        )}
        {balanceFinancialSummary.attachmentBadge && (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${balanceFinancialSummary.attachmentBadge.className}`}
          >
            {balanceFinancialSummary.attachmentBadge.label}
          </span>
        )}
      </div>
    </div>

    {!balanceFinancialSummary.isConfirmed &&
      balanceFinancialSummary.hasBalance && (
        <p className="text-xs text-yellow-400/90 mb-4">
          Valores del último balance pendientes de confirmación.
        </p>
      )}

    <div className="space-y-3">
      {balanceFinancialSummary.rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-4 bg-muted border border-border rounded-xl px-4 py-3"
        >
          <span className="text-sm text-foreground/80 shrink-0">
            {row.label}
          </span>
          <span
            className={
              row.value === "No informado"
                ? "text-sm text-muted-foreground"
                : "text-sm font-semibold text-foreground tabular-nums text-right"
            }
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  </div>
  </>
  )}

  {/* ALERTAS */}
  {hasBcra &&
    (
      entidadesConAtraso > 0 ||
      maxDiasAtraso > 0 ||
      tieneRefinanciaciones ||
      tieneJudiciales ||
      peorSituacion >= 3
    ) && (
      <div className="bg-danger/10 border border-red-500/20 rounded-3xl p-6">

        <h3 className="font-bold text-red-400 mb-4">
          Alertas de Riesgo
        </h3>

        <div className="space-y-2 text-sm">

          {entidadesConAtraso > 0 && (
            <p>• Entidades con atraso.</p>
          )}

          {maxDiasAtraso > 0 && (
            <p>
              • Máximo atraso:
              {" "}
              {maxDiasAtraso}
              {" "}
              días.
            </p>
          )}

          {tieneRefinanciaciones && (
            <p>• Refinanciaciones detectadas.</p>
          )}

          {tieneJudiciales && (
            <p>• Procesos judiciales activos.</p>
          )}

          {peorSituacion >= 3 && (
            <p>• Riesgo elevado.</p>
          )}
        </div>
      </div>
    )}

  {/* SEGURIDAD */}
  <div className="bg-card border border-border rounded-3xl p-6">

    <div className="flex gap-4">

      <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <ShieldCheck className="w-6 h-6 text-red-400" />
      </div>

      <div>
        <h4 className="font-semibold">
          Información protegida
        </h4>

        <p className="text-sm text-muted-foreground mt-1">
          La documentación financiera se encuentra protegida
          mediante protocolos internos de seguridad.
        </p>
      </div>
    </div>
  </div>
  </div>

                </div>
            </div>
        </main>
    )
}
