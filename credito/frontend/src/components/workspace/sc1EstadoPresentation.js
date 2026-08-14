/**
 * Presentación funcional — Estado SC-1.0
 *
 * Traduce códigos internos de banda (AAA…B) a estados visibles para analistas.
 * No modifica score, confidence, límites, bandas ni políticas: solo etiquetas UI/docs.
 *
 * Mapeo de presentación (bandas internas intactas):
 *   AAA / AA / A  → Aprobado
 *   BBB           → Observado
 *   BB            → Riesgo Alto
 *   B             → No Recomendado
 */

/** @typedef {"aprobado" | "observado" | "riesgo_alto" | "no_recomendado"} Sc1EstadoId */

/**
 * @typedef {{
 *   id: Sc1EstadoId;
 *   label: string;
 *   shortLabel: string;
 *   emoji: string;
 *   meaning: string;
 * }} Sc1EstadoDef
 */

/** @type {readonly Sc1EstadoDef[]} */
export const SC1_ESTADOS = Object.freeze([
  {
    id: "aprobado",
    label: "Aprobado",
    shortLabel: "Aprobado",
    emoji: "🟢",
    meaning: "Cliente apto para operar.",
  },
  {
    id: "observado",
    label: "Observado",
    shortLabel: "Observado",
    emoji: "🟡",
    meaning: "Requiere revisión del analista o seguimiento.",
  },
  {
    id: "riesgo_alto",
    label: "Riesgo Alto",
    shortLabel: "Riesgo Alto",
    emoji: "🟠",
    meaning: "Riesgo significativo; operar con mucha cautela.",
  },
  {
    id: "no_recomendado",
    label: "No Recomendado",
    shortLabel: "No Recomendado",
    emoji: "🔴",
    meaning: "No se recomienda otorgar crédito.",
  },
])

/** @type {Record<Sc1EstadoId, Sc1EstadoDef>} */
const ESTADOS_BY_ID = Object.fromEntries(
  SC1_ESTADOS.map((e) => [e.id, e])
)

/**
 * Códigos internos de banda → estado funcional.
 * @type {Record<string, Sc1EstadoId>}
 */
const CODE_TO_ESTADO = {
  AAA: "aprobado",
  AA: "aprobado",
  A: "aprobado",
  BBB: "observado",
  BB: "riesgo_alto",
  B: "no_recomendado",
}

/**
 * Etiquetas legacy de banda → estado (fallback si no hay código).
 * @type {Record<string, Sc1EstadoId>}
 */
const LABEL_TO_ESTADO = {
  excelente: "aprobado",
  "muy bueno": "aprobado",
  bueno: "aprobado",
  aceptable: "observado",
  observado: "riesgo_alto",
  crítico: "no_recomendado",
  critico: "no_recomendado",
}

/**
 * @param {string | null | undefined} code
 * @param {string | null | undefined} [label]
 * @returns {Sc1EstadoId | null}
 */
export function resolveSc1EstadoId(code, label) {
  if (typeof code === "string" && code.trim()) {
    const key = code.trim().toUpperCase()
    if (CODE_TO_ESTADO[key]) return CODE_TO_ESTADO[key]
  }
  if (typeof label === "string" && label.trim()) {
    const key = label.trim().toLowerCase()
    if (LABEL_TO_ESTADO[key]) return LABEL_TO_ESTADO[key]
  }
  return null
}

/**
 * @param {Sc1EstadoId | null | undefined} id
 * @returns {Sc1EstadoDef | null}
 */
export function getSc1EstadoDef(id) {
  if (!id) return null
  return ESTADOS_BY_ID[id] ?? null
}

/**
 * Texto visible: "🟢 Aprobado"
 * @param {string | null | undefined} code
 * @param {string | null | undefined} [label]
 */
export function formatSc1Estado(code, label) {
  const id = resolveSc1EstadoId(code, label)
  const def = getSc1EstadoDef(id)
  if (!def) return "—"
  return `${def.emoji} ${def.label}`
}

/**
 * Solo etiqueta sin emoji (CSV / filtros compactos).
 * @param {string | null | undefined} code
 * @param {string | null | undefined} [label]
 */
export function formatSc1EstadoLabel(code, label) {
  const id = resolveSc1EstadoId(code, label)
  const def = getSc1EstadoDef(id)
  return def ? def.label : "—"
}

/**
 * Opciones de filtro UI (Cartera).
 * @type {ReadonlyArray<{ id: Sc1EstadoId; label: string }>}
 */
export const PORTFOLIO_SC1_ESTADO_OPTIONS = SC1_ESTADOS.map((e) => ({
  id: e.id,
  label: `${e.emoji} ${e.label}`,
}))

