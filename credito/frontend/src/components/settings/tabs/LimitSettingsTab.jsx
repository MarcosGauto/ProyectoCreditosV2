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
 *   profile: import("@/lib/settings").PolicyProfile;
 *   validation: import("@/lib/settings").SettingsValidationResult;
 *   onChangeProfile: (updater: (p: import("@/lib/settings").PolicyProfile) => import("@/lib/settings").PolicyProfile) => void;
 *   onSave: () => void;
 *   onRestore: () => void;
 * }} props
 */
export function LimitSettingsTab({
  profile,
  validation,
  onChangeProfile,
  onSave,
  onRestore,
}) {
  const limit = profile.limit

  /**
   * @param {(l: typeof limit) => typeof limit} updater
   */
  const patchLimit = (updater) => {
    onChangeProfile((p) => ({
      ...p,
      limit: updater({ ...p.limit }),
    }))
  }

  return (
    <SettingsTabShell
      title="Motor de Límite"
      description="Solo configuración. No ejecuta el algoritmo de límite."
      errors={validation.errors}
      warnings={validation.warnings}
      onRestore={onRestore}
      onSave={onSave}
      canSave={validation.valid}
    >
      <SettingsSection title="Factor comercial">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField
            label="Factor comercial (% sobre ventas promedio)"
            hint="Default de producto: 20 %"
          >
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              className={settingsInputClassName}
              value={limit.commercialFactorPercent}
              onChange={(e) =>
                patchLimit((l) => {
                  l.commercialFactorPercent = Number(e.target.value)
                  return l
                })
              }
            />
          </SettingsField>
          <SettingsField label="Moneda">
            <input
              className={settingsInputClassName}
              value={limit.currency}
              onChange={(e) =>
                patchLimit((l) => {
                  l.currency = e.target.value
                  return l
                })
              }
            />
          </SettingsField>
          <SettingsField label="Métrica base">
            <input
              className={settingsInputClassName}
              value={limit.baseMetric.label}
              onChange={(e) =>
                patchLimit((l) => {
                  l.baseMetric = { ...l.baseMetric, label: e.target.value }
                  return l
                })
              }
            />
          </SettingsField>
          <SettingsField label="Techo comercial global (opcional)">
            <input
              type="number"
              className={settingsInputClassName}
              value={limit.globalCommercialCeiling ?? ""}
              placeholder="Sin techo"
              onChange={(e) =>
                patchLimit((l) => {
                  l.globalCommercialCeiling =
                    e.target.value === "" ? null : Number(e.target.value)
                  return l
                })
              }
            />
          </SettingsField>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            className={settingsCheckboxClassName}
            checked={limit.requireScoreOk}
            onChange={(e) =>
              patchLimit((l) => {
                l.requireScoreOk = e.target.checked
                return l
              })
            }
          />
          Requerir score OK para sugerir límite
        </label>
      </SettingsSection>

      <SettingsSection title="Multiplicadores por categoría">
        <p className="text-xs text-muted-foreground -mt-2">
          Multiplicador = % del límite comercial (ventas × factor comercial).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-2 font-medium">Activa</th>
                <th className="py-2 pr-2 font-medium">Cat.</th>
                <th className="py-2 pr-2 font-medium">Etiqueta</th>
                <th className="py-2 pr-2 font-medium">Mult. %</th>
                <th className="py-2 pr-2 font-medium">Plazo</th>
                <th className="py-2 font-medium">Deny</th>
              </tr>
            </thead>
            <tbody>
              {limit.categoryMultipliers.map((row, index) => (
                <tr key={row.id} className="border-b border-border/80">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      className={settingsCheckboxClassName}
                      checked={row.enabled}
                      onChange={(e) =>
                        patchLimit((l) => {
                          l.categoryMultipliers = l.categoryMultipliers.map(
                            (r, i) =>
                              i === index
                                ? { ...r, enabled: e.target.checked }
                                : r
                          )
                          return l
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2 text-foreground/80">{row.categoryCode}</td>
                  <td className="py-2 pr-2">
                    <input
                      className={settingsInputClassName}
                      value={row.label ?? ""}
                      onChange={(e) =>
                        patchLimit((l) => {
                          l.categoryMultipliers = l.categoryMultipliers.map(
                            (r, i) =>
                              i === index ? { ...r, label: e.target.value } : r
                          )
                          return l
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      className={settingsInputClassName}
                      value={row.multiplier ?? ""}
                      disabled={row.deny}
                      onChange={(e) =>
                        patchLimit((l) => {
                          l.categoryMultipliers = l.categoryMultipliers.map(
                            (r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    multiplier:
                                      e.target.value === ""
                                        ? null
                                        : Number(e.target.value),
                                  }
                                : r
                          )
                          return l
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      className={settingsInputClassName}
                      value={row.termMonths ?? ""}
                      placeholder="—"
                      onChange={(e) =>
                        patchLimit((l) => {
                          l.categoryMultipliers = l.categoryMultipliers.map(
                            (r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    termMonths:
                                      e.target.value === ""
                                        ? null
                                        : Number(e.target.value),
                                  }
                                : r
                          )
                          return l
                        })
                      }
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      className={settingsCheckboxClassName}
                      checked={row.deny}
                      onChange={(e) =>
                        patchLimit((l) => {
                          l.categoryMultipliers = l.categoryMultipliers.map(
                            (r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    deny: e.target.checked,
                                    multiplier: e.target.checked
                                      ? 0
                                      : r.multiplier,
                                  }
                                : r
                          )
                          return l
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

      <SettingsSection title="Restricciones">
        <div className="space-y-3">
          {limit.restrictions.map((rule, index) => (
            <div
              key={rule.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    className={settingsCheckboxClassName}
                    checked={rule.enabled}
                    onChange={(e) =>
                      patchLimit((l) => {
                        l.restrictions = l.restrictions.map((r, i) =>
                          i === index ? { ...r, enabled: e.target.checked } : r
                        )
                        return l
                      })
                    }
                  />
                  Activa
                </label>
                <input
                  className={`${settingsInputClassName} flex-1 min-w-[12rem]`}
                  value={rule.name}
                  onChange={(e) =>
                    patchLimit((l) => {
                      l.restrictions = l.restrictions.map((r, i) =>
                        i === index ? { ...r, name: e.target.value } : r
                      )
                      return l
                    })
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SettingsField label="Stage">
                  <input
                    className={settingsInputClassName}
                    value={rule.stage}
                    onChange={(e) =>
                      patchLimit((l) => {
                        l.restrictions = l.restrictions.map((r, i) =>
                          i === index ? { ...r, stage: e.target.value } : r
                        )
                        return l
                      })
                    }
                  />
                </SettingsField>
                <SettingsField label="Acción">
                  <input
                    className={settingsInputClassName}
                    value={rule.effect.action}
                    onChange={(e) =>
                      patchLimit((l) => {
                        l.restrictions = l.restrictions.map((r, i) =>
                          i === index
                            ? {
                                ...r,
                                effect: { ...r.effect, action: e.target.value },
                              }
                            : r
                        )
                        return l
                      })
                    }
                  />
                </SettingsField>
                <SettingsField label="Prioridad">
                  <input
                    type="number"
                    className={settingsInputClassName}
                    value={rule.priority}
                    onChange={(e) =>
                      patchLimit((l) => {
                        l.restrictions = l.restrictions.map((r, i) =>
                          i === index
                            ? { ...r, priority: Number(e.target.value) }
                            : r
                        )
                        return l
                      })
                    }
                  />
                </SettingsField>
              </div>
              <SettingsField label="Mensaje">
                <input
                  className={settingsInputClassName}
                  value={rule.effect.message ?? ""}
                  onChange={(e) =>
                    patchLimit((l) => {
                      l.restrictions = l.restrictions.map((r, i) =>
                        i === index
                          ? {
                              ...r,
                              effect: {
                                ...r.effect,
                                message: e.target.value || null,
                              },
                            }
                          : r
                      )
                      return l
                    })
                  }
                />
              </SettingsField>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Garantías requeridas">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-2 font-medium">Código</th>
                <th className="py-2 pr-2 font-medium">Etiqueta</th>
                <th className="py-2 pr-2 font-medium">Requerida</th>
                <th className="py-2 pr-2 font-medium">Severidad</th>
                <th className="py-2 font-medium">Categorías</th>
              </tr>
            </thead>
            <tbody>
              {limit.guarantees.map((g, index) => (
                <tr key={g.code} className="border-b border-border/80">
                  <td className="py-2 pr-2 text-muted-foreground">{g.code}</td>
                  <td className="py-2 pr-2">
                    <input
                      className={settingsInputClassName}
                      value={g.label}
                      onChange={(e) =>
                        patchLimit((l) => {
                          l.guarantees = l.guarantees.map((row, i) =>
                            i === index ? { ...row, label: e.target.value } : row
                          )
                          return l
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      className={settingsCheckboxClassName}
                      checked={g.required}
                      onChange={(e) =>
                        patchLimit((l) => {
                          l.guarantees = l.guarantees.map((row, i) =>
                            i === index
                              ? { ...row, required: e.target.checked }
                              : row
                          )
                          return l
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      className={settingsSelectClassName}
                      value={g.severity}
                      onChange={(e) =>
                        patchLimit((l) => {
                          l.guarantees = l.guarantees.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  severity: /** @type {"info"|"warning"|"critical"} */ (
                                    e.target.value
                                  ),
                                }
                              : row
                          )
                          return l
                        })
                      }
                    >
                      <option value="info">info</option>
                      <option value="warning">warning</option>
                      <option value="critical">critical</option>
                    </select>
                  </td>
                  <td className="py-2">
                    <input
                      className={settingsInputClassName}
                      value={(g.categoryCodes ?? []).join(", ")}
                      placeholder="todas"
                      onChange={(e) =>
                        patchLimit((l) => {
                          const raw = e.target.value.trim()
                          l.guarantees = l.guarantees.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  categoryCodes: raw
                                    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
                                    : null,
                                }
                              : row
                          )
                          return l
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

      <SettingsSection title="Reglas de revisión manual">
        <div className="grid gap-4 sm:grid-cols-3">
          <SettingsField label="Frecuencia (días)">
            <input
              type="number"
              className={settingsInputClassName}
              value={limit.review.frequencyDays ?? ""}
              onChange={(e) =>
                patchLimit((l) => {
                  l.review = {
                    ...l.review,
                    frequencyDays:
                      e.target.value === "" ? null : Number(e.target.value),
                  }
                  return l
                })
              }
            />
          </SettingsField>
          <SettingsField label="Etiqueta">
            <input
              className={settingsInputClassName}
              value={limit.review.frequencyLabel ?? ""}
              onChange={(e) =>
                patchLimit((l) => {
                  l.review = {
                    ...l.review,
                    frequencyLabel: e.target.value || null,
                  }
                  return l
                })
              }
            />
          </SettingsField>
          <SettingsField label="Obligatoria">
            <label className="flex items-center gap-2 h-10 text-foreground/80">
              <input
                type="checkbox"
                className={settingsCheckboxClassName}
                checked={limit.review.mandatory}
                onChange={(e) =>
                  patchLimit((l) => {
                    l.review = { ...l.review, mandatory: e.target.checked }
                    return l
                  })
                }
              />
              Revisión obligatoria
            </label>
          </SettingsField>
        </div>
        {limit.review.byCategory.length > 0 ? (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2 font-medium">Cat.</th>
                  <th className="py-2 pr-2 font-medium">Días</th>
                  <th className="py-2 pr-2 font-medium">Etiqueta</th>
                  <th className="py-2 font-medium">Obligatoria</th>
                </tr>
              </thead>
              <tbody>
                {limit.review.byCategory.map((row, index) => (
                  <tr key={row.categoryCode} className="border-b border-border/80">
                    <td className="py-2 pr-2 text-foreground/80">{row.categoryCode}</td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        className={settingsInputClassName}
                        value={row.frequencyDays ?? ""}
                        onChange={(e) =>
                          patchLimit((l) => {
                            l.review = {
                              ...l.review,
                              byCategory: l.review.byCategory.map((r, i) =>
                                i === index
                                  ? {
                                      ...r,
                                      frequencyDays:
                                        e.target.value === ""
                                          ? null
                                          : Number(e.target.value),
                                    }
                                  : r
                              ),
                            }
                            return l
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className={settingsInputClassName}
                        value={row.frequencyLabel ?? ""}
                        onChange={(e) =>
                          patchLimit((l) => {
                            l.review = {
                              ...l.review,
                              byCategory: l.review.byCategory.map((r, i) =>
                                i === index
                                  ? {
                                      ...r,
                                      frequencyLabel: e.target.value || null,
                                    }
                                  : r
                              ),
                            }
                            return l
                          })
                        }
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        className={settingsCheckboxClassName}
                        checked={row.mandatory}
                        onChange={(e) =>
                          patchLimit((l) => {
                            l.review = {
                              ...l.review,
                              byCategory: l.review.byCategory.map((r, i) =>
                                i === index
                                  ? { ...r, mandatory: e.target.checked }
                                  : r
                              ),
                            }
                            return l
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SettingsSection>
    </SettingsTabShell>
  )
}
