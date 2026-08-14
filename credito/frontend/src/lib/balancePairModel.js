import { getDocumentSortTime } from "@/lib/getLatestDocumentPeriod"
import { hasConfirmedBalanceIndicators } from "@/lib/balanceIndicators"

/** @typedef {"actual" | "anterior"} BalanceSlot */

/** @type {BalanceSlot[]} */
export const BALANCE_SLOTS = ["actual", "anterior"]

/** @type {Record<BalanceSlot, string>} */
export const BALANCE_SLOT_LABELS = {
  actual: "Balance actual",
  anterior: "Balance ejercicio anterior",
}

/** @type {Record<BalanceSlot, string>} */
export const BALANCE_SLOT_DESCRIPTIONS = {
  actual: "Ejercicio en curso o último cerrado",
  anterior: "Ejercicio inmediato anterior (solo uno)",
}

/**
 * @param {unknown} raw
 * @returns {BalanceSlot | null}
 */
export function normalizeBalanceSlot(raw) {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase()
  if (value === "actual" || value === "anterior") {
    return value
  }
  return null
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {number | null}
 */
export function getEjercicioYear(doc) {
  if (!doc) {
    return null
  }

  const ejercicio = doc.ejercicio ?? doc.periodo
  if (ejercicio != null && ejercicio !== "") {
    const raw = String(ejercicio).trim()
    if (/^\d{4}$/.test(raw)) {
      return Number(raw)
    }
    if (raw.length >= 4) {
      const year = Number(raw.slice(0, 4))
      return Number.isFinite(year) ? year : null
    }
  }

  const fecha = doc.fechaCierre ?? doc.fecha_cierre ?? doc.fecha
  if (fecha) {
    const parsed = new Date(
      typeof fecha === "string" && !fecha.includes("T")
        ? `${fecha}T12:00:00`
        : fecha
    )
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getFullYear()
    }
  }

  const sortTime = getDocumentSortTime(doc)
  return sortTime > 0 ? new Date(sortTime).getFullYear() : null
}

/**
 * @param {BalanceSlot} slot
 * @returns {string}
 */
export function suggestedEjercicioForSlot(slot) {
  const currentYear = new Date().getFullYear()
  return slot === "actual" ? String(currentYear) : String(currentYear - 1)
}

/**
 * @param {BalanceSlot} slot
 * @returns {Record<string, unknown> & { id: string }}
 */
export function buildPlaceholderBalanceDoc(slot) {
  const ejercicio = suggestedEjercicioForSlot(slot)
  return {
    id: `pending-${slot}`,
    balanceSlot: slot,
    ejercicio,
    periodo: `${ejercicio}12`,
    nombre: BALANCE_SLOT_LABELS[slot],
    validationStatus: "draft",
    storageDisabled: true,
  }
}

/**
 * @param {unknown[]} balances
 * @returns {{ actual: (Record<string, unknown> & { id?: string }) | null; anterior: (Record<string, unknown> & { id?: string }) | null }}
 */
export function resolveBalancePair(balances) {
  /** @type {{ actual: (Record<string, unknown> & { id?: string }) | null; anterior: (Record<string, unknown> & { id?: string }) | null }} */
  const pair = { actual: null, anterior: null }

  if (!Array.isArray(balances)) {
    return pair
  }

  const docs = balances
    .filter((doc) => doc && typeof doc === "object")
    .map((doc) => /** @type {Record<string, unknown> & { id?: string }} */ (doc))

  for (const doc of docs) {
    const slot = normalizeBalanceSlot(doc.balanceSlot ?? doc.balance_slot)
    if (slot === "actual" && !pair.actual) {
      pair.actual = doc
    } else if (slot === "anterior" && !pair.anterior) {
      pair.anterior = doc
    }
  }

  const unassigned = docs
    .filter((doc) => doc !== pair.actual && doc !== pair.anterior)
    .sort((a, b) => getDocumentSortTime(b) - getDocumentSortTime(a))

  if (!pair.actual && unassigned.length > 0) {
    pair.actual = unassigned.shift() ?? null
  }
  if (!pair.anterior && unassigned.length > 0) {
    pair.anterior = unassigned.shift() ?? null
  }

  return pair
}

/**
 * Máximo dos balances para pre-calificación (actual + anterior), año descendente.
 * @param {unknown[]} balances
 * @returns {Array<Record<string, unknown> & { id?: string }>}
 */
export function getBalancesForPrequalification(balances) {
  const { actual, anterior } = resolveBalancePair(balances)
  return [actual, anterior]
    .filter((doc) => doc != null)
    .sort((a, b) => getDocumentSortTime(b) - getDocumentSortTime(a))
}

/**
 * @param {unknown[]} balances
 * @returns {BalanceSlot | null}
 */
export function assignSlotForNewBalance(balances) {
  const pair = resolveBalancePair(balances)
  if (!pair.actual) {
    return "actual"
  }
  if (!pair.anterior) {
    return "anterior"
  }
  return null
}

/**
 * @param {unknown[]} balances
 * @returns {boolean}
 */
export function canAddMoreBalances(balances) {
  return assignSlotForNewBalance(balances) !== null
}

/**
 * @param {string} ejercicio
 * @param {BalanceSlot} slot
 * @param {unknown[]} balances
 * @param {string} [excludeDocId]
 * @returns {string | null}
 */
export function validateEjercicioNotDuplicated(
  ejercicio,
  slot,
  balances,
  excludeDocId
) {
  const year = String(ejercicio ?? "")
    .trim()
    .slice(0, 4)
  if (!/^\d{4}$/.test(year)) {
    return "El ejercicio debe ser un año de 4 dígitos (ej. 2024)."
  }

  const pair = resolveBalancePair(balances)
  const other = slot === "actual" ? pair.anterior : pair.actual
  if (!other) {
    return null
  }

  if (excludeDocId && other.id === excludeDocId) {
    return null
  }

  const otherYear = getEjercicioYear(other)
  if (otherYear != null && String(otherYear) === year) {
    return "No se puede repetir el mismo ejercicio en actual y anterior."
  }

  return null
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {boolean}
 */
export function balanceDocHasIndicatorData(doc) {
  if (!doc) {
    return false
  }
  const keys = [
    "ventas",
    "compras",
    "costos",
    "totalActivo",
    "activoCorriente",
    "patrimonioNeto",
  ]
  return keys.some((key) => doc[key] != null && doc[key] !== "")
}

/**
 * @param {unknown[]} balances
 * @returns {number}
 */
export function countExtraBalancesIgnored(balances) {
  if (!Array.isArray(balances)) {
    return 0
  }
  return Math.max(0, balances.length - 2)
}
