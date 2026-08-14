/**
 * Cartera = bandeja de trabajo del analista.
 * Solo presenta latest.summary. Reglas de UI (prioridad / acciones), no motor nuevo.
 */

import { RESULTADO_COBERTURA } from "@/lib/coverageRequirements"

export const PORTFOLIO_STALE_DAYS = 90
export const PORTFOLIO_LOW_SCORE = 50
export const PORTFOLIO_RECENT_DAYS = 7

/**
 * @typedef {"all"|"today"|"risky"|"no_coverage"|"docs"|"published"} PortfolioFilterId
 * @typedef {"high"|"medium"|"low"} PortfolioPriority
 */

/**
 * @param {unknown} value
 * @returns {Date | null}
 */
export function toPortfolioDate(value) {
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
 * @param {unknown} resultadoCobertura
 */
export function hasPortfolioCoverage(resultadoCobertura) {
  return (
    typeof resultadoCobertura === "string" &&
    resultadoCobertura !== RESULTADO_COBERTURA.SIN_COBERTURA &&
    resultadoCobertura.length > 0
  )
}

/**
 * @param {unknown} publishedAt
 * @param {number} [staleDays]
 */
export function isPortfolioStale(publishedAt, staleDays = PORTFOLIO_STALE_DAYS) {
  const date = toPortfolioDate(publishedAt)
  if (!date) return false
  return date.getTime() < Date.now() - staleDays * 24 * 60 * 60 * 1000
}

/**
 * @param {unknown} publishedAt
 * @param {number} [days]
 */
export function isPortfolioRecentlyPublished(
  publishedAt,
  days = PORTFOLIO_RECENT_DAYS
) {
  const date = toPortfolioDate(publishedAt)
  if (!date) return false
  const age = Date.now() - date.getTime()
  return age >= 0 && age <= days * 24 * 60 * 60 * 1000
}

/**
 * @param {unknown} publishedAt
 */
export function daysSincePublished(publishedAt) {
  const date = toPortfolioDate(publishedAt)
  if (!date) return null
  const days = Math.floor(
    (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)
  )
  return days >= 0 ? days : null
}

/**
 * Tiempo transcurrido en lenguaje natural.
 * @param {unknown} publishedAt
 */
export function formatPortfolioRelativeTime(publishedAt) {
  const days = daysSincePublished(publishedAt)
  if (days == null) return "—"
  if (days === 0) return "Hoy"
  if (days === 1) return "Hace 1 día"
  if (days < 30) return `Hace ${days} días`
  const months = Math.floor(days / 30)
  if (months === 1) return "Hace 1 mes"
  if (months < 12) return `Hace ${months} meses`
  const years = Math.floor(days / 365)
  if (years === 1) return "Hace 1 año"
  return `Hace ${years} años`
}

/**
 * @param {unknown} estadoGeneral
 */
export function portfolioRiskLabel(estadoGeneral) {
  const map = {
    good: "Bajo",
    medium: "Medio",
    risky: "Alto",
    unknown: "Sin evaluar",
  }
  return map[String(estadoGeneral ?? "")] ?? "Sin evaluar"
}

/**
 * @param {string} cuit
 */
export function formatPortfolioCuit(cuit) {
  const digits = String(cuit ?? "").replace(/\D/g, "")
  if (digits.length !== 11) return String(cuit ?? "—")
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}

/**
 * @param {number | null | undefined} documentQualityScore
 */
export function isDocumentacionPendiente(documentQualityScore) {
  return (
    documentQualityScore == null ||
    !Number.isFinite(documentQualityScore) ||
    documentQualityScore < 40
  )
}

/**
 * Prioridad — reglas simples de UI sobre señales ya publicadas.
 * @param {{
 *   sinCobertura: boolean;
 *   isRisky: boolean;
 *   isStale: boolean;
 *   isLowScore: boolean;
 *   docsPendiente: boolean;
 *   estadoGeneral: unknown;
 * }} signals
 * @returns {PortfolioPriority}
 */
export function computePortfolioPriority(signals) {
  if (signals.sinCobertura || signals.isRisky || signals.isStale) {
    return "high"
  }
  if (
    signals.isLowScore ||
    signals.docsPendiente ||
    signals.estadoGeneral === "medium"
  ) {
    return "medium"
  }
  return "low"
}

/**
 * @param {PortfolioPriority} priority
 */
export function portfolioPriorityLabel(priority) {
  if (priority === "high") return "Alta"
  if (priority === "medium") return "Media"
  return "Baja"
}

/**
 * Próxima acción — traducción de señales existentes (sin motor nuevo).
 * @param {PortfolioRow} row
 */
export function portfolioNextAction(row) {
  if (row.sinCobertura) return "Revisar cobertura"
  if (row.isStale) return "Recalcular análisis"
  if (row.documentQualityScore === 0) return "Actualizar balance"
  if (row.docsPendiente) return "Completar documentación"
  if (row.isRisky) return "Revisión manual"
  if (row.isLowScore || row.estadoGeneral === "medium") {
    return "Revisión manual"
  }
  return "—"
}

/**
 * Badge tone para próxima acción.
 * @param {string} action
 * @returns {"danger"|"warn"|"neutral"|"ok"}
 */
export function portfolioActionTone(action) {
  if (action === "Revisar cobertura" || action === "Recalcular análisis") {
    return "danger"
  }
  if (
    action === "Completar documentación" ||
    action === "Actualizar balance" ||
    action === "Revisión manual"
  ) {
    return "warn"
  }
  if (action === "—") return "ok"
  return "neutral"
}

/**
 * @param {{
 *   cuit: string;
 *   empresa?: Record<string, unknown> | null;
 *   latest: {
 *     publishedAt?: unknown;
 *     summary?: Record<string, unknown>;
 *     versionNumber?: number;
 *   } | null;
 * }} params
 */
export function normalizePortfolioRow(params) {
  const summary = params.latest?.summary ?? {}
  const empresa = params.empresa ?? {}

  const scoreRaw =
    summary.scoreFinanciero != null
      ? Number(summary.scoreFinanciero)
      : summary.scoreGeneralPonderado != null
        ? Number(summary.scoreGeneralPonderado)
        : null
  const docRaw =
    summary.documentQualityScore != null
      ? Number(summary.documentQualityScore)
      : null

  const score = Number.isFinite(scoreRaw) ? scoreRaw : null
  const documentQualityScore = Number.isFinite(docRaw) ? docRaw : null
  const hasCoverage = hasPortfolioCoverage(summary.resultadoCobertura)
  const sinCobertura = summary.resultadoCobertura != null && !hasCoverage
  const isRisky = summary.estadoGeneral === "risky"
  const isLowScore = score != null && score < PORTFOLIO_LOW_SCORE
  const isStale = isPortfolioStale(params.latest?.publishedAt)
  const docsPendiente = isDocumentacionPendiente(documentQualityScore)
  const isRecent = isPortfolioRecentlyPublished(params.latest?.publishedAt)

  const priority = computePortfolioPriority({
    sinCobertura,
    isRisky,
    isStale,
    isLowScore,
    docsPendiente,
    estadoGeneral: summary.estadoGeneral,
  })

  const needsWork =
    sinCobertura ||
    isRisky ||
    isStale ||
    isLowScore ||
    docsPendiente ||
    summary.estadoGeneral === "medium"

  /** @type {PortfolioRow} */
  const row = {
    cuit: params.cuit,
    razonSocial:
      String(
        summary.razonSocial ?? empresa.razonSocial ?? empresa.nombre ?? ""
      ) || params.cuit,
    score,
    estadoGeneral: summary.estadoGeneral ?? null,
    resultadoCobertura: summary.resultadoCobertura ?? null,
    hasCoverage,
    sinCobertura,
    documentQualityScore,
    docsPendiente,
    publishedAt: params.latest?.publishedAt ?? null,
    versionNumber: params.latest?.versionNumber ?? null,
    daysStale: daysSincePublished(params.latest?.publishedAt),
    relativeTime: formatPortfolioRelativeTime(params.latest?.publishedAt),
    isRisky,
    isLowScore,
    isStale,
    isRecent,
    priority,
    priorityLabel: portfolioPriorityLabel(priority),
    needsWork,
    /** Mi trabajo hoy = prioridad alta. */
    isTodayWork: priority === "high",
    estadoLabel: needsWork ? "Actuar" : "OK",
    nextAction: "",
    actionTone: /** @type {"danger"|"warn"|"neutral"|"ok"} */ ("neutral"),
  }

  row.nextAction = portfolioNextAction(row)
  row.actionTone = portfolioActionTone(row.nextAction)
  return row
}

/**
 * @typedef {ReturnType<typeof normalizePortfolioRow>} PortfolioRow
 */

/**
 * @param {PortfolioRow} a
 * @param {PortfolioRow} b
 */
function compareInbox(a, b) {
  const rank = { high: 0, medium: 1, low: 2 }
  const d = rank[a.priority] - rank[b.priority]
  if (d !== 0) return d
  if (a.sinCobertura !== b.sinCobertura) return a.sinCobertura ? -1 : 1
  if (a.isRisky !== b.isRisky) return a.isRisky ? -1 : 1
  return (a.score ?? 999) - (b.score ?? 999)
}

/**
 * @param {PortfolioRow[]} rows
 */
export function buildPortfolioKpis(rows) {
  const list = Array.isArray(rows) ? rows : []
  return {
    today: list.filter((r) => r.isTodayWork).length,
    risky: list.filter((r) => r.isRisky).length,
    noCoverage: list.filter((r) => r.sinCobertura).length,
    docs: list.filter((r) => r.docsPendiente).length,
    published: list.filter((r) => r.isRecent).length,
    all: list.length,
  }
}

/** @type {{ id: string; label: string; filterId: PortfolioFilterId; getValue: (k: ReturnType<typeof buildPortfolioKpis>) => number; emphasis?: "risk"|"warn" }[]} */
export const PORTFOLIO_KPI_DEFS = [
  {
    id: "today",
    label: "Mi trabajo hoy",
    filterId: "today",
    getValue: (k) => k.today,
    emphasis: "risk",
  },
  {
    id: "risky",
    label: "En riesgo",
    filterId: "risky",
    getValue: (k) => k.risky,
    emphasis: "risk",
  },
  {
    id: "no_coverage",
    label: "Sin cobertura",
    filterId: "no_coverage",
    getValue: (k) => k.noCoverage,
    emphasis: "risk",
  },
  {
    id: "docs",
    label: "Documentación pendiente",
    filterId: "docs",
    getValue: (k) => k.docs,
    emphasis: "warn",
  },
]

/** @type {{ id: PortfolioFilterId; label: string }[]} */
export const PORTFOLIO_FILTER_CHIPS = [
  { id: "all", label: "Todos" },
  { id: "today", label: "Hoy" },
  { id: "risky", label: "En riesgo" },
  { id: "no_coverage", label: "Sin cobertura" },
  { id: "docs", label: "Documentación" },
  { id: "published", label: "Publicados" },
]

/**
 * @param {PortfolioFilterId} filterId
 */
export function portfolioFilterTitle(filterId) {
  if (filterId === "today") return "Mi bandeja de trabajo"
  if (filterId === "all") return "Cartera completa"
  const chip = PORTFOLIO_FILTER_CHIPS.find((c) => c.id === filterId)
  return chip?.label ?? "Cartera"
}

/**
 * @param {PortfolioRow[]} rows
 * @param {PortfolioFilterId} filterId
 */
export function applyPortfolioFilter(rows, filterId) {
  const list = Array.isArray(rows) ? rows : []

  if (filterId === "today") {
    return list.filter((r) => r.isTodayWork).sort(compareInbox)
  }
  if (filterId === "risky") {
    return list.filter((r) => r.isRisky).sort(compareInbox)
  }
  if (filterId === "no_coverage") {
    return list.filter((r) => r.sinCobertura).sort(compareInbox)
  }
  if (filterId === "docs") {
    return list.filter((r) => r.docsPendiente).sort(compareInbox)
  }
  if (filterId === "published") {
    return list
      .filter((r) => r.isRecent)
      .sort((a, b) => (a.daysStale ?? 0) - (b.daysStale ?? 0))
  }
  return [...list].sort(compareInbox)
}

/**
 * @param {PortfolioRow[]} rows
 * @param {string} query
 */
export function filterPortfolioRows(rows, query) {
  const q = String(query ?? "").trim().toLowerCase()
  if (!q) return rows
  const qDigits = q.replace(/\D/g, "")
  return rows.filter((row) => {
    const name = row.razonSocial.toLowerCase()
    const cuit = row.cuit.replace(/\D/g, "").toLowerCase()
    return name.includes(q) || (qDigits.length > 0 && cuit.includes(qDigits))
  })
}

/**
 * Novedades desde datos existentes (publicados recientes).
 * Sin localStorage como fuente definitiva.
 * @param {PortfolioRow[]} rows
 * @returns {{ id: string; cuit: string; text: string; tone: "up"|"down"|"info" }[]}
 */
export function buildPortfolioNews(rows) {
  const list = Array.isArray(rows) ? rows : []
  /** @type {{ id: string; cuit: string; text: string; tone: "up"|"down"|"info" }[]} */
  const news = []

  for (const row of list) {
    if (!row.isRecent) continue
    news.push({
      id: `${row.cuit}-published`,
      cuit: row.cuit,
      text: `${row.razonSocial}: se publicó un nuevo análisis.`,
      tone: "info",
    })
    if (row.sinCobertura) {
      news.push({
        id: `${row.cuit}-no-cov`,
        cuit: row.cuit,
        text: `${row.razonSocial}: sin cobertura.`,
        tone: "down",
      })
    }
  }

  return news.slice(0, 8)
}

/** Columnas — extensibles sin romper layout. */
export const PORTFOLIO_TABLE_COLUMNS = [
  { id: "empresa", label: "Empresa" },
  { id: "cuit", label: "CUIT" },
  { id: "estado", label: "Estado" },
  { id: "score", label: "Score" },
  { id: "cobertura", label: "Cobertura" },
  { id: "ultimo", label: "Último análisis" },
  { id: "prioridad", label: "Prioridad" },
  { id: "accion", label: "Próxima acción" },
  { id: "cta", label: "" },
]

/** @deprecated */
export function buildPortfolioPanels(rows) {
  const list = Array.isArray(rows) ? rows : []
  const kpis = buildPortfolioKpis(list)
  return {
    kpis: {
      empresasAnalizadas: kpis.all,
      conCobertura: list.filter((r) => r.hasCoverage).length,
      sinCobertura: kpis.noCoverage,
      riesgoAlto: kpis.risky,
      desactualizados: list.filter((r) => r.isStale).length,
    },
    requierenAtencion: applyPortfolioFilter(list, "today"),
    topExposicion: [],
    actividadReciente: [],
  }
}
