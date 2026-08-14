import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"

import { db } from "@/service/firebase"
import { toYearMonth } from "@/lib/inflation/balanceInflation"

export const INFLATION_INDEX_COLLECTION = "inflation_index"

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

function inflationIndexCollection() {
  return collection(db, INFLATION_INDEX_COLLECTION)
}

/**
 * @param {string} period
 */
export function isValidInflationPeriod(period) {
  return PERIOD_PATTERN.test(String(period ?? "").trim())
}

/**
 * @param {string} period
 */
export function formatInflationPeriod(period) {
  const match = String(period ?? "").match(/^(\d{4})-(\d{2})$/)
  return match ? `${match[2]}/${match[1]}` : String(period ?? "")
}

/**
 * coeficiente = 1 + (inflación interanual % / 100)
 *
 * @param {number} annualInflationPct
 */
export function computeCoefficientFromYoY(annualInflationPct) {
  const value = Number(annualInflationPct)
  if (!Number.isFinite(value)) {
    return null
  }
  const factorInflacion = 1 + value / 100
  return {
    factorInflacion,
    accumulated: value / 100,
    inflacionAcumuladaPct: value,
    ipcOrigen: value,
    ipcDestino: null,
  }
}

/**
 * Producto de factores anuales: ∏ (1 + value_i / 100)
 *
 * @param {number[]} annualInflationPcts
 */
export function computeChainedCoefficientFromYoY(annualInflationPcts) {
  if (!Array.isArray(annualInflationPcts) || annualInflationPcts.length === 0) {
    return null
  }

  let factorInflacion = 1
  for (const raw of annualInflationPcts) {
    const value = Number(raw)
    if (!Number.isFinite(value)) {
      return null
    }
    factorInflacion *= 1 + value / 100
  }

  const first = Number(annualInflationPcts[0])
  const last = Number(annualInflationPcts[annualInflationPcts.length - 1])

  return {
    factorInflacion,
    accumulated: factorInflacion - 1,
    inflacionAcumuladaPct: (factorInflacion - 1) * 100,
    ipcOrigen: Number.isFinite(first) ? first : null,
    ipcDestino: Number.isFinite(last) ? last : null,
  }
}

/**
 * Aniversarios AAAA-MM desde el mes de cierre hasta el último período del mismo mes.
 *
 * @param {string} originPeriod
 * @param {string} lastPeriod
 * @returns {string[]}
 */
export function buildAnniversaryPeriods(originPeriod, lastPeriod) {
  if (
    !isValidInflationPeriod(originPeriod) ||
    !isValidInflationPeriod(lastPeriod) ||
    lastPeriod < originPeriod
  ) {
    return []
  }

  const originMonth = originPeriod.slice(5, 7)
  const originYear = Number(originPeriod.slice(0, 4))
  const lastYear = Number(lastPeriod.slice(0, 4))
  /** @type {string[]} */
  const periods = []

  for (let year = originYear; year <= lastYear; year += 1) {
    const period = `${year}-${originMonth}`
    if (period < originPeriod || period > lastPeriod) continue
    periods.push(period)
  }

  return periods
}

/**
 * Aniversarios del mismo mes con period > closingPeriod y period <= lastPeriod.
 * Nunca incluye el período de cierre.
 *
 * @param {string} closingPeriod
 * @param {string} lastPeriod
 * @returns {string[]}
 */
export function buildAppliedInflationPeriods(closingPeriod, lastPeriod) {
  if (
    !isValidInflationPeriod(closingPeriod) ||
    !isValidInflationPeriod(lastPeriod) ||
    lastPeriod <= closingPeriod
  ) {
    return []
  }

  const closingMonth = closingPeriod.slice(5, 7)
  const closingYear = Number(closingPeriod.slice(0, 4))
  const lastYear = Number(lastPeriod.slice(0, 4))
  /** @type {string[]} */
  const periods = []

  for (let year = closingYear + 1; year <= lastYear; year += 1) {
    const period = `${year}-${closingMonth}`
    if (period > closingPeriod && period <= lastPeriod) {
      periods.push(period)
    }
  }

  return periods
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} data
 */
function parseInflationIndex(id, data) {
  const period = String(data.period ?? id)
  const value = Number(data.value)
  if (!isValidInflationPeriod(period) || !Number.isFinite(value)) {
    return null
  }
  return {
    id,
    period,
    value,
    source: String(data.source ?? "INDEC"),
    updatedAt: data.updatedAt ?? null,
    updatedBy: String(data.updatedBy ?? ""),
  }
}

/**
 * @param {(indexes: Array<{ id: string; period: string; value: number; source: string; updatedAt: unknown; updatedBy: string }>) => void} onChange
 * @param {(error: Error) => void} [onError]
 */
export function subscribeInflationIndexes(onChange, onError) {
  return onSnapshot(
    inflationIndexCollection(),
    (snapshot) => {
      const indexes = snapshot.docs
        .map((item) => parseInflationIndex(item.id, item.data()))
        .filter(Boolean)
        .sort((a, b) => b.period.localeCompare(a.period))
      onChange(indexes)
    },
    onError
  )
}

