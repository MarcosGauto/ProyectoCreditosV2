"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createSettingsValidator } from "@/lib/settings"
import {
  DEFAULT_ORGANIZATION_ID,
} from "@/lib/settings/repositories/organizationSettingsRepository"
import {
  areOrganizationSettingsEqual,
  buildResetOrganizationSettings,
  cloneOrganizationSettings,
  loadOrCreateOrganizationSettings,
  saveOrganizationSettingsDocument,
} from "@/lib/settings/services/organizationSettingsService"

/** @typedef {import("@/lib/settings").OrganizationSettings} OrganizationSettings */
/** @typedef {import("@/lib/settings").PolicyProfile} PolicyProfile */
/** @typedef {import("@/lib/settings").SettingsValidationResult} SettingsValidationResult */

/**
 * Hook de UI para Ajustes SC-1.0.
 * No accede a Firestore: solo service + estado de pantalla.
 *
 * Estado: loading | saving | dirty | error
 * Acciones: load | save | reset | cancel
 *
 * @param {{
 *   organizationId?: string;
 *   userEmail?: string | null;
 *   autoLoad?: boolean;
 * }} [options]
 */
export function useOrganizationSettings(options = {}) {
  const organizationId = options.organizationId ?? DEFAULT_ORGANIZATION_ID
  const userEmail = options.userEmail ?? null
  const autoLoad = options.autoLoad !== false
  const validator = useMemo(() => createSettingsValidator(), [])

  const [saved, setSaved] = useState(
    /** @type {OrganizationSettings | null} */ (null)
  )
  const [draft, setDraft] = useState(
    /** @type {OrganizationSettings | null} */ (null)
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const dirty = useMemo(() => {
    if (!draft || !saved) return false
    return !areOrganizationSettingsEqual(draft, saved)
  }, [draft, saved])

  const activeProfile = useMemo(() => {
    if (!draft) return null
    const id = draft.activeProfileId
    return (
      draft.profiles.find((p) => p.meta.id === id) ??
      draft.profiles.find((p) => p.meta.isDefault) ??
      draft.profiles[0] ??
      null
    )
  }, [draft])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const doc = await loadOrCreateOrganizationSettings({
        organizationId,
        createdBy: userEmail,
      })
      setSaved(cloneOrganizationSettings(doc))
      setDraft(cloneOrganizationSettings(doc))
      return doc
    } catch (err) {
      console.error("[useOrganizationSettings] load", err)
      setError("No se pudo cargar Ajustes SC-1.0.")
      setSaved(null)
      setDraft(null)
      throw err
    } finally {
      setLoading(false)
    }
  }, [organizationId, userEmail])

  useEffect(() => {
    if (!autoLoad) return
    void load().catch(() => {
      /* error ya seteado */
    })
  }, [autoLoad, load])

  /**
   * @param {(profile: PolicyProfile) => PolicyProfile} updater
   */
  const updateActiveProfile = useCallback((updater) => {
    setDraft((prev) => {
      if (!prev) return prev
      const next = cloneOrganizationSettings(prev)
      const idx = next.profiles.findIndex(
        (p) =>
          p.meta.id === next.activeProfileId ||
          (next.activeProfileId == null && p.meta.isDefault)
      )
      const targetIdx = idx >= 0 ? idx : 0
      if (!next.profiles[targetIdx]) return prev
      next.profiles[targetIdx] = updater(next.profiles[targetIdx])
      return next
    })
  }, [])

  /**
   * @param {(doc: OrganizationSettings) => OrganizationSettings} updater
   */
  const updateOrganization = useCallback((updater) => {
    setDraft((prev) => {
      if (!prev) return prev
      return updater(cloneOrganizationSettings(prev))
    })
  }, [])

  /** Descarta cambios del draft y vuelve a la última versión guardada. */
  const cancel = useCallback(() => {
    if (!saved) return
    setDraft(cloneOrganizationSettings(saved))
    setError(null)
  }, [saved])

  /**
   * Restaura defaults de producto en draft (sin persistir).
   * Conserva organizationId + createdAt; incrementa version.
   */
  const reset = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev
      return buildResetOrganizationSettings(prev)
    })
    setError(null)
  }, [])

  /**
   * @param {"score" | "limit" | "alerts" | "documentation" | "ai"} module
   * @returns {SettingsValidationResult}
   */
  const validateModule = useCallback(
    (module) => {
      if (!activeProfile || !draft) {
        return {
          valid: false,
          errors: [
            {
              code: "org.active_profile_missing",
              message: "No hay perfil activo.",
              path: "organization.activeProfileId",
            },
          ],
          warnings: [],
        }
      }
      switch (module) {
        case "score":
          return validator.score.validate(activeProfile.score)
        case "limit":
          return validator.limit.validate(activeProfile.limit)
        case "alerts":
          return validator.alerts.validate(activeProfile.alerts)
        case "documentation":
          return validator.documentation.validate(activeProfile.documentation)
        case "ai":
          return validator.ai.validate(draft.ai)
        default:
          return { valid: true, errors: [], warnings: [] }
      }
    },
    [activeProfile, draft, validator]
  )

  const validateOrganization = useCallback(() => {
    if (!draft) {
      return {
        valid: false,
        errors: [
          {
            code: "org.active_profile_missing",
            message: "No hay documento de Ajustes cargado.",
            path: "organization",
          },
        ],
        warnings: [],
      }
    }
    return validator.validateOrganization(draft)
  }, [draft, validator])

  /**
   * Valida y persiste OrganizationSettings completo vía service.
   * @returns {Promise<boolean>}
   */
  const save = useCallback(async () => {
    if (!draft || !saved) return false
    if (!dirty) return false

    const orgValidation = validator.validateOrganization(draft)
    if (!orgValidation.valid) {
      setError("Hay errores de validación. Corregilos antes de guardar.")
      return false
    }

    setSaving(true)
    setError(null)
    try {
      const { settings, validation } = await saveOrganizationSettingsDocument({
        draft,
        previous: saved,
        updatedBy: userEmail,
      })
      if (!validation.valid) {
        setError("Hay errores de validación. Corregilos antes de guardar.")
        return false
      }
      setSaved(cloneOrganizationSettings(settings))
      setDraft(cloneOrganizationSettings(settings))
      return true
    } catch (err) {
      console.error("[useOrganizationSettings] save", err)
      setError("No se pudo guardar Ajustes SC-1.0.")
      throw err
    } finally {
      setSaving(false)
    }
  }, [draft, saved, dirty, userEmail, validator])

  return {
    draft,
    saved,
    activeProfile,
    loading,
    saving,
    dirty,
    /** alias */
    isDirty: dirty,
    error,
    setError,
    load,
    save,
    reset,
    cancel,
    updateActiveProfile,
    updateOrganization,
    validateModule,
    validateOrganization,
    /** aliases de compatibilidad */
    refresh: load,
    saveSettings: save,
    restoreDefaults: reset,
    cancelChanges: cancel,
  }
}

/** @deprecated Usar useOrganizationSettings */
export { useOrganizationSettings as useOrganizationSettingsLocal }
export { cloneOrganizationSettings as cloneSettings }
