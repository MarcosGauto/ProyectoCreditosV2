/**
 * LimitPolicyRevision — revisión inmutable de una LimitPolicy.
 *
 * Análogo a PolicyRevision del Score/Credit Policy, pero del módulo de Límite.
 * Cada decisión comercial debe ligarse a una revisión (id + version + hash).
 *
 * Sin Firestore: solo contrato + factory en memoria.
 */

import type { LimitPolicy } from "@/lib/creditLimit/policy/limitPolicyTypes"

/**
 * Revisión congelada de LimitPolicy.
 * Inmutable por convención: no se edita; se publica una nueva.
 */
export interface LimitPolicyRevision {
  id: string
  policyId: string
  policyName: string
  organizationId: string | null
  version: number
  hash: string
  createdAt: string
  createdBy: string | null
  /** Snapshot profundo al momento del freeze. */
  policySnapshot: LimitPolicy
}

/**
 * Binding mínimo para auditoría en SuggestedLimitResult.
 */
export interface LimitPolicyBinding {
  revisionId: string
  policyId: string
  policyName: string
  version: number
  hash: string
}

export interface FreezeLimitPolicyRevisionInput {
  policy: LimitPolicy
  createdBy?: string | null
  createdAt?: string | null
}

/** Hash no criptográfico de contenido (paridad con creditPolicy/sc1). */
export function hashLimitPolicySnapshot(policy: LimitPolicy): string {
  const json = JSON.stringify(policy)
  let h = 2166136261
  for (let i = 0; i < json.length; i += 1) {
    h ^= json.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, "0")
}

function deepClonePolicy(policy: LimitPolicy): LimitPolicy {
  return JSON.parse(JSON.stringify(policy)) as LimitPolicy
}

/**
 * Congela una LimitPolicy en una revisión inmutable.
 * `createdAt` puede inyectarse; si no, usa ISO actual (solo factory; el engine no genera fechas).
 */
export function freezeLimitPolicyRevision(
  input: FreezeLimitPolicyRevisionInput
): LimitPolicyRevision {
  const snapshot = deepClonePolicy(input.policy)
  const hash = hashLimitPolicySnapshot(snapshot)
  const createdAt = input.createdAt ?? new Date().toISOString()
  const version = snapshot.meta.version
  const policyId = snapshot.meta.id
  const short = hash.slice(0, 6)

  return {
    id: `limrev_${policyId}_${version}_${short}`,
    policyId,
    policyName: snapshot.meta.name,
    organizationId: snapshot.meta.organizationId,
    version,
    hash,
    createdAt,
    createdBy: input.createdBy ?? null,
    policySnapshot: snapshot,
  }
}

export function toLimitPolicyBinding(
  revision: LimitPolicyRevision
): LimitPolicyBinding {
  return {
    revisionId: revision.id,
    policyId: revision.policyId,
    policyName: revision.policyName,
    version: revision.version,
    hash: revision.hash,
  }
}

/** Atajo: publica revisión desde documento activo. */
export function publishLimitPolicyRevision(
  policy: LimitPolicy,
  createdBy?: string | null
): LimitPolicyRevision {
  return freezeLimitPolicyRevision({ policy, createdBy: createdBy ?? null })
}
