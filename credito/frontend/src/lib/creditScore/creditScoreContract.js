/**
 * Contrato Score Propio (SC-1.0) — presentación y clasificación.
 * El valor del MVP es el score financiero propio (0–100).
 * NOSIS no participa del cálculo; queda como info externa.
 */

export const SCORE_MODEL_ID = "SC-1.0"

/** @typedef {"excellent"|"very_good"|"acceptable"|"risk"|"critical"|"unknown"} CreditScoreCategory */

/**
 * Escalas por defecto (sobre valor 0–100 del motor actual).
 * Configurables desde Ajustes sin cambiar el algoritmo.
 */
export const DEFAULT_SCORE_PROPIO_ESCALAS = {
  excelenteMin: 90,
  muyBuenoMin: 75,
  aceptableMin: 60,
  riesgoMin: 40,
}

/**
 * @param {unknown} raw
 */
export function resolveScorePropioEscalas(raw) {
  const row =
    raw && typeof raw === "object"
      ? /** @type {Record<string, unknown>} */ (raw)
      : {}
  const num = (v, fb) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fb
  }
  return {
    excelenteMin: num(row.excelenteMin, DEFAULT_SCORE_PROPIO_ESCALAS.excelenteMin),
    muyBuenoMin: num(row.muyBuenoMin, DEFAULT_SCORE_PROPIO_ESCALAS.muyBuenoMin),
    aceptableMin: num(row.aceptableMin, DEFAULT_SCORE_PROPIO_ESCALAS.aceptableMin),
    riesgoMin: num(row.riesgoMin, DEFAULT_SCORE_PROPIO_ESCALAS.riesgoMin),
  }
}

/**
 * @param {number | null | undefined} value
 * @param {ReturnType<typeof resolveScorePropioEscalas>} escalas
 * @returns {{ category: CreditScoreCategory; categoryLabel: string }}
 */
export function classifyOwnScore(value, escalas = DEFAULT_SCORE_PROPIO_ESCALAS) {
  if (value == null || !Number.isFinite(value)) {
    return { category: "unknown", categoryLabel: "Sin evaluar" }
  }
  if (value >= escalas.excelenteMin) {
    return { category: "excellent", categoryLabel: "Excelente" }
  }
  if (value >= escalas.muyBuenoMin) {
    return { category: "very_good", categoryLabel: "Muy bueno" }
  }
  if (value >= escalas.aceptableMin) {
    return { category: "acceptable", categoryLabel: "Aceptable" }
  }
  if (value >= escalas.riesgoMin) {
    return { category: "risk", categoryLabel: "Riesgo" }
  }
  return { category: "critical", categoryLabel: "Crítico" }
}

/**
 * Estado operativo NOSIS (info externa) — Aprobado / Observado.
 * @param {number | null | undefined} scoreNosis
 * @param {{ scoreAprobadoMinimo?: number; scoreObservadoMinimo?: number } | null} [nosisConfig]
 * @returns {"Aprobado"|"Observado"|"Sin dato"}
 */
export function getNosisExternalStatusLabel(scoreNosis, nosisConfig = null) {
  if (scoreNosis == null || !Number.isFinite(scoreNosis)) return "Sin dato"
  const aprobadoMin = nosisConfig?.scoreAprobadoMinimo ?? 70
  if (scoreNosis >= aprobadoMin) return "Aprobado"
  return "Observado"
}

/**
 * Arma el objeto creditScore de presentación (sin algoritmo nuevo).
 * Final Score MVP = score financiero propio.
 *
 * @param {{
 *   scoreFinanciero?: number | null;
 *   scoreNosis?: number | null;
 *   scoreGeneralPonderado?: number | null;
 *   estadoGeneral?: string | null;
 *   resultadoCobertura?: string | null;
 *   policy?: import("@/lib/creditPolicy/creditPolicyTypes").CreditPolicy | null;
 * }} input
 */
export function buildCreditScorePresentation(input) {
  const policy = input.policy ?? null
  const escalas = resolveScorePropioEscalas(policy?.scorePropio?.escalas)
  const value =
    input.scoreFinanciero != null && Number.isFinite(input.scoreFinanciero)
      ? Number(input.scoreFinanciero)
      : null
  const classified = classifyOwnScore(value, escalas)
  const incluirNosis = policy?.estadoGeneral?.incluirNosisEnCalculo === true

  return {
    scoreModel: policy?.scorePropio?.scoreModel ?? SCORE_MODEL_ID,
    schemaVersion: 1,
    financialScore: {
      value,
      category: classified.category,
      categoryLabel: classified.categoryLabel,
    },
    commercialScore: {
      value: null,
      category: "unknown",
      categoryLabel: "Sin evaluar",
    },
    finalScore: {
      value,
      category: classified.category,
      categoryLabel: classified.categoryLabel,
    },
    confidence: {
      value: value != null ? 0.7 : 0,
      level: value != null ? "medium" : "low",
      label: value != null ? "Media" : "Baja",
      missing: [],
    },
    strengths: [],
    weaknesses: [],
    observations: incluirNosis
      ? []
      : [
          {
            id: "nosis-external",
            text: "NOSIS no participa del Score Propio; se muestra solo como información externa.",
            severity: "info",
          },
        ],
    recommendations: [],
    legacy: {
      scoreFinanciero: input.scoreFinanciero ?? null,
      scoreGeneralPonderado: input.scoreGeneralPonderado ?? null,
      scoreNosis: input.scoreNosis ?? null,
      estadoGeneral: input.estadoGeneral ?? null,
      resultadoCobertura: input.resultadoCobertura ?? null,
    },
    nosisExternal: {
      score: input.scoreNosis ?? null,
      status: getNosisExternalStatusLabel(
        input.scoreNosis,
        policy?.configuracionNosis ?? null
      ),
    },
    simulation: {
      supported: false,
    },
    computedAt: null,
  }
}
