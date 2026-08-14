"use client"

import { useMemo, useState } from "react"
import { Scale } from "lucide-react"

import { buildHistoricalViewModel } from "@/lib/creditAnalysis/buildHistoricalViewModel"
import {
  formatCreditAmount,
  formatRatioPercent,
} from "@/lib/creditAnalysisEngine"
import { getNosisExternalStatusLabel } from "@/lib/creditScore/creditScoreContract"
import { ComportamientoComercialCard } from "@/components/financialAnalysis/ComportamientoComercialCard"
import { CoverageRequirementsBlock } from "@/components/financialAnalysis/CoverageRequirementsBlock"
import {
  formatFechaInicioActividadInput,
  getResultadoCoberturaBadgeClass,
  getResultadoFinalDisplayEmoji,
  resultadoCoberturaPermiteMonto,
} from "@/lib/coverageRequirements"
import { PrequalificationExcelTable } from "@/components/financialAnalysis/PrequalificationExcelTable"
import {
  formatBalanceRatio,
  formatBalanceVariationPercent,
} from "@/lib/balanceAnalysis"
import { ESTADO_ANALISIS_BALANCE_LABEL } from "@/lib/contribuyenteBalanceContext"
import { formatCoeficienteDisplay } from "@/lib/scoring/prequalification"
import { FinancialScoreDebugPanel } from "@/components/financialAnalysis/FinancialScoreDebugPanel"
import { BalanceValidationChecklist } from "@/components/financialAnalysis/BalanceValidationChecklist"
import { NosisDetectedInfo } from "@/components/financialAnalysis/NosisDetectedInfo"
import {
  BalanceEvolutionCard,
  ESTADO_GENERAL_LABEL,
  formatAnalysisDate,
  hasAnalisisIAContent,
  HighlightRow,
  MetricRow,
  PatrimonioNetoEvolutionSummary,
  TAB_KEYS,
  TAB_LABELS,
} from "@/components/financialAnalysis/creditAnalysisResultUi"
import { SEMAPHORE_STYLES } from "@/config/creditAnalysis"
import { Sc1ComparisonBlock } from "@/components/workspace/Sc1ComparisonBlock"
import { toHistorySc1Presentation } from "@/components/financialAnalysis/historySc1Presentation"

/**
 * Vista histórica 100% aislada: solo snapshot congelado.
 *
 * @param {{
 *   cuit: string;
 *   historicalVersion: Record<string, unknown>;
 * }} props
 */
