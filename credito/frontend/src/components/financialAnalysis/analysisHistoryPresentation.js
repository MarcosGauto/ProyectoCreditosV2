/**
 * Analysis History — solo presentación sobre versiones publicadas.
 * No recalcula, no inventa métricas, no toca persistencia.
 */

import { RESULTADO_COBERTURA } from "@/lib/coverageRequirements"

/** @typedef {"up"|"down"|"flat"|"na"} TrendDirection */

/** @typedef {{
 *   key: string;
 *   label: string;
 *   currentLabel: string;
 *   trend: TrendDirection;
 *   trendLabel: string;
 * }} HistoryMetricRow */

/** @typedef {{
 *   estado: HistoryMetricRow[];
 *   ratios: HistoryMetricRow[];
 *   documentacion: {
 *     agregados: string[];
 *     faltantes: string[];
 *   };
 *   decision: { id: string; label: string }[];
 *   hasAnyChange: boolean;
 * }} HistoryComparison */

const TREND_LABEL = {
  up: "▲ Mejoró",
  down: "▼ Empeoró",
  flat: "= Sin cambios",
  na: "= Sin cambios",
}

/**
 * @param {unknown} value
 * @returns {Date | null}
 */
export function toPublishedDate(value) {
  if (!value) return null
  try {
    if (
      typeof value === "object" &&
      value !== null &&
      typeof /** @type {{ toDate?: () => Date }} */ (value).toDate === "function"
    ) {
      return /** @type {{ toDate: () => Date }} */ (value).toDate()
    }
    const date = new Date(String(value))
    return Number.isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * @param {unknown} value
 * @param {"short"|"long"|"datetime"} [style]
 */
export function formatHistoryDate(value, style = "short") {
  const date = toPublishedDate(value)
  if (!date) return "—"
  try {
    if (style === "datetime") {
      return date.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
    if (style === "long") {
      return date.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    }
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

/**
 * @param {unknown} resultadoCobertura
 */
export function hasCoverage(resultadoCobertura) {
  return (
    typeof resultadoCobertura === "string" &&
    resultadoCobertura !== RESULTADO_COBERTURA.SIN_COBERTURA &&
    resultadoCobertura.length > 0
  )
}

/**
 * @param {unknown} resultadoCobertura
 */
export function coverageConSinLabel(resultadoCobertura) {
  if (!resultadoCobertura) return "—"
  return hasCoverage(resultadoCobertura) ? "CON" : "SIN"
}

/**
 * @param {unknown} estadoGeneral
 */
export function riskShortLabel(estadoGeneral) {
  const map = {
    good: "Bajo",
    medium: "Medio",
    risky: "Alto",
    unknown: "Sin evaluar",
  }
  return map[String(estadoGeneral ?? "")] ?? "Sin evaluar"
}

/**
 * Lee métricas ya publicadas (compareIndex + snapshot si hace falta).
 * @param {Record<string, unknown> | null | undefined} version
 */
export function getVersionMetrics(version) {
  const idx = /** @type {Record<string, unknown>} */ (version?.compareIndex ?? {})
  const snapshot = /** @type {Record<string, unknown>} */ (version?.snapshot ?? {})
  const computed = /** @type {Record<string, unknown>} */ (snapshot.computed ?? {})
  const capacidad = /** @type {Record<string, unknown>} */ (
    computed.capacidadEconomica ?? {}
  )

  const scoreRaw =
    idx.scoreFinanciero != null
      ? Number(idx.scoreFinanciero)
      : idx.scoreGeneralPonderado != null
        ? Number(idx.scoreGeneralPonderado)
        : null

  // Rentabilidad: solo si el snapshot/compareIndex ya trae un campo real.
  const rentabilidadRaw =
    idx.rentabilidad != null
      ? Number(idx.rentabilidad)
      : capacidad.rentabilidad != null
        ? Number(capacidad.rentabilidad)
        : null

  return {
    score: Number.isFinite(scoreRaw) ? scoreRaw : null,
    linea:
      idx.preCalificacion != null && Number.isFinite(Number(idx.preCalificacion))
        ? Number(idx.preCalificacion)
        : null,
    liquidez:
      idx.liquidezCorriente != null &&
      Number.isFinite(Number(idx.liquidezCorriente))
        ? Number(idx.liquidezCorriente)
        : null,
    endeudamiento:
      idx.endeudamiento != null && Number.isFinite(Number(idx.endeudamiento))
        ? Number(idx.endeudamiento)
        : null,
    rentabilidad:
      rentabilidadRaw != null && Number.isFinite(rentabilidadRaw)
        ? rentabilidadRaw
        : null,
    resultadoCobertura: idx.resultadoCobertura ?? null,
    estadoGeneral: idx.estadoGeneral ?? null,
  }
}

/**
 * Documentos presentes en el snapshot publicado (sin recalcular).
 * @param {Record<string, unknown> | null | undefined} version
 * @returns {{ id: string; label: string }[]}
 */
export function getPresentDocuments(version) {
  const snapshot = /** @type {Record<string, unknown>} */ (version?.snapshot ?? {})
  const inputs = /** @type {Record<string, unknown>} */ (snapshot.inputs ?? {})
  /** @type {{ id: string; label: string }[]} */
  const docs = []

  if (Array.isArray(inputs.iva) && inputs.iva.length > 0) {
    docs.push({ id: "iva", label: "IVA" })
  }
  if (Array.isArray(inputs.iibb) && inputs.iibb.length > 0) {
    docs.push({ id: "iibb", label: "IIBB" })
  }
  if (Array.isArray(inputs.balances) && inputs.balances.length > 0) {
    docs.push({ id: "balances", label: "Balances" })
  }
  if (inputs.balanceContable && typeof inputs.balanceContable === "object") {
    docs.push({ id: "balanceContable", label: "Balance contable" })
  }
  if (inputs.nosis && typeof inputs.nosis === "object") {
    docs.push({ id: "nosis", label: "NOSIS" })
  }
  if (inputs.bcra && typeof inputs.bcra === "object") {
    docs.push({ id: "bcra", label: "BCRA" })
  }

  return docs
}

/**
 * @param {number | null | undefined} current
 * @param {number | null | undefined} previous
 * @param {{ higherIsBetter?: boolean; decimals?: number; money?: boolean }} [opts]
 */
function numericTrend(current, previous, opts = {}) {
  const higherIsBetter = opts.higherIsBetter !== false
  const decimals = opts.decimals ?? 2
  const format = (n) => {
    if (n == null || !Number.isFinite(n)) return "—"
    if (opts.money) {
      try {
        return new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: "ARS",
          maximumFractionDigits: 0,
        }).format(n)
      } catch {
        return String(Math.round(n))
      }
    }
    return n.toLocaleString("es-AR", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: 0,
    })
  }

  const currentLabel = format(current ?? null)

  if (
    current == null ||
    previous == null ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous)
  ) {
    return { trend: /** @type {TrendDirection} */ ("na"), currentLabel }
  }

  const delta = current - previous
  if (Math.abs(delta) < 1e-9) {
    return { trend: /** @type {TrendDirection} */ ("flat"), currentLabel }
  }

  const improved = higherIsBetter ? delta > 0 : delta < 0
  return {
    trend: /** @type {TrendDirection} */ (improved ? "up" : "down"),
    currentLabel,
  }
}

/**
 * @param {TrendDirection} trend
 */
export function trendDisplayLabel(trend) {
  return TREND_LABEL[trend] ?? TREND_LABEL.flat
}

/**
 * Comparación visual vs versión inmediatamente anterior.
 * Solo incluye filas con dato real; tendencias sin % inventados.
 *
 * @param {Record<string, unknown> | null | undefined} current
 * @param {Record<string, unknown> | null | undefined} previous
 * @returns {HistoryComparison | null}
 */
export function buildHistoryComparison(current, previous) {
  if (!current || !previous) return null

  const a = getVersionMetrics(current)
  const b = getVersionMetrics(previous)

  /**
   * @param {string} key
   * @param {string} label
   * @param {string} currentLabel
   * @param {TrendDirection} trend
   * @returns {HistoryMetricRow}
   */
  const row = (key, label, currentLabel, trend) => ({
    key,
    label,
    currentLabel,
    trend,
    trendLabel: trendDisplayLabel(trend),
  })

  /** @type {HistoryMetricRow[]} */
  const estado = []

  if (a.score != null || b.score != null) {
    const t = numericTrend(a.score, b.score, {
      higherIsBetter: true,
      decimals: 0,
    })
    estado.push(row("score", "Score propio", t.currentLabel, t.trend))
  }

  if (a.resultadoCobertura != null || b.resultadoCobertura != null) {
    const covNow = hasCoverage(a.resultadoCobertura)
    const covPrev = hasCoverage(b.resultadoCobertura)
    let trend = /** @type {TrendDirection} */ ("flat")
    if (a.resultadoCobertura == null || b.resultadoCobertura == null) {
      trend = "na"
    } else if (covNow && !covPrev) {
      trend = "up"
    } else if (!covNow && covPrev) {
      trend = "down"
    }
    estado.push(
      row("cobertura", "Cobertura", coverageConSinLabel(a.resultadoCobertura), trend)
    )
  }

  if (a.linea != null || b.linea != null) {
    const t = numericTrend(a.linea, b.linea, {
      higherIsBetter: true,
      money: true,
    })
    estado.push(row("linea", "Línea sugerida", t.currentLabel, t.trend))
  }

  if (a.estadoGeneral != null || b.estadoGeneral != null) {
    const riskNow = String(a.estadoGeneral ?? "")
    const riskPrev = String(b.estadoGeneral ?? "")
    const riskRank = { good: 3, medium: 2, risky: 1, unknown: 0 }
    let trend = /** @type {TrendDirection} */ ("flat")
    if (!riskNow || !riskPrev) {
      trend = "na"
    } else if (riskNow !== riskPrev) {
      const d = (riskRank[riskNow] ?? 0) - (riskRank[riskPrev] ?? 0)
      trend = d === 0 ? "flat" : d > 0 ? "up" : "down"
    }
    estado.push(
      row("estadoGeneral", "Estado general", riskShortLabel(a.estadoGeneral), trend)
    )
  }

  /** @type {HistoryMetricRow[]} */
  const ratios = []

  if (a.liquidez != null || b.liquidez != null) {
    const t = numericTrend(a.liquidez, b.liquidez, {
      higherIsBetter: true,
      decimals: 2,
    })
    ratios.push(row("liquidez", "Liquidez", t.currentLabel, t.trend))
  }

  if (a.endeudamiento != null || b.endeudamiento != null) {
    const t = numericTrend(a.endeudamiento, b.endeudamiento, {
      higherIsBetter: false,
      decimals: 2,
    })
    ratios.push(row("endeudamiento", "Endeudamiento", t.currentLabel, t.trend))
  }

  // Rentabilidad solo si existe dato real en ambas o al menos en una versión.
  if (a.rentabilidad != null || b.rentabilidad != null) {
    const t = numericTrend(a.rentabilidad, b.rentabilidad, {
      higherIsBetter: true,
      decimals: 2,
    })
    if (a.rentabilidad != null) {
      ratios.push(row("rentabilidad", "Rentabilidad", t.currentLabel, t.trend))
    }
  }

  const docsNow = getPresentDocuments(current)
  const docsPrev = getPresentDocuments(previous)
  const nowIds = new Set(docsNow.map((d) => d.id))
  const prevIds = new Set(docsPrev.map((d) => d.id))

  const agregados = docsNow
    .filter((d) => !prevIds.has(d.id))
    .map((d) => d.label)
  const faltantes = docsPrev
    .filter((d) => !nowIds.has(d.id))
    .map((d) => d.label)

  /** @type {{ id: string; label: string }[]} */
  const decision = []
  const covNow = hasCoverage(a.resultadoCobertura)
  const covPrev = hasCoverage(b.resultadoCobertura)
  if (
    a.resultadoCobertura != null &&
    b.resultadoCobertura != null &&
    covNow !== covPrev
  ) {
    if (covPrev && !covNow) {
      decision.push({
        id: "cov-con-sin",
        label: "Cambió de CON → SIN cobertura",
      })
    } else if (!covPrev && covNow) {
      decision.push({
        id: "cov-sin-con",
        label: "Cambió de SIN → CON cobertura",
      })
    }
  }

  if (
    a.linea != null &&
    b.linea != null &&
    Number.isFinite(a.linea) &&
    Number.isFinite(b.linea) &&
    Math.abs(a.linea - b.linea) >= 1e-9
  ) {
    decision.push({
      id: "limite",
      label: "Cambió el límite sugerido",
    })
  }

  const estadoChanged = estado.some((r) => r.trend === "up" || r.trend === "down")
  const ratiosChanged = ratios.some((r) => r.trend === "up" || r.trend === "down")
  const docsChanged = agregados.length > 0 || faltantes.length > 0
  const decisionChanged = decision.length > 0

  return {
    estado,
    ratios,
    documentacion: { agregados, faltantes },
    decision,
    hasAnyChange:
      estadoChanged || ratiosChanged || docsChanged || decisionChanged,
  }
}

/**
 * Filas de tendencia compactas para una tarjeta (solo métricas de estado).
 * @param {Record<string, unknown> | null | undefined} current
 * @param {Record<string, unknown> | null | undefined} previous
 */
export function buildCardTrends(current, previous) {
  const comparison = buildHistoryComparison(current, previous)
  if (!comparison) return []
  return comparison.estado.filter((r) =>
    ["score", "cobertura", "linea"].includes(r.key)
  )
}

/**
 * Chips de cambios reales (solo lo que cambió).
 * @param {HistoryComparison | null | undefined} comparison
 * @returns {{ id: string; label: string; tone: "up"|"down"|"info" }[]}
 */
export function buildChangeChips(comparison) {
  if (!comparison) return []

  /** @type {{ id: string; label: string; tone: "up"|"down"|"info" }[]} */
  const chips = []

  for (const item of comparison.decision) {
    chips.push({
      id: item.id,
      label: item.label,
      tone: item.id === "cov-sin-con" ? "up" : "down",
    })
  }

  for (const row of [...comparison.estado, ...comparison.ratios]) {
    if (row.trend !== "up" && row.trend !== "down") continue
    if (row.key === "linea" && comparison.decision.some((d) => d.id === "limite")) {
      continue
    }
    if (row.key === "cobertura" && comparison.decision.some((d) => d.id.startsWith("cov-"))) {
      continue
    }
    chips.push({
      id: `metric-${row.key}`,
      label: `${row.label}: ${row.trendLabel}`,
      tone: row.trend,
    })
  }

  for (const label of comparison.documentacion.agregados) {
    chips.push({
      id: `doc-add-${label}`,
      label: `+ ${label}`,
      tone: "up",
    })
  }
  for (const label of comparison.documentacion.faltantes) {
    chips.push({
      id: `doc-miss-${label}`,
      label: `− ${label}`,
      tone: "down",
    })
  }

  return chips
}

/**
 * Resumen ejecutivo de evolución vs la versión anterior.
 * @param {HistoryComparison | null | undefined} comparison
 * @param {{ versionCount?: number }} [opts]
 * @returns {{ headline: string; detail: string; tone: "up"|"down"|"flat"|"na" }}
 */
export function buildEvolutionSummary(comparison, opts = {}) {
  const versionCount = opts.versionCount ?? 0

  if (!comparison) {
    return {
      headline:
        versionCount <= 1
          ? "Primera versión publicada"
          : "Sin comparación disponible",
      detail:
        versionCount <= 1
          ? "Todavía no hay una versión anterior para medir evolución."
          : "No hay datos suficientes para resumir la evolución.",
      tone: "na",
    }
  }

  if (!comparison.hasAnyChange) {
    return {
      headline: "Sin cambios relevantes",
      detail: "La versión actual mantiene el mismo estado que la anterior.",
      tone: "flat",
    }
  }

  const ups = [...comparison.estado, ...comparison.ratios].filter(
    (r) => r.trend === "up"
  ).length
  const downs = [...comparison.estado, ...comparison.ratios].filter(
    (r) => r.trend === "down"
  ).length
  const recovered = comparison.decision.some((d) => d.id === "cov-sin-con")
  const lost = comparison.decision.some((d) => d.id === "cov-con-sin")

  /** @type {string[]} */
  const parts = []
  if (recovered) parts.push("recuperó cobertura")
  if (lost) parts.push("perdió cobertura")
  if (comparison.decision.some((d) => d.id === "limite")) {
    parts.push("cambió el límite sugerido")
  }
  if (ups > 0) parts.push(`${ups} indicador${ups === 1 ? "" : "es"} mejoró${ups === 1 ? "" : "aron"}`)
  if (downs > 0) {
    parts.push(
      `${downs} indicador${downs === 1 ? "" : "es"} empeoró${downs === 1 ? "" : "aron"}`
    )
  }
  if (comparison.documentacion.agregados.length > 0) {
    parts.push(
      `${comparison.documentacion.agregados.length} documento${comparison.documentacion.agregados.length === 1 ? "" : "s"} agregado${comparison.documentacion.agregados.length === 1 ? "" : "s"}`
    )
  }
  if (comparison.documentacion.faltantes.length > 0) {
    parts.push(
      `${comparison.documentacion.faltantes.length} documento${comparison.documentacion.faltantes.length === 1 ? "" : "s"} menos`
    )
  }

  let tone = /** @type {"up"|"down"|"flat"|"na"} */ ("flat")
  if (lost || (downs > ups && !recovered)) tone = "down"
  else if (recovered || ups > downs) tone = "up"

  const headline =
    tone === "up"
      ? "Evolución positiva vs la versión anterior"
      : tone === "down"
        ? "Evolución negativa vs la versión anterior"
        : "Evolución mixta vs la versión anterior"

  return {
    headline,
    detail: parts.length > 0 ? parts.join(" · ") : "Hay cambios respecto a la versión anterior.",
    tone,
  }
}
