/**
 * Helpers de presentación del Decision Cockpit.
 * No calculan cobertura/score: solo reordenan y redactan señales ya existentes.
 */

import { RESULTADO_COBERTURA } from "@/lib/coverageRequirements"

/** @typedef {"positive"|"risk"|"blocking"} DecisionFactorKind */

/**
 * @typedef {{
 *   id: string;
 *   kind: DecisionFactorKind;
 *   text: string;
 * }} DecisionFactorItem
 */

/** Etiquetas cortas orientadas al negocio (solo presentación). */
const CHECKLIST_SHORT = {
  antiguedad: {
    positive: "Antigüedad suficiente",
    blocking: "Antigüedad insuficiente",
  },
  cheques: {
    positive: "Sin cheques rechazados",
    blocking: "Cheques rechazados",
  },
  atrasosBancarios: {
    positive: "Sin atrasos BCRA",
    blocking: "Atrasos bancarios BCRA",
  },
  facturasContado: {
    positive: "Facturas al contado",
    blocking: "Sin facturas al contado",
  },
}

const RISK_LEVEL_LABEL = {
  good: "Bajo",
  medium: "Medio",
  risky: "Alto",
  unknown: "Sin evaluar",
}

/**
 * @param {string | null | undefined} estadoGeneral
 */
export function getDecisionRiskLevelLabel(estadoGeneral) {
  return RISK_LEVEL_LABEL[estadoGeneral] ?? RISK_LEVEL_LABEL.unknown
}

/**
 * @param {string | null | undefined} resultadoCobertura
 */
export function hasCoverageFromResultado(resultadoCobertura) {
  return (
    typeof resultadoCobertura === "string" &&
    resultadoCobertura !== RESULTADO_COBERTURA.SIN_COBERTURA
  )
}

/**
 * @param {unknown} item
 */
export function isDocumentacionPendienteItem(item) {
  if (!item || typeof item !== "object") return false
  const row = /** @type {Record<string, unknown>} */ (item)
  if (row.confirmed === true) return false
  if (row.optional === true) {
    return row.status === "Pendiente"
  }
  return row.status === "Pendiente" || row.tone === "danger"
}

/**
 * @param {unknown} item
 */
export function isDocumentacionOkItem(item) {
  if (!item || typeof item !== "object") return false
  const row = /** @type {Record<string, unknown>} */ (item)
  if (row.confirmed === true) return true
  if (row.optional === true) return row.status !== "Pendiente"
  return row.status !== "Pendiente" && row.tone !== "danger"
}

/**
 * Lista completa para el bloque Documentación (✓ / ✗).
 * @param {unknown[] | null | undefined} items
 * @returns {Array<{ label: string; ok: boolean; optional: boolean; status: string }>}
 */
export function getDocumentacionStatusList(items) {
  if (!Array.isArray(items)) return []
  return items.map((item) => {
    const row = /** @type {Record<string, unknown>} */ (item || {})
    return {
      label: String(row.label ?? "Documento"),
      ok: isDocumentacionOkItem(row),
      optional: row.optional === true,
      status: String(row.status ?? "Pendiente"),
    }
  })
}

/**
 * @param {unknown[] | null | undefined} items
 */
export function getDocumentacionPendienteItems(items) {
  if (!Array.isArray(items)) return []
  return items.filter(isDocumentacionPendienteItem)
}

/**
 * Clasifica señales existentes en Fortalezas / Riesgos / Bloqueantes.
 * Redacción corta de negocio; sin motores nuevos.
 *
 * @param {{
 *   checklist?: Array<{ key?: string; label?: string; cumple?: boolean }> | null;
 *   motivosExclusion?: string[] | null;
 *   displayWarnings?: string[] | null;
 *   estadoGeneral?: string | null;
 *   resultadoCobertura?: string | null;
 *   documentalCompletitud?: number | null;
 *   dictamenPatrimonial?: { semaforo?: string | null; label?: string | null; texto?: string | null } | null;
 *   nosisAlertas?: string[] | null;
 *   iaFortalezas?: string[] | null;
 *   iaDebilidades?: string[] | null;
 *   iaMonitorear?: string[] | null;
 * }} input
 * @returns {{ positive: DecisionFactorItem[]; risk: DecisionFactorItem[]; blocking: DecisionFactorItem[] }}
 */
