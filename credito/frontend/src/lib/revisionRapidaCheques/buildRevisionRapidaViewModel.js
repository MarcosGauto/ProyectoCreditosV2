/**
 * View-model presentacional — Revisión Rápida de Cheques.
 *
 * Consulta objetiva (BCRA + cheques + escenario informativo).
 * NO usa coverageDecision / resultadoCobertura / evaluateCoverageDecision.
 * NO modifica Score Engine, Limit Engine, SC-1 ni precalificación.
 */

import { formatCreditAmount } from "@/lib/creditAnalysisEngine"
import {
  CHEQUE_ESTADO,
  formatChequeFecha,
  formatChequeImporte,
  parseChequeImporte,
} from "@/lib/chequesRechazadosModel"
import {
  computeBcraMetrics,
  normalizeBcraReport,
} from "@/lib/normalizeBcraReport"

const DASH = "—"

/**
 * @param {number | null | undefined} amount
 */
function displayAmount(amount) {
  if (amount == null || !Number.isFinite(amount)) return DASH
  return formatCreditAmount(amount)
}

/**
 * @param {number | null | undefined} amount
 */
export function displayAmountCompact(amount) {
  if (amount == null || !Number.isFinite(amount)) return DASH
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) {
    return `$${(amount / 1_000_000).toLocaleString("es-AR", {
      maximumFractionDigits: 1,
    })} M`
  }
  if (abs >= 10_000) {
    return `$${(amount / 1_000).toLocaleString("es-AR", {
      maximumFractionDigits: 0,
    })} K`
  }
  return formatCreditAmount(amount)
}

/**
 * @param {number | null | undefined} sit
 */
export function situacionTone(sit) {
  if (sit == null || !Number.isFinite(sit)) return "neutral"
  if (sit <= 1) return "good"
  if (sit === 2) return "warn"
  if (sit === 3) return "elevated"
  return "critical"
}

/**
 * @param {unknown} value
 */
function toDateLabel(value) {
  if (!value) return null
  try {
    if (
      typeof value === "object" &&
      value !== null &&
      typeof /** @type {{ toDate?: () => Date }} */ (value).toDate === "function"
    ) {
      return /** @type {{ toDate: () => Date }} */ (value)
        .toDate()
        .toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
    }
    const d = new Date(String(value))
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
  } catch {
    return null
  }
}

/**
 * Historial de deuda total por consulta/período (solo reportes reales).
 * @param {Array<Record<string, unknown>>} reports
 */
export function buildDebtHistorySeries(reports) {
  if (!Array.isArray(reports) || reports.length === 0) return []

  /** @type {Array<{ label: string; deuda: number; situacion: number | null; ts: number }>} */
  const points = []

  for (const report of reports) {
    const source =
      report.rawPayload && typeof report.rawPayload === "object"
        ? report.rawPayload
        : report
    const normalized = normalizeBcraReport(source)
    const metrics =
      report.metrics && typeof report.metrics === "object"
        ? /** @type {Record<string, unknown>} */ (report.metrics)
        : computeBcraMetrics(normalized)

    const deuda =
      typeof metrics.deudaTotal === "number"
        ? metrics.deudaTotal
        : Number(metrics.deudaTotal)
    if (!Number.isFinite(deuda)) continue

    const situacion =
      typeof metrics.peorSituacion === "number"
        ? metrics.peorSituacion
        : normalized.situacionGeneral

    const ts = reportTimestamp(report)
    const label =
      (typeof normalized.periodo === "string" && normalized.periodo) ||
      (ts ? new Date(ts).toISOString().slice(0, 10) : null)
    if (!label) continue

    points.push({
      label,
      deuda,
      situacion: situacion != null && Number.isFinite(Number(situacion))
        ? Number(situacion)
        : null,
      ts,
    })
  }

  /** @type {Map<string, (typeof points)[0]>} */
  const byLabel = new Map()
  for (const p of points) {
    const prev = byLabel.get(p.label)
    if (!prev || p.ts >= prev.ts) byLabel.set(p.label, p)
  }

  return [...byLabel.values()].sort(
    (a, b) => a.label.localeCompare(b.label) || a.ts - b.ts
  )
}

