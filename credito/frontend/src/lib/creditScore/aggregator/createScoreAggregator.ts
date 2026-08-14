/**

 * Aggregator SC-1.0

 *

 * Input: DimensionEvaluation[] + PolicyRevision.

 * Cada evaluación trae score, scoreMin, scoreMax y weight.

 * NO lee ratios, métricas ni fuentes externas.

 * NO genera fechas (computedAt = responsabilidad del servicio de análisis).

 */



import type { CreditPolicyCategory } from "@/lib/creditPolicy/sc1/creditPolicyTypes"

import { toAnalysisPolicyBinding } from "@/lib/creditPolicy/sc1/policyRevision"

import type {

  AggregatedScores,

  AggregatorInput,

  ScoreAggregator,

} from "@/lib/creditScore/aggregator/aggregatorTypes"

import type { DimensionEvaluation } from "@/lib/creditScore/ruleEngine/ruleEngineTypes"

import type {

  OwnCreditScoreResult,

  ScoreConfidence,

  ScoreDimensionBreakdown,

  ScoreFinding,

  ScoreValue,

} from "@/lib/creditScore/result/scoreResultTypes"



function round2(n: number): number {

  return Math.round(n * 100) / 100

}



/** Dimensiones que participan del agregado. */

function scoringPool(evaluations: DimensionEvaluation[]): DimensionEvaluation[] {

  return evaluations.filter(

    (e) =>

      e.enabled &&

      e.status !== "SKIPPED" &&

      e.weight > 0 &&

      e.score != null &&

      Number.isFinite(e.score)

  )

}



/** Normaliza un score de dimensión a [0, 1] usando su escala explícita. */

function normalizeDimensionScore(

  score: number,

  scoreMin: number,

  scoreMax: number

): number | null {

  const span = scoreMax - scoreMin

  if (!Number.isFinite(span) || span <= 0) return null

  return (score - scoreMin) / span

}



/**

 * Media ponderada de scores normalizados (0–1).

 * Re-normaliza pesos dentro del subconjunto.

 */

function weightedAverageNormalized(

  evaluations: DimensionEvaluation[]

): { average: number | null; totalWeight: number } {

  const pool = scoringPool(evaluations)

  if (pool.length === 0) {

    return { average: null, totalWeight: 0 }

  }

  const totalWeight = pool.reduce((s, e) => s + e.weight, 0)

  if (totalWeight <= 0) {

    return { average: null, totalWeight: 0 }

  }



  let sum = 0

  for (const e of pool) {

    const normalized = normalizeDimensionScore(

      e.score as number,

      e.scoreMin,

      e.scoreMax

    )

    if (normalized == null) {

      return { average: null, totalWeight: 0 }

    }

    sum += normalized * e.weight

  }

  return { average: sum / totalWeight, totalWeight }

}



/** Promedio normalizado (0–1) → rango global de la política. */

function mapToPolicyScale(

  normalizedAverage: number | null,

  scoreMin: number,

  scoreMax: number

): number | null {

  if (normalizedAverage == null || !Number.isFinite(normalizedAverage)) return null

  const span = scoreMax - scoreMin

  if (!Number.isFinite(span) || span <= 0) {

    return round2(normalizedAverage)

  }

  return round2(scoreMin + normalizedAverage * span)

}



/** Score de dimensión → escala global de la política (vía normalización). */

function mapDimensionScoreToPolicyScale(

  score: number,

  dimensionScoreMin: number,

  dimensionScoreMax: number,

  policyScoreMin: number,

  policyScoreMax: number

): number | null {

  const normalized = normalizeDimensionScore(score, dimensionScoreMin, dimensionScoreMax)

  if (normalized == null) return null

  return mapToPolicyScale(normalized, policyScoreMin, policyScoreMax)

}



function byDomain(

  evaluations: DimensionEvaluation[],

  domain: "financial" | "commercial"

): DimensionEvaluation[] {

  return evaluations.filter((e) => e.domain === domain)

}



