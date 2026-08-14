/**
 * PolicyRevision — revisión inmutable de una Política Crediticia.
 *
 * Cada análisis debe ligarse a una revisión (id + version + hash + snapshot).
 * Editar Ajustes NUNCA muta revisiones ya publicadas.
 *
 * Sin Firestore todavía: solo contrato + factory en memoria.
 */

import type { CreditPolicyDocument, CreditPolicyKind } from "./creditPolicyTypes"

/**
 * Revisión congelada. Inmutable por convención de producto:
 * una vez creada, no se edita; se publica una nueva.
 */
export interface PolicyRevision {
  /** Id estable de la revisión (ej. "rev_default_1_a1b2c3"). */
  id: string
  /** Id de la política lógica (meta.id), puede tener muchas revisiones. */
  policyId: string
  /** Nombre al momento del freeze. */
  policyName: string
  kind: CreditPolicyKind
  organizationId: string | null
  /** Número de versión de la política al publicar. */
  version: number
  /** Hash del policySnapshot (auditoría / igualdad). */
  hash: string
  createdAt: string
  createdBy: string | null
  /** Copia profunda del documento al momento del freeze. */
  policySnapshot: CreditPolicyDocument
}

/**
 * Lo mínimo que un análisis guarda para responder:
 * "Aprobado con Política X versión Y".
 */
export interface AnalysisPolicyBinding {
  revisionId: string
  policyId: string
  policyName: string
  version: number
  hash: string
}

export interface FreezePolicyRevisionInput {
  policy: CreditPolicyDocument
  createdBy?: string | null
  createdAt?: string | null
  /** Si se omite, se genera a partir de policyId + version + hash corto. */
  revisionId?: string | null
}

/**
 * Serialización estable para hashing (orden de keys no garantizado en JSON.stringify
 * de objetos arbitrarios — suficiente para MVP de diseño; v2 puede usar canonical JSON).
 */
export function serializePolicyForHash(policy: CreditPolicyDocument): string {
  return JSON.stringify(policy)
}

/**
 * Hash determinístico liviano (no criptográfico).
 * Suficiente para ligar análisis en diseño; reemplazable por SHA-256 en persistencia.
 */
export function computePolicyContentHash(policy: CreditPolicyDocument): string {
  const raw = serializePolicyForHash(policy)
  let h = 2166136261
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // unsigned hex
  return (h >>> 0).toString(16).padStart(8, "0")
}

/**
 * Congela una política en una PolicyRevision inmutable (en memoria).
 */
export function freezePolicyRevision(
  input: FreezePolicyRevisionInput
): PolicyRevision {
  const snapshot = structuredClone(input.policy)
  const hash = computePolicyContentHash(snapshot)
  const createdAt = input.createdAt ?? new Date().toISOString()
  const version = snapshot.meta.version
  const policyId = snapshot.meta.id
  const shortHash = hash.slice(0, 8)
  const id =
    input.revisionId ??
    `rev_${policyId}_v${version}_${shortHash}`

  return {
    id,
    policyId,
    policyName: snapshot.meta.name,
    kind: snapshot.kind,
    organizationId: snapshot.meta.organizationId,
    version,
    hash,
    createdAt,
    createdBy: input.createdBy ?? null,
    policySnapshot: snapshot,
  }
}

export function toAnalysisPolicyBinding(
  revision: PolicyRevision
): AnalysisPolicyBinding {
  return {
    revisionId: revision.id,
    policyId: revision.policyId,
    policyName: revision.policyName,
    version: revision.version,
    hash: revision.hash,
  }
}

/**
 * Incrementa version del documento editable (draft) — no crea revisión.
 * La revisión se crea solo al publicar / al analizar con freeze.
 */
export function bumpPolicyDocumentVersion(
  policy: CreditPolicyDocument,
  updatedBy?: string | null
): CreditPolicyDocument {
  const next = structuredClone(policy)
  next.meta.version = Number(next.meta.version || 0) + 1
  next.meta.updatedAt = new Date().toISOString()
  next.meta.updatedBy = updatedBy ?? next.meta.updatedBy
  return next
}