/**
 * @param {{ period: string; value: number; source?: string; updatedBy: string }} input
 */
export async function saveInflationIndex(input) {
  const period = String(input.period ?? "").trim()
  const value = Number(input.value)
  if (!isValidInflationPeriod(period)) {
    throw new Error("El período debe tener formato AAAA-MM.")
  }
  if (!Number.isFinite(value)) {
    throw new Error("La inflación interanual debe ser un número válido.")
  }

  await setDoc(
    doc(inflationIndexCollection(), period),
    {
      period,
      value,
      source: String(input.source ?? "INDEC").trim() || "INDEC",
      updatedAt: serverTimestamp(),
      updatedBy: input.updatedBy,
    },
    { merge: true }
  )
}

/**
 * @param {string} period
 */
export async function deleteInflationIndex(period) {
  if (!isValidInflationPeriod(period)) {
    throw new Error("Período inválido.")
  }
  await deleteDoc(doc(inflationIndexCollection(), period))
}

/**
 * Resuelve el factor desde inflación interanual (%).
 * Solo multiplica períodos estrictamente posteriores al cierre.
 *
 * @param {Array<{ period: string; value: number }>} indexes
 * @param {string | Date | null | undefined} closingDate
 */
export function resolveInflationFromMasterIndexes(indexes, closingDate) {
  const originPeriod = toYearMonth(closingDate)
  const byPeriod = new Map(indexes.map((item) => [item.period, item.value]))
  const empty = {
    inflation: null,
    originPeriod,
    destinationPeriod: null,
    ipcOrigen: null,
    ipcDestino: null,
    annualInflationPct: null,
    chainPeriods: [],
    chainSteps: [],
    missingPeriods: /** @type {string[]} */ ([]),
  }

  if (!originPeriod) {
    return { ...empty, originPeriod: null }
  }

  const originMonth = originPeriod.slice(5, 7)
  const sameMonthPeriods = indexes
    .map((item) => item.period)
    .filter(
      (period) =>
        isValidInflationPeriod(period) && period.endsWith(`-${originMonth}`)
    )
    .sort((a, b) => a.localeCompare(b))

  const lastPeriod = sameMonthPeriods[sameMonthPeriods.length - 1] ?? null

  if (!lastPeriod || lastPeriod < originPeriod) {
    return {
      ...empty,
      destinationPeriod: lastPeriod,
      missingPeriods: [originPeriod],
    }
  }

  if (originPeriod === lastPeriod) {
    return {
      inflation: {
        factorInflacion: 1,
        accumulated: 0,
        inflacionAcumuladaPct: 0,
        ipcOrigen: null,
        ipcDestino: null,
        fechaIPCOrigen: originPeriod,
        fechaIPCDestino: lastPeriod,
        sourceId: "firestore_master",
        manual: false,
        fallback: false,
        apiUnavailable: false,
      },
      originPeriod,
      destinationPeriod: lastPeriod,
      ipcOrigen: null,
      ipcDestino: null,
      annualInflationPct: null,
      chainPeriods: [],
      chainSteps: [],
      missingPeriods: [],
    }
  }

  const chainPeriods = buildAppliedInflationPeriods(originPeriod, lastPeriod)
  const missingPeriods = chainPeriods.filter(
    (period) => !Number.isFinite(Number(byPeriod.get(period)))
  )

  /** @type {Array<{ period: string; fromPeriod: string; toPeriod: string; year: string; annualInflationPct: number; coefficient: number }>} */
  const chainSteps = []
  for (const period of chainPeriods) {
    const yoy = Number(byPeriod.get(period))
    if (!Number.isFinite(yoy)) continue
    const year = Number(period.slice(0, 4))
    const month = period.slice(5, 7)
    chainSteps.push({
      period,
      fromPeriod: `${year - 1}-${month}`,
      toPeriod: period,
      year: period.slice(0, 4),
      annualInflationPct: yoy,
      coefficient: 1 + yoy / 100,
    })
  }

  if (missingPeriods.length > 0 || chainPeriods.length === 0) {
    return {
      ...empty,
      destinationPeriod: lastPeriod,
      chainPeriods,
      chainSteps,
      missingPeriods:
        missingPeriods.length > 0 ? missingPeriods : [originPeriod],
    }
  }

  const values = chainSteps.map((step) => step.annualInflationPct)
  const core = computeChainedCoefficientFromYoY(values)

  return {
    inflation: core
      ? {
          ...core,
          fechaIPCOrigen: originPeriod,
          fechaIPCDestino: lastPeriod,
          sourceId: "firestore_master",
          manual: false,
          fallback: false,
          apiUnavailable: false,
        }
      : null,
    originPeriod,
    destinationPeriod: lastPeriod,
    ipcOrigen: values[0],
    ipcDestino: values[values.length - 1],
    annualInflationPct: values[0],
    chainPeriods,
    chainSteps,
    missingPeriods: core ? [] : chainPeriods,
  }
}
