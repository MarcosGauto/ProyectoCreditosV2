"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, RotateCcw, Save, Settings2 } from "lucide-react"
import { useAuth } from "@/app/context/AuthContext"
import { useCreditPolicy } from "@/hooks/useCreditPolicy"
import { resolveCreditPolicy } from "@/lib/creditPolicy/resolveCreditPolicy"
import {
  getScoringWeightValidation,
  getGeneralScoreWeightValidation,
  SCORING_WEIGHT_SAVE_BLOCKED_MESSAGE,
  GENERAL_SCORE_WEIGHT_SAVE_BLOCKED_MESSAGE,
} from "@/lib/creditPolicy/creditPolicyScoring"
import { POLICY_TEXT_PLACEHOLDER_HINTS } from "@/lib/creditPolicy/defaultPolicyTextos"
import { Button } from "@/components/ui/button"

/** @typedef {import("@/lib/creditPolicy/creditPolicyTypes").CreditPolicyIndicator} CreditPolicyIndicator */

/**
 * @param {CreditPolicyIndicator[]} rows
 * @param {number} index
 * @param {Partial<CreditPolicyIndicator>} patch
 */
function patchIndicator(rows, index, patch) {
  return rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
}

function formatUpdatedAt(iso) {
  if (!iso) {
    return "—"
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleString("es-AR")
}

/**
 * @param {{
 *   label: string;
 *   fields: Array<{ key: string; label: string }>;
 *   values: Record<string, string>;
 *   onChange: (key: string, value: string) => void;
 * }} props
 */
function TextosSection({ label, fields, values, onChange }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h2>
      <div className="space-y-4">
        {fields.map(({ key, label: fieldLabel }) => (
          <label key={key} className="block space-y-1 text-sm">
            <span className="text-muted-foreground">{fieldLabel}</span>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed"
              value={values[key] ?? ""}
              onChange={(e) => onChange(key, e.target.value)}
            />
          </label>
        ))}
      </div>
    </section>
  )
}

