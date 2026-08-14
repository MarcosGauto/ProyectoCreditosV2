"use client"

import {
  SettingsField,
  SettingsSection,
  SettingsTabShell,
  settingsCheckboxClassName,
  settingsInputClassName,
} from "@/components/settings/SettingsTabShell"
import { SettingsHelpButton } from "@/components/settings/help/SettingsHelpButton"

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
export function DocumentationSettingsTab({
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
  const docs = profile.documentation

  /**
   * @param {(d: typeof docs) => typeof docs} updater
   */
  const patchDocs = (updater) => {
    onChangeProfile((p) => ({
      ...p,
      documentation: updater({ ...p.documentation }),
    }))
  }

  return (
    <SettingsTabShell
      title="Documentación"
      description="Documentos mínimos requeridos y requisitos por tipo de cliente."
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
        title="Requisitos mínimos (todas las empresas)"
        actions={
          <SettingsHelpButton
            topicId="ajustes-documentacion"
            onOpenHelp={onOpenHelp}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-2 font-medium">Req.</th>
                <th className="py-2 pr-2 font-medium">Código</th>
                <th className="py-2 pr-2 font-medium">Etiqueta</th>
                <th className="py-2 pr-2 font-medium">Bloquea</th>
                <th className="py-2 font-medium">Orden</th>
              </tr>
            </thead>
            <tbody>
              {docs.minimumRequirements.map((req, index) => (
                <tr key={req.id} className="border-b border-border/80">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      className={settingsCheckboxClassName}
                      checked={req.required}
                      onChange={(e) =>
                        patchDocs((d) => {
                          d.minimumRequirements = d.minimumRequirements.map(
                            (r, i) =>
                              i === index
                                ? { ...r, required: e.target.checked }
                                : r
                          )
                          return d
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className={settingsInputClassName}
                      value={req.code}
                      onChange={(e) =>
                        patchDocs((d) => {
                          d.minimumRequirements = d.minimumRequirements.map(
                            (r, i) =>
                              i === index ? { ...r, code: e.target.value } : r
                          )
                          return d
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className={settingsInputClassName}
                      value={req.label}
                      onChange={(e) =>
                        patchDocs((d) => {
                          d.minimumRequirements = d.minimumRequirements.map(
                            (r, i) =>
                              i === index ? { ...r, label: e.target.value } : r
                          )
                          return d
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      className={settingsCheckboxClassName}
                      checked={req.blocking}
                      onChange={(e) =>
                        patchDocs((d) => {
                          d.minimumRequirements = d.minimumRequirements.map(
                            (r, i) =>
                              i === index
                                ? { ...r, blocking: e.target.checked }
                                : r
                          )
                          return d
                        })
                      }
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      className={settingsInputClassName}
                      value={req.order}
                      onChange={(e) =>
                        patchDocs((d) => {
                          d.minimumRequirements = d.minimumRequirements.map(
                            (r, i) =>
                              i === index
                                ? { ...r, order: Number(e.target.value) }
                                : r
                          )
                          return d
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

      <SettingsSection title="Por tipo de cliente">
        <div className="space-y-4">
          {docs.byCompanyType.map((group, gIndex) => (
            <div
              key={group.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    className={settingsCheckboxClassName}
                    checked={group.enabled}
                    onChange={(e) =>
                      patchDocs((d) => {
                        d.byCompanyType = d.byCompanyType.map((g, i) =>
                          i === gIndex
                            ? { ...g, enabled: e.target.checked }
                            : g
                        )
                        return d
                      })
                    }
                  />
                  Activo
                </label>
                <SettingsField label="Tipo" className="flex-1 min-w-[10rem]">
                  <input
                    className={settingsInputClassName}
                    value={group.label}
                    onChange={(e) =>
                      patchDocs((d) => {
                        d.byCompanyType = d.byCompanyType.map((g, i) =>
                          i === gIndex ? { ...g, label: e.target.value } : g
                        )
                        return d
                      })
                    }
                  />
                </SettingsField>
                <span className="text-xs text-muted-foreground">{group.companyType}</span>
              </div>
              {group.requirements.map((req, rIndex) => (
                <div
                  key={req.id}
                  className="grid gap-2 sm:grid-cols-4 pl-2 border-l border-border"
                >
                  <SettingsField label="Código">
                    <input
                      className={settingsInputClassName}
                      value={req.code}
                      onChange={(e) =>
                        patchDocs((d) => {
                          d.byCompanyType = d.byCompanyType.map((g, i) => {
                            if (i !== gIndex) return g
                            return {
                              ...g,
                              requirements: g.requirements.map((r, j) =>
                                j === rIndex
                                  ? { ...r, code: e.target.value }
                                  : r
                              ),
                            }
                          })
                          return d
                        })
                      }
                    />
                  </SettingsField>
                  <SettingsField label="Etiqueta">
                    <input
                      className={settingsInputClassName}
                      value={req.label}
                      onChange={(e) =>
                        patchDocs((d) => {
                          d.byCompanyType = d.byCompanyType.map((g, i) => {
                            if (i !== gIndex) return g
                            return {
                              ...g,
                              requirements: g.requirements.map((r, j) =>
                                j === rIndex
                                  ? { ...r, label: e.target.value }
                                  : r
                              ),
                            }
                          })
                          return d
                        })
                      }
                    />
                  </SettingsField>
                  <label className="flex items-center gap-2 text-sm text-foreground/80 self-end pb-2">
                    <input
                      type="checkbox"
                      className={settingsCheckboxClassName}
                      checked={req.required}
                      onChange={(e) =>
                        patchDocs((d) => {
                          d.byCompanyType = d.byCompanyType.map((g, i) => {
                            if (i !== gIndex) return g
                            return {
                              ...g,
                              requirements: g.requirements.map((r, j) =>
                                j === rIndex
                                  ? { ...r, required: e.target.checked }
                                  : r
                              ),
                            }
                          })
                          return d
                        })
                      }
                    />
                    Requerido
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground/80 self-end pb-2">
                    <input
                      type="checkbox"
                      className={settingsCheckboxClassName}
                      checked={req.blocking}
                      onChange={(e) =>
                        patchDocs((d) => {
                          d.byCompanyType = d.byCompanyType.map((g, i) => {
                            if (i !== gIndex) return g
                            return {
                              ...g,
                              requirements: g.requirements.map((r, j) =>
                                j === rIndex
                                  ? { ...r, blocking: e.target.checked }
                                  : r
                              ),
                            }
                          })
                          return d
                        })
                      }
                    />
                    Bloquea
                  </label>
                </div>
              ))}
            </div>
          ))}
        </div>
      </SettingsSection>
    </SettingsTabShell>
  )
}
