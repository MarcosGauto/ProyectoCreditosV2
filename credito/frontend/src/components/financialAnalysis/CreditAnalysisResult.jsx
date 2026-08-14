"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Save, Sparkles } from "lucide-react"

import {
  SEMAPHORE_STYLES,
  SHOW_CAPACIDAD_FINANCIERA,
} from "@/config/creditAnalysis"
import { useCreditPolicy } from "@/hooks/useCreditPolicy"
import { buildResultadoFinalNarrative } from "@/lib/creditPolicy/creditPolicyResultadoFinal"
import {
  buildCreditAnalysis,
  computeUltimoEjercicioBalanceRatios,
  formatCreditAmount,
  formatRatioPercent,
} from "@/lib/creditAnalysisEngine"
import {
  getNosisSemaphoreDisplayLabel,
  getNosisSemaphoreLabelUpper,
} from "@/lib/nosisScore"
import { CONSULTAS_ULTIMOS_MESES } from "@/lib/nosisModel"
import { NosisDetectedInfo } from "@/components/financialAnalysis/NosisDetectedInfo"
import { ComportamientoComercialCard } from "@/components/financialAnalysis/ComportamientoComercialCard"
import { CoverageRequirementsBlock } from "@/components/financialAnalysis/CoverageRequirementsBlock"
import {
  evaluateCoverageDecision,
  formatFechaInicioActividadInput,
  fechaInicioActividadFromInput,
  getResultadoCoberturaBadgeClass,
  getResultadoFinalDisplayEmoji,
  resultadoCoberturaPermiteMonto,
  TIPO_OPERACION,
  TIPO_OPERACION_OPTIONS,
} from "@/lib/coverageRequirements"
import { fetchChequesRechazadosByCuit } from "@/lib/chequesRechazadosService"
import { USE_FIREBASE_STORAGE } from "@/lib/storageConfig"
import {
  loadCreditAnalysisResult,
  saveCreditAnalysisResult,
} from "@/lib/saveCreditAnalysisResult"
import { PrequalificationExcelTable } from "@/components/financialAnalysis/PrequalificationExcelTable"
import {
  balanceContableLatestEjercicioLegacyDoc,
  getVentasPromedioMensualUltimoPeriodoFromTablas,
  logVentasContableSeleccionDebug,
  resolveColumnForHighestFechaCierreBalance,
} from "@/lib/balanceContableModel"
import {
  computeBalanceAnalysis,
  formatBalanceRatio,
  formatBalanceVariationPercent,
} from "@/lib/balanceAnalysis"
import {
  ESTADO_ANALISIS_BALANCE_LABEL,
  resolveTipoContribuyente,
  shouldSuppressBalanceWarning,
} from "@/lib/contribuyenteBalanceContext"
import {
  TIPO_EMPRESA_OPTIONS,
  calculateExcelPrequalification,
  formatCoeficienteDisplay,
} from "@/lib/scoring/prequalification"
import { UploadButton } from "@/components/financialAnalysis/UploadButton"
import { FinancialScoreDebugPanel } from "@/components/financialAnalysis/FinancialScoreDebugPanel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  buildBalanceAnalysisInput,
  fetchBalanceGeminiAnalysis,
} from "@/lib/balance/balanceGeminiAnalysis"
import { CreditAnalysisCockpit } from "@/components/creditCockpit/CreditAnalysisCockpit"

const ESTADO_GENERAL_LABEL = {
  good: "Bueno",
  medium: "Medio",
  risky: "Riesgoso",
  unknown: "Sin evaluar",
}

const TAB_KEYS = [
  "resumen",
  "financiero",
  "analisisIA",
  "balance",
  "nosis",
  "credito",
  "decision",
]
const TAB_LABELS = {
  resumen: "Resumen",
  financiero: "Financiero",
  analisisIA: "Análisis IA",
  balance: "Análisis balance",
  nosis: "NOSIS",
  credito: "Crédito",
  decision: "Decisión",
}

function formatAnalysisDate(iso) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}

/**
 * @param {import("@/lib/balance/balanceGeminiAnalysis").BalanceGeminiAnalysisResult | null | undefined} analisis
 */
function hasAnalisisIAContent(analisis) {
  if (!analisis || typeof analisis !== "object") {
    return false
  }
  if (typeof analisis.texto === "string" && analisis.texto.trim()) {
    return true
  }
  if (Array.isArray(analisis.lineas) && analisis.lineas.length > 0) {
    return true
  }
  return (
    (analisis.fortalezas?.length ?? 0) > 0 ||
    (analisis.debilidades?.length ?? 0) > 0 ||
    (analisis.monitorear?.length ?? 0) > 0
  )
}

/**
 * @param {string} raw
 * @returns {number | null}
 */
function parseMontoCreditoInput(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return null
  }
  const normalized = String(raw)
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
  const value = Number(normalized)
  return Number.isFinite(value) && value >= 0 ? value : null
}

function MetricRow({
  label,
  value,
  semaphore,
  valueClassName,
  hideSemaphoreBadge = false,
}) {
  const sem =
    semaphore && SEMAPHORE_STYLES[semaphore]
      ? SEMAPHORE_STYLES[semaphore]
      : null

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border bg-muted px-3 py-2 sm:px-4 sm:py-2.5">
      <span className="min-w-0 text-xs text-muted-foreground sm:text-sm">{label}</span>
      <span
        className={`ml-auto min-w-0 text-xs font-semibold tabular-nums whitespace-nowrap text-right sm:text-sm ${
          valueClassName ?? "text-foreground"
        }`}
      >
        {value}
      </span>
      {sem && !hideSemaphoreBadge && (
        <span className={`text-xs ${sem.className}`}>
          {sem.emoji} {sem.label}
        </span>
      )}
    </div>
  )
}

function HighlightRow({ label, value }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <span className="text-sm font-semibold text-red-200">{label}</span>
      <span className="ml-auto text-lg font-bold text-foreground tabular-nums whitespace-nowrap text-right">
        {value || "—"}
      </span>
    </div>
  )
}

/**
 * @param {{
 *   consultas: {
 *     jun?: number;
 *     may?: number;
 *     abr?: number;
 *     mar?: number;
 *     feb?: number;
 *     ene?: number;
 *     total?: number;
 *     promedio?: number;
 *   } | null | undefined;
 *   comentario?: string | null;
 * }} props
 */
