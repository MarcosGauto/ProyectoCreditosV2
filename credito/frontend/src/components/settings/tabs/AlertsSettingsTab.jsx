"use client"

import {
  SettingsField,
  SettingsSection,
  SettingsTabShell,
  settingsCheckboxClassName,
  settingsInputClassName,
  settingsSelectClassName,
} from "@/components/settings/SettingsTabShell"
import { SettingsHelpButton } from "@/components/settings/help/SettingsHelpButton"

/** @typedef {import("@/lib/settings").AlertChannelKind} AlertChannelKind */
/** @typedef {import("@/lib/settings").AlertChannelSettings} AlertChannelSettings */

/**
 * Presentación amigable — no altera ids ni valores persistidos.
 * @param {AlertChannelKind | string} kind
 */
function channelKindLabel(kind) {
  switch (kind) {
    case "in_app":
      return "Dentro del sistema"
    case "email":
      return "Correo electrónico (Próximamente)"
    case "webhook":
      return "Webhook"
    case "slack":
      return "Slack"
    case "custom":
      return "Personalizado"
    default:
      return "Canal"
  }
}

/**
 * @param {string} severity
 */
function severityLabel(severity) {
  switch (severity) {
    case "info":
      return "Informativa"
    case "warning":
      return "Advertencia"
    case "critical":
      return "Crítica"
    default:
      return severity
  }
}

/**
 * Título amigable por código interno (solo UI).
 * @param {string} eventCode
 * @param {string} fallbackName
 */
function eventDisplayName(eventCode, fallbackName) {
  /** @type {Record<string, string>} */
  const map = {
    score_below_threshold: "Puntaje por debajo del umbral",
    score_category_change: "Cambio de categoría de puntaje",
    limit_denied: "Límite denegado",
    limit_reduced: "Límite reducido",
    confidence_low: "Confianza baja",
    coverage_missing: "Cobertura insuficiente",
    documentation_incomplete: "Documentación incompleta",
    manual_review_required: "Revisión manual requerida",
    policy_published: "Política publicada",
  }
  return map[eventCode] || fallbackName || "Alerta"
}

/**
 * @param {AlertChannelSettings} ch
 */
function channelDisplayLabel(ch) {
  return channelKindLabel(ch.kind)
}

/**
 * @param {{
 *   profile: import("@/lib/settings").PolicyProfile;
 *   validation: import("@/lib/settings").SettingsValidationResult;
 *   onChangeProfile: (updater: (p: import("@/lib/settings").PolicyProfile) => import("@/lib/settings").PolicyProfile) => void;
 *   onSave: () => void;
 *   onRestore: () => void;
 *   onCancel?: () => void;
 *   canSave?: boolean;
 *   isDirty?: boolean;
 *   saving?: boolean;
 *   onOpenHelp?: (payload: { docId: string; section: string }) => void;
 * }} props
 */
