/**
 * Validación de Política Crediticia SC-1.0 (producto comercial).
 * Verifica integridad del documento; no ejecuta reglas ni calcula score.
 */

import type {
  CreditPolicyCategory,
  CreditPolicyDocument,
  CreditPolicyValidationIssue,
  CreditPolicyValidationResult,
} from "./creditPolicyTypes"

const WEIGHT_TARGET = 100
const WEIGHT_EPSILON = 1e-9

function sumEnabledWeights(doc: CreditPolicyDocument): number {
  return doc.dimensions
    .filter((d) => d.enabled)
    .reduce((sum, d) => {
      const n = Number(d.weight)
      return sum + (Number.isFinite(n) ? n : 0)
    }, 0)
}

function uniqueIds(
  items: Array<{ id: string }>,
  path: string,
  errors: CreditPolicyValidationIssue[]
) {
  const seen = new Set<string>()
  for (const item of items) {
    if (!item.id) {
      errors.push({
        code: "id.missing",
        message: `Hay un elemento sin id en ${path}.`,
        path,
      })
      continue
    }
    if (seen.has(item.id)) {
      errors.push({
        code: "id.duplicate",
        message: `Id duplicado «${item.id}» en ${path}.`,
        path: `${path}.${item.id}`,
      })
    }
    seen.add(item.id)
  }
}

function validateCategories(
  categories: CreditPolicyCategory[],
  scoreMin: number,
  scoreMax: number,
  errors: CreditPolicyValidationIssue[],
  warnings: CreditPolicyValidationIssue[]
) {
  if (categories.length === 0) {
    errors.push({
      code: "categories.empty",
      message: "Debe existir al menos una categoría de score.",
      path: "categories",
    })
    return
  }

  const sorted = [...categories].sort((a, b) => a.min - b.min || a.order - b.order)

  for (const cat of sorted) {
    if (!(cat.min <= cat.max)) {
      errors.push({
        code: "categories.range",
        message: `Categoría «${cat.code}»: min debe ser ≤ max.`,
        path: `categories.${cat.id}`,
      })
    }
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (a.max > b.min || (a.max === b.min && a.maxInclusive && b.minInclusive)) {
      errors.push({
        code: "categories.overlap",
        message: `Categorías «${a.code}» y «${b.code}» se solapan.`,
        path: "categories",
      })
    }
  }

  if (sorted[0].min > scoreMin) {
    warnings.push({
      code: "categories.gap_low",
      message: `Hueco entre scoreMin (${scoreMin}) y «${sorted[0].code}».`,
      path: "categories",
    })
  }
  if (sorted[sorted.length - 1].max < scoreMax) {
    warnings.push({
      code: "categories.gap_high",
      message: `Hueco entre «${sorted[sorted.length - 1].code}» y scoreMax (${scoreMax}).`,
      path: "categories",
    })
  }
}