function ConsultasComercialesCard({ consultas, comentario }) {
  const hasData = consultas && typeof consultas.total === "number" && consultas.total > 0

  return (
    <div className="bg-muted border border-border rounded-xl px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-sm text-muted-foreground">Consultas comerciales</span>
        <span className="ml-auto text-lg font-bold text-foreground tabular-nums">
          {hasData ? consultas.total : "—"}
        </span>
      </div>

      {hasData ? (
        <>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Últimos 6 meses
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 pt-2 border-t border-border">
            {CONSULTAS_ULTIMOS_MESES.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-baseline justify-between gap-2 min-w-0"
              >
                <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {consultas[/** @type {"jun"|"may"|"abr"|"mar"|"feb"|"ene"} */ (key)] ?? "—"}
                </span>
              </div>
            ))}
          </div>

          {comentario && (
            <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
              {comentario}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Sin datos de consultas comerciales en el informe.
        </p>
      )}
    </div>
  )
}

/**
 * @param {{
 *   label: string;
 *   ejercicioAnterior: string;
 *   valorAnterior: number | null;
 *   ejercicioActual: string;
 *   valorActual: number | null;
 *   variacionPct: number | null;
 *   semaphore?: string;
 * }} props
 */
function BalanceEvolutionCard({
  label,
  ejercicioAnterior,
  valorAnterior,
  ejercicioActual,
  valorActual,
  variacionPct,
  semaphore,
}) {
  const sem =
    semaphore && SEMAPHORE_STYLES[semaphore]
      ? SEMAPHORE_STYLES[semaphore]
      : null

  return (
    <div className="bg-muted border border-border rounded-xl px-4 py-3 space-y-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {sem && (
          <span className={`text-xs ml-auto ${sem.className}`}>
            {sem.emoji} {sem.label}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {ejercicioActual}: {formatCreditAmount(valorActual)}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {ejercicioAnterior}: {formatCreditAmount(valorAnterior)}
      </p>
      <p className="text-xs font-medium text-foreground tabular-nums">
        Variación: {formatBalanceVariationPercent(variacionPct)}
      </p>
    </div>
  )
}

/**
 * @param {{
 *   patrimonioActual: number | null;
 *   patrimonioAnterior: number | null;
 *   variacionPct: number | null;
 *   estadoEvolucionPatrimonial: string;
 *   escala?: { lineas?: string[] } | null;
 * }} resumen
 */
function PatrimonioNetoEvolutionSummary({ resumen }) {
  const sem =
    SEMAPHORE_STYLES[resumen.estadoEvolucionPatrimonial] ??
    SEMAPHORE_STYLES.unknown
  const resultado =
    ESTADO_GENERAL_LABEL[resumen.estadoEvolucionPatrimonial] ?? "Sin dato"

  return (
    <div className="bg-muted border border-border rounded-xl px-4 py-3 space-y-2">
      <p className="text-sm font-semibold text-foreground">Evolución Patrimonial</p>
      <p className="text-xs text-muted-foreground tabular-nums">
        PN actual: {formatCreditAmount(resumen.patrimonioActual)}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        PN anterior: {formatCreditAmount(resumen.patrimonioAnterior)}
      </p>
      <p className="text-xs font-medium text-foreground tabular-nums">
        Variación: {formatBalanceVariationPercent(resumen.variacionPct)}
      </p>
      {resumen.escala?.lineas?.length ? (
        <div className="pt-1 border-t border-border space-y-0.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Escala
          </p>
          {resumen.escala.lineas.map((linea) => (
            <p key={linea} className="text-[11px] text-muted-foreground">
              {linea}
            </p>
          ))}
        </div>
      ) : null}
      <p className="text-xs pt-1">
        <span className="text-muted-foreground">Resultado: </span>
        <span className={`font-semibold uppercase ${sem.className}`}>
          {sem.emoji} {resultado}
        </span>
      </p>
    </div>
  )
}

/**
 * @param {{
 *   cuit: string;
 *   empresa?: Record<string, unknown> | null;
 *   balances?: unknown[];
 *   balanceContable?: import("@/lib/balanceContableModel").BalanceContableDoc | null;
 *   iva?: unknown[];
 *   iibb?: unknown[];
 *   nosis?: unknown[];
 *   bcra?: {
 *     peorSituacion?: number;
 *     entidadesConAtraso?: number;
 *     maxDiasAtraso?: number;
 *     tieneRefinanciaciones?: boolean;
 *     tieneJudiciales?: boolean;
 *   } | null;
 *   bcraReports?: unknown[];
 *   razonSocial?: string | null;
 *   analista?: string | null;
 *   tipoEmpresa?: string;
 *   coeficienteEmpresa?: number | null;
 *   analysisEmpresaLoaded?: boolean;
 *   onTipoEmpresaChange?: (value: string) => void | Promise<void>;
 * }} props
 */