export function AlertsSettingsTab({
  profile,
  validation,
  onChangeProfile,
  onSave,
  onRestore,
  onCancel,
  canSave = true,
  isDirty = false,
  saving = false,
  onOpenHelp,
}) {
  const alerts = profile.alerts

  /**
   * @param {(a: typeof alerts) => typeof alerts} updater
   */
  const patchAlerts = (updater) => {
    onChangeProfile((p) => ({
      ...p,
      alerts: updater({ ...p.alerts }),
    }))
  }

  /**
   * @param {number} eventIndex
   * @param {string} channelId
   * @param {boolean} checked
   */
  const toggleEventChannel = (eventIndex, channelId, checked) => {
    patchAlerts((a) => {
      a.events = a.events.map((row, i) => {
        if (i !== eventIndex) return row
        const set = new Set(row.channelIds)
        if (checked) set.add(channelId)
        else set.delete(channelId)
        return { ...row, channelIds: [...set] }
      })
      return a
    })
  }

  return (
    <SettingsTabShell
      title="Alertas"
      description="Definí qué avisos se generan para el equipo y por qué medio se muestran. El envío por correo estará disponible más adelante."
      errors={validation.errors}
      warnings={validation.warnings}
      onRestore={onRestore}
      onSave={onSave}
      onCancel={onCancel}
      canSave={canSave}
      isDirty={isDirty}
      saving={saving}
    >
      <SettingsSection
        title="Módulo"
        actions={
          <SettingsHelpButton
            topicId="ajustes-alertas"
            onOpenHelp={onOpenHelp}
          />
        }
      >
        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            className={settingsCheckboxClassName}
            checked={alerts.enabled}
            onChange={(e) =>
              patchAlerts((a) => {
                a.enabled = e.target.checked
                return a
              })
            }
          />
          Alertas habilitadas
        </label>
      </SettingsSection>

      <SettingsSection title="Canales de notificación">
        <div className="space-y-3">
          {alerts.channels.map((ch, index) => (
            <div
              key={ch.id}
              className="grid gap-3 sm:grid-cols-3 rounded-xl border border-border bg-card p-4"
            >
              <label className="flex items-center gap-2 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  className={settingsCheckboxClassName}
                  checked={ch.enabled}
                  onChange={(e) =>
                    patchAlerts((a) => {
                      a.channels = a.channels.map((c, i) =>
                        i === index ? { ...c, enabled: e.target.checked } : c
                      )
                      return a
                    })
                  }
                />
                Activo
              </label>
              <SettingsField label="Canal">
                <p className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground/80">
                  {channelDisplayLabel(ch)}
                </p>
              </SettingsField>
              <SettingsField label="Tipo">
                <select
                  className={settingsSelectClassName}
                  value={ch.kind}
                  onChange={(e) =>
                    patchAlerts((a) => {
                      a.channels = a.channels.map((c, i) =>
                        i === index
                          ? {
                              ...c,
                              kind: /** @type {AlertChannelKind} */ (
                                e.target.value
                              ),
                            }
                          : c
                      )
                      return a
                    })
                  }
                >
                  <option value="in_app">Dentro del sistema</option>
                  <option value="email">
                    Correo electrónico (Próximamente)
                  </option>
                  <option value="webhook">Webhook</option>
                  <option value="slack">Slack</option>
                  <option value="custom">Personalizado</option>
                </select>
              </SettingsField>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Eventos de alerta">
        <div className="space-y-4">
          {alerts.events.map((ev, index) => (
            <div
              key={ev.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    className={settingsCheckboxClassName}
                    checked={ev.enabled}
                    onChange={(e) =>
                      patchAlerts((a) => {
                        a.events = a.events.map((row, i) =>
                          i === index
                            ? { ...row, enabled: e.target.checked }
                            : row
                        )
                        return a
                      })
                    }
                  />
                  Habilitada
                </label>
                <p className="flex-1 min-w-[12rem] text-sm font-medium text-foreground">
                  {eventDisplayName(String(ev.eventCode), ev.name)}
                </p>
              </div>

              <SettingsField label="Nombre visible">
                <input
                  className={settingsInputClassName}
                  value={ev.name}
                  onChange={(e) =>
                    patchAlerts((a) => {
                      a.events = a.events.map((row, i) =>
                        i === index ? { ...row, name: e.target.value } : row
                      )
                      return a
                    })
                  }
                />
              </SettingsField>

              <div className="grid gap-3 sm:grid-cols-2">
                <SettingsField label="Severidad">
                  <select
                    className={settingsSelectClassName}
                    value={ev.severity}
                    onChange={(e) =>
                      patchAlerts((a) => {
                        a.events = a.events.map((row, i) =>
                          i === index
                            ? {
                                ...row,
                                severity: /** @type {"info"|"warning"|"critical"} */ (
                                  e.target.value
                                ),
                              }
                            : row
                        )
                        return a
                      })
                    }
                  >
                    <option value="info">{severityLabel("info")}</option>
                    <option value="warning">{severityLabel("warning")}</option>
                    <option value="critical">
                      {severityLabel("critical")}
                    </option>
                  </select>
                </SettingsField>
                <SettingsField
                  label="Puntaje máximo para generar la alerta"
                  hint="Dejá vacío si esta alerta no usa umbral de puntaje"
                >
                  <input
                    type="number"
                    className={settingsInputClassName}
                    value={
                      typeof ev.thresholds.scoreMax === "number"
                        ? ev.thresholds.scoreMax
                        : ""
                    }
                    onChange={(e) =>
                      patchAlerts((a) => {
                        a.events = a.events.map((row, i) => {
                          if (i !== index) return row
                          const thresholds = { ...row.thresholds }
                          if (e.target.value === "") {
                            delete thresholds.scoreMax
                          } else {
                            thresholds.scoreMax = Number(e.target.value)
                          }
                          return { ...row, thresholds }
                        })
                        return a
                      })
                    }
                  />
                </SettingsField>
              </div>

              <SettingsField label="Canales de envío">
                <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-muted/50 px-3 py-3">
                  {alerts.channels.map((ch) => {
                    const checked = ev.channelIds.includes(ch.id)
                    return (
                      <label
                        key={ch.id}
                        className="flex items-center gap-2 text-sm text-foreground/80"
                      >
                        <input
                          type="checkbox"
                          className={settingsCheckboxClassName}
                          checked={checked}
                          onChange={(e) =>
                            toggleEventChannel(index, ch.id, e.target.checked)
                          }
                        />
                        {channelDisplayLabel(ch)}
                      </label>
                    )
                  })}
                  {alerts.channels.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No hay canales configurados.
                    </p>
                  ) : null}
                </div>
              </SettingsField>
            </div>
          ))}
        </div>
      </SettingsSection>
    </SettingsTabShell>
  )
}