export function HistoricalCreditAnalysisResult({ cuit, historicalVersion }) {
  const [activeTab, setActiveTab] = useState("resumen")

  const vm = useMemo(
    () => buildHistoricalViewModel(historicalVersion, cuit),
    [historicalVersion, cuit]
  )

  const computed = vm.computed
  const preCalificacion = computed.preCalificacion ?? vm.asyncPreCal ?? {}
  const nosisData = vm.nosisAnalysis
  const financieroTab = vm.financieroTab
  const balanceAnalysis = vm.balanceAnalysis ?? {}
  const coverageDecision = vm.coverageDecision

  const estadoSem = SEMAPHORE_STYLES[computed.resumenEjecutivo?.estadoGeneral]
  const nosisConfig =
    vm.policySnapshot?.data?.configuracionNosis ?? null
  const nosisExternalStatus = getNosisExternalStatusLabel(
    nosisData?.scoreNosis,
    nosisConfig
  )
  const scorePropio = computed.resumenEjecutivo?.scoreFinanciero ?? null
  const estadoGeneralLabel =
    ESTADO_GENERAL_LABEL[computed.resumenEjecutivo?.estadoGeneral] ?? "Sin evaluar"

  const sc1Presentation = useMemo(
    () => toHistorySc1Presentation(vm.sc1),
    [vm.sc1]
  )

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

  return (
    <div className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
      <div className="px-5 pt-5 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4 text-red-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base text-foreground leading-tight">
              Resultado del Análisis (histórico)
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Versión {vm.versionNumber ?? "—"} · snapshot congelado
            </p>
          </div>
        </div>
      </div>

      <div className="mx-5 mb-4 space-y-3">
        <div className={`rounded-2xl border-2 px-5 py-4 text-center ${resultadoFinalBadge}`}>
          <p className="text-[10px] uppercase tracking-widest opacity-70 mb-0.5">
            Resultado final
          </p>
          <p className="text-xl font-black tracking-wide leading-tight">
            {resultadoFinalEmoji} {resultadoFinalLabel}
          </p>
          {vm.resultadoFinalNarrativa && (
            <p className="text-sm mt-2 opacity-90 leading-relaxed max-w-2xl mx-auto">
              {vm.resultadoFinalNarrativa}
            </p>
          )}
        </div>

        {muestraMontoCredito && vm.montoCreditoOtorgado != null && vm.montoCreditoOtorgado > 0 && (
          <div className="rounded-2xl border-2 border-green-500/40 bg-green-500/10 px-5 py-4">
            <p className="text-[10px] uppercase tracking-widest text-green-300/80 mb-1">
              Crédito otorgado
            </p>
            <p className="text-2xl font-black text-foreground tabular-nums leading-snug">
              {formatCreditAmount(vm.montoCreditoOtorgado)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2.5">
          <div className="bg-muted border border-border rounded-2xl px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Pre calificación
            </p>
            <p className="text-base font-bold text-foreground tabular-nums break-all leading-snug">
              {formatCreditAmount(preCalificacion.preCalificacion)}
            </p>
          </div>
          <div className="bg-muted border border-border rounded-2xl px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Score propio
            </p>
            <p className="text-xl font-black text-foreground tabular-nums leading-snug">
              {scorePropio != null ? `${scorePropio} / 100` : "—"}
            </p>
            <p className={`text-sm font-bold mt-1 ${estadoSem?.className ?? "text-muted-foreground"}`}>
              {estadoSem?.emoji ?? "⚪"} {estadoGeneralLabel}
            </p>
          </div>
          <div className="bg-muted border border-border rounded-2xl px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Score NOSIS (externo)
            </p>
            <p className="text-xl font-black text-foreground tabular-nums leading-snug">
              {nosisData?.scoreNosis != null ? `${nosisData.scoreNosis} / 100` : "—"}
            </p>
            <p className="text-sm font-bold uppercase tracking-wide mt-1 text-foreground/80">
              {nosisExternalStatus}
            </p>
          </div>
        </div>
      </div>

      {vm.displayWarnings.length > 0 && (
        <div className="mx-5 mb-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-2.5">
          <ul className="text-[11px] text-amber-200/80 space-y-0.5 list-disc list-inside">
            {vm.displayWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-border">
        <div className="hidden sm:flex">
          {TAB_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex-1 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-center transition-colors ${
                activeTab === key
                  ? "text-red-400 border-b-2 border-red-500 bg-muted/40"
                  : "text-muted-foreground hover:text-foreground/80 border-b-2 border-transparent"
              }`}
            >
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>
        <div className="sm:hidden px-5 py-3">
          <select
            value={activeTab}
            onChange={(event) => setActiveTab(event.target.value)}
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground"
          >
            {TAB_KEYS.map((key) => (
              <option key={key} value={key}>
                {TAB_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-5 space-y-2.5">
        {activeTab === "resumen" && (
          <>
            <MetricRow label="CUIT" value={computed.resumenEjecutivo?.cuit || "—"} />
            <MetricRow label="Razón social" value={computed.resumenEjecutivo?.razonSocial} />
            <MetricRow label="Fecha de análisis" value={formatAnalysisDate(computed.resumenEjecutivo?.fechaAnalisis)} />
            <MetricRow label="Analista" value={computed.resumenEjecutivo?.analista ?? vm.publishedBy} />
            <MetricRow label="Tipo de operación" value={vm.tipoOperacionLabel} />
            <ComportamientoComercialCard data={vm.comportamientoComercial} cuit={cuit} />
          </>
        )}

        {activeTab === "financiero" && financieroTab && (
          <>
            <MetricRow label="Ventas Contable" value={formatCreditAmount(financieroTab.ventasContable)} />
            <MetricRow label="Ventas IVA" value={formatCreditAmount(financieroTab.ventasIva)} />
            <MetricRow label="Ventas IIBB" value={formatCreditAmount(financieroTab.ventasIibb)} />
            <MetricRow label="Patrimonio neto" value={formatCreditAmount(financieroTab.patrimonioNeto)} />
            <MetricRow label="Promedio" value={formatCreditAmount(financieroTab.promedio)} />
            <MetricRow
              label="Liquidez corriente"
              value={
                financieroTab.liquidezCorriente != null
                  ? financieroTab.liquidezCorriente.toLocaleString("es-AR", { maximumFractionDigits: 2 })
                  : "—"
              }
              semaphore={financieroTab.semaforos?.liquidez}
            />
            <MetricRow
              label="Endeudamiento"
              value={formatRatioPercent(financieroTab.endeudamiento)}
              semaphore={financieroTab.semaforos?.endeudamiento}
            />
          </>
        )}

        {activeTab === "analisisIA" && (
          hasAnalisisIAContent(vm.analisisBalanceIA) ? (
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-4 py-4 space-y-3 text-sm text-foreground">
              {(vm.analisisBalanceIA?.lineas ?? []).map((linea, index) => (
                <p key={`${index}-${linea.slice(0, 24)}`}>{linea}</p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin análisis IA guardado en esta versión.</p>
          )
        )}

        {activeTab === "balance" && balanceAnalysis.disponible && (
          <>
            <MetricRow
              label="Estado análisis balance"
              value={
                ESTADO_ANALISIS_BALANCE_LABEL[balanceAnalysis.estadoAnalisisBalance] ??
                balanceAnalysis.estadoAnalisisBalance
              }
            />
            {balanceAnalysis.mensajePrincipal && (
              <p className="text-sm text-foreground">{balanceAnalysis.mensajePrincipal}</p>
            )}
            {(balanceAnalysis.evolucionPatrimonial?.filas ?? []).map((fila) => (
              <BalanceEvolutionCard key={fila.label} {...fila} />
            ))}
            {balanceAnalysis.evolucionPatrimonial?.resumen && (
              <PatrimonioNetoEvolutionSummary resumen={balanceAnalysis.evolucionPatrimonial.resumen} />
            )}
          </>
        )}

        {activeTab === "nosis" && (
          <>
            <MetricRow label="Score NOSIS" value={nosisData?.scoreNosis != null ? `${nosisData.scoreNosis}/100` : "—"} />
            <MetricRow label="Estado" value={nosisExternalStatus} />
            <p className="text-[11px] text-muted-foreground py-1">
              Información externa — no participa del Score Propio.
            </p>
            <NosisDetectedInfo parsedData={nosisData?.parsedData} />
          </>
        )}

        {activeTab === "credito" && (
          <>
            <MetricRow label="Tipo empresa" value={preCalificacion.tipoEmpresaLabel ?? vm.tipoEmpresa ?? "—"} />
            <MetricRow label="Coeficiente" value={formatCoeficienteDisplay(preCalificacion.coeficiente)} />
            <HighlightRow
              label="Pre calificación"
              value={
                preCalificacion.preCalificacion != null
                  ? formatCreditAmount(preCalificacion.preCalificacion)
                  : "—"
              }
            />
            <PrequalificationExcelTable
              tablas={preCalificacion.tablas ?? {}}
              rubroLabels={preCalificacion.rubroLabels}
            />
          </>
        )}

        {activeTab === "decision" && (
          <>
            <CoverageRequirementsBlock
              decision={coverageDecision}
              tipoOperacion={vm.tipoOperacion}
              fechaInicioActividadInput={formatFechaInicioActividadInput(vm.fechaInicioActividad)}
              facturasAlContado={vm.facturasAlContado}
              readOnly
            />
            <MetricRow label="Monto otorgado" value={formatCreditAmount(vm.montoCreditoOtorgado)} />
            <div className="bg-muted border border-border rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Recomendación del analista
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {vm.recomendacionAnalista || "—"}
              </p>
            </div>
          </>
        )}
      </div>

      {sc1Presentation ? (
        <div className="mx-5 mb-4">
          <Sc1ComparisonBlock sc1={sc1Presentation} variant="history" />
        </div>
      ) : null}

      {computed.balanceValidation && (
        <div className="mx-3 mb-3 sm:mx-5 sm:mb-3">
          <BalanceValidationChecklist validation={computed.balanceValidation} />
        </div>
      )}

      <div className="mx-3 mb-3 sm:mx-5 sm:mb-4">
        <FinancialScoreDebugPanel debug={vm.scoreDebug} />
      </div>
    </div>
  )
}