export function CreditAnalysisResult({
  cuit,
  empresa = null,
  balances = [],
  balanceContable = null,
  iva = [],
  iibb = [],
  nosis = [],
  bcra = null,
  bcraReports = [],
  razonSocial = null,
  analista = null,
  tipoEmpresa = "",
  coeficienteEmpresa = null,
  analysisEmpresaLoaded = true,
  onTipoEmpresaChange,
  estadoDocumentalItems = [],
  bcraCockpit = null,
  uploadPath = null,
}) {
  const { toast } = useToast()
  const { policy: creditPolicy } = useCreditPolicy()
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recomendacionAnalista, setRecomendacionAnalista] = useState("")
  const [montoCreditoOtorgado, setMontoCreditoOtorgado] = useState(
    /** @type {number | null} */ (null)
  )
  const [montoCreditoInput, setMontoCreditoInput] = useState("")
  const [activeTab, setActiveTab] = useState("resumen")
  const [asyncPreCal, setAsyncPreCal] = useState(null)
  const [preCalLoading, setPreCalLoading] = useState(false)
  const [savedAnalysis, setSavedAnalysis] = useState(
    /** @type {Record<string, unknown> | null} */ (null)
  )
  const [chequesRechazados, setChequesRechazados] = useState(
    /** @type {import("@/lib/chequesRechazadosModel").ChequeRechazadoDoc[]} */ ([])
  )
  const [facturasAlContado, setFacturasAlContado] = useState(
    /** @type {boolean | null} */ (null)
  )
  const [tipoOperacion, setTipoOperacion] = useState(TIPO_OPERACION.NOMINADO)
  const [fechaInicioActividad, setFechaInicioActividad] = useState(
    /** @type {string | null} */ (null)
  )
  const [fechaInicioActividadInput, setFechaInicioActividadInput] = useState("")
  const [analisisBalanceIA, setAnalisisBalanceIA] = useState(
    /** @type {import("@/lib/balance/balanceGeminiAnalysis").BalanceGeminiAnalysisResult | null} */ (
      null
    )
  )
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false)
  const [aiAnalysisError, setAiAnalysisError] = useState("")

  useEffect(() => {
    if (!cuit) {
      return
    }

    let active = true
    fetchChequesRechazadosByCuit(cuit)
      .then((data) => {
        if (active) {
          setChequesRechazados(data)
        }
      })
      .catch((error) => {
        console.error("[CreditAnalysisResult] cheques rechazados", error)
      })

    return () => {
      active = false
    }
  }, [cuit])

  const baseComputed = useMemo(
    () =>
      buildCreditAnalysis({
        cuit,
        empresa,
        balances,
        balanceContable,
        iva,
        iibb,
        nosis,
        bcra,
        razonSocial,
        analista,
        tipoEmpresa: tipoEmpresa || null,
        chequesRechazados,
        creditPolicy,
      }),
    [
      cuit,
      empresa,
      balances,
      balanceContable,
      iva,
      iibb,
      nosis,
      bcra,
      razonSocial,
      analista,
      tipoEmpresa,
      chequesRechazados,
      creditPolicy,
    ]
  )

  const tipoContribuyente = useMemo(
    () =>
      resolveTipoContribuyente({
        cuit,
        savedAnalysis,
        balanceContable,
        iva,
        iibb,
      }),
    [cuit, savedAnalysis, balanceContable, iva, iibb]
  )

  const computed = useMemo(() => {
    if (!asyncPreCal) {
      return baseComputed
    }

    const warnings = [...baseComputed.warnings]

    for (const warning of asyncPreCal.warnings ?? []) {
      if (shouldSuppressBalanceWarning(tipoContribuyente, warning)) {
        continue
      }
      if (!warnings.includes(warning)) {
        warnings.push(warning)
      }
    }
    if (asyncPreCal.error && !warnings.includes(asyncPreCal.error)) {
      warnings.push(asyncPreCal.error)
    }

    return {
      ...baseComputed,
      preCalificacion: { ...asyncPreCal, loading: false },
      warnings,
    }
  }, [baseComputed, asyncPreCal, tipoContribuyente])

  const displayWarnings = useMemo(() => {
    return computed.warnings.filter(
      (warning) => !shouldSuppressBalanceWarning(tipoContribuyente, warning)
    )
  }, [computed.warnings, tipoContribuyente])

  const estadoSem = SEMAPHORE_STYLES[computed.resumenEjecutivo.estadoGeneral]
  const nosisData = computed.nosisAnalisis
  const nosisSem = SEMAPHORE_STYLES[nosisData?.estadoNosis ?? "unknown"]
  const nosisSemaphoreLabel = getNosisSemaphoreDisplayLabel(
    nosisData?.estadoComercial,
    nosisData?.estadoNosis
  )
  const comportamientoComercial = computed.comportamientoComercial

  const coverageDecision = useMemo(
    () =>
      evaluateCoverageDecision({
        tipoOperacion,
        fechaInicioActividad,
        chequesRechazadosCount: comportamientoComercial?.cantidadRechazados ?? 0,
        nosisChequesRechazados: nosisData?.chequesHistorico?.rechazados ?? null,
        nosisChequesPendientes: nosisData?.chequesHistorico?.pendientes ?? null,
        bcraReports,
        facturasAlContado,
        creditPolicy,
      }),
    [
      tipoOperacion,
      fechaInicioActividad,
      comportamientoComercial?.cantidadRechazados,
      nosisData?.chequesHistorico?.rechazados,
      nosisData?.chequesHistorico?.pendientes,
      bcraReports,
      facturasAlContado,
      creditPolicy,
    ]
  )

  const preCal = computed.preCalificacion

  const financieroTab = useMemo(() => {
    if (!asyncPreCal || preCal.loading) {
      return null
    }

    const ventasContable = getVentasPromedioMensualUltimoPeriodoFromTablas(
      asyncPreCal.tablas
    )

    logVentasContableSeleccionDebug(
      balanceContable,
      asyncPreCal.tablas,
      "FinancieroTab"
    )

    const latestBalance = balanceContable
      ? balanceContableLatestEjercicioLegacyDoc(balanceContable)
      : null

    const ratios = computeUltimoEjercicioBalanceRatios(latestBalance, {
      columnaSeleccionada: balanceContable
        ? resolveColumnForHighestFechaCierreBalance(balanceContable)
        : null,
      creditPolicy,
    })
    const ventas = asyncPreCal.ventas ?? asyncPreCal.indicadores
    const ventasIva = ventas?.ventasIva ?? null
    const ventasIibb = ventas?.ventasIibb ?? null
    const promedio = asyncPreCal.promedioVentas ?? null

    console.log("VENTAS CONTABLES", ventasContable)
    console.log("VENTAS IVA", ventasIva)
    console.log("VENTAS IIBB", ventasIibb)
    console.log("PROMEDIO CALCULADO", promedio)

    return {
      ventasContable,
      ventasIva,
      ventasIibb,
      patrimonioNeto: ratios.patrimonioNeto,
      promedio,
      liquidezCorriente: ratios.liquidezCorriente,
      endeudamiento: ratios.endeudamiento,
      semaforos: ratios.semaforos,
    }
  }, [asyncPreCal, preCal.loading, balanceContable, creditPolicy])

  const balanceAnalysisIngresos = useMemo(() => {
    const preCal = computed.preCalificacion
    const ventas = asyncPreCal?.ventas ?? preCal?.ventas ?? preCal?.indicadores
    return {
      ventasIva: ventas?.ventasIva ?? null,
      ventasIibb: ventas?.ventasIibb ?? null,
      promedioVentas:
        asyncPreCal?.promedioVentas ??
        preCal?.promedioVentas ??
        preCal?.promedioIndicadores ??
        null,
      peorSituacionBcra: bcra?.peorSituacion ?? null,
    }
  }, [asyncPreCal, computed.preCalificacion, bcra])

  const policyTextVars = useMemo(
    () => ({
      liquidezCorriente: computed.capacidadEconomica?.liquidezCorriente ?? null,
      endeudamiento: computed.capacidadEconomica?.endeudamiento ?? null,
      patrimonioNeto: computed.capacidadEconomica?.patrimonioNeto ?? null,
      scoreFinanciero: computed.resumenEjecutivo?.scoreFinanciero ?? null,
      scoreNosis: computed.nosisAnalisis?.scoreNosis ?? null,
      capacidadFinanciera: SHOW_CAPACIDAD_FINANCIERA
        ? computed.creditoAsumible?.creditoSugerido ?? null
        : null,
    }),
    [computed]
  )

  const balanceAnalysis = useMemo(
    () =>
      computeBalanceAnalysis(balanceContable, {
        cuit,
        savedAnalysis,
        iva,
        iibb,
        ingresos: balanceAnalysisIngresos,
        creditPolicy,
        textVars: policyTextVars,
      }),
    [
      balanceContable,
      cuit,
      savedAnalysis,
      iva,
      iibb,
      balanceAnalysisIngresos,
      creditPolicy,
      policyTextVars,
    ]
  )

  const scoreDebug = computed.scoreDebug ?? null

  const resultadoFinalNarrativa = useMemo(
    () =>
      buildResultadoFinalNarrative(creditPolicy, {
        resultadoCobertura: coverageDecision.resultadoCobertura,
        estadoGeneral: computed.resumenEjecutivo.estadoGeneral,
        textVars: policyTextVars,
      }),
    [
      creditPolicy,
      coverageDecision.resultadoCobertura,
      computed.resumenEjecutivo.estadoGeneral,
      policyTextVars,
    ]
  )

  useEffect(() => {
    let cancelled = false
    setPreCalLoading(true)

    calculateExcelPrequalification({
      balanceContable,
      balances,
      iva,
      iibb,
      tipoEmpresa: tipoEmpresa || null,
      coeficienteEmpresa,
    })
      .then((result) => {
        if (!cancelled) {
          setAsyncPreCal(result)
        }
      })
      .catch((error) => {
        console.error("[CreditAnalysisResult] preCalificacion IPC", error)
        if (!cancelled) {
          setAsyncPreCal(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPreCalLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [balanceContable, balances, iva, iibb, tipoEmpresa, coeficienteEmpresa])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!cuit) {
        setLoadingSaved(false)
        return
      }

      setLoadingSaved(true)
      try {
        const saved = await loadCreditAnalysisResult(cuit)
        if (cancelled) return

        if (saved) {
          setSavedAnalysis(saved)
          if (typeof saved.recomendacionAnalista === "string") {
            setRecomendacionAnalista(saved.recomendacionAnalista)
          }
          if (
            saved.montoCreditoOtorgado != null &&
            Number.isFinite(Number(saved.montoCreditoOtorgado))
          ) {
            const monto = Number(saved.montoCreditoOtorgado)
            setMontoCreditoOtorgado(monto)
            setMontoCreditoInput(String(Math.round(monto)))
          }
          if (saved.facturasAlContado === true || saved.facturasAlContado === false) {
            setFacturasAlContado(saved.facturasAlContado)
          }
          if (
            saved.tipoOperacion === TIPO_OPERACION.NOMINADO ||
            saved.tipoOperacion === TIPO_OPERACION.DISCRECIONAL
          ) {
            setTipoOperacion(saved.tipoOperacion)
          }
          if (typeof saved.fechaInicioActividad === "string") {
            setFechaInicioActividad(saved.fechaInicioActividad)
            setFechaInicioActividadInput(
              formatFechaInicioActividadInput(saved.fechaInicioActividad)
            )
          }
          if (
            saved.analisisBalanceIA &&
            typeof saved.analisisBalanceIA === "object"
          ) {
            setAnalisisBalanceIA(
              /** @type {import("@/lib/balance/balanceGeminiAnalysis").BalanceGeminiAnalysisResult} */ (
                saved.analisisBalanceIA
              )
            )
          }
        }
      } catch (error) {
        console.error("[CreditAnalysisResult] load", error)
      } finally {
        if (!cancelled) setLoadingSaved(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [cuit, empresa])

  const balanceAnalysisInput = useMemo(
    () =>
      buildBalanceAnalysisInput({
        financieroTab,
        balanceAnalysis,
        asyncPreCal,
      }),
    [financieroTab, balanceAnalysis, asyncPreCal]
  )

  const canGenerateAiAnalysis = !preCalLoading && Boolean(financieroTab)

  const handleGenerateAiAnalysis = useCallback(async () => {
    if (!canGenerateAiAnalysis) {
      return
    }

    setAiAnalysisLoading(true)
    setAiAnalysisError("")
    try {
      const analisis = await fetchBalanceGeminiAnalysis(balanceAnalysisInput)
      setAnalisisBalanceIA(analisis)
      toast({
        title: "Análisis generado",
        description: "La reseña ejecutiva del balance está lista.",
      })
    } catch (error) {
      console.error("[CreditAnalysisResult] balance AI", error)
      const message =
        error instanceof Error ? error.message : "No se pudo generar el análisis."
      setAiAnalysisError(message)
      toast({
        variant: "destructive",
        title: "Error de análisis IA",
        description: message,
      })
    } finally {
      setAiAnalysisLoading(false)
    }
  }, [balanceAnalysisInput, canGenerateAiAnalysis, toast])

  const handleSave = useCallback(async () => {
    if (!cuit) return

    setSaving(true)
    try {
      await saveCreditAnalysisResult(cuit, {
        ...(tipoEmpresa
          ? {
              tipoEmpresa,
              coeficienteEmpresa:
                coeficienteEmpresa ??
                computed.preCalificacion?.coeficiente ??
                null,
            }
          : {}),
        recomendacionAnalista,
        montoCreditoOtorgado,
        tipoOperacion: coverageDecision.tipoOperacion,
        fechaInicioActividad,
        resultadoCobertura: coverageDecision.resultadoCobertura,
        requisitosCobertura: coverageDecision.requisitosCobertura,
        motivosExclusion: coverageDecision.motivosExclusion,
        facturasAlContado,
        computed,
        analista,
        analisisBalanceIA,
      })
      setSavedAnalysis((prev) => ({
        ...(prev ?? {}),
        analisisBalanceIA,
      }))
      toast({
        title: "Resultado guardado",
        description: "El análisis crediticio se guardó en Firestore.",
      })
    } catch (error) {
      console.error("[CreditAnalysisResult] save", error)
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description:
          error instanceof Error ? error.message : "No se pudo guardar.",
      })
    } finally {
      setSaving(false)
    }
  }, [
    cuit,
    tipoEmpresa,
    recomendacionAnalista,
    montoCreditoOtorgado,
    fechaInicioActividad,
    facturasAlContado,
    coverageDecision,
    computed,
    analista,
    analisisBalanceIA,
    toast,
  ])

  const resultadoFinalLabel = coverageDecision.resultadoCoberturaLabel
  const resultadoFinalEmoji = getResultadoFinalDisplayEmoji(
    coverageDecision.resultadoCobertura
  )
  const resultadoFinalBadge = getResultadoCoberturaBadgeClass(
    coverageDecision.resultadoCobertura
  )
  const muestraMontoCredito = resultadoCoberturaPermiteMonto(
    coverageDecision.resultadoCobertura
  )

  const handleMontoCreditoInputChange = useCallback((raw) => {
    setMontoCreditoInput(raw)
    setMontoCreditoOtorgado(parseMontoCreditoInput(raw))
  }, [])

  const estadoGeneralLabel =
    ESTADO_GENERAL_LABEL[computed.resumenEjecutivo.estadoGeneral]
  const tipoOperacionLabel =
    TIPO_OPERACION_OPTIONS.find((o) => o.value === tipoOperacion)?.label ??
    tipoOperacion

  return (
    <div className="min-w-0">
      <CreditAnalysisCockpit
        cuit={cuit}
        empresa={empresa}
        razonSocialBcra={razonSocial}
        bcra={bcraCockpit}
        computed={computed}
        coverageDecision={coverageDecision}
        preCalLoading={preCalLoading}
        estadoDocumentalItems={estadoDocumentalItems}
        fechaInicioActividad={fechaInicioActividad}
        montoCreditoOtorgado={montoCreditoOtorgado}
        uploadPath={uploadPath ?? `/dashboard/analysis/${cuit}/upload`}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={TAB_KEYS.map((key) => ({ key, label: TAB_LABELS[key] }))}
        headerActions={
          <UploadButton
            variant="primary"
            size="sm"
            disabled={saving || loadingSaved}
            onClick={handleSave}
            className="shrink-0"
          >
            {saving ? (
              <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 inline h-3.5 w-3.5" />
            )}
            Guardar
          </UploadButton>
        }
      >
      {activeTab !== "resumen" ? (
      <>
      {displayWarnings.length > 0 && (
        <div className="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 sm:px-4 sm:py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
            Advertencias
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-[11px] text-amber-200/80">
            {displayWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <FinancialScoreDebugPanel debug={scoreDebug} />

      {/* ── Tab content ── */}
      <div className="min-w-0 space-y-2.5">
        {activeTab === "decision" || activeTab === "credito" ? (
          <div
            className={`mb-3 rounded-xl border px-4 py-3 text-center ${resultadoFinalBadge}`}
          >
            <p className="text-[10px] uppercase tracking-widest opacity-70">
              Resultado final
            </p>
            <p className="text-lg font-black tracking-wide">
              {resultadoFinalEmoji} {resultadoFinalLabel}
            </p>
            {muestraMontoCredito &&
            montoCreditoOtorgado != null &&
            montoCreditoOtorgado > 0 ? (
              <p className="mt-1 whitespace-nowrap text-sm font-semibold tabular-nums">
                Crédito otorgado: {formatCreditAmount(montoCreditoOtorgado)}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* ===== FINANCIERO ===== */}
        {activeTab === "financiero" && (
          <>
            {preCalLoading || !financieroTab ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Cargando indicadores financieros…
              </div>
            ) : (
              <>
                <MetricRow
                  label="Ventas Contable"
                  value={formatCreditAmount(financieroTab.ventasContable)}
                />
                <MetricRow
                  label="Ventas IVA"
                  value={formatCreditAmount(financieroTab.ventasIva)}
                />
                <MetricRow
                  label="Ventas IIBB"
                  value={formatCreditAmount(financieroTab.ventasIibb)}
                />
                <MetricRow
                  label="Patrimonio neto"
                  value={formatCreditAmount(financieroTab.patrimonioNeto)}
                />
                <MetricRow
                  label="Promedio"
                  value={formatCreditAmount(financieroTab.promedio)}
                />
                <MetricRow
                  label="Liquidez corriente" // liquidez  corriente = act corriente / pasivo corriente
                  value={
                    financieroTab.liquidezCorriente !== null
                      ? financieroTab.liquidezCorriente.toLocaleString("es-AR", {
                          maximumFractionDigits: 2,
                        })
                      : "—"
                  }
                  semaphore={financieroTab.semaforos.liquidez}
                />
                <MetricRow
                  label="Endeudamiento" // endeudamiento =pasivo total / activo total
                  value={formatRatioPercent(financieroTab.endeudamiento)}
                  semaphore={financieroTab.semaforos.endeudamiento}
                />
              </>
            )}
            <ComportamientoComercialCard
              data={comportamientoComercial}
              cuit={cuit}
            />
            {estadoSem && (
              <p className="text-[11px] text-muted-foreground pt-1">
                🟢 Bueno · 🟡 Medio · 🔴 Riesgoso
              </p>
            )}
          </>
        )}

        {/* ===== ANÁLISIS IA ===== */}
        {activeTab === "analisisIA" && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Análisis IA
            </p>

            {preCalLoading || !financieroTab ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Cargando indicadores financieros…
              </div>
            ) : (
              <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-4 py-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-violet-200">
                    Reseña ejecutiva del balance
                  </p>
                  <UploadButton
                    type="button"
                    variant="secondary"
                    disabled={!canGenerateAiAnalysis || aiAnalysisLoading}
                    onClick={handleGenerateAiAnalysis}
                    className="text-xs"
                  >
                    {aiAnalysisLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generando…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generar análisis con IA
                      </>
                    )}
                  </UploadButton>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Se basa solo en indicadores ya calculados (ventas, liquidez,
                  endeudamiento, patrimonio, capital de trabajo). No vuelve a
                  leer el PDF del balance.
                </p>

                {aiAnalysisError && (
                  <p className="text-xs text-red-300">{aiAnalysisError}</p>
                )}

                {hasAnalisisIAContent(analisisBalanceIA) ? (
                  <div className="space-y-3 text-sm text-foreground leading-relaxed border-t border-violet-500/15 pt-3">
                    {(analisisBalanceIA?.lineas?.length
                      ? analisisBalanceIA.lineas
                      : String(analisisBalanceIA?.texto ?? "")
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                    ).map((linea, index) => (
                      <p key={`${index}-${linea.slice(0, 24)}`}>{linea}</p>
                    ))}
                    {((analisisBalanceIA?.fortalezas?.length ?? 0) > 0 ||
                      (analisisBalanceIA?.debilidades?.length ?? 0) > 0 ||
                      (analisisBalanceIA?.monitorear?.length ?? 0) > 0) && (
                      <div className="grid gap-2 pt-2 border-t border-violet-500/15 text-xs">
                        {(analisisBalanceIA?.fortalezas?.length ?? 0) > 0 && (
                          <p>
                            <span className="text-green-300 font-medium">
                              Fortalezas:
                            </span>{" "}
                            {analisisBalanceIA.fortalezas.join(" · ")}
                          </p>
                        )}
                        {(analisisBalanceIA?.debilidades?.length ?? 0) > 0 && (
                          <p>
                            <span className="text-red-300 font-medium">
                              Debilidades:
                            </span>{" "}
                            {analisisBalanceIA.debilidades.join(" · ")}
                          </p>
                        )}
                        {(analisisBalanceIA?.monitorear?.length ?? 0) > 0 && (
                          <p>
                            <span className="text-yellow-300 font-medium">
                              Monitorear:
                            </span>{" "}
                            {analisisBalanceIA.monitorear.join(" · ")}
                          </p>
                        )}
                      </div>
                    )}
                    {analisisBalanceIA?.generadoEn && (
                      <p className="text-[10px] text-muted-foreground">
                        Generado: {formatAnalysisDate(analisisBalanceIA.generadoEn)}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Basado exclusivamente en indicadores calculados por el
                      sistema. No constituye asesoramiento legal ni contable.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Presioná «Generar análisis con IA» para obtener una reseña
                    breve (máx. 8 líneas) con fortalezas, debilidades y
                    aspectos a monitorear. Guardá el análisis crediticio para
                    incluirlo en el PDF.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* ===== ANÁLISIS DEL BALANCE ===== */}
        {activeTab === "balance" && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Análisis del balance
            </p>
            {!balanceAnalysis.disponible ? (
              <p className="text-xs text-muted-foreground py-2">
                Cargá el balance contable para ver el análisis patrimonial entre ejercicios.
              </p>
            ) : (
              <>
                <MetricRow
                  label="Estado análisis balance"
                  value={
                    ESTADO_ANALISIS_BALANCE_LABEL[
                      balanceAnalysis.estadoAnalisisBalance
                    ] ?? balanceAnalysis.estadoAnalisisBalance
                  }
                />

                {balanceAnalysis.mensajePrincipal && (
                  <div className="bg-muted border border-border rounded-xl px-4 py-3 mb-2">
                    <p className="text-sm text-foreground leading-relaxed">
                      {balanceAnalysis.mensajePrincipal}
                    </p>
                  </div>
                )}

                {balanceAnalysis.tipoContribuyente === "fisica" && (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-1.5">
                      Capacidad de ingresos (sin balance)
                    </p>
                    <MetricRow
                      label="Ventas IVA (prom. mensual)"
                      value={formatCreditAmount(
                        balanceAnalysis.ingresosResumen?.ventasIva
                      )}
                    />
                    <MetricRow
                      label="Ventas IIBB (prom. mensual)"
                      value={formatCreditAmount(
                        balanceAnalysis.ingresosResumen?.ventasIibb
                      )}
                    />
                    <MetricRow
                      label="Promedio ventas"
                      value={formatCreditAmount(
                        balanceAnalysis.ingresosResumen?.promedioVentas
                      )}
                    />
                    <MetricRow
                      label="BCRA — peor situación"
                      value={
                        balanceAnalysis.ingresosResumen?.peorSituacionBcra != null
                          ? String(balanceAnalysis.ingresosResumen.peorSituacionBcra)
                          : "—"
                      }
                    />
                  </>
                )}

                {!balanceAnalysis.mostrarIndicadoresPatrimoniales ? (
                  <div className="bg-muted border border-border rounded-xl px-4 py-3 mt-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Comentario balance
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {balanceAnalysis.comentarioBalance}
                    </p>
                  </div>
                ) : (
                  <>
                <p className="text-[10px] text-muted-foreground mb-3 mt-2">
                  Cierre más reciente:{" "}
                  {balanceAnalysis.periodoReciente ??
                    balanceAnalysis.fechaCierreUltimo ??
                    "Ejercicio actual"}
                  {" · "}
                  Cierre anterior:{" "}
                  {balanceAnalysis.periodoAnterior ??
                    balanceAnalysis.fechaCierreAnterior ??
                    "Ejercicio anterior"}
                </p>

                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Indicadores
                  {balanceAnalysis.fechaCierreUltimo
                    ? ` (cierre ${balanceAnalysis.fechaCierreUltimo})`
                    : " (último ejercicio)"}
                </p>
                <MetricRow
                  label="Liquidez corriente" // liquidez  corriente = act corriente / pasivo corriente
                  value={
                    financieroTab.liquidezCorriente !== null
                      ? financieroTab.liquidezCorriente.toLocaleString("es-AR", {
                          maximumFractionDigits: 2,
                        })
                      : "—"
                  }
                  semaphore={financieroTab.semaforos.liquidez}
                />
                <MetricRow
                  label="Capital de trabajo"
                  value={formatCreditAmount(balanceAnalysis.indicadores.capitalTrabajo)}
                />
                <MetricRow
                  label="Endeudamiento"
                  value={formatRatioPercent(balanceAnalysis.indicadores.endeudamiento)}
                  semaphore={balanceAnalysis.semaforos.endeudamiento}
                />
                <MetricRow
                  label="Solvencia"
                  value={formatBalanceRatio(balanceAnalysis.indicadores.solvencia)}
                />
                <MetricRow
                  label="Participación patrimonial"
                  value={formatRatioPercent(
                    balanceAnalysis.indicadores.participacionPatrimonial
                  )}
                  semaphore={balanceAnalysis.semaforos.participacionPatrimonial}
                />
                <MetricRow
                  label="Cobertura patrimonial"
                  value={formatBalanceRatio(
                    balanceAnalysis.indicadores.coberturaPatrimonial
                  )}
                />

                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-2">
                  Evolución patrimonial
                </p>
                <div className="space-y-2.5">
                  {(balanceAnalysis.evolucionPatrimonial?.filas ?? []).map((fila) => (
                    <BalanceEvolutionCard
                      key={fila.label}
                      label={fila.label}
                      ejercicioAnterior={fila.ejercicioAnterior}
                      valorAnterior={fila.valorAnterior}
                      ejercicioActual={fila.ejercicioActual}
                      valorActual={fila.valorActual}
                      variacionPct={fila.variacionPct}
                    />
                  ))}
                  {balanceAnalysis.evolucionPatrimonial?.resumenPatrimonioNeto && (
                    <PatrimonioNetoEvolutionSummary
                      resumen={balanceAnalysis.evolucionPatrimonial.resumenPatrimonioNeto}
                    />
                  )}
                </div>
                <div className="bg-muted border border-border rounded-xl px-4 py-3 mt-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Conclusión evolutiva
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {balanceAnalysis.evolucionPatrimonial?.comentarioEvolucion}
                  </p>
                </div>

                {balanceAnalysis.dictamenPatrimonial && (
                  <div
                    className={`rounded-2xl border-2 px-4 py-4 mt-4 ${
                      balanceAnalysis.dictamenPatrimonial.semaforo === "good"
                        ? "border-green-500/35 bg-green-500/10"
                        : balanceAnalysis.dictamenPatrimonial.semaforo === "medium"
                          ? "border-yellow-500/35 bg-yellow-500/10"
                          : "border-red-500/35 bg-red-500/10"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Dictamen patrimonial
                      </p>
                      {SEMAPHORE_STYLES[balanceAnalysis.dictamenPatrimonial.semaforo] && (
                        <span
                          className={`text-sm font-semibold ml-auto ${
                            SEMAPHORE_STYLES[balanceAnalysis.dictamenPatrimonial.semaforo]
                              .className
                          }`}
                        >
                          {
                            SEMAPHORE_STYLES[balanceAnalysis.dictamenPatrimonial.semaforo]
                              .emoji
                          }{" "}
                          {balanceAnalysis.dictamenPatrimonial.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-100 leading-relaxed">
                      {balanceAnalysis.dictamenPatrimonial.texto}
                    </p>
                  </div>
                )}

                <MetricRow
                  label="Estado balance"
                  value={ESTADO_GENERAL_LABEL[balanceAnalysis.estadoBalance]}
                  semaphore={balanceAnalysis.estadoBalance}
                />
                <div className="bg-muted border border-border rounded-xl px-4 py-3 mt-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Comentario balance
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {balanceAnalysis.comentarioBalance}
                  </p>
                </div>

                <p className="text-[11px] text-muted-foreground pt-1">
                  🟢 Bueno · 🟡 Medio · 🔴 Riesgoso
                </p>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ===== ANÁLISIS NOSIS ===== */}
        {activeTab === "nosis" && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Análisis NOSIS
            </p>

            {!nosisData?.disponible ? (
              <p className="text-xs text-muted-foreground py-2">
                Sin informe NOSIS cargado. Subí el PDF en Carga documental.
              </p>
            ) : (
              <>
                {(nosisData.pdfDisplayLabel ||
                  (nosisData.downloadUrl && USE_FIREBASE_STORAGE)) && (
                  <MetricRow
                    label="Informe PDF"
                    value={
                      nosisData.pdfDisplayLabel ? (
                        nosisData.pdfDisplayLabel
                      ) : (
                        <a
                          href={nosisData.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-400 hover:underline"
                        >
                          Descargar PDF
                        </a>
                      )
                    }
                  />
                )}

                <HighlightRow
                  label="Score NOSIS"
                  value={
                    nosisData.scoreNosis != null
                      ? `${nosisData.scoreNosis}/100`
                      : "Pendiente confirmación"
                  }
                />

                {nosisData.estadoComercial && (
                  <HighlightRow
                    label="Estado NOSIS"
                    value={nosisData.estadoComercial}
                  />
                )}

                {nosisData.scoreSourceLabel && (
                  <MetricRow
                    label="Fuente del score"
                    value={`Fuente: ${nosisData.scoreSourceLabel}`}
                  />
                )}

                <MetricRow
                  label="Semáforo NOSIS"
                  value={`${nosisSem?.emoji ?? "⚪"} ${nosisSemaphoreLabel}`}
                  valueClassName={nosisSem?.className}
                  hideSemaphoreBadge
                />

                {nosisData.rating && nosisData.scoreSource === "calculo_interno" && (
                  <MetricRow label="Rating interno" value={nosisData.rating} />
                )}

                <MetricRow
                  label="Situación BCRA informada"
                  value={nosisData.situacionBcra ?? "—"}
                />

                <ConsultasComercialesCard
                  consultas={nosisData.consultas}
                  comentario={nosisData.consultasComercialComentario}
                />

                {nosisData.chequesHistorico?.parsed ? (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-1">
                      Estadística histórica — Total actual
                    </p>
                    <MetricRow
                      label="Cheques rechazados (total)"
                      value={String(nosisData.chequesHistorico.rechazados ?? 0)}
                    />
                    <MetricRow
                      label="Cheques abonados"
                      value={String(nosisData.chequesHistorico.abonados ?? 0)}
                    />
                    <MetricRow
                      label="Cheques sin recuperar"
                      value={String(nosisData.chequesHistorico.pendientes ?? 0)}
                    />
                    <MetricRow
                      label="Monto rechazado (total)"
                      value={formatCreditAmount(
                        nosisData.chequesHistorico.montoRechazado ?? 0
                      )}
                    />
                    <MetricRow
                      label="Monto abonado"
                      value={formatCreditAmount(
                        nosisData.chequesHistorico.montoAbonado ?? 0
                      )}
                    />
                    <MetricRow
                      label="Monto sin recuperar"
                      value={formatCreditAmount(
                        nosisData.chequesHistorico.montoPendiente ?? 0
                      )}
                    />
                  </>
                ) : (
                  <>
                    <MetricRow
                      label="Cheques rechazados"
                      value={String(nosisData.cantidadCheques ?? 0)}
                    />
                    <MetricRow
                      label="Monto rechazado"
                      value={formatCreditAmount(nosisData.montoCheques ?? 0)}
                    />
                  </>
                )}

                <MetricRow
                  label="Juicios / concursos"
                  value={nosisData.juiciosConcursos ? "Sí" : "No"}
                />

                {nosisData.alertas?.length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/25 rounded-xl px-4 py-3 mt-1">
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/90 mb-1">
                      Alertas detectadas
                    </p>
                    <ul className="text-xs text-amber-200/90 space-y-0.5 list-disc list-inside">
                      {nosisData.alertas.map((alerta) => (
                        <li key={alerta}>{alerta}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-muted border border-border rounded-xl px-4 py-3 mt-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Comentario automático
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {nosisData.comentarioAutomatico ?? "—"}
                  </p>
                  {nosisData.conclusion && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {nosisData.conclusion}
                    </p>
                  )}
                </div>

                <NosisDetectedInfo parsedData={nosisData.parsedData} />
              </>
            )}
          </>
        )}

        {/* ===== CRÉDITO ===== */}
        {activeTab === "credito" && (
          <>
            <label className="text-xs text-muted-foreground mb-1 block">
              Tipo de empresa
            </label>
            <Select
              key={tipoEmpresa || "empty-tipo"}
              value={tipoEmpresa || undefined}
              onValueChange={(value) => {
                void onTipoEmpresaChange?.(value)
              }}
              disabled={!analysisEmpresaLoaded && !tipoEmpresa}
            >
              <SelectTrigger className="w-full h-11 rounded-xl border-border bg-muted text-sm text-foreground focus:ring-red-500/40 mb-3">
                <SelectValue placeholder="Seleccionar…" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                {TIPO_EMPRESA_OPTIONS.map((o) => (
                  <SelectItem
                    key={o.value}
                    value={o.value}
                    className="focus:bg-red-500/20 focus:text-white"
                  >
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-[11px] text-muted-foreground mb-2">
              Por balance y rubro: mensual = anual ÷ 12 · actualizado = mensual ×
              IPC · crédito = actualizado × coeficiente (solo referencia en
              tablas). Pre calificación = (ventas contables + IVA + IIBB) ÷ 3
              × coeficiente × 1,1575.
            </p>

            <MetricRow label="Tipo empresa" value={computed.preCalificacion.tipoEmpresaLabel} />
            <MetricRow label="Coeficiente" value={formatCoeficienteDisplay(computed.preCalificacion.coeficiente)} />
            <MetricRow
              label="Promedio ventas mensuales"
              value={
                preCalLoading
                  ? "Calculando…"
                  : formatCreditAmount(computed.preCalificacion.promedioVentas)
              }
            />
            <HighlightRow
              label="Pre calificación"
              value={
                preCalLoading
                  ? "Calculando…"
                  : computed.preCalificacion.preCalificacion != null
                    ? formatCreditAmount(
                        computed.preCalificacion.preCalificacion
                      )
                    : "—"
              }
            />

            {preCalLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Calculando pre-calificación…
              </div>
            ) : (
              <PrequalificationExcelTable
                tablas={computed.preCalificacion.tablas ?? {}}
                rubroLabels={computed.preCalificacion.rubroLabels}
              />
            )}

          </>
        )}

        {/* ===== DECISIÓN ===== */}
        {activeTab === "decision" && (
          <>
            <CoverageRequirementsBlock
              decision={coverageDecision}
              tipoOperacion={tipoOperacion}
              onTipoOperacionChange={setTipoOperacion}
              fechaInicioActividadInput={fechaInicioActividadInput}
              onFechaInicioActividadChange={(value) => {
                setFechaInicioActividadInput(value)
                setFechaInicioActividad(fechaInicioActividadFromInput(value))
              }}
              facturasAlContado={facturasAlContado}
              onFacturasAlContadoChange={setFacturasAlContado}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
              <div className="bg-muted border border-border rounded-xl px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Score financiero
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {computed.resumenEjecutivo.scoreFinanciero ?? "—"}/100
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Riesgo financiero · {estadoGeneralLabel}
                </p>
              </div>
              <div className="bg-muted border border-border rounded-xl px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Score NOSIS
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {nosisData?.scoreNosis != null ? `${nosisData.scoreNosis}/100` : "—"}
                </p>
                <p className={`text-[10px] mt-0.5 ${nosisSem?.className ?? "text-muted-foreground"}`}>
                  {nosisData?.estadoComercial
                    ? `Estado NOSIS · ${nosisData.estadoComercial}`
                    : `Riesgo comercial · ${nosisData?.comentarioAutomatico ?? "Sin informe"}`}
                </p>
                {nosisData?.scoreSourceLabel && (
                  <p className="text-[10px] text-muted-foreground">
                    Fuente: {nosisData.scoreSourceLabel}
                  </p>
                )}
              </div>
            </div>

            {muestraMontoCredito && (
              <div className="rounded-xl border border-green-500/35 bg-green-500/5 px-4 py-3 mb-5 space-y-2">
                <label
                  htmlFor="monto-credito-otorgado"
                  className="text-xs font-semibold uppercase tracking-wider text-green-300/90 block"
                >
                  Monto de crédito otorgado
                </label>
                <input
                  id="monto-credito-otorgado"
                  type="text"
                  inputMode="decimal"
                  value={montoCreditoInput}
                  onChange={(e) => handleMontoCreditoInputChange(e.target.value)}
                  placeholder="Ej.: 1500000"
                  className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-lg font-bold text-foreground tabular-nums placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/40"
                  autoFocus
                />
              </div>
            )}

            <label
              htmlFor="recomendacion-analista"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block"
            >
              Recomendación del analista
            </label>
            <textarea
              id="recomendacion-analista"
              rows={4}
              value={recomendacionAnalista}
              onChange={(e) => setRecomendacionAnalista(e.target.value)}
              placeholder="Ej.: Cliente con adecuada capacidad económica…"
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-y min-h-[90px]"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <UploadButton
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => {
                  setRecomendacionAnalista(
                    `Cliente con capacidad económica ${estadoGeneralLabel.toLowerCase()}. Se recomienda operación ${tipoOperacionLabel.toLowerCase()}.`
                  )
                }}
              >
                Generar borrador
              </UploadButton>
              <UploadButton
                variant="primary"
                size="sm"
                disabled={saving || loadingSaved}
                onClick={handleSave}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" />
                ) : (
                  <Save className="w-3.5 h-3.5 inline mr-1" />
                )}
                Guardar
              </UploadButton>
            </div>
          </>
        )}
      </div>
      </>
      ) : null}
      </CreditAnalysisCockpit>
    </div>
  )
}
