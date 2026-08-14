/**
 * Service — OrganizationSettings (Ajustes SC-1.0).
 *
 * Orquesta repository + defaults de producto + versionado.
 * No proyecta a engines. No es UI.
 */

import { createProductOrganizationSettings } from "@/lib/settings/seeds/createProductOrganizationSettings"
import { createSettingsValidator } from "@/lib/settings/validation/createSettingsValidator"
import type { OrganizationSettings } from "@/lib/settings/org/organizationSettingsTypes"
import type { SettingsValidationResult } from "@/lib/settings/shared/settingsSharedTypes"
import {
  createOrganizationSettings,
  DEFAULT_ORGANIZATION_ID,
  getOrganizationSettings,
  saveOrganizationSettings,
} from "@/lib/settings/repositories/organizationSettingsRepository"

export function cloneOrganizationSettings(
  doc: OrganizationSettings
): OrganizationSettings {
  return (
    typeof structuredClone === "function"
      ? structuredClone(doc)
      : JSON.parse(JSON.stringify(doc))
  ) as OrganizationSettings
}

export function areOrganizationSettingsEqual(
  a: OrganizationSettings,
  b: OrganizationSettings
): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export interface LoadOrCreateOrganizationSettingsInput {
  organizationId?: string
  /** Actor que crea el doc si no existía. */
  createdBy?: string | null
}

/**
 * Busca el documento de la org.
 * Si no existe → crea desde createProductOrganizationSettings(),
 * lo persiste y lo devuelve.
 *
 * El caller nunca necesita saber si existía o no.
 */
export async function loadOrCreateOrganizationSettings(
  input: LoadOrCreateOrganizationSettingsInput = {}
): Promise<OrganizationSettings> {
  const organizationId = input.organizationId?.trim() || DEFAULT_ORGANIZATION_ID
  const existing = await getOrganizationSettings(organizationId)

  if (existing) {
    return normalizeLoadedSettings(existing, organizationId)
  }

  const now = new Date().toISOString()
  const createdBy = input.createdBy?.trim() || "system"
  const fresh = createProductOrganizationSettings({
    organizationId,
    id: `settings_${organizationId}`,
    name: "Ajustes SC-1.0",
  })

  fresh.meta.organizationId = organizationId
  fresh.meta.version = 1
  fresh.meta.status = "active"
  fresh.meta.audit = {
    createdAt: now,
    createdBy,
    updatedAt: now,
    updatedBy: createdBy,
  }

  await createOrganizationSettings(fresh)
  return fresh
}

function normalizeLoadedSettings(
  raw: OrganizationSettings,
  organizationId: string
): OrganizationSettings {
  const doc = cloneOrganizationSettings(raw)
  if (!doc.meta) {
    throw new Error("OrganizationSettings inválido: falta meta")
  }
  doc.meta.organizationId = doc.meta.organizationId || organizationId
  if (!doc.meta.audit) {
    doc.meta.audit = {
      createdAt: null,
      createdBy: null,
      updatedAt: null,
      updatedBy: null,
    }
  }
  return doc
}

/**
 * Draft restaurado a defaults de producto (sin persistir).
 * Conserva organizationId + createdAt/createdBy; incrementa version.
 */
export function buildResetOrganizationSettings(
  current: OrganizationSettings
): OrganizationSettings {
  const organizationId =
    current.meta.organizationId?.trim() || DEFAULT_ORGANIZATION_ID
  const createdAt = current.meta.audit?.createdAt ?? null
  const createdBy = current.meta.audit?.createdBy ?? null
  const prevVersion = Number(current.meta.version) || 1

  const restored = createProductOrganizationSettings({
    organizationId,
    id: current.meta.id || `settings_${organizationId}`,
    name: current.meta.name || "Ajustes SC-1.0",
  })

  restored.meta.organizationId = organizationId
  restored.meta.version = prevVersion + 1
  restored.meta.status = current.meta.status || "draft"
  restored.meta.locale = current.meta.locale || restored.meta.locale
  restored.meta.currency = current.meta.currency || restored.meta.currency
  restored.meta.audit = {
    createdAt,
    createdBy,
    updatedAt: current.meta.audit?.updatedAt ?? null,
    updatedBy: current.meta.audit?.updatedBy ?? null,
  }

  return restored
}

/** @deprecated Preferir buildResetOrganizationSettings */
export const buildRestoredOrganizationSettings = buildResetOrganizationSettings

export interface SaveOrganizationSettingsInput {
  draft: OrganizationSettings
  previous: OrganizationSettings
  updatedBy?: string | null
}

export interface SaveOrganizationSettingsResult {
  settings: OrganizationSettings
  validation: SettingsValidationResult
}

/**
 * Valida, versiona y persiste el documento completo.
 * Nunca modifica createdAt.
 */
export async function saveOrganizationSettingsDocument(
  input: SaveOrganizationSettingsInput
): Promise<SaveOrganizationSettingsResult> {
  const validator = createSettingsValidator()
  const validation = validator.validateOrganization(input.draft)

  if (!validation.valid) {
    return { settings: input.draft, validation }
  }

  const now = new Date().toISOString()
  const updatedBy = input.updatedBy?.trim() || "desconocido"
  const next = cloneOrganizationSettings(input.draft)

  const previousVersion = Number(input.previous.meta?.version) || 0
  const draftVersion = Number(next.meta.version) || 1
  next.meta.version =
    draftVersion > previousVersion ? draftVersion : previousVersion + 1

  const createdAt =
    input.previous.meta.audit?.createdAt ??
    next.meta.audit?.createdAt ??
    now
  const createdBy =
    input.previous.meta.audit?.createdBy ??
    next.meta.audit?.createdBy ??
    updatedBy

  next.meta.organizationId =
    next.meta.organizationId ||
    input.previous.meta.organizationId ||
    DEFAULT_ORGANIZATION_ID

  next.meta.audit = {
    createdAt,
    createdBy,
    updatedAt: now,
    updatedBy,
  }

  next.meta.status = next.meta.status === "archived" ? "archived" : "active"

  await saveOrganizationSettings(next)
  return { settings: next, validation }
}