export function aggregateScores(

  evaluations: DimensionEvaluation[],

  scoreMin: number,

  scoreMax: number

): AggregatedScores {

  const fin = weightedAverageNormalized(byDomain(evaluations, "financial"))

  const com = weightedAverageNormalized(byDomain(evaluations, "commercial"))

  const all = weightedAverageNormalized(evaluations)



  return {

    financialScore: {

      value: mapToPolicyScale(fin.average, scoreMin, scoreMax),

      categoryCode: null,

      categoryLabel: null,

    },

    commercialScore: {

      value: mapToPolicyScale(com.average, scoreMin, scoreMax),

      categoryCode: null,

      categoryLabel: null,

    },

    finalScore: {

      value: mapToPolicyScale(all.average, scoreMin, scoreMax),

      categoryCode: null,

      categoryLabel: null,

    },

  }

}



export function categorize(

  finalScore: ScoreValue,

  categories: CreditPolicyCategory[]

): ScoreValue {

  const value = finalScore.value

  if (value == null || !Number.isFinite(value)) {

    return { ...finalScore, categoryCode: null, categoryLabel: null }

  }



  const sorted = [...categories].sort((a, b) => a.order - b.order)

  for (const cat of sorted) {

    const minOk = cat.minInclusive ? value >= cat.min : value > cat.min

    const maxOk = cat.maxInclusive ? value <= cat.max : value < cat.max

    if (minOk && maxOk) {

      return {

        value,

        categoryCode: cat.code,

        categoryLabel: cat.label,

      }

    }

  }



  return { ...finalScore, categoryCode: null, categoryLabel: null }

}



function withDimension(

  finding: {

    id: string

    text: string

    severity?: ScoreFinding["severity"]

  },

  evaluation: DimensionEvaluation

): ScoreFinding {

  return {

    id: finding.id,

    text: finding.text,

    severity: finding.severity,

    dimensionId: evaluation.dimensionId,

    ruleId: evaluation.matchedRuleId ?? undefined,

  }

}



export function buildGlobalFindings(evaluations: DimensionEvaluation[]): {

  strengths: ScoreFinding[]

  weaknesses: ScoreFinding[]

  observations: ScoreFinding[]

  recommendations: ScoreFinding[]

} {

  const strengths: ScoreFinding[] = []

  const weaknesses: ScoreFinding[] = []

  const observations: ScoreFinding[] = []

  const recommendations: ScoreFinding[] = []

  const seen = new Set<string>()



  const pushUnique = (list: ScoreFinding[], item: ScoreFinding) => {

    if (seen.has(item.id)) return

    seen.add(item.id)

    list.push(item)

  }



  for (const ev of evaluations) {

    if (!ev.enabled || ev.status === "SKIPPED") continue

    for (const s of ev.strengths) {

      pushUnique(strengths, withDimension(s, ev))

    }

    for (const w of ev.weaknesses) {

      pushUnique(weaknesses, withDimension(w, ev))

    }

    for (const o of ev.observations) {

      pushUnique(observations, withDimension(o, ev))

    }

    for (const r of ev.recommendations) {

      pushUnique(recommendations, withDimension(r, ev))

    }

  }



  return { strengths, weaknesses, observations, recommendations }

}



export function buildConfidence(

  evaluations: DimensionEvaluation[],

  _confidenceMin: number

): ScoreConfidence {

  const eligible = evaluations.filter(

    (e) => e.enabled && e.status !== "SKIPPED" && e.weight > 0

  )

  const missing: string[] = []

  let scored = 0



  for (const e of eligible) {

    if (e.score == null || e.status === "UNKNOWN") {

      missing.push(e.dimensionId)

    } else {

      scored += 1

    }

  }



  const total = eligible.length

  const value = total === 0 ? 0 : scored / total



  let level: ScoreConfidence["level"] = "low"

  let label = "Baja"

  if (value >= 0.85) {

    level = "high"

    label = "Alta"

  } else if (value >= 0.6) {

    level = "medium"

    label = "Media"

  }



  return {

    value: round2(value),

    level,

    label,

    missing,

  }

}



