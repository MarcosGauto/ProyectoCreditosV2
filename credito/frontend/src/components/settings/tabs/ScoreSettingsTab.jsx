"use client"

import { useMemo } from "react"
import {
  SettingsField,
  SettingsSection,
  SettingsTabShell,
  settingsCheckboxClassName,
  settingsInputClassName,
} from "@/components/settings/SettingsTabShell"

/**
 * @param {{
 *   profile: import("@/lib/settings").PolicyProfile;
 *   validation: import("@/lib/settings").SettingsValidationResult;
 *   onChangeProfile: (updater: (p: import("@/lib/settings").PolicyProfile) => import("@/lib/settings").PolicyProfile) => void;
 *   onSave: () => void;
 *   onRestore: () => void;
 * }} props
 */
export function ScoreSettingsTab({
  profile,
  validation,
  onChangeProfile,
  onSave,
  onRestore,
}) {
  const score = profile.score
  const sub =
    score.subProfiles.find((s) => s.id === score.activeSubProfileId) ??
    score.subProfiles[0]

  const weightSum = useMemo(() => {
    if (!sub) return 0
    return sub.dimensionWeights
      .filter((d) => d.enabled)
      .reduce((acc, d) => acc + (Number(d.weight) || 0), 0)
  }, [sub])

  if (!sub) {
    return (
      <SettingsTabShell
        title="Score Propio"
        errors={validation.errors}
        warnings={validation.warnings}
        onRestore={onRestore}
        onSave={onSave}
        canSave={false}
      >
        <p className="text-sm text-muted-foreground">No hay sub-perfil de score configurado.</p>
      </SettingsTabShell>
    )
  }

  /**
   * @param {(s: typeof sub) => typeof sub} updater
   */
  const patchSub = (updater) => {
    onChangeProfile((p) => {
      const next = { ...p, score: { ...p.score } }
      next.score.subProfiles = next.score.subProfiles.map((s) =>
        s.id === sub.id ? updater({ ...s }) : s
      )
      return next
    })
  }

  return (
    <SettingsTabShell
      title="Score Propio"
      description="Pesos, bandas de categoría, confidence y escala. No ejecuta el Score Engine."
      errors={validation.errors}
      warnings={validation.warnings}
      onRestore={onRestore}
      onSave={onSave}
      canSave={validation.valid}
    >
      <SettingsSection title="Perfil">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField label="Nombre del perfil">
            <input
              className={settingsInputClassName}
              value={profile.meta.name}
              onChange={(e) =>
                onChangeProfile((p) => ({
                  ...p,
                  meta: { ...p.meta, name: e.target.value },
                }))
              }
            />
          </SettingsField>
          <SettingsField label="Nombre del sub-perfil de score">
            <input
              className={settingsInputClassName}
              value={sub.name}
              onChange={(e) =>
                patchSub((s) => {
                  s.name = e.target.value
                  return s
                })
              }
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection title="Escala del score">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField label="Score mínimo">
            <input
              type="number"
              className={settingsInputClassName}
              value={sub.scoreMin}
              onChange={(e) =>
                patchSub((s) => {
                  s.scoreMin = Number(e.target.value)
                  return s
                })
              }
            />
          </SettingsField>
          <SettingsField label="Score máximo">
            <input
              type="number"
              className={settingsInputClassName}
              value={sub.scoreMax}
              onChange={(e) =>
                patchSub((s) => {
                  s.scoreMax = Number(e.target.value)
                  return s
                })
              }
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection title="Confidence mínima">
        <div className="grid gap-4 sm:grid-cols-3">
          <SettingsField label="Confidence mínima (0–1)">
            <input
              type="number"
              step="0.01"
              min={0}
              max={1}
              className={settingsInputClassName}
              value={sub.confidence.confidenceMin}
              onChange={(e) =>
                patchSub((s) => {
                  s.confidence = {
                    ...s.confidence,
                    confidenceMin: Number(e.target.value),
                  }
                  return s
                })
              }
            />
          </SettingsField>
          <SettingsField label="Umbral media (0–1)">
            <input
              type="number"
              step="0.01"
              min={0}
              max={1}
              className={settingsInputClassName}
              value={sub.confidence.mediumThreshold}
              onChange={(e) =>
                patchSub((s) => {
                  s.confidence = {
                    ...s.confidence,
                    mediumThreshold: Number(e.target.value),
                  }
                  return s
                })
              }
            />
          </SettingsField>
          <SettingsField label="Umbral alta (0–1)">
            <input
              type="number"
              step="0.01"
              min={0}
              max={1}
              className={settingsInputClassName}
              value={sub.confidence.highThreshold}
              onChange={(e) =>
                patchSub((s) => {
                  s.confidence = {
                    ...s.confidence,
                    highThreshold: Number(e.target.value),
                  }
                  return s
                })
              }
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection title="Pesos por dimensión">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs text-muted-foreground">
            Solo dimensiones habilitadas cuentan para el total.
          </p>
          <p
            className={`text-sm font-medium ${
              Math.abs(weightSum - 100) < 0.01 ? "text-emerald-400" : "text-red-300"
            }`}
          >
            Suma: {weightSum.toFixed(2)} %
            {Math.abs(weightSum - 100) < 0.01 ? " ✓" : " (debe ser 100 %)"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-3 font-medium">Activa</th>
                <th className="py-2 pr-3 font-medium">Dimensión</th>
                <th className="py-2 pr-3 font-medium">Dominio</th>
                <th className="py-2 font-medium w-28">Peso %</th>
              </tr>
            </thead>
            <tbody>
              {sub.dimensionWeights.map((dim, index) => (
                <tr key={dim.dimensionId} className="border-b border-border/80">
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      className={settingsCheckboxClassName}
                      checked={dim.enabled}
                      onChange={(e) =>
                        patchSub((s) => {
                          s.dimensionWeights = s.dimensionWeights.map((d, i) =>
                            i === index ? { ...d, enabled: e.target.checked } : d
                          )
                          return s
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-3 text-foreground">{dim.label}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{dim.domain}</td>
                  <td className="py-2">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      className={settingsInputClassName}
                      value={dim.weight}
                      disabled={!dim.enabled}
                      onChange={(e) =>
                        patchSub((s) => {
                          s.dimensionWeights = s.dimensionWeights.map((d, i) =>
                            i === index
                              ? { ...d, weight: Number(e.target.value) }
                              : d
                          )
                          return s
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>

      <SettingsSection title="Bandas de categorías">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-2 font-medium">Código</th>
                <th className="py-2 pr-2 font-medium">Etiqueta</th>
                <th className="py-2 pr-2 font-medium">Min</th>
                <th className="py-2 font-medium">Max</th>
              </tr>
            </thead>
            <tbody>
              {sub.categories.map((cat, index) => (
                <tr key={cat.id} className="border-b border-border/80">
                  <td className="py-2 pr-2">
                    <input
                      className={settingsInputClassName}
                      value={cat.code}
                      onChange={(e) =>
                        patchSub((s) => {
                          s.categories = s.categories.map((c, i) =>
                            i === index ? { ...c, code: e.target.value } : c
                          )
                          return s
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className={settingsInputClassName}
                      value={cat.label}
                      onChange={(e) =>
                        patchSub((s) => {
                          s.categories = s.categories.map((c, i) =>
                            i === index ? { ...c, label: e.target.value } : c
                          )
                          return s
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      className={settingsInputClassName}
                      value={cat.min}
                      onChange={(e) =>
                        patchSub((s) => {
                          s.categories = s.categories.map((c, i) =>
                            i === index
                              ? { ...c, min: Number(e.target.value) }
                              : c
                          )
                          return s
                        })
                      }
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      className={settingsInputClassName}
                      value={cat.max}
                      onChange={(e) =>
                        patchSub((s) => {
                          s.categories = s.categories.map((c, i) =>
                            i === index
                              ? { ...c, max: Number(e.target.value) }
                              : c
                          )
                          return s
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>
    </SettingsTabShell>
  )
}
