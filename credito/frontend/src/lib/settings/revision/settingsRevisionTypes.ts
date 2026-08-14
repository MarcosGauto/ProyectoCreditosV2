/**
 * SettingsRevision — freeze inmutable de Ajustes (auditoría).
 * Sin Firestore: solo contrato + factory tipada.
 */

import type { OrganizationSettings } from "@/lib/settings/org/organizationSettingsTypes"
import type { PolicyProfile } from "@/lib/settings/profile/policyProfileTypes"

/**
 * Revisión congelada (org completa o un perfil).
 */
export interface SettingsRevision {
  id: string
  organizationId: string
  /** Si se publicó un perfil puntual; null = snapshot de org. */
  profileId: string | null
  version: number
  hash: string
  createdAt: string
  createdBy: string | null
  label: string | null
  /** Snapshot profundo. */
  organizationSnapshot: OrganizationSettings
  /** Perfil congelado (si aplica). */
  profileSnapshot: PolicyProfile | null
}

export interface SettingsRevisionBinding {
  revisionId: string
  organizationId: string
  profileId: string | null
  version: number
  hash: string
}

export interface FreezeSettingsRevisionInput {
  organization: OrganizationSettings
  profile?: PolicyProfile | null
  createdBy?: string | null
  createdAt?: string | null
  label?: string | null
}

/**
 * Contrato de fábrica de revisiones (sin persistencia).
 * La implementación real de hash/fecha puede vivir en un servicio futuro.
 */
export interface SettingsRevisionFactory {
  freeze(input: FreezeSettingsRevisionInput): SettingsRevision
  toBinding(revision: SettingsRevision): SettingsRevisionBinding
}

