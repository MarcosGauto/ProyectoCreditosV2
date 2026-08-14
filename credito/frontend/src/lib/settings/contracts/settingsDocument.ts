/**
 * Documento canónico de Ajustes + aliases de contrato.
 */

import type { OrganizationSettings } from "@/lib/settings/org/organizationSettingsTypes"
import type { PolicyProfile } from "@/lib/settings/profile/policyProfileTypes"
import type { SettingsRevision } from "@/lib/settings/revision/settingsRevisionTypes"

/**
 * Alias: el documento editable raíz de Ajustes es OrganizationSettings.
 */
export type SettingsDocument = OrganizationSettings

/**
 * Bundle tipado que una futura UI de Ajustes cargaría / guardaría.
 * Sin I/O aquí.
 */
export interface SettingsWorkspace {
  document: SettingsDocument
  /** Perfil seleccionado en el editor. */
  editingProfileId: string | null
  /** Última revisión conocida (si hubo publish). */
  lastRevision: SettingsRevision | null
  dirty: boolean
}

/**
 * Operaciones de contrato del workspace (sin implementación).
 */
export interface SettingsWorkspaceApi {
  load(organizationId: string): Promise<SettingsWorkspace>
  saveDraft(workspace: SettingsWorkspace): Promise<SettingsWorkspace>
  publish(workspace: SettingsWorkspace): Promise<SettingsRevision>
  selectProfile(
    workspace: SettingsWorkspace,
    profileId: string
  ): SettingsWorkspace
  createProfile(
    workspace: SettingsWorkspace,
    draft: Partial<PolicyProfile>
  ): SettingsWorkspace
  duplicateProfile(
    workspace: SettingsWorkspace,
    profileId: string,
    newName: string
  ): SettingsWorkspace
  setDefaultProfile(
    workspace: SettingsWorkspace,
    profileId: string
  ): SettingsWorkspace
}