export function buildDecisionFactorGroups(input) {
  /** @type {DecisionFactorItem[]} */
  const positive = []
  /** @type {DecisionFactorItem[]} */
  const risk = []
  /** @type {DecisionFactorItem[]} */
  const blocking = []
  const seen = new Set()

  /**
   * @param {DecisionFactorKind} kind
   * @param {string} id
   * @param {string} text
   */
  const push = (kind, id, text) => {
    const normalized = String(text || "").trim()
    if (!normalized) return
    const dedupeKey = `${kind}:${normalized.toLowerCase()}`
    if (seen.has(dedupeKey) || seen.has(id)) return
    seen.add(dedupeKey)
    seen.add(id)
    const item = { id, kind, text: normalized }
    if (kind === "positive") positive.push(item)
    else if (kind === "risk") risk.push(item)
    else blocking.push(item)
  }

  const checklist = Array.isArray(input.checklist) ? input.checklist : []
  for (const row of checklist) {
    const key = String(row?.key ?? "")
    const copy = CHECKLIST_SHORT[key]
    if (row?.cumple) {
      push(
        "positive",
        `check-ok-${key}`,
        copy?.positive ?? String(row.label ?? key)
      )
    } else {
      push(
        "blocking",
        `check-fail-${key}`,
        copy?.blocking ?? String(row.label ?? key)
      )
    }
  }

  if (!hasCoverageFromResultado(input.resultadoCobertura)) {
    push("blocking", "sin-cobertura", "Sin cobertura")
  }

  const motivos = Array.isArray(input.motivosExclusion)
    ? input.motivosExclusion
    : []
  if (blocking.filter((b) => b.id.startsWith("check-fail")).length === 0) {
    for (let i = 0; i < motivos.length; i += 1) {
      const motivo = String(motivos[i] ?? "").trim()
      if (!motivo) continue
      push("blocking", `motivo-${i}`, shortPhrase(motivo))
    }
  }

  const iaFortalezas = Array.isArray(input.iaFortalezas)
    ? input.iaFortalezas
    : []
  for (let i = 0; i < iaFortalezas.length; i += 1) {
    push("positive", `ia-f-${i}`, shortPhrase(iaFortalezas[i]))
  }

  const warnings = Array.isArray(input.displayWarnings)
    ? input.displayWarnings
    : []
  for (let i = 0; i < warnings.length; i += 1) {
    push("risk", `warn-${i}`, shortPhrase(warnings[i]))
  }

  const dictamen = input.dictamenPatrimonial
  if (
    dictamen &&
    (dictamen.semaforo === "risky" || dictamen.semaforo === "medium")
  ) {
    const label = String(dictamen.label || "").trim()
    if (label) push("risk", "dictamen", shortPhrase(label))
  }

  if (input.estadoGeneral === "risky") {
    push("risk", "estado-general", "Riesgo crediticio alto")
  } else if (input.estadoGeneral === "medium") {
    push("risk", "estado-general", "Riesgo crediticio medio")
  }

  if (
    typeof input.documentalCompletitud === "number" &&
    input.documentalCompletitud < 100
  ) {
    push("risk", "docs-incompletas", "Documentación incompleta")
  }

  const alertas = Array.isArray(input.nosisAlertas) ? input.nosisAlertas : []
  for (let i = 0; i < alertas.length; i += 1) {
    push("risk", `nosis-${i}`, shortPhrase(alertas[i]))
  }

  const iaDebilidades = Array.isArray(input.iaDebilidades)
    ? input.iaDebilidades
    : []
  for (let i = 0; i < iaDebilidades.length; i += 1) {
    push("risk", `ia-d-${i}`, shortPhrase(iaDebilidades[i]))
  }

  const iaMonitorear = Array.isArray(input.iaMonitorear)
    ? input.iaMonitorear
    : []
  for (let i = 0; i < iaMonitorear.length; i += 1) {
    push("risk", `ia-m-${i}`, shortPhrase(iaMonitorear[i]))
  }

  return { positive, risk, blocking }
}

/**
 * Acorta frases largas para escaneo (solo presentación).
 * @param {unknown} value
 */
function shortPhrase(value) {
  const text = String(value ?? "").trim()
  if (!text) return ""
  const cleaned = text.replace(/\s+/g, " ").replace(/\.$/, "")
  if (cleaned.length <= 64) return cleaned
  return `${cleaned.slice(0, 61).trim()}…`
}
