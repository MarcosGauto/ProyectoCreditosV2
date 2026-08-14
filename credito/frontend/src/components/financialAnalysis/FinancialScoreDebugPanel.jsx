"use client"

import { useState } from "react"
import { Bug, ChevronDown, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatFinancialScore } from "@/lib/creditPolicy/financialScoreEngine"

/**
 * @param {{ debug: ReturnType<import("@/lib/creditPolicy/financialScoreEngine").buildFinancialScoreDebug> | null | undefined }} props
 */
export function FinancialScoreDebugPanel({ debug }) {
  const [open, setOpen] = useState(true)

  if (!debug) {
    return null
  }

  return (
    <div className="mx-5 mb-4 rounded-xl border border-sky-500/30 bg-sky-500/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-sky-500/10 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-sky-200">
          <Bug className="w-4 h-4 shrink-0" />
          Depuración — Scoring
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-sky-300 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-sky-300 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-sky-500/20">
          {debug.discrepancias.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                Advertencias
              </p>
              <ul className="text-xs text-amber-100/90 space-y-1 list-disc list-inside">
                {debug.discrepancias.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <section className="space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Política activa
            </h4>
            <div className="text-xs text-foreground/80 font-mono bg-muted rounded-lg border border-border px-3 py-2 space-y-1">
              <p>ID: {debug.policy.id} · v{debug.policy.version}</p>
              <p>
                Pesos estado general: Financiero{" "}
                {debug.policy.estadoGeneral.scoreFinancieroPeso}% · NOSIS{" "}
                {debug.policy.estadoGeneral.scoreNosisPeso}%
              </p>
              <p>
                Suma pesos indicadores (activo + impacta):{" "}
                {debug.policy.pesoScoringTotal}% — {debug.policy.weightValidation.message}
              </p>
              <p>
                Suma ponderación general: {debug.policy.generalWeightValidation.total}% —{" "}
                {debug.policy.generalWeightValidation.message}
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Indicadores en el cálculo
            </h4>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[700px] text-xs">
                <thead>
                  <tr className="bg-card text-muted-foreground">
                    <th className="text-left px-3 py-2 font-semibold">Indicador</th>
                    <th className="text-right px-3 py-2 font-semibold">Valor</th>
                    <th className="text-center px-3 py-2 font-semibold">Estado</th>
                    <th className="text-right px-3 py-2 font-semibold">Peso</th>
                    <th className="text-right px-3 py-2 font-semibold">Puntaje base</th>
                    <th className="text-right px-3 py-2 font-semibold">Aporte</th>
                  </tr>
                </thead>
                <tbody>
                  {debug.indicadoresEnCalculo.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border bg-muted"
                    >
                      <td className="px-3 py-2 text-foreground">{row.nombre}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground/80">
                        {row.valorDisplay}
                      </td>
                      <td className="px-3 py-2 text-center text-foreground/80">
                        {row.estadoLabel}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground/80">
                        {row.peso}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground/80">
                        {row.puntajeBase}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground/80">
                        {row.aporte.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-sky-500/30 bg-sky-500/5 font-semibold">
                    <td colSpan={5} className="px-3 py-2.5 text-right text-sky-200">
                      Total (Σ aportes)
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-sky-200">
                      {debug.sumaAportes.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-sky-300/80 mb-1">
                Score financiero
              </p>
              <p className="text-2xl font-black text-sky-200 tabular-nums">
                {formatFinancialScore(debug.scoreFinanciero)}
                <span className="text-sm font-normal text-muted-foreground"> / 100</span>
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Estado general (solo UI / textos)
              </p>
              <p className="text-lg font-bold text-foreground">
                {debug.estadoGeneral.label}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Liquidez: {debug.estadoGeneral.semaforoLiquidez} · Endeudamiento:{" "}
                {debug.estadoGeneral.semaforoEndeudamiento}
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Score general ponderado
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-muted px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Score financiero
                </p>
                <p className="text-xl font-black text-foreground tabular-nums">
                  {formatFinancialScore(debug.scoreGeneral?.scoreFinanciero)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Peso {debug.scoreGeneral?.pesoFinanciero ?? "—"}% → aporte{" "}
                  {debug.scoreGeneral?.aporteFinanciero?.toFixed(2) ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Score NOSIS
                </p>
                <p className="text-xl font-black text-foreground tabular-nums">
                  {formatFinancialScore(debug.scoreNosis)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Peso {debug.scoreGeneral?.pesoNosis ?? "—"}% → aporte{" "}
                  {debug.scoreGeneral?.aporteNosis?.toFixed(2) ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-violet-300/80 mb-1">
                  Score general final
                </p>
                <p className="text-2xl font-black text-violet-200 tabular-nums">
                  {formatFinancialScore(debug.scoreGeneralPonderado)}
                  <span className="text-sm font-normal text-muted-foreground"> / 100</span>
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Fórmula score financiero
            </h4>
            <div className="space-y-2 text-xs font-mono text-foreground/80">
              <p className="rounded-lg bg-muted border border-border px-3 py-2">
                {debug.formula}
              </p>
              <p className="rounded-lg bg-muted border border-border px-3 py-2 break-all">
                {debug.formulaExpandida}
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Fórmula score general
            </h4>
            <div className="space-y-2 text-xs font-mono text-foreground/80">
              <p className="rounded-lg bg-muted border border-border px-3 py-2">
                {debug.scoreGeneral?.formula}
              </p>
              <p className="rounded-lg bg-muted border border-border px-3 py-2 break-all">
                {debug.scoreGeneral?.formulaExpandida}
              </p>
            </div>
          </section>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log("[SCORE FINANCIERO DEBUG]", debug)
              }}
            >
              Volcar a consola
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
