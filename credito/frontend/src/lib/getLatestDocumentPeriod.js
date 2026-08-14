import { getBalanceValidationSubtitle } from "@/lib/balanceIndicators"
import { hasConfirmedIvaIndicators } from "@/lib/ivaIndicators"
import { hasConfirmedIibbIndicators } from "@/lib/iibbIndicators"

const SORT_FIELDS = [
  "periodo",
  "fecha",
  "fechaCierre",
  "fecha_cierre",
  "ejercicio",
  "id",
]

const BALANCE_DISPLAY_FIELDS = [
  "fechaCierre",
  "fecha_cierre",
  "fecha",
  "ejercicio",
  "periodo",
  "id",
]

const FISCAL_DISPLAY_FIELDS = ["periodo", "fecha", "id"]

/** @typedef {"green" | "yellow" | "red"} DocumentVigencySignal */
/** @typedef {"vigente" | "atencion" | "vencido"} DocumentVigencyLevel */

export const VIGENCY_EMOJI = {
  green: "🟢",
  yellow: "🟡",
  red: "🔴",
}

export const VIGENCY_TONE = {
  green: "success",
  yellow: "warning",
  red: "danger",
}

const FISCAL_VIGENCY_RULES = {
  vigenteMaxMonths: 3,
  atencionMaxMonths: 6,
}

const BALANCE_VIGENCY_RULES = {
  vigenteMaxMonths: 18,
  atencionMaxMonths: 24,
}

import {
  formatWebsiteDisplayLabel,
  getEmpresaWebsiteUrl,
  hasEmpresaWebsite,
  hasWebUrl,
} from "@/lib/empresaWebsite"
import {
  hasLocalesLoaded,
  mergeSucursalesFromFirestore,
} from "@/lib/sucursalesModel"
import {
  getLatestNosisReport,
  getNosisDocumentStatus,
  hasConfirmedNosisIndicators,
  getNosisPdfSubtitle,
} from "@/lib/nosisModel"
import { USE_FIREBASE_STORAGE } from "@/lib/storageConfig"

/**
 * @param {unknown} value
 * @returns {Date | null}
 */
function toDate(value) {
  if (value == null || value === "") {
    return null
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  if (typeof value === "object") {
    const maybeTimestamp = /** @type {{ toDate?: () => Date; seconds?: number }} */ (
      value
    )
    if (typeof maybeTimestamp.toDate === "function") {
      const date = maybeTimestamp.toDate()
      return Number.isNaN(date.getTime()) ? null : date
    }
    if (typeof maybeTimestamp.seconds === "number") {
      return new Date(maybeTimestamp.seconds * 1000)
    }
  }

  if (typeof value === "number") {
    if (value > 190000 && value < 210000) {
      return periodPartsToDate(parsePeriodParts(String(value)))
    }
    if (value > 1_000_000_000_000) {
      return new Date(value)
    }
    if (value > 1_000_000_000) {
      return new Date(value * 1000)
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }

    const parsedPeriod = parsePeriodParts(trimmed)
    if (parsedPeriod) {
      return periodPartsToDate(parsedPeriod)
    }

    const iso = Date.parse(trimmed)
    if (!Number.isNaN(iso)) {
      return new Date(iso)
    }
  }

  return null
}

/**
 * @param {string} raw
 * @returns {{ year: number; month: number; day: number | null; kind: "month" | "date" | "year" } | null}
 */
function parsePeriodParts(raw) {
  const value = String(raw).trim()
  if (!value) {
    return null
  }

  if (/^\d{6}$/.test(value)) {
    return {
      year: parseInt(value.slice(0, 4), 10),
      month: parseInt(value.slice(4, 6), 10),
      day: null,
      kind: "month",
    }
  }

  const ymd = value.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?$/)
  if (ymd) {
    return {
      year: Number(ymd[1]),
      month: Number(ymd[2]),
      day: ymd[3] ? Number(ymd[3]) : null,
      kind: ymd[3] ? "date" : "month",
    }
  }

  const my = value.match(/^(\d{1,2})[-/](\d{4})$/)
  if (my) {
    return {
      year: Number(my[2]),
      month: Number(my[1]),
      day: null,
      kind: "month",
    }
  }

  if (/^\d{4}$/.test(value)) {
    return {
      year: Number(value),
      month: 12,
      day: 31,
      kind: "year",
    }
  }

  return null
}