/**
 * Serie apilada tipo Nosis: deuda por mes desglosada por situación (1–4+).
 * Fuentes (en orden):
 * 1) `periodos` del payload BCRA live / rawPayload
 * 2) Snapshot actual de entidades (1 barra)
 * 3) Histórico de consultas bcra_reports (1 barra por consulta, sin inventar meses)
 *
 * @param {{
 *   liveBcra?: Record<string, unknown> | null;
 *   reports?: Array<Record<string, unknown>>;
 *   currentEntidades?: Array<{ situacion: number; monto: number }>;
 * }} input
 */
export function buildStackedDebtBySituation(input) {
  /** @type {Map<string, { key: string; ts: number; bySit: Record<number, number> }>} */
  const byPeriod = new Map()

  /**
   * @param {string} key
   * @param {number} ts
   * @param {Array<{ situacion?: number; monto?: number }>} entidades
   */
  function upsert(key, ts, entidades) {
    if (!key || !Array.isArray(entidades) || entidades.length === 0) return
    const prev = byPeriod.get(key)
    if (prev && ts < prev.ts) return

    /** @type {Record<number, number>} */
    const bySit = { 1: 0, 2: 0, 3: 0, 4: 0 }
    for (const e of entidades) {
      const sit = Math.min(4, Math.max(1, Number(e.situacion) || 1))
      const monto = Number(e.monto) || 0
      bySit[sit] = (bySit[sit] || 0) + monto
    }
    byPeriod.set(key, { key, ts, bySit })
  }

  // 1) Periodos del live / reports (raw o ya mapeados)
  const sources = []
  if (input.liveBcra) sources.push(input.liveBcra)
  for (const report of input.reports ?? []) {
    if (report.rawPayload && typeof report.rawPayload === "object") {
      sources.push(/** @type {Record<string, unknown>} */ (report.rawPayload))
    }
    sources.push(report)
  }

  for (const src of sources) {
    const periodos = extractPeriodosFromBcraPayload(src)
    for (const p of periodos) {
      upsert(p.key, p.ts, p.entidades)
    }
  }

  // 2) Snapshot actual si no hubo periodos
  if (byPeriod.size === 0 && (input.currentEntidades?.length ?? 0) > 0) {
    const now = new Date()
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    upsert(key, now.getTime(), input.currentEntidades ?? [])
  }

  // 3) Fallback: un punto por reporte almacenado
  if (byPeriod.size === 0) {
    for (const report of input.reports ?? []) {
      const ents = Array.isArray(report.entidades)
        ? /** @type {Array<{ situacion?: number; monto?: number }>} */ (
            report.entidades
          )
        : []
      const metrics =
        report.metrics && typeof report.metrics === "object"
          ? /** @type {Record<string, unknown>} */ (report.metrics)
          : null
      const ts = reportTimestamp(report)
      const key =
        (typeof report.periodo === "string" && report.periodo) ||
        (ts ? new Date(ts).toISOString().slice(0, 7) : null)
      if (!key) continue
      if (ents.length > 0) {
        upsert(key, ts, ents)
      } else if (metrics && Number.isFinite(Number(metrics.deudaTotal))) {
        const sit = Math.min(
          4,
          Math.max(1, Number(metrics.peorSituacion) || 1)
        )
        upsert(key, ts, [{ situacion: sit, monto: Number(metrics.deudaTotal) }])
      }
    }
  }

  let series = [...byPeriod.values()].sort(
    (a, b) => a.key.localeCompare(b.key) || a.ts - b.ts
  )

  // Últimos 24 períodos reales (no inventar meses vacíos)
  if (series.length > 24) {
    series = series.slice(-24)
  }

  const maxTotal = series.reduce((m, p) => {
    const t = (p.bySit[1] || 0) + (p.bySit[2] || 0) + (p.bySit[3] || 0) + (p.bySit[4] || 0)
    return Math.max(m, t)
  }, 0)

  return {
    bars: series.map((p) => {
      const s1 = p.bySit[1] || 0
      const s2 = p.bySit[2] || 0
      const s3 = p.bySit[3] || 0
      const s4 = p.bySit[4] || 0
      const total = s1 + s2 + s3 + s4
      return {
        key: p.key,
        label: formatPeriodShort(p.key),
        year: p.key.slice(0, 4),
        total,
        totalLabel: displayAmountCompact(total),
        segments: [
          { sit: 1, monto: s1, tone: "good" },
          { sit: 2, monto: s2, tone: "warn" },
          { sit: 3, monto: s3, tone: "elevated" },
          { sit: 4, monto: s4, tone: "critical" },
        ].filter((s) => s.monto > 0),
      }
    }),
    maxTotal: maxTotal || 1,
    hasHistory: series.length >= 2,
  }
}

