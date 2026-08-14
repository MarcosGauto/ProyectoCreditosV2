/**
 * LimitEngine SC-1.0 — contratos de entrada del algoritmo.
 *
 * Fuentes:
 *   OwnCreditScoreResult | LimitPolicyRevision | CommercialContext | LimitOverride?
 */

import type { CommercialContext } from "@/lib/creditLimit/commercial/commercialContext"
import type { LimitOverride } from "@/lib/creditLimit/engine/limitOverride"
import type { LimitPolicyRevision } from "@/lib/creditLimit/policy/limitPolicyRevision"
import type { LimitRule } from "@/lib/creditLimit/rules/limitRuleTypes"
import type { OwnCreditScoreResult } from "@/lib/creditScore/result/scoreResultTypes"
import type { SuggestedLimitResult } from "@/lib/creditLimit/result/suggestedLimitTypes"

export type { CommercialContext } from "@/lib/creditLimit/commercial/commercialContext"
export type { LimitOverride } from "@/lib/creditLimit/engine/limitOverride"

export interface LimitEngineInput {
  score: OwnCreditScoreResult
  revision: LimitPolicyRevision
  commercialContext: CommercialContext
  /** Override manual opcional (Stage 6.5). */
  override?: LimitOverride | null
  /** ISO 8601 — servicio de análisis; el motor no genera fechas. */
  computedAt?: string | null
}

export interface LimitEngine {
  run(input: LimitEngineInput): SuggestedLimitResult
}

export type PolicyRevision = LimitPolicyRevision

export interface LimitRulesLayer {
  getRules(revision: LimitPolicyRevision): LimitRule[]
}