/**
 * @param {{ year: number; month: number; day: number | null; kind: "month" | "date" | "year" } | null} parts
 * @returns {Date | null}
 */
function periodPartsToDate(parts) {
  if (!parts || !parts.year || !parts.month) {
    return null
  }

  if (parts.day) {
    return new Date(parts.year, parts.month - 1, parts.day)
  }

  if (parts.kind === "year") {
    return new Date(parts.year, 11, 31)
  }

  return new Date(parts.year, parts.month, 0)
}

/**
 * Timestamp para ordenar documentos (balances, IVA, IIBB).
 * Usa el mayor entre periodo, fechas de cierre y campos de SORT_FIELDS.
 *
 * @param {Record<string, unknown> | null | undefined} doc
 * @param {string[]} [fields]
 * @returns {number}
 */
export function getDocumentSortTime(doc, fields = SORT_FIELDS) {
  if (!doc) {
    return 0
  }

  let best = 0

  for (const field of fields) {
    const date = toDate(doc?.[field])
    if (date) {
      best = Math.max(best, date.getTime())
    }
  }

  return best
}

/**
 * @param {unknown[]} docs
 * @returns {Record<string, unknown> | null}
 */
export function getLatestDocument(docs) {
  if (!Array.isArray(docs) || docs.length === 0) {
    return null
  }

  return docs.reduce((latest, doc) => {
    if (!latest) {
      return doc
    }

    return getDocumentSortTime(doc) >= getDocumentSortTime(latest)
      ? doc
      : latest
  }, null)
}

/**
 * @param {Date} date
 * @returns {string}
 */