/**
 * @param {Record<string, unknown>} src
 * @returns {Array<{ key: string; ts: number; entidades: Array<{ situacion: number; monto: number }> }>}
 */
function extractPeriodosFromBcraPayload(src) {
  if (!src || typeof src !== "object") return []

  // Formato API crudo: results.periodos (montos en MILES)
  const results =
    src.results && typeof src.results === "object" && !Array.isArray(src.results)
      ? /** @type {Record<string, unknown>} */ (src.results)
      : null
  if (Array.isArray(results?.periodos) && results.periodos.length > 0) {
    return mapRawPeriodos(results.periodos, true)
  }

  // Ya mapeados por backend (periodos con montos en PESOS)
  if (Array.isArray(src.periodos) && src.periodos.length > 0) {
    const inPesos = src.montoFormato === "PESOS" || Array.isArray(src.entidades)
    return mapRawPeriodos(src.periodos, !inPesos)
  }

  return []
}

/**
 * @param {unknown[]} periodos
 * @param {boolean} fromMiles
 */
function mapRawPeriodos(periodos, fromMiles) {
  return periodos
    .filter((p) => p && typeof p === "object")
    .map((p) => {
      const row = /** @type {Record<string, unknown>} */ (p)
      const key = normalizePeriodKey(String(row.periodo ?? ""))
      const entsRaw = Array.isArray(row.entidades) ? row.entidades : []
      return {
        key,
        ts: periodKeyToTs(key),
        entidades: entsRaw.map((e) => {
          const ent = /** @type {Record<string, unknown>} */ (e ?? {})
          const raw = Number(ent.monto) || 0
          return {
            entidad: String(ent.entidad ?? "Desconocida"),
            situacion: Number(ent.situacion) || 1,
            monto: fromMiles ? raw * 1000 : raw,
          }
        }),
      }
    })
    .filter((p) => p.key)
}

/**
 * Matriz tipo Nosis: columnas = meses reales, filas = situación / endeudamiento / entidades.
 * No inventa meses vacíos.
 *
 * @param {{
 *   liveBcra?: Record<string, unknown> | null;
 *   reports?: Array<Record<string, unknown>>;
 *   currentEntidades?: Array<{ entidad: string; situacion: number; monto: number }>;
 * }} input
 */
