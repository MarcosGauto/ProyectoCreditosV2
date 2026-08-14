"use client"

import {
  SettingsField,
  SettingsSection,
  SettingsTabShell,
  settingsCheckboxClassName,
  settingsInputClassName,
  settingsSelectClassName,
} from "@/components/settings/SettingsTabShell"

/**
 * @param {{
 *   ai: import("@/lib/settings").AiSettings;
 *   validation: import("@/lib/settings").SettingsValidationResult;
 *   onChangeAi: (updater: (ai: import("@/lib/settings").AiSettings) => import("@/lib/settings").AiSettings) => void;
 *   onSave: () => void;
 *   onRestore: () => void;
 * }} props
 */
export function AiSettingsTab({
  ai,
  validation,
  onChangeAi,
  onSave,
  onRestore,
}) {
  return (
    <SettingsTabShell
      title="IA"
      description="Nivel de explicación, recomendaciones y prompts (placeholder). Sin ejecución."
      errors={validation.errors}
      warnings={validation.warnings}
      onRestore={onRestore}
      onSave={onSave}
      canSave={validation.valid}
    >
      <SettingsSection title="General">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              className={settingsCheckboxClassName}
              checked={ai.enabled}
              onChange={(e) =>
                onChangeAi((prev) => ({
                  ...prev,
                  enabled: e.target.checked,
                }))
              }
            />
            Módulo IA habilitado
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              className={settingsCheckboxClassName}
              checked={ai.recommendationsEnabled}
              onChange={(e) =>
                onChangeAi((prev) => ({
                  ...prev,
                  recommendationsEnabled: e.target.checked,
                }))
              }
            />
            Recomendaciones automáticas (sugerir, no aplicar)
          </label>
          <SettingsField label="Nivel de explicación">
            <select
              className={settingsSelectClassName}
              value={ai.explanationLevel}
              onChange={(e) =>
                onChangeAi((prev) => ({
                  ...prev,
                  explanationLevel: /** @type {import("@/lib/settings").AiExplanationLevel} */ (
                    e.target.value
                  ),
                }))
              }
            >
              <option value="brief">brief</option>
              <option value="standard">standard</option>
              <option value="detailed">detailed</option>
              <option value="audit">audit</option>
            </select>
          </SettingsField>
          <SettingsField label="Referencia de modelo (opcional)">
            <input
              className={settingsInputClassName}
              value={ai.modelRef ?? ""}
              placeholder="ej. org-default"
              onChange={(e) =>
                onChangeAi((prev) => ({
                  ...prev,
                  modelRef: e.target.value || null,
                }))
              }
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection title="Recomendaciones">
        <div className="space-y-3">
          {ai.recommendationToggles.map((tog, index) => (
            <div
              key={tog.id}
              className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <label className="flex items-center gap-2 text-sm text-foreground/80 pt-1">
                <input
                  type="checkbox"
                  className={settingsCheckboxClassName}
                  checked={tog.enabled}
                  onChange={(e) =>
                    onChangeAi((prev) => ({
                      ...prev,
                      recommendationToggles: prev.recommendationToggles.map(
                        (t, i) =>
                          i === index
                            ? { ...t, enabled: e.target.checked }
                            : t
                      ),
                    }))
                  }
                />
              </label>
              <div className="flex-1 min-w-[12rem] space-y-1">
                <input
                  className={settingsInputClassName}
                  value={tog.label}
                  onChange={(e) =>
                    onChangeAi((prev) => ({
                      ...prev,
                      recommendationToggles: prev.recommendationToggles.map(
                        (t, i) =>
                          i === index ? { ...t, label: e.target.value } : t
                      ),
                    }))
                  }
                />
                {tog.description ? (
                  <p className="text-xs text-muted-foreground">{tog.description}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Prompts (placeholder)">
        <div className="space-y-4">
          {ai.prompts.map((prompt, index) => (
            <div
              key={prompt.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    className={settingsCheckboxClassName}
                    checked={prompt.enabled}
                    onChange={(e) =>
                      onChangeAi((prev) => ({
                        ...prev,
                        prompts: prev.prompts.map((p, i) =>
                          i === index
                            ? { ...p, enabled: e.target.checked }
                            : p
                        ),
                      }))
                    }
                  />
                  Habilitado
                </label>
                <input
                  className={`${settingsInputClassName} flex-1 min-w-[12rem]`}
                  value={prompt.name}
                  onChange={(e) =>
                    onChangeAi((prev) => ({
                      ...prev,
                      prompts: prev.prompts.map((p, i) =>
                        i === index ? { ...p, name: e.target.value } : p
                      ),
                    }))
                  }
                />
              </div>
              <SettingsField
                label="Plantilla"
                hint="Placeholders futuros: {{score}}, {{trace}}, {{razonSocial}}, …"
              >
                <textarea
                  rows={4}
                  className={settingsInputClassName}
                  value={prompt.template}
                  onChange={(e) =>
                    onChangeAi((prev) => ({
                      ...prev,
                      prompts: prev.prompts.map((p, i) =>
                        i === index ? { ...p, template: e.target.value } : p
                      ),
                    }))
                  }
                />
              </SettingsField>
            </div>
          ))}
        </div>
      </SettingsSection>
    </SettingsTabShell>
  )
}