function formatDayMonthYear(date) {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * @param {Date} date
 * @returns {string}
 */
function formatMonthYear(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${month}/${year}`
}

/**
 * @param {Record<string, unknown> | null} doc
 * @param {string[]} fields
 * @returns {Date | null}
 */
function getDisplayDate(doc, fields) {
  if (!doc) {
    return null
  }

  for (const field of fields) {
    const date = toDate(doc[field])
    if (date) {
      return date
    }
  }

  return null
}

/**
 * Meses calendario transcurridos desde `fromDate` hasta `referenceDate`.
 *
 * @param {Date} fromDate
 * @param {Date} [referenceDate]
 * @returns {number}
 */
export function getAgeInCalendarMonths(fromDate, referenceDate = new Date()) {
  if (!fromDate || Number.isNaN(fromDate.getTime())) {
    return Number.POSITIVE_INFINITY
  }

  let months =
    (referenceDate.getFullYear() - fromDate.getFullYear()) * 12 +
    (referenceDate.getMonth() - fromDate.getMonth())

  if (referenceDate.getDate() < fromDate.getDate()) {
    months -= 1
  }

  return Math.max(0, months)
}

/**
 * @param {unknown[]} docs
 * @param {string[]} fields
 * @returns {Date | null}
 */
export function getLatestDocumentDate(docs, fields = SORT_FIELDS) {
  const latest = getLatestDocument(docs)
  return getDisplayDate(latest, fields)
}

/**
 * @param {number} ageMonths
 * @param {{ vigenteMaxMonths: number; atencionMaxMonths: number }} rules
 * @returns {{ level: DocumentVigencyLevel; signal: DocumentVigencySignal; ageMonths: number }}
 */
export function evaluateDocumentVigency(ageMonths, rules) {
  if (!Number.isFinite(ageMonths)) {
    return { level: "vencido", signal: "red", ageMonths }
  }

  if (ageMonths <= rules.vigenteMaxMonths) {
    return { level: "vigente", signal: "green", ageMonths }
  }

  if (ageMonths <= rules.atencionMaxMonths) {
    return { level: "atencion", signal: "yellow", ageMonths }
  }

  return { level: "vencido", signal: "red", ageMonths }
}

/**
 * @param {unknown[]} docs
 * @param {Date} [referenceDate]
 * @returns {{ level: DocumentVigencyLevel; signal: DocumentVigencySignal; ageMonths: number | null; latestDate: Date | null }}
 */
export function evaluateFiscalVigency(docs, referenceDate = new Date()) {
  if (!Array.isArray(docs) || docs.length === 0) {
    return { level: "vencido", signal: "red", ageMonths: null, latestDate: null }
  }

  const latestDate = getLatestDocumentDate(docs, FISCAL_DISPLAY_FIELDS)
  if (!latestDate) {
    return { level: "vencido", signal: "red", ageMonths: null, latestDate: null }
  }

  const ageMonths = getAgeInCalendarMonths(latestDate, referenceDate)
  const vigency = evaluateDocumentVigency(ageMonths, FISCAL_VIGENCY_RULES)

  return { ...vigency, latestDate }
}

/**
 * @param {unknown[]} docs
 * @param {Date} [referenceDate]
 * @returns {{ level: DocumentVigencyLevel; signal: DocumentVigencySignal; ageMonths: number | null; latestDate: Date | null }}
 */
export function evaluateBalanceVigency(docs, referenceDate = new Date()) {
  if (!Array.isArray(docs) || docs.length === 0) {
    return { level: "vencido", signal: "red", ageMonths: null, latestDate: null }
  }

  const latestDate = getLatestDocumentDate(docs, BALANCE_DISPLAY_FIELDS)
  if (!latestDate) {
    return { level: "vencido", signal: "red", ageMonths: null, latestDate: null }
  }

  const ageMonths = getAgeInCalendarMonths(latestDate, referenceDate)
  const vigency = evaluateDocumentVigency(ageMonths, BALANCE_VIGENCY_RULES)

  return { ...vigency, latestDate }
}

/**
 * @param {unknown[]} docs
 * @returns {string | null}
 */
export function formatLatestFiscalPeriod(docs) {
  const latest = getLatestDocument(docs)
  const date = getDisplayDate(latest, FISCAL_DISPLAY_FIELDS)

  if (!date) {
    return null
  }

  return `Último: ${formatMonthYear(date)}`
}

/**
 * @param {unknown[]} docs
 * @returns {string | null}
 */
export function formatLatestBalancePeriod(docs) {
  const latest = getLatestDocument(docs)
  const date = getDisplayDate(latest, BALANCE_DISPLAY_FIELDS)

  if (!date) {
    return null
  }

  return `Último: ${formatDayMonthYear(date)}`
}

export { hasWebUrl }

/**
 * @param {{
 *   iva?: unknown[];
 *   iibb?: unknown[];
 *   balances?: unknown[];
 *   locales?: unknown[];
 *   nosis?: unknown[];
 *   empresa?: Record<string, unknown> | null;
 * }} data
 * @returns {Array<{
 *   label: string;
 *   status: string;
 *   tone: "success" | "warning" | "danger" | "muted";
 *   vigencyEmoji?: string | null;
 *   optional?: boolean;
 *   confirmed?: boolean;
 *   subtitle?: string | null;
 *   subtitleTone?: "success" | "warning" | "muted";
 * }>}
 */
/**
 * @param {Record<string, unknown> | null} doc
 * @param {"iva" | "iibb"} tipo
 * @returns {string | null}
 */
function getFiscalIndicatorsSubtitle(doc, tipo) {
  if (!doc) {
    return null
  }

  const confirmed =
    tipo === "iva"
      ? hasConfirmedIvaIndicators(doc)
      : hasConfirmedIibbIndicators(doc)

  return confirmed ? "Indicadores confirmados" : "Pendiente de validación"
}

export function buildEstadoDocumentalItems(data) {
  const iva = data.iva ?? []
  const iibb = data.iibb ?? []
  const balances = data.balances ?? []
  const locales = data.locales ?? []
  const nosisDocs = data.nosis ?? []
  const latestNosis = getLatestNosisReport(nosisDocs)
  const nosisStatus = getNosisDocumentStatus(latestNosis)
  const hasNosisConfirmed = hasConfirmedNosisIndicators(latestNosis)
  const sucursales = mergeSucursalesFromFirestore(data.empresa, locales)
  const cantidadLocales = sucursales.length
  const cantidadImagenes = Array.isArray(locales) ? locales.length : 0
  const hasLocales = hasLocalesLoaded(data.empresa, locales)

  console.log("LOCALES DEBUG", {
    locales,
    cantidadLocales,
    cantidadImagenes,
    status: hasLocales ? "confirmed" : "optional",
  })

  const website = getEmpresaWebsiteUrl(data.empresa)
  const hasWebsite =
    typeof website === "string" && website.trim().length > 0

  const ivaVigency = evaluateFiscalVigency(iva)
  const iibbVigency = evaluateFiscalVigency(iibb)
  const balanceVigency = evaluateBalanceVigency(balances)

  const fiscalItem = (label, docs, vigency, tipo) => {
    const latest = /** @type {Record<string, unknown> | null} */ (
      getLatestDocument(docs)
    )
    const subtitle = docs.length > 0 ? getFiscalIndicatorsSubtitle(latest, tipo) : null

    return {
      label,
      status: formatLatestFiscalPeriod(docs) ?? "Pendiente",
      tone: VIGENCY_TONE[vigency.signal],
      vigencyEmoji: VIGENCY_EMOJI[vigency.signal],
      subtitle,
      subtitleTone:
        subtitle === "Indicadores confirmados" ? "success" : "warning",
    }
  }

  const latestBalance = getLatestDocument(balances)
  const balanceSubtitle = getBalanceValidationSubtitle(
    /** @type {Record<string, unknown> | null} */ (latestBalance)
  )

  const balanceItem = {
    label: "Balances",
    status: formatLatestBalancePeriod(balances) ?? "Pendiente",
    tone: VIGENCY_TONE[balanceVigency.signal],
    vigencyEmoji: VIGENCY_EMOJI[balanceVigency.signal],
    subtitle: balances.length > 0 ? balanceSubtitle : null,
    subtitleTone:
      balanceSubtitle === "Indicadores confirmados" ? "success" : "warning",
  }

  return [
    fiscalItem("IVA", iva, ivaVigency, "iva"),
    fiscalItem("IIBB", iibb, iibbVigency, "iibb"),
    balanceItem,
    {
      label: "Locales",
      status: hasLocales ? "Confirmado" : "Opcional",
      tone: hasLocales ? "success" : "muted",
      vigencyEmoji: null,
      optional: !hasLocales,
      confirmed: hasLocales,
      subtitle: hasLocales
        ? cantidadImagenes > 0
          ? `${cantidadLocales} local${cantidadLocales === 1 ? "" : "es"} · ${cantidadImagenes} imagen${cantidadImagenes === 1 ? "" : "es"}`
          : `${cantidadLocales} local${cantidadLocales === 1 ? "" : "es"} cargado${cantidadLocales === 1 ? "" : "s"}`
        : null,
      subtitleTone: hasLocales ? "success" : "muted",
    },
    {
      label: "Web",
      status: hasWebsite ? "Confirmado" : "Opcional",
      tone: hasWebsite ? "success" : "muted",
      vigencyEmoji: null,
      optional: !hasWebsite,
      confirmed: hasWebsite,
      subtitle: hasWebsite
        ? `Último registro: ${formatWebsiteDisplayLabel(website)}`
        : null,
      subtitleTone: hasWebsite ? "success" : "muted",
    },
    {
      label: "NOSIS",
      status: nosisStatus,
      tone:
        nosisStatus === "Confirmado"
          ? "success"
          : nosisStatus === "Pendiente"
            ? "warning"
            : "muted",
      vigencyEmoji: null,
      optional: !hasNosisConfirmed,
      confirmed: hasNosisConfirmed,
      subtitle: getNosisPdfSubtitle(latestNosis, USE_FIREBASE_STORAGE),
      subtitleTone:
        nosisStatus === "Confirmado"
          ? "success"
          : nosisStatus === "Pendiente"
            ? "warning"
            : "muted",
    },
  ]
}

/**
 * Resumen agregado para el sidebar (sin duplicar tarjetas del panel principal).
 *
 * @param {ReturnType<typeof buildEstadoDocumentalItems>} items
 */
export function summarizeEstadoDocumentalItems(items) {
  const list = Array.isArray(items) ? items : []
  let confirmados = 0
  let opcionales = 0

  for (const item of list) {
    if (item.confirmed) {
      confirmados++
      continue
    }
    if (item.optional) {
      opcionales++
      continue
    }
    if (item.status !== "Pendiente" && item.tone !== "danger") {
      confirmados++
    }
  }

  const total = list.length
  const completitud =
    total > 0 ? Math.round((confirmados / total) * 100) : 0

  return { confirmados, opcionales, completitud, total }
}
