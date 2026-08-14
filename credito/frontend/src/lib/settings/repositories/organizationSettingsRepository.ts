/**
 * Repository Firestore — organization_settings/{organizationId}
 *
 * Responsabilidad única: I/O del documento OrganizationSettings.
 * Sin validación, versionado ni defaults de producto.
 */

import {
  doc,
  getDoc,
  setDoc,
  type DocumentReference,
} from "firebase/firestore"
import { db } from "@/service/firebase"
import type { OrganizationSettings } from "@/lib/settings/org/organizationSettingsTypes"

export const ORGANIZATION_SETTINGS_COLLECTION = "organization_settings" as const

/**
 * Org por defecto del producto single-tenant actual.
 * El path sigue siendo organization_settings/{organizationId} (SaaS-ready).
 */
export const DEFAULT_ORGANIZATION_ID = "default" as const

/**
 * Elimina `undefined` recursivamente (Firestore no lo acepta).
 */
export function stripUndefinedForFirestore(value: unknown): unknown {
  if (value === undefined) return undefined
  if (value === null) return null
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedForFirestore(item))
      .filter((item) => item !== undefined)
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      const cleaned = stripUndefinedForFirestore(v)
      if (cleaned !== undefined) out[k] = cleaned
    }
    return out
  }
  return value
}

export function organizationSettingsRef(
  organizationId: string
): DocumentReference {
  if (!organizationId.trim()) {
    throw new Error("organizationId es obligatorio")
  }
  return doc(db, ORGANIZATION_SETTINGS_COLLECTION, organizationId)
}

/**
 * Lee OrganizationSettings de la org. null si no existe.
 */
export async function getOrganizationSettings(
  organizationId: string
): Promise<OrganizationSettings | null> {
  const snap = await getDoc(organizationSettingsRef(organizationId))
  if (!snap.exists()) return null
  return snap.data() as OrganizationSettings
}

/**
 * Crea el documento (escritura completa).
 * No valida existencia previa — eso es responsabilidad del service.
 */
export async function createOrganizationSettings(
  settings: OrganizationSettings
): Promise<OrganizationSettings> {
  const organizationId = requireOrganizationId(settings)
  const payload = stripUndefinedForFirestore(settings) as Record<string, unknown>
  await setDoc(organizationSettingsRef(organizationId), payload)
  return settings
}

/**
 * Actualiza el documento completo (replace).
 * No merge parcial de módulos.
 */
export async function updateOrganizationSettings(
  settings: OrganizationSettings
): Promise<OrganizationSettings> {
  const organizationId = requireOrganizationId(settings)
  const payload = stripUndefinedForFirestore(settings) as Record<string, unknown>
  await setDoc(organizationSettingsRef(organizationId), payload)
  return settings
}

/**
 * Upsert del documento completo OrganizationSettings.
 */
export async function saveOrganizationSettings(
  settings: OrganizationSettings
): Promise<OrganizationSettings> {
  const organizationId = requireOrganizationId(settings)
  const payload = stripUndefinedForFirestore(settings) as Record<string, unknown>
  await setDoc(organizationSettingsRef(organizationId), payload)
  return settings
}

function requireOrganizationId(settings: OrganizationSettings): string {
  const organizationId = settings.meta?.organizationId?.trim()
  if (!organizationId) {
    throw new Error("OrganizationSettings.meta.organizationId es obligatorio")
  }
  return organizationId
}