function buildBreakdown(

  evaluations: DimensionEvaluation[],

  policyScoreMin: number,

  policyScoreMax: number

): ScoreDimensionBreakdown[] {

  const pool = scoringPool(evaluations)

  const totalWeight = pool.reduce((s, e) => s + e.weight, 0)



  return evaluations.map((e) => {

    const inPool = pool.some((p) => p.dimensionId === e.dimensionId)

    let contribution: number | null = null

    if (inPool && e.score != null && totalWeight > 0) {

      const mapped = mapDimensionScoreToPolicyScale(

        e.score,

        e.scoreMin,

        e.scoreMax,

        policyScoreMin,

        policyScoreMax

      )

      if (mapped != null) {

        contribution = round2((e.weight / totalWeight) * mapped)

      }

    }



    return {

      dimensionId: e.dimensionId,

      label: e.label,

      domain: e.domain,

      enabled: e.enabled,

      weight: e.weight,

      scoreMin: e.scoreMin,

      scoreMax: e.scoreMax,

      score: e.score,

      status: e.status,

      contribution,

      metricKey: e.metricKey,

      metricValue: e.metricValue,

      matchedRuleId: e.matchedRuleId,

      ruleMatches: [],

      strengths: e.strengths.map((f) => withDimension(f, e)),

      weaknesses: e.weaknesses.map((f) => withDimension(f, e)),

      observations: e.observations.map((f) => withDimension(f, e)),

      recommendations: e.recommendations.map((f) => withDimension(f, e)),

    }

  })

}



function resolveStatus(

  finalScore: ScoreValue,

  confidence: ScoreConfidence,

  confidenceMin: number

): OwnCreditScoreResult["status"] {

  if (finalScore.value == null) {

    return "insufficient_data"

  }

  if (confidence.value < confidenceMin) {

    return "insufficient_data"

  }

  return "ok"

}



/**

 * Factory del Aggregator SC-1.0.

 */

export function createScoreAggregator(): ScoreAggregator {

  return {

    aggregateScores,

    categorize,

    buildRecommendations(evaluations) {

      return buildGlobalFindings(evaluations)

    },

    buildConfidence,

    assemble(input: AggregatorInput): OwnCreditScoreResult {

      const { evaluations, revision } = input

      const policy = revision.policySnapshot

      const scoreMin = policy.meta.scoreMin

      const scoreMax = policy.meta.scoreMax

      const confidenceMin = policy.meta.confidenceMin

      const categories = policy.categories



      const scores = aggregateScores(evaluations, scoreMin, scoreMax)

      const finalScore = categorize(scores.finalScore, categories)

      const financialScore = scores.financialScore

      const commercialScore = scores.commercialScore

      const findings = buildGlobalFindings(evaluations)

      const confidence = buildConfidence(evaluations, confidenceMin)

      const breakdown = buildBreakdown(evaluations, scoreMin, scoreMax)

      const status = resolveStatus(finalScore, confidence, confidenceMin)



      const binding = toAnalysisPolicyBinding(revision)



      return {

        schemaVersion: 1,

        model: revision.policySnapshot.meta.model,

        financialScore,

        commercialScore,

        finalScore,

        confidence,

        breakdown,

        strengths: findings.strengths,

        weaknesses: findings.weaknesses,

        observations: findings.observations,

        recommendations: findings.recommendations,

        policyRevisionId: revision.id,

        policyRevisionVersion: revision.version,

        policyRevisionHash: revision.hash,

        policy: {

          ...binding,

          kind: revision.kind,

        },

        computedAt: null,

        status,

      }

    },

  }

}



/**

 * Atajo: agrega evaluaciones con datos de la PolicyRevision.

 * Pesos = evaluation.weight (copiados desde la política al evaluar).

 */

export function aggregateFromRevision(

  evaluations: DimensionEvaluation[],

  revision: AggregatorInput["revision"]

): OwnCreditScoreResult {

  const aggregator = createScoreAggregator()

  return aggregator.assemble({ evaluations, revision })

}


