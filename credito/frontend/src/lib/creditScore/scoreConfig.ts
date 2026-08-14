/**
 * Configuración del Score Propio SC-1.0.
 * Perfiles Default / Personalizado. Sin pesos hardcodeados en el motor:
 * el motor solo consume este modelo.
 */

import {
  SCORE_MODEL_ID,
  type ScoreClassificationScales,
  type ScoreConfig,
  type ScoreDimensionId,
  type ScoreWeightMap,
} from "./scoreTypes"

/** Catálogo de dimensiones del modelo de ejemplo (no valores definitivos). */
export const BUILT_IN_SCORE_DIMENSIONS = [
  { id: "liquidity" as const, label: "Liquidez" },
  { id: "debt" as const, label: "Endeudamiento" },
  { id: "profitability" as const, label: "Rentabilidad" },
  { id: "documentation" as const, label: "Documentación" },
  { id: "bcra" as const, label: "BCRA" },
  { id: "checks" as const, label: "Cheques" },
  { id: "seniority" as const, label: "Antigüedad" },
  { id: "coverage" as const, label: "Cobertura" },
] as const

/**
 * Pesos de ejemplo del perfil Default.
 * Ilustrativos — no son la política definitiva de producto.
 * Suma = 100.
 */
export const EXAMPLE_DEFAULT_WEIGHTS: ScoreWeightMap = {
  liquidity: 20,
  debt: 15,
  profitability: 15,
  documentation: 20,
  bcra: 10,
  checks: 10,
  seniority: 5,
  coverage: 5,
}

export const DEFAULT_SCORE_SCALES: ScoreClassificationScales = {
  excelenteMin: 90,
  muyBuenoMin: 75,
  aceptableMin: 60,
  riesgoMin: 40,
}

export const DEFAULT_SCORE_PROFILE_ID = "default"

/**
 * Copia superficial de un mapa de pesos (extensible a nuevas dimensiones).
 */
export function cloneScoreWeights(weights: ScoreWeightMap): ScoreWeightMap {
  return { ...weights }
}

/**
 * Perfil Default: base para que cada cliente copie y personalice después.
 */
export function createDefaultScoreConfig(): ScoreConfig {
  return {
    scoreModel: SCORE_MODEL_ID,
    schemaVersion: 1,
    profile: {
      kind: "default",
      id: DEFAULT_SCORE_PROFILE_ID,
      name: "Default",
      basedOn: null,
    },
    weights: cloneScoreWeights(EXAMPLE_DEFAULT_WEIGHTS),
    scales: { ...DEFAULT_SCORE_SCALES },
    extensions: {},
  }
}

/**
 * Perfil Personalizado a partir del Default (o de otro perfil base).
 * Más adelante: cada cliente copia Default y ajusta pesos.
 *
 * @param overrides Pesos / escalas / metadata a fusionar
 * @param base Config base (por defecto: Default)
 */
export function createCustomScoreConfig(
  overrides: {
    id: string
    name?: string | null
    weights?: Partial<ScoreWeightMap> & Record<string, number>
    scales?: Partial<ScoreClassificationScales>
    extensions?: Record<string, unknown>
  },
  base: ScoreConfig = createDefaultScoreConfig()
): ScoreConfig {
  const weights: ScoreWeightMap = {
    ...cloneScoreWeights(base.weights),
    ...(overrides.weights ?? {}),
  }

  return {
    scoreModel: base.scoreModel,
    schemaVersion: base.schemaVersion,
    profile: {
      kind: "custom",
      id: overrides.id,
      name: overrides.name ?? null,
      basedOn: base.profile.id,
    },
    weights,
    scales: {
      ...base.scales,
      ...(overrides.scales ?? {}),
    },
    extensions: {
      ...(base.extensions ?? {}),
      ...(overrides.extensions ?? {}),
    },
  }
}

/**
 * Normaliza una config parcial / desconocida hacia un ScoreConfig usable.
 * No persiste; no toca Firestore. Útil cuando llegue config desde política.
 */
export function resolveScoreConfig(raw?: unknown): ScoreConfig {
  const defaults = createDefaultScoreConfig()
  if (!raw || typeof raw !== "object") {
    return defaults
  }

  const doc = raw as Record<string, unknown>
  const profileRaw =
    doc.profile && typeof doc.profile === "object"
      ? (doc.profile as Record<string, unknown>)
      : {}
  const weightsRaw =
    doc.weights && typeof doc.weights === "object"
      ? (doc.weights as Record<string, unknown>)
      : {}
  const scalesRaw =
    doc.scales && typeof doc.scales === "object"
      ? (doc.scales as Record<string, unknown>)
      : {}

  const weights: ScoreWeightMap = { ...defaults.weights }
  for (const [key, value] of Object.entries(weightsRaw)) {
    const n = Number(value)
    if (Number.isFinite(n)) {
      weights[key as ScoreDimensionId] = n
    }
  }

  const num = (v: unknown, fb: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fb
  }

  const kind =
    profileRaw.kind === "custom" ? ("custom" as const) : ("default" as const)

  return {
    scoreModel: String(doc.scoreModel ?? defaults.scoreModel),
    schemaVersion: num(doc.schemaVersion, defaults.schemaVersion),
    profile: {
      kind,
      id: String(profileRaw.id ?? (kind === "default" ? DEFAULT_SCORE_PROFILE_ID : "custom")),
      name:
        typeof profileRaw.name === "string"
          ? profileRaw.name
          : kind === "default"
            ? "Default"
            : null,
      basedOn:
        typeof profileRaw.basedOn === "string"
          ? profileRaw.basedOn
          : kind === "custom"
            ? DEFAULT_SCORE_PROFILE_ID
            : null,
    },
    weights,
    scales: {
      excelenteMin: num(scalesRaw.excelenteMin, defaults.scales.excelenteMin),
      muyBuenoMin: num(scalesRaw.muyBuenoMin, defaults.scales.muyBuenoMin),
      aceptableMin: num(scalesRaw.aceptableMin, defaults.scales.aceptableMin),
      riesgoMin: num(scalesRaw.riesgoMin, defaults.scales.riesgoMin),
    },
    extensions:
      doc.extensions && typeof doc.extensions === "object"
        ? { ...(doc.extensions as Record<string, unknown>) }
        : {},
  }
}

/**
 * Etiqueta de una dimensión known o fallback al id.
 */
export function getScoreDimensionLabel(dimensionId: ScoreDimensionId): string {
  const found = BUILT_IN_SCORE_DIMENSIONS.find((d) => d.id === dimensionId)
  return found?.label ?? String(dimensionId)
}
