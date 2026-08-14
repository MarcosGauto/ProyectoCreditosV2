/**
 * Validación de configuración del Score Propio SC-1.0.
 */

import type {
  ScoreConfig,
  ScoreValidationIssue,
  ScoreValidationResult,
  ScoreWeightMap,
} from "./scoreTypes"

const WEIGHT_TARGET = 100
/** Tolerancia numérica mínima (floats) */
const WEIGHT_EPSILON = 1e-9

/**
 * Suma de pesos de un mapa de dimensiones.
 */
export function sumScoreWeights(weights: ScoreWeightMap): number {
  return Object.values(weights).reduce((sum, value) => {
    const n = Number(value)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)
}

/**
 * Valida que todos los pesos sean >= 0 y que sumen exactamente 100.
 */
export function validateScoreWeights(
  weights: ScoreWeightMap | null | undefined
): ScoreValidationResult {
  const errors: ScoreValidationIssue[] = []
  const warnings: ScoreValidationIssue[] = []

  if (!weights || typeof weights !== "object") {
    return {
      valid: false,
      errors: [
        {
          code: "weights.missing",
          message: "Falta el mapa de pesos del scoring.",
          path: "weights",
        },
      ],
      warnings: [],
      weightTotal: null,
    }
  }

  const entries = Object.entries(weights)
  if (entries.length === 0) {
    return {
      valid: false,
      errors: [
        {
          code: "weights.empty",
          message: "El mapa de pesos está vacío. Debe incluir al menos una dimensión.",
          path: "weights",
        },
      ],
      warnings: [],
      weightTotal: 0,
    }
  }

  for (const [dimensionId, raw] of entries) {
    const n = Number(raw)
    if (!Number.isFinite(n)) {
      errors.push({
        code: "weights.invalid_number",
        message: `El peso de «${dimensionId}» no es un número válido.`,
        path: `weights.${dimensionId}`,
      })
      continue
    }
    if (n < 0) {
      errors.push({
        code: "weights.negative",
        message: `El peso de «${dimensionId}» debe ser ≥ 0 (recibido: ${n}).`,
        path: `weights.${dimensionId}`,
      })
    }
  }

  const weightTotal = sumScoreWeights(weights)
  const delta = Math.abs(weightTotal - WEIGHT_TARGET)

  if (delta > WEIGHT_EPSILON) {
    const rounded = Math.round(weightTotal * 1000) / 1000
    if (weightTotal < WEIGHT_TARGET) {
      errors.push({
        code: "weights.sum_under",
        message: `La suma de pesos es ${rounded}% (faltan ${Math.round((WEIGHT_TARGET - weightTotal) * 1000) / 1000}%). Debe ser exactamente ${WEIGHT_TARGET}%.`,
        path: "weights",
      })
    } else {
      errors.push({
        code: "weights.sum_over",
        message: `La suma de pesos es ${rounded}% (excede ${Math.round((weightTotal - WEIGHT_TARGET) * 1000) / 1000}%). Debe ser exactamente ${WEIGHT_TARGET}%.`,
        path: "weights",
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    weightTotal,
  }
}

/**
 * Valida una ScoreConfig completa (pesos + escalas básicas).
 */
export function validateScoreConfig(
  config: ScoreConfig | null | undefined
): ScoreValidationResult {
  const errors: ScoreValidationIssue[] = []
  const warnings: ScoreValidationIssue[] = []

  if (!config || typeof config !== "object") {
    return {
      valid: false,
      errors: [
        {
          code: "config.missing",
          message: "Falta la configuración del Score Propio.",
          path: "config",
        },
      ],
      warnings: [],
      weightTotal: null,
    }
  }

  if (!config.scoreModel) {
    errors.push({
      code: "config.scoreModel",
      message: "Falta scoreModel en la configuración.",
      path: "scoreModel",
    })
  }

  if (!config.profile?.id) {
    errors.push({
      code: "config.profile.id",
      message: "El perfil de scoring debe tener un id.",
      path: "profile.id",
    })
  }

  if (
    config.profile?.kind !== "default" &&
    config.profile?.kind !== "custom"
  ) {
    errors.push({
      code: "config.profile.kind",
      message: 'profile.kind debe ser "default" o "custom".',
      path: "profile.kind",
    })
  }

  const weightResult = validateScoreWeights(config.weights)
  errors.push(...weightResult.errors)
  warnings.push(...weightResult.warnings)

  const scales = config.scales
  if (!scales) {
    errors.push({
      code: "scales.missing",
      message: "Faltan las escalas de clasificación.",
      path: "scales",
    })
  } else {
    const keys = [
      "excelenteMin",
      "muyBuenoMin",
      "aceptableMin",
      "riesgoMin",
    ] as const
    for (const key of keys) {
      const n = Number(scales[key])
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        errors.push({
          code: "scales.invalid",
          message: `scales.${key} debe ser un número entre 0 y 100.`,
          path: `scales.${key}`,
        })
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    weightTotal: weightResult.weightTotal,
  }
}