export function validateCreditPolicyDocument(
  doc: CreditPolicyDocument | null | undefined
): CreditPolicyValidationResult {
  const errors: CreditPolicyValidationIssue[] = []
  const warnings: CreditPolicyValidationIssue[] = []

  if (!doc || typeof doc !== "object") {
    return {
      valid: false,
      errors: [
        {
          code: "policy.missing",
          message: "Falta el documento de Política Crediticia.",
          path: "policy",
        },
      ],
      warnings: [],
      enabledWeightTotal: null,
    }
  }

  const meta = doc.meta
  if (!meta?.id) {
    errors.push({ code: "meta.id", message: "meta.id es obligatorio.", path: "meta.id" })
  }
  if (!meta?.name) {
    errors.push({
      code: "meta.name",
      message: "meta.name es obligatorio.",
      path: "meta.name",
    })
  }
  if (!meta?.model) {
    errors.push({
      code: "meta.model",
      message: "meta.model es obligatorio.",
      path: "meta.model",
    })
  }
  if (typeof meta?.version !== "number" || meta.version < 1) {
    errors.push({
      code: "meta.version",
      message: "meta.version debe ser un entero >= 1.",
      path: "meta.version",
    })
  }

  const scoreMin = Number(meta?.scoreMin)
  const scoreMax = Number(meta?.scoreMax)
  if (!Number.isFinite(scoreMin) || !Number.isFinite(scoreMax) || scoreMin >= scoreMax) {
    errors.push({
      code: "meta.score_range",
      message: "scoreMin debe ser < scoreMax.",
      path: "meta",
    })
  }

  const confidenceMin = Number(meta?.confidenceMin)
  if (!Number.isFinite(confidenceMin) || confidenceMin < 0 || confidenceMin > 1) {
    errors.push({
      code: "meta.confidenceMin",
      message: "confidenceMin debe estar entre 0 y 1.",
      path: "meta.confidenceMin",
    })
  }

  if (doc.kind !== "default" && doc.kind !== "custom") {
    errors.push({
      code: "kind.invalid",
      message: 'kind debe ser "default" o "custom".',
      path: "kind",
    })
  }

  uniqueIds(doc.dimensions ?? [], "dimensions", errors)
  uniqueIds(doc.blockingRules ?? [], "blockingRules", errors)
  uniqueIds(doc.categories ?? [], "categories", errors)
  uniqueIds(doc.recommendations ?? [], "recommendations", errors)
  uniqueIds(doc.limitEngine?.rules ?? [], "limitEngine.rules", errors)

  const dimensionIds = new Set((doc.dimensions ?? []).map((d) => d.id))
  const categoryCodes = new Set((doc.categories ?? []).map((c) => c.code))

  for (const d of doc.dimensions ?? []) {
    if (d.weight < 0) {
      errors.push({
        code: "dimension.weight_negative",
        message: `Dimensión «${d.id}»: peso ≥ 0.`,
        path: `dimensions.${d.id}.weight`,
      })
    }
    if (!(d.scoreMin <= d.scoreMax)) {
      errors.push({
        code: "dimension.score_range",
        message: `Dimensión «${d.id}»: scoreMin debe ser ≤ scoreMax.`,
        path: `dimensions.${d.id}`,
      })
    }
    if (!["financial", "commercial", "cross"].includes(d.domain)) {
      errors.push({
        code: "dimension.domain",
        message: `Dimensión «${d.id}»: domain inválido.`,
        path: `dimensions.${d.id}.domain`,
      })
    }

    uniqueIds(d.rules ?? [], `dimensions.${d.id}.rules`, errors)

    for (const r of d.rules ?? []) {
      if (!Number.isFinite(r.points)) {
        errors.push({
          code: "rule.points",
          message: `Regla «${r.id}» en «${d.id}»: points inválido.`,
          path: `dimensions.${d.id}.rules.${r.id}.points`,
        })
      }
      if (r.points < d.scoreMin || r.points > d.scoreMax) {
        warnings.push({
          code: "rule.points_out_of_range",
          message: `Regla «${r.id}» en «${d.id}»: points (${r.points}) fuera de [${d.scoreMin}, ${d.scoreMax}].`,
          path: `dimensions.${d.id}.rules.${r.id}.points`,
        })
      }
      if (r.operator === "between" && (r.value == null || r.valueTo == null)) {
        errors.push({
          code: "rule.between_values",
          message: `Regla «${r.id}»: between requiere value y valueTo.`,
          path: `dimensions.${d.id}.rules.${r.id}`,
        })
      }
      if (d.enabled && r.enabled === false) {
        // ok — regla deshabilitada dentro de dimensión activa
      }
    }

    if (d.enabled && (d.rules ?? []).filter((r) => r.enabled).length === 0) {
      warnings.push({
        code: "dimension.rules_empty",
        message: `Dimensión habilitada «${d.id}» sin reglas activas (pendiente de Ajustes).`,
        path: `dimensions.${d.id}.rules`,
      })
    }
  }

  const enabledWeightTotal = sumEnabledWeights(doc)
  if (Math.abs(enabledWeightTotal - WEIGHT_TARGET) > WEIGHT_EPSILON) {
    const rounded = Math.round(enabledWeightTotal * 1000) / 1000
    errors.push({
      code: "weights.sum",
      message: `Suma de pesos de dimensiones habilitadas = ${rounded}% (debe ser ${WEIGHT_TARGET}%).`,
      path: "dimensions",
    })
  }

  if ((doc.dimensions ?? []).filter((d) => d.enabled).length === 0) {
    errors.push({
      code: "dimensions.none_enabled",
      message: "Debe haber al menos una dimensión habilitada.",
      path: "dimensions",
    })
  }

  validateCategories(
    doc.categories ?? [],
    Number.isFinite(scoreMin) ? scoreMin : 0,
    Number.isFinite(scoreMax) ? scoreMax : 100,
    errors,
    warnings
  )

  for (const rule of doc.limitEngine?.rules ?? []) {
    if (rule.categoryCode !== "*" && !categoryCodes.has(rule.categoryCode)) {
      errors.push({
        code: "limit.category_missing",
        message: `Límite «${rule.id}» referencia categoría «${rule.categoryCode}» inexistente.`,
        path: `limitEngine.rules.${rule.id}`,
      })
    }
    if (
      rule.maxTermMonths != null &&
      (!Number.isFinite(rule.maxTermMonths) || rule.maxTermMonths < 0)
    ) {
      errors.push({
        code: "limit.max_term_invalid",
        message: `Límite «${rule.id}»: maxTermMonths inválido.`,
        path: `limitEngine.rules.${rule.id}.maxTermMonths`,
      })
    }
    if (
      rule.reviewFrequencyDays != null &&
      (!Number.isFinite(rule.reviewFrequencyDays) ||
        rule.reviewFrequencyDays < 0)
    ) {
      errors.push({
        code: "limit.review_invalid",
        message: `Límite «${rule.id}»: reviewFrequencyDays inválido.`,
        path: `limitEngine.rules.${rule.id}.reviewFrequencyDays`,
      })
    }
  }

  if (doc.limitEngine && !doc.limitEngine.currency) {
    warnings.push({
      code: "limit.currency_missing",
      message: "limitEngine.currency vacío; se recomienda ISO 4217 (ej. ARS).",
      path: "limitEngine.currency",
    })
  }

  for (const rec of doc.recommendations ?? []) {
    if (rec.dimensionId && !dimensionIds.has(rec.dimensionId)) {
      errors.push({
        code: "recommendation.dimension_missing",
        message: `Recomendación «${rec.id}» referencia dimensión inexistente.`,
        path: `recommendations.${rec.id}`,
      })
    }
  }

  if (doc.extensions?.nosisInOwnScore === true) {
    warnings.push({
      code: "nosis.optional_enabled",
      message:
        "extensions.nosisInOwnScore=true: NOSIS entraría al Score Propio solo si existe dimensión configurada. Por defecto debe permanecer false.",
      path: "extensions.nosisInOwnScore",
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    enabledWeightTotal,
  }
}