export function buildBcraHeatmapMatrix(input) {
  /** @type {Map<string, { key: string; ts: number; entidades: Array<{ entidad: string; situacion: number; monto: number }> }>} */
  const byPeriod = new Map()

  /**
   * @param {string} key
   * @param {number} ts
   * @param {Array<{ entidad?: string; situacion?: number; monto?: number }>} entidades
   */
  function upsert(key, ts, entidades) {
    if (!key || !Array.isArray(entidades) || entidades.length === 0) return
    const prev = byPeriod.get(key)
    if (prev && ts < prev.ts) return
    byPeriod.set(key, {
      key,
      ts,
      entidades: entidades.map((e) => ({
        entidad: String(e.entidad ?? "Desconocida"),
        situacion: Number(e.situacion) || 1,
        monto: Number(e.monto) || 0,
      })),
    })
  }

  const sources = []
  if (input.liveBcra) sources.push(input.liveBcra)
  for (const report of input.reports ?? []) {
    if (report.rawPayload && typeof report.rawPayload === "object") {
      sources.push(/** @type {Record<string, unknown>} */ (report.rawPayload))
    }
    if (Array.isArray(report.periodos)) sources.push(report)
  }

  for (const src of sources) {
    for (const p of extractPeriodosFromBcraPayload(src)) {
      upsert(p.key, p.ts, p.entidades)
    }
  }

  if (byPeriod.size === 0 && (input.currentEntidades?.length ?? 0) > 0) {
    const now = new Date()
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    upsert(key, now.getTime(), input.currentEntidades ?? [])
  }

  let periods = [...byPeriod.values()].sort(
    (a, b) => a.key.localeCompare(b.key) || a.ts - b.ts
  )
  if (periods.length > 24) periods = periods.slice(-24)

  const months = periods.map((p) => {
    const year = p.key.slice(0, 4)
    const monthNum = /^\d{4}-\d{2}$/.test(p.key)
      ? Number(p.key.slice(5, 7))
      : 0
    const peor = p.entidades.reduce(
      (m, e) => Math.max(m, e.situacion || 1),
      1
    )
    const deuda = p.entidades.reduce((acc, e) => acc + (e.monto || 0), 0)
    return {
      key: p.key,
      year,
      monthNum,
      label: formatPeriodShort(p.key),
      peorSituacion: peor,
      peorTone: situacionTone(peor),
      endeudamiento: deuda,
      endeudamientoLabel: formatHeatAmount(deuda),
      entidades: p.entidades,
    }
  })

  /** @type {Map<string, string>} */
  const entityNames = new Map()
  for (const m of months) {
    for (const e of m.entidades) {
      if (!entityNames.has(e.entidad)) {
        entityNames.set(e.entidad, shortenEntityName(e.entidad))
      }
    }
  }

  // Orden: mayor deuda en el último mes primero
  const last = months[months.length - 1]
  const entityRows = [...entityNames.entries()]
    .map(([full, short]) => {
      const cells = months.map((m) => {
        const hit = m.entidades.find((e) => e.entidad === full)
        if (!hit) return null
        return {
          monto: hit.monto,
          montoLabel: formatHeatAmount(hit.monto),
          situacion: hit.situacion,
          tone: situacionTone(hit.situacion),
        }
      })
      const lastMonto = cells[cells.length - 1]?.monto ?? 0
      return { fullName: full, shortName: short, cells, lastMonto }
    })
    .sort((a, b) => b.lastMonto - a.lastMonto)

  /** Agrupar años para header colspan */
  /** @type {Array<{ year: string; count: number }>} */
  const yearGroups = []
  for (const m of months) {
    const lastG = yearGroups[yearGroups.length - 1]
    if (lastG && lastG.year === m.year) lastG.count += 1
    else yearGroups.push({ year: m.year, count: 1 })
  }

  return {
    months,
    yearGroups,
    entityRows,
    monthCount: months.length,
  }
}

/**
 * Monto completo (sin $), formato es-AR.
 * @param {number} amount
 */
function formatHeatAmount(amount) {
  if (!Number.isFinite(amount)) return "—"
  return Math.round(amount).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  })
}

/**
 * @param {string} name
 */
function shortenEntityName(name) {
  let s = String(name || "")
    .replace(/\s+/g, " ")
    .trim()
  s = s
    .replace(/^BANCO DE LA NACION ARGENTINA.*$/i, "Bco Nación")
    .replace(/^BANCO DE LA PROVINCIA DE BUENOS AIRES.*$/i, "Bco Pcia Bs As")
    .replace(/^BANCO DE GALICIA Y BUENOS AIRES.*$/i, "Bco Galicia")
    .replace(/^BANCO SANTANDER.*$/i, "Bco Santander Río")
    .replace(/^BANCO SUPERVIELLE.*$/i, "Bco Supervielle")
    .replace(/^BANCO BBVA.*$/i, "BBVA SA")
    .replace(/^BANCO COMAFI.*$/i, "Bco Comafi")
    .replace(/^MERCADOLIBRE.*$/i, "Mercadolibre SRL")
    .replace(/^FINTECH SGR.*$/i, "Fintech SGR")
    .replace(/^FONDO DE GARANT[ÍI]AS BUENOS AIRES.*$/i, "Fogaba SAPEM")
    .replace(/^GARANTIZAR SGR.*$/i, "Garantizar SGR")
    .replace(/^ARGENPYMES.*$/i, "ArgenPymes")
    .replace(/^AFB AVALES.*$/i, "AFB Avales SGR")
  if (s.length > 22) s = `${s.slice(0, 20)}…`
  return s
}

