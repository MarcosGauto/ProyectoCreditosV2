"use client"

/**
 * @deprecated Preferir `@/hooks/useOrganizationSettings`.
 * Re-export para compatibilidad con imports existentes.
 */
export {
  useOrganizationSettings as useOrganizationSettingsLocal,
  useOrganizationSettings,
  cloneSettings,
} from "@/hooks/useOrganizationSettings"