export function CreditPolicyConfigPage() {
  const { user } = useAuth()
  const { policy, loading, saving, error, savePolicy, restoreDefaults } =
    useCreditPolicy({ userEmail: user?.email ?? null })

  const [draft, setDraft] = useState(
    /** @type {ReturnType<typeof resolveCreditPolicy> | null} */ (null)
  )
  const [message, setMessage] = useState(/** @type {string | null} */ (null))
  const [activeTab, setActiveTab] = useState(/** @type {"reglas" | "textos"} */ ("reglas"))

  const working = draft ?? policy

  const indicadores = useMemo(
    () => working.indicadoresFinancieros ?? [],
    [working.indicadoresFinancieros]
  )

  const weightValidation = useMemo(
    () => getScoringWeightValidation(indicadores),
    [indicadores]
  )

  const generalWeightValidation = useMemo(
    () => getGeneralScoreWeightValidation(working.estadoGeneral),
    [working.estadoGeneral]
  )

  const canSave =
    weightValidation.isValid && generalWeightValidation.isValid && !saving

  const saveBlockedMessage = !weightValidation.isValid
    ? SCORING_WEIGHT_SAVE_BLOCKED_MESSAGE
    : !generalWeightValidation.isValid
      ? GENERAL_SCORE_WEIGHT_SAVE_BLOCKED_MESSAGE
      : undefined

  const updateDraft = (updater) => {
    setDraft((prev) => {
      const base = resolveCreditPolicy(prev ?? policy)
      return updater(base)
    })
  }

  const updateTextosSection = (section, key, value) => {
    updateDraft((p) => ({
      ...p,
      textos: {
        ...p.textos,
        [section]: {
          ...p.textos[section],
          [key]: value,
        },
      },
    }))
  }

  const handleSave = async () => {
    setMessage(null)
    if (!weightValidation.isValid) {
      setMessage(SCORING_WEIGHT_SAVE_BLOCKED_MESSAGE)
      return
    }
    if (!generalWeightValidation.isValid) {
      setMessage(GENERAL_SCORE_WEIGHT_SAVE_BLOCKED_MESSAGE)
      return
    }
    try {
      await savePolicy(working)
      setDraft(null)
      setMessage("Política crediticia guardada correctamente.")
    } catch {
      setMessage("Error al guardar la política.")
    }
  }

  const handleReset = async () => {
    setMessage(null)
    try {
      await restoreDefaults()
      setDraft(null)
      setMessage("Valores por defecto restaurados.")
    } catch {
      setMessage("Error al restaurar valores por defecto.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando configuración crediticia…
      </div>
    )
  }

  return (
    <div className="text-foreground space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Settings2 className="w-5 h-5 text-red-400" />
            <h1 className="text-2xl font-bold">Configuración Crediticia</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Motor parametrizable de scoring, cobertura, capacidad y dictámenes
            automáticos.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Última modificación: {formatUpdatedAt(policy.updatedAt)} · Usuario:{" "}
            {policy.updatedBy ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/dashboard">Volver al dashboard</Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => void handleReset()}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar defaults
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!canSave}
            title={saveBlockedMessage}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar cambios
          </Button>
        </div>
      </div>

      {(error || message) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-green-500/30 bg-green-500/10 text-green-200"
          }`}
        >
          {error ?? message}
        </div>
      )}

      {(!weightValidation.isValid || !generalWeightValidation.isValid) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 space-y-1">
          {!weightValidation.isValid && (
            <p>{SCORING_WEIGHT_SAVE_BLOCKED_MESSAGE}</p>
          )}
          {!generalWeightValidation.isValid && (
            <p>{GENERAL_SCORE_WEIGHT_SAVE_BLOCKED_MESSAGE}</p>
          )}
        </div>
      )}

      <div className="flex gap-2 border-b border-border pb-1">
        {[
          { id: "reglas", label: "Reglas y scoring" },
          { id: "textos", label: "Textos automáticos" },
        ].map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(/** @type {"reglas" | "textos"} */ (tab.id))}
            className={
              activeTab === tab.id
                ? "bg-secondary text-foreground border-zinc-600"
                : "text-muted-foreground"
            }
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "reglas" && (
        <>
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Score Propio
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Único score del sistema para decisiones y límites. Modelo{" "}
                {working.scorePropio?.scoreModel ?? "SC-1.0"}. NOSIS no participa
                del cálculo en el MVP.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-3 text-sm opacity-80">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={working.estadoGeneral.incluirNosisEnCalculo === true}
                disabled
                title="Disponible en una versión futura"
                onChange={() => {}}
              />
              <span>
                <span className="text-foreground/80">
                  Incluir NOSIS en el cálculo del score
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Deshabilitado en el MVP. Reservado para reactivar NOSIS como
                  factor opcional vía configuración.
                </span>
              </span>
            </label>

            {working.estadoGeneral.incluirNosisEnCalculo === true ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">
                      Peso Score Financiero (%)
                    </span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2"
                      value={working.estadoGeneral.scoreFinancieroPeso}
                      onChange={(e) =>
                        updateDraft((p) => ({
                          ...p,
                          estadoGeneral: {
                            ...p.estadoGeneral,
                            scoreFinancieroPeso: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">Peso Score NOSIS (%)</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2"
                      value={working.estadoGeneral.scoreNosisPeso}
                      onChange={(e) =>
                        updateDraft((p) => ({
                          ...p,
                          estadoGeneral: {
                            ...p.estadoGeneral,
                            scoreNosisPeso: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </label>
                </div>
                <div
                  className={`rounded-lg border px-3 py-2 text-xs max-w-xl ${
                    generalWeightValidation.status === "valid"
                      ? "border-green-500/30 bg-green-500/10 text-green-200"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                  }`}
                >
                  <p>Peso total configurado: {generalWeightValidation.total}%</p>
                  <p className="mt-1">{generalWeightValidation.message}</p>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-200 max-w-xl">
                <p>Score Propio = 100% score financiero (indicadores de abajo).</p>
                <p className="mt-1 text-muted-foreground">
                  {generalWeightValidation.message}
                </p>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Escalas de clasificación (0–100)
              </h3>
              <p className="text-xs text-muted-foreground">
                Umbrales mínimos por categoría. No modifican el algoritmo de
                cálculo; solo la etiqueta de clasificación.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
                {[
                  ["excelenteMin", "Excelente ≥"],
                  ["muyBuenoMin", "Muy bueno ≥"],
                  ["aceptableMin", "Aceptable ≥"],
                  ["riesgoMin", "Riesgo ≥"],
                ].map(([key, label]) => (
                  <label key={key} className="space-y-1 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2"
                      value={working.scorePropio?.escalas?.[key] ?? 0}
                      onChange={(e) =>
                        updateDraft((p) => ({
                          ...p,
                          scorePropio: {
                            ...p.scorePropio,
                            escalas: {
                              ...p.scorePropio.escalas,
                              [key]: Number(e.target.value),
                            },
                          },
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Por debajo de “Riesgo” → Crítico.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Indicadores financieros
              </h2>
              <div
                className={`rounded-lg border px-3 py-2 text-xs ${
                  weightValidation.status === "valid"
                    ? "border-green-500/30 bg-green-500/10 text-green-200"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                }`}
              >
                <p>Peso total configurado: {weightValidation.total}%</p>
                <p className="mt-1">{weightValidation.message}</p>
                {weightValidation.status === "under" && (
                  <p className="mt-1">
                    Disponible para asignar: {weightValidation.disponible}%
                  </p>
                )}
                <p className="mt-1 text-muted-foreground">
                  Solo indicadores con Activo e Impacta Score activos.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Indicador</th>
                    <th className="py-2 pr-3">Fórmula</th>
                    <th className="py-2 pr-3">Fuente</th>
                    <th className="py-2 pr-3">Bueno</th>
                    <th className="py-2 pr-3">Medio</th>
                    <th className="py-2 pr-3"> % scoring general</th>
                    <th className="py-2 pr-3">Impacta Score</th>
                    <th className="py-2 pr-3">Activo</th>
                  </tr>
                </thead>
                <tbody>
                  {indicadores.map((row, index) => (
                    <tr key={row.id} className="border-b border-border/80">
                      <td className="py-2 pr-3 font-medium">{row.nombre}</td>
                      <td className="py-2 pr-3">
                        <input
                          className="w-full min-w-[120px] rounded border border-border bg-card px-2 py-1"
                          value={row.formula}
                          onChange={(e) =>
                            updateDraft((p) => ({
                              ...p,
                              indicadoresFinancieros: patchIndicator(
                                p.indicadoresFinancieros,
                                index,
                                { formula: e.target.value }
                              ),
                            }))
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          className="w-full min-w-[90px] rounded border border-border bg-card px-2 py-1"
                          value={row.fuente}
                          onChange={(e) =>
                            updateDraft((p) => ({
                              ...p,
                              indicadoresFinancieros: patchIndicator(
                                p.indicadoresFinancieros,
                                index,
                                { fuente: e.target.value }
                              ),
                            }))
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          step="any"
                          className="w-20 rounded border border-border bg-card px-2 py-1"
                          value={row.good}
                          onChange={(e) =>
                            updateDraft((p) => ({
                              ...p,
                              indicadoresFinancieros: patchIndicator(
                                p.indicadoresFinancieros,
                                index,
                                { good: Number(e.target.value) }
                              ),
                            }))
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          step="any"
                          className="w-20 rounded border border-border bg-card px-2 py-1"
                          value={row.medium}
                          onChange={(e) =>
                            updateDraft((p) => ({
                              ...p,
                              indicadoresFinancieros: patchIndicator(
                                p.indicadoresFinancieros,
                                index,
                                { medium: Number(e.target.value) }
                              ),
                            }))
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          className="w-16 rounded border border-border bg-card px-2 py-1"
                          value={row.peso}
                          onChange={(e) =>
                            updateDraft((p) => ({
                              ...p,
                              indicadoresFinancieros: patchIndicator(
                                p.indicadoresFinancieros,
                                index,
                                { peso: Number(e.target.value) }
                              ),
                            }))
                          }
                        />
                      </td>
                      <td className="py-2 pr-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.impactaScore}
                          onChange={(e) =>
                            updateDraft((p) => ({
                              ...p,
                              indicadoresFinancieros: patchIndicator(
                                p.indicadoresFinancieros,
                                index,
                                { impactaScore: e.target.checked }
                              ),
                            }))
                          }
                        />
                      </td>
                      <td className="py-2 pr-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.activo}
                          onChange={(e) =>
                            updateDraft((p) => ({
                              ...p,
                              indicadoresFinancieros: patchIndicator(
                                p.indicadoresFinancieros,
                                index,
                                { activo: e.target.checked }
                              ),
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Reglas de cobertura
              </h2>
              {[
                ["antiguedadMinimaAnios", "Antigüedad mínima (años)"],
                ["mesesSinAtrasos", "Meses sin atrasos BCRA"],
                ["facturasContadoMinimas", "Facturas al contado mínimas"],
              ].map(([key, label]) => (
                <label key={key} className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2"
                    value={working.reglasCobertura[key]}
                    onChange={(e) =>
                      updateDraft((p) => ({
                        ...p,
                        reglasCobertura: {
                          ...p.reglasCobertura,
                          [key]: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={working.reglasCobertura.exigirSinChequesRechazados}
                  onChange={(e) =>
                    updateDraft((p) => ({
                      ...p,
                      reglasCobertura: {
                        ...p.reglasCobertura,
                        exigirSinChequesRechazados: e.target.checked,
                      },
                    }))
                  }
                />
                Exigir sin cheques rechazados
              </label>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Reglas de crédito (%)
              </h2>
              {[
                ["porcentajeCapacidadVentas", "Capacidad por ventas"],
                ["porcentajeCapacidadPatrimonio", "Capacidad por patrimonio"],
                ["porcentajeCapacidadFlujoIVA", "Capacidad por flujo IVA"],
              ].map(([key, label]) => (
                <label key={key} className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2"
                    value={working.reglasCredito[key] ?? 0}
                    onChange={(e) =>
                      updateDraft((p) => ({
                        ...p,
                        reglasCredito: {
                          ...p.reglasCredito,
                          [key]: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </label>
              ))}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                NOSIS (información externa)
              </h2>
              <p className="text-xs text-muted-foreground">
                Umbrales solo para el estado Aprobado / Observado. No afectan el
                Score Propio.
              </p>
              {[
                ["scoreAprobadoMinimo", "Score aprobado mínimo"],
                ["scoreObservadoMinimo", "Score observado mínimo"],
              ].map(([key, label]) => (
                <label key={key} className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2"
                    value={working.configuracionNosis[key]}
                    onChange={(e) =>
                      updateDraft((p) => ({
                        ...p,
                        configuracionNosis: {
                          ...p.configuracionNosis,
                          [key]: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </label>
              ))}
            </section>
          </div>
        </>
      )}

      {activeTab === "textos" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground/80 mb-1">Variables dinámicas</p>
            <p>
              Podés usar placeholders en los textos:{" "}
              {POLICY_TEXT_PLACEHOLDER_HINTS.join(", ")}
            </p>
          </div>

          <TextosSection
            label="Dictamen patrimonial"
            fields={[
              { key: "bueno", label: "Bueno" },
              { key: "medio", label: "Medio" },
              { key: "riesgoso", label: "Riesgoso" },
            ]}
            values={working.textos.dictamenPatrimonial}
            onChange={(key, value) =>
              updateTextosSection("dictamenPatrimonial", key, value)
            }
          />

          <TextosSection
            label="Comentario balance"
            fields={[
              { key: "bueno", label: "Bueno" },
              { key: "medio", label: "Medio" },
              { key: "riesgoso", label: "Riesgoso" },
            ]}
            values={working.textos.comentarioBalance}
            onChange={(key, value) =>
              updateTextosSection("comentarioBalance", key, value)
            }
          />

          <TextosSection
            label="Conclusión evolutiva"
            fields={[
              { key: "crecimiento", label: "Crecimiento" },
              { key: "estable", label: "Estable" },
              { key: "caida", label: "Caída" },
            ]}
            values={working.textos.conclusionEvolutiva}
            onChange={(key, value) =>
              updateTextosSection("conclusionEvolutiva", key, value)
            }
          />

          <TextosSection
            label="Resultado final"
            fields={[
              { key: "aprobado", label: "Aprobado" },
              { key: "observado", label: "Observado" },
              { key: "riesgoso", label: "Riesgoso" },
              { key: "sinCobertura", label: "Sin cobertura" },
              {
                key: "nominadoConCobertura",
                label: "Nominado con cobertura",
              },
              {
                key: "discrecionalConCobertura",
                label: "Discrecional con cobertura",
              },
            ]}
            values={working.textos.resultadoFinal}
            onChange={(key, value) =>
              updateTextosSection("resultadoFinal", key, value)
            }
          />
        </div>
      )}
    </div>
  )
}