/**
 * @param {string} periodo
 */
function normalizePeriodKey(periodo) {
  const s = String(periodo || "").trim()
  // YYYYMM → YYYY-MM
  if (/^\d{6}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}`
  }
  // YYYY-MM
  if (/^\d{4}-\d{2}/.test(s)) {
    return s.slice(0, 7)
  }
  return s
}

/**
 * @param {string} key
 */
function periodKeyToTs(key) {
  if (/^\d{4}-\d{2}$/.test(key)) {
    return Date.parse(`${key}-01T00:00:00Z`) || 0
  }
  return Date.parse(key) || 0
}

const MONTH_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
]

/**
 * @param {string} key YYYY-MM o similar
 */
function formatPeriodShort(key) {
  if (/^\d{4}-\d{2}$/.test(key)) {
    const m = Number(key.slice(5, 7)) - 1
    return MONTH_SHORT[m] ?? key.slice(5)
  }
  return key.slice(0, 7)
}

/**
 * @param {Record<string, unknown>} report
 */
function reportTimestamp(report) {
  const raw = report.fetchedAt ?? report.createdAt ?? 0
  if (typeof raw === "number") return raw
  if (raw && typeof raw === "object" && "toMillis" in raw) {
    return Number(/** @type {{ toMillis: () => number }} */ (raw).toMillis()) || 0
  }
  if (typeof raw === "string") {
    const parsed = Date.parse(raw)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

/**
 * @param {{
 *   cuit: string;
 *   empresaExists: boolean;
 *   empresa?: Record<string, unknown> | null;
 *   latest?: {
 *     summary?: Record<string, unknown>;
 *     updatedAt?: unknown;
 *     publishedAt?: unknown;
 *   } | null;
 *   chequesRechazados?: Array<Record<string, unknown>>;
 *   bcraReports?: Array<Record<string, unknown>>;
 *   normalized?: ReturnType<typeof normalizeBcraReport> | null;
 *   metrics?: ReturnType<typeof computeBcraMetrics> | null;
 *   liveBcra?: Record<string, unknown> | null;
 *   bcraError?: string | null;
 *   lastBcraFetchedAt?: unknown;
 *   chequeInput?: {
 *     importe?: string | number;
 *     vencimiento?: string;
 *     tipo?: string;
 *     banco?: string;
 *   };
 * }} input
 */
export function buildRevisionRapidaViewModel(input) {
  const summary = input.latest?.summary ?? null
  const metrics = input.metrics ?? null
  const normalized = input.normalized ?? null

  const razonSocial =
    pickString(
      input.empresa?.razonSocial,
      input.empresa?.nombre,
      input.empresa?.denominacion,
      normalized?.denominacion,
      summary?.razonSocial
    ) || null

  const peorSituacion =
    metrics?.peorSituacion != null && Number.isFinite(metrics.peorSituacion)
      ? Number(metrics.peorSituacion)
      : null

  const deudaTotal =
    metrics?.deudaTotal != null && Number.isFinite(metrics.deudaTotal)
      ? Number(metrics.deudaTotal)
      : null

  const entidadesRaw = Array.isArray(metrics?.entidades) ? metrics.entidades : []

  const entidades = [...entidadesRaw]
    .map((e) => ({
      entidad: String(e.entidad ?? "Desconocida"),
      situacion: Number(e.situacion) || 1,
      monto: Number(e.monto) || 0,
      tone: situacionTone(Number(e.situacion) || 1),
    }))
    .sort((a, b) => {
      if (b.situacion !== a.situacion) return b.situacion - a.situacion
      return b.monto - a.monto
    })

  const maxEntidadMonto = entidades.reduce((m, e) => Math.max(m, e.monto), 0)

  /** Distribución por situación (solo buckets con valor > 0) */
  /** @type {Record<number, number>} */
  const sitCount = {}
  for (const e of entidades) {
    const s = Math.min(6, Math.max(1, e.situacion))
    sitCount[s] = (sitCount[s] || 0) + 1
  }
  const situationDistribution = [1, 2, 3, 4, 5, 6]
    .filter((s) => (sitCount[s] || 0) > 0)
    .map((s) => ({
      situacion: s,
      count: sitCount[s],
      tone: situacionTone(s),
    }))

  const debtHistory = buildDebtHistorySeries(input.bcraReports ?? [])
  const stacked = buildStackedDebtBySituation({
    liveBcra: input.liveBcra ?? null,
    reports: input.bcraReports ?? [],
    currentEntidades: entidades,
  })
  const heatmap = buildBcraHeatmapMatrix({
    liveBcra: input.liveBcra ?? null,
    reports: input.bcraReports ?? [],
    currentEntidades: entidades,
  })

  const cheques = Array.isArray(input.chequesRechazados)
    ? [...input.chequesRechazados]
    : []
  cheques.sort((a, b) => {
    const da = Date.parse(String(a.fechaRechazo ?? "")) || 0
    const db = Date.parse(String(b.fechaRechazo ?? "")) || 0
    return db - da
  })

  const pendientes = cheques.filter((c) => c.estado === CHEQUE_ESTADO.PENDIENTE)
  const montoRechazos = cheques.reduce(
    (acc, c) => acc + (Number(c.importe) || 0),
    0
  )

  /** Filas detalladas (todas las disponibles, sin inventar campos). */
  const chequeRows = cheques.map((c) => {
    const fechaIso = String(c.fechaRechazo ?? "")
    const monthKey = monthKeyFromIso(fechaIso)
    return {
      id: String(c.id ?? `${c.numeroCheque}-${c.fechaRechazo}`),
      monthKey,
      numeroCheque: String(c.numeroCheque ?? DASH),
      fecha: formatChequeFecha(
        /** @type {string | null | undefined} */ (c.fechaRechazo)
      ),
      fechaPago: formatChequeFecha(
        /** @type {string | null | undefined} */ (c.fechaAbono)
      ),
      banco: String(c.banco ?? DASH),
      importe: formatChequeImporte(Number(c.importe) || 0),
      importeNum: Number(c.importe) || 0,
      causal: String(c.motivoRechazo ?? DASH),
      estado: String(c.estado ?? DASH),
    }
  })

  /** Grupos por mes (formato tipo Nosis: colapsable). */
  /** @type {Map<string, typeof chequeRows>} */
  const byMonth = new Map()
  for (const row of chequeRows) {
    const key = row.monthKey || "sin-fecha"
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)?.push(row)
  }

  const chequeGroups = [...byMonth.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => {
      const total = items.reduce((acc, r) => acc + r.importeNum, 0)
      return {
        key,
        label: monthLabelFromKey(key),
        cantidad: items.length,
        monto: formatChequeImporte(total),
        items,
      }
    })

  const montoOtorgado =
    summary?.montoCreditoOtorgado != null &&
    Number.isFinite(Number(summary.montoCreditoOtorgado))
      ? Number(summary.montoCreditoOtorgado)
      : null

  const limiteSugerido =
    summary?.preCalificacion != null &&
    Number.isFinite(Number(summary.preCalificacion))
      ? Number(summary.preCalificacion)
      : null

  const limiteConocido = montoOtorgado ?? limiteSugerido

  const docsIncomplete =
    summary?.documentQualityScore != null &&
    Number.isFinite(Number(summary.documentQualityScore)) &&
    Number(summary.documentQualityScore) < 50

  const estadoCliente = !input.empresaExists
    ? "No encontrado en empresas"
    : summary
      ? "Con análisis"
      : "Sin análisis crediticio"

  const ultimaConsultaBcra =
    toDateLabel(input.lastBcraFetchedAt) ||
    (input.bcraReports?.length
      ? toDateLabel(input.bcraReports[input.bcraReports.length - 1]?.fetchedAt)
      : null) ||
    DASH

  // Cheque — escenario solo si importe + vencimiento
  const chequeImporte = parseChequeImporte(input.chequeInput?.importe)
  const hasImporte = chequeImporte > 0
  const hasVencimiento = Boolean(
    input.chequeInput?.vencimiento &&
      String(input.chequeInput.vencimiento).trim()
  )
  const escenarioReady = hasImporte && hasVencimiento

  const chequeVencimiento = hasVencimiento
    ? formatChequeFecha(input.chequeInput?.vencimiento)
    : DASH

  /** @type {{
   *   ready: boolean;
   *   disponibleReal: string;
   *   limiteConocidoLabel: string;
   *   chequeLabel: string;
   *   impactoEstimado: string | null;
   *   superaLimite: boolean | null;
   *   nota: string;
   * }} */
  const escenario = {
    ready: escenarioReady,
    disponibleReal: "No disponible",
    limiteConocidoLabel:
      limiteConocido != null ? displayAmount(limiteConocido) : "No disponible",
    chequeLabel: hasImporte ? displayAmount(chequeImporte) : DASH,
    impactoEstimado: null,
    superaLimite: null,
    nota: "Escenario informativo sobre límite conocido. No es una decisión crediticia ni una aprobación.",
  }

  if (escenarioReady && limiteConocido != null) {
    escenario.superaLimite = chequeImporte > limiteConocido
    const ratio = limiteConocido > 0 ? chequeImporte / limiteConocido : null
    escenario.impactoEstimado =
      ratio != null
        ? `${(ratio * 100).toLocaleString("es-AR", {
            maximumFractionDigits: 1,
          })}% del límite conocido`
        : null
  }

  // —— Alertas objetivas (sin cobertura / sin veredicto de aprobación) ——
  /** @type {Array<{ id: string; level: "alert"|"review"|"ok"; title: string }>} */
  const alerts = []

  if (peorSituacion != null && peorSituacion >= 4) {
    alerts.push({
      id: "bcra-crit",
      level: "alert",
      title: `BCRA situación ${peorSituacion}`,
    })
  } else if (peorSituacion != null && peorSituacion >= 3) {
    alerts.push({
      id: "bcra-alta",
      level: "alert",
      title: `BCRA situación ${peorSituacion}`,
    })
  } else if (peorSituacion != null && peorSituacion >= 2) {
    alerts.push({
      id: "bcra-2",
      level: "review",
      title: `BCRA con situación ${peorSituacion}`,
    })
  } else if (peorSituacion != null && peorSituacion <= 1) {
    alerts.push({
      id: "bcra-ok",
      level: "ok",
      title: "BCRA situación 1",
    })
  }

  if (
    deudaTotal != null &&
    limiteConocido != null &&
    limiteConocido > 0 &&
    deudaTotal > limiteConocido
  ) {
    alerts.push({
      id: "deuda-vs-limite",
      level: "review",
      title: "Deuda BCRA elevada respecto del límite conocido",
    })
  }

  if (cheques.length > 0) {
    alerts.push({
      id: "rechazos",
      level: pendientes.length > 0 ? "alert" : "review",
      title:
        pendientes.length > 0
          ? `${pendientes.length} cheque(s) rechazado(s) pendiente(s) de abono`
          : `${cheques.length} cheque(s) rechazado(s) en historial`,
    })
  } else {
    alerts.push({
      id: "sin-rechazos",
      level: "ok",
      title: "Sin cheques rechazados registrados",
    })
  }

  if (docsIncomplete) {
    alerts.push({
      id: "docs",
      level: "review",
      title: "Calidad documental baja en el último análisis",
    })
  }

  if (escenarioReady && escenario.superaLimite) {
    alerts.push({
      id: "cheque-limite",
      level: "review",
      title:
        "Importe del cheque superior al límite conocido (escenario informativo)",
    })
  }

  const chequesHistory = chequeGroups.map((g) => ({
    key: g.key,
    label: g.label,
    cantidad: g.cantidad,
    monto: g.items.reduce((acc, r) => acc + r.importeNum, 0),
    montoLabel: g.monto,
  }))

  return {
    cuit: input.cuit,
    empresaExists: input.empresaExists,
    header: {
      razonSocial: razonSocial || "Sin razón social disponible",
      cuit: formatCuitDisplay(input.cuit),
      estado: estadoCliente,
      ultimaConsultaBcra,
    },
    bcraError: input.bcraError ?? null,
    kpis: {
      bcra: {
        peorSituacion: peorSituacion != null ? String(peorSituacion) : DASH,
        deudaTotal: displayAmountCompact(deudaTotal),
        deudaTotalFull: displayAmount(deudaTotal),
        entidades: entidades.length > 0 ? String(entidades.length) : DASH,
        tone: situacionTone(peorSituacion),
      },
      rechazos: {
        cantidad: String(cheques.length),
        montoTotal: formatChequeImporte(montoRechazos),
        pendientes: String(pendientes.length),
      },
      credito: {
        limiteOtorgado:
          montoOtorgado != null ? displayAmount(montoOtorgado) : DASH,
        limiteSugerido:
          limiteSugerido != null ? displayAmount(limiteSugerido) : DASH,
        limiteConocido:
          limiteConocido != null ? displayAmount(limiteConocido) : DASH,
      },
    },
    charts: {
      mode: stacked.bars.length >= 2 ? "evolution" : "composition",
      heatmap,
      stacked: {
        bars: stacked.bars,
        maxTotal: stacked.maxTotal,
        hasHistory: stacked.hasHistory,
      },
      debtHistory: debtHistory.map((p) => ({
        label: p.label,
        deuda: p.deuda,
        deudaLabel: displayAmountCompact(p.deuda),
        situacion: p.situacion,
      })),
      maxDebt: debtHistory.reduce((m, p) => Math.max(m, p.deuda), 0) || 1,
      composition: {
        entidades,
        maxMonto: maxEntidadMonto || 1,
        deudaTotal: displayAmountCompact(deudaTotal),
      },
      situationDistribution,
      maxSitCount: Math.max(
        1,
        ...situationDistribution.map((s) => s.count),
        1
      ),
      chequesHistory,
      maxChequesMonto:
        chequesHistory.reduce((m, p) => Math.max(m, p.monto), 0) || 1,
      maxChequesCantidad:
        chequesHistory.reduce((m, p) => Math.max(m, p.cantidad), 0) || 1,
    },
    bcraTable: {
      rows: entidades.map((e) => ({
        entidad: e.entidad,
        situacion: e.situacion,
        deuda: displayAmount(e.monto),
        deudaCompact: displayAmountCompact(e.monto),
        tone: e.tone,
      })),
    },
    cheques: {
      cantidad: cheques.length,
      montoTotal: formatChequeImporte(montoRechazos),
      pendientes: pendientes.length,
      groups: chequeGroups,
      rows: chequeRows.slice(0, 20).map((r) => ({
        id: r.id,
        fecha: r.fecha,
        importe: r.importe,
        banco: r.banco,
        estado: r.estado,
      })),
    },
    alerts,
    cheque: {
      importe: hasImporte ? displayAmount(chequeImporte) : null,
      vencimiento: chequeVencimiento,
      tipo: String(input.chequeInput?.tipo ?? "").trim() || "",
      banco: String(input.chequeInput?.banco ?? "").trim() || "",
      escenarioReady,
    },
    escenario,
  }
}

/**
 * @param {string} iso
 * @returns {string} YYYY-MM o "sin-fecha"
 */
function monthKeyFromIso(iso) {
  if (!iso) return "sin-fecha"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    const m = String(iso).match(/^(\d{4})-(\d{2})/)
    return m ? `${m[1]}-${m[2]}` : "sin-fecha"
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

const MONTH_NAMES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

/**
 * @param {string} key YYYY-MM
 */
function monthLabelFromKey(key) {
  if (key === "sin-fecha") return "Sin fecha"
  const [y, m] = key.split("-")
  const idx = Number(m) - 1
  if (!y || idx < 0 || idx > 11) return key
  return `${MONTH_NAMES_ES[idx]} ${y}`
}

/**
 * @param {...unknown} values
 */
function pickString(...values) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return ""
}

/**
 * @param {string} cuit
 */
function formatCuitDisplay(cuit) {
  const d = String(cuit).replace(/\D/g, "")
  if (d.length !== 11) return d
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}
