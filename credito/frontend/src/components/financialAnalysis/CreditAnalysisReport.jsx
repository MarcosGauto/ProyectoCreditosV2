"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  FileDown,
  Loader2,
  Scale,
  ShieldAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { getResultadoCoberturaBadgeClass } from "@/lib/coverageRequirements"
import { SHOW_CAPACIDAD_FINANCIERA } from "@/config/creditAnalysis"
import { generateProfessionalCreditReport } from "@/lib/generateProfessionalCreditReport"
import { generateCreditReportPdf } from "@/lib/generateCreditReportPdf"
import { loadCreditReportContext } from "@/lib/loadCreditReportContext"

/**
 * @param {{ title: string; children: React.ReactNode; className?: string }} props
 */
function ReportSection({ title, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-5 shadow-lg ${className}`}
    >
      <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 mb-3 pb-2 border-b border-border">
        {title}
      </h3>
      {children}
    </section>
  )
}

/**
 * @param {{ label: string; value: string | null | undefined }} props
 */
function KpiChip({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-muted px-4 py-3 min-w-[140px] flex-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-sm font-bold text-foreground tabular-nums break-words">
        {value || "—"}
      </p>
    </div>
  )
}

/**
 * @param {{
 *   cuit: string;
 *   analista?: string;
 *   versionId?: string | null;
 *   historical?: boolean;
 *   autoDownloadPdf?: boolean;
 * }} props
 */
export function CreditAnalysisReport({
  cuit,
  analista,
  versionId = null,
  historical = false,
  autoDownloadPdf = false,
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [context, setContext] = useState(
    /** @type {Awaited<ReturnType<typeof loadCreditReportContext>> | null} */ (
      null
    )
  )
  const [pdfLoading, setPdfLoading] = useState(false)
  const autoDownloadDoneRef = useRef(false)

  const load = useCallback(async () => {
    if (!cuit) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const ctx = await loadCreditReportContext(cuit, {
        analista,
        mode: historical && versionId ? "historical" : "live",
        versionId: versionId ?? undefined,
      })
      setContext(ctx)
    } catch (err) {
      console.error("[CreditAnalysisReport] load", err)
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo generar el informe crediticio."
      )
      setContext(null)
    } finally {
      setLoading(false)
    }
  }, [cuit, analista, historical, versionId])

  useEffect(() => {
    load()
  }, [load])

  const report = useMemo(
    () => (context ? generateProfessionalCreditReport(context) : null),
    [context]
  )

  const handlePdf = useCallback(async () => {
    if (!report) return
    setPdfLoading(true)
    try {
      await generateCreditReportPdf(report)
    } catch (err) {
      console.error("[CreditAnalysisReport] pdf", err)
    } finally {
      setPdfLoading(false)
    }
  }, [report])

  useEffect(() => {
    if (!autoDownloadPdf || !report || autoDownloadDoneRef.current) {
      return
    }
    autoDownloadDoneRef.current = true
    void handlePdf()
  }, [autoDownloadPdf, report, handlePdf])

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-12 text-center">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Generando análisis crediticio automático…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-10 text-center">
        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-400" />
        <h2 className="text-xl font-bold text-foreground mb-2">
          No se pudo generar el informe
        </h2>
        <p className="text-foreground/80 max-w-lg mx-auto mb-6">
          {error ?? "Error desconocido."}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <Button variant="primary" onClick={load}>Reintentar</Button>
        </div>
      </div>
    )
  }

  const resultadoKey = String(
    context?.savedAnalysis?.resultadoCobertura ?? ""
  )
  const resultadoBadge = getResultadoCoberturaBadgeClass(resultadoKey)

  const fechaStr = (() => {
    try {
      return new Date(report.meta.fecha).toLocaleString("es-AR", {
        dateStyle: "long",
        timeStyle: "short",
      })
    } catch {
      return String(report.meta.fecha)
    }
  })()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-red-400/80 mb-1">
              Análisis crediticio automático profesional
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight">
              {report.meta.razonSocial}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              CUIT {report.meta.cuit} · {fechaStr}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Analista: {report.meta.analista}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="primary"
            disabled={pdfLoading}
            onClick={handlePdf}
          >
            {pdfLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            Generar Informe PDF
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push(`/dashboard/analysis/${cuit}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al legajo
          </Button>
        </div>
      </div>

      <div className={`rounded-2xl border-2 px-6 py-5 text-center ${resultadoBadge}`}>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
          Resultado final
        </p>
        <p className="text-2xl font-black">{report.conclusionFinal.resultado}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <KpiChip label="Nivel de riesgo" value={report.resumenEjecutivo.kpis.nivelRiesgo} />
        {SHOW_CAPACIDAD_FINANCIERA && (
          <KpiChip
            label="Capacidad financiera"
            value={
              report.resumenEjecutivo.kpis.capacidadFinanciera ??
              report.resumenEjecutivo.kpis.creditoSugerido
            }
          />
        )}
        <KpiChip
          label="Crédito otorgado"
          value={report.resumenEjecutivo.kpis.creditoOtorgado ?? "—"}
        />
        <KpiChip label="Pre calificación" value={report.resumenEjecutivo.kpis.preCalificacion} />
        <KpiChip label="Score financiero" value={report.resumenEjecutivo.kpis.scoreFinanciero} />
        <KpiChip label="Score NOSIS" value={report.resumenEjecutivo.kpis.scoreNosis} />
        <KpiChip label="Situación BCRA" value={report.resumenEjecutivo.kpis.situacionBcra} />
      </div>

      <ReportSection title="1. Resumen ejecutivo">
        <p className="text-sm text-foreground/80 leading-relaxed">
          {report.resumenEjecutivo.narrativa}
        </p>
      </ReportSection>

      {SHOW_CAPACIDAD_FINANCIERA && report.capacidadFinanciera && (
        <ReportSection title="Capacidad financiera">
          <p className="text-sm text-foreground/80 leading-relaxed mb-4">
            {report.capacidadFinanciera.descripcion}
          </p>
          <p className="text-2xl font-bold text-foreground tabular-nums mb-4">
            {report.capacidadFinanciera.monto}
          </p>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Detalle
          </p>
          <ul className="space-y-2 text-sm text-foreground/80 mb-4">
            <li>
              • Capacidad por patrimonio:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {report.capacidadFinanciera.porPatrimonio}
              </span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                {report.capacidadFinanciera.formulaPatrimonio}
              </span>
            </li>
            <li>
              • Capacidad por flujo IVA:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {report.capacidadFinanciera.porFlujo}
              </span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                {report.capacidadFinanciera.formulaFlujo}
              </span>
            </li>
          </ul>
          <p className="text-[11px] text-muted-foreground mb-3">
            {report.capacidadFinanciera.formulaTotal}
          </p>
          {report.capacidadFinanciera.criterioLimitante && (
            <p className="text-sm font-semibold text-amber-300/90">
              Criterio limitante: {report.capacidadFinanciera.criterioLimitante}
            </p>
          )}
        </ReportSection>
      )}

      <ReportSection title="2. Análisis financiero">
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          {report.analisisFinanciero.narrativa}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {Object.entries(report.analisisFinanciero.indicadores).map(([key, val]) => (
            <div
              key={key}
              className="rounded-lg border border-border bg-muted px-3 py-2"
            >
              <span className="text-muted-foreground block capitalize">
                {key.replace(/([A-Z])/g, " $1")}
              </span>
              <span className="text-foreground font-semibold tabular-nums">{val}</span>
            </div>
          ))}
        </div>
      </ReportSection>

      {report.analisisFinanciero.analisisIA &&
        typeof report.analisisFinanciero.analisisIA === "object" && (
        <ReportSection title="Análisis IA">
          <div className="space-y-2 text-sm text-foreground/80 leading-relaxed">
            {(report.analisisFinanciero.analisisIA.lineas?.length
              ? report.analisisFinanciero.analisisIA.lineas
              : String(report.analisisFinanciero.analisisIA.texto ?? "")
                  .split("\n")
                  .filter(Boolean)
            ).map((linea) => (
              <p key={linea}>{linea}</p>
            ))}
          </div>
        </ReportSection>
      )}

      <ReportSection title="3. Análisis comercial">
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          {report.analisisComercial.narrativa}
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <KpiChip
            label="Consultas (6 meses)"
            value={report.analisisComercial.consultasTotal}
          />
          <KpiChip
            label="Promedio mensual"
            value={report.analisisComercial.consultasPromedio}
          />
        </div>
      </ReportSection>

      <ReportSection title="4. Análisis NOSIS">
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          {report.analisisNosis.narrativa}
        </p>
        {"scoreNosis" in report.analisisNosis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <KpiChip label="Score NOSIS" value={report.analisisNosis.scoreNosis} />
            <KpiChip
              label="Cheques rechazados"
              value={report.analisisNosis.chequesRechazados}
            />
            <KpiChip
              label="Cheques abonados"
              value={report.analisisNosis.chequesAbonados}
            />
            <KpiChip
              label="Cheques pendientes"
              value={report.analisisNosis.chequesPendientes}
            />
            <KpiChip
              label="Monto pendiente"
              value={report.analisisNosis.montoPendiente}
            />
            <KpiChip
              label="Juicios / concursos"
              value={report.analisisNosis.juiciosConcursos}
            />
          </div>
        )}
      </ReportSection>

      <ReportSection title="5. Análisis BCRA">
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          {report.analisisBcra.narrativa}
        </p>
        {"situacion" in report.analisisBcra && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <KpiChip label="Clasificación" value={report.analisisBcra.situacion} />
            <KpiChip label="Deuda total" value={report.analisisBcra.deudaTotal} />
            <KpiChip label="Entidades" value={report.analisisBcra.entidades} />
            <KpiChip
              label="Con atraso"
              value={report.analisisBcra.entidadesConAtraso}
            />
          </div>
        )}
      </ReportSection>

      <ReportSection title="6. Análisis fiscal">
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          {report.analisisFiscal.narrativa}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <KpiChip label="Ventas IVA" value={report.analisisFiscal.ventasIva} />
          <KpiChip label="Ventas IIBB" value={report.analisisFiscal.ventasIibb} />
          <KpiChip
            label="Ventas balance"
            value={report.analisisFiscal.ventasBalance}
          />
          <KpiChip
            label="Promedio ventas"
            value={report.analisisFiscal.promedioVentas}
          />
        </div>
      </ReportSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReportSection title="7. Fortalezas">
          <ul className="space-y-2">
            {report.fortalezas.map((item) => (
              <li
                key={item}
                className="text-sm text-green-300/90 flex gap-2 leading-snug"
              >
                <span className="text-green-500 shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </ReportSection>

        <ReportSection title="8. Debilidades">
          <ul className="space-y-2">
            {report.debilidades.map((item) => (
              <li
                key={item}
                className="text-sm text-amber-200/90 flex gap-2 leading-snug"
              >
                <span className="text-amber-500 shrink-0">!</span>
                {item}
              </li>
            ))}
          </ul>
        </ReportSection>
      </div>

      <ReportSection title="9. Conclusión final">
        <p className="text-sm text-foreground leading-relaxed">
          {report.conclusionFinal.narrativa}
        </p>
        {report.conclusionFinal.recomendacionAnalista && (
          <div className="mt-4 rounded-xl border border-border bg-muted px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Observaciones del analista
            </p>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">
              {report.conclusionFinal.recomendacionAnalista}
            </p>
          </div>
        )}
      </ReportSection>
    </div>
  )
}
