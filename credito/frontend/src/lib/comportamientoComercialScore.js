import { CHEQUE_ESTADO } from "@/lib/chequesRechazadosModel"

/** @typedef {"good" | "medium" | "risky" | "unknown"} ComportamientoSemaphore */

const MONTO_PENDIENTE_CRITICO = 5_000_000

/**
 * @param {Array<{ estado?: string; importe?: number; fechaRechazo?: string | null }>} cheques
 */
export function computeComportamientoComercialMetrics(cheques = []) {
  const list = Array.isArray(cheques) ? cheques : []

  const totalRechazados = list.length
  const pendientes = list.filter((c) => c.estado === CHEQUE_ESTADO.PENDIENTE)
  const abonados = list.filter((c) => c.estado === CHEQUE_ESTADO.ABONADO)

  const cantidadPendientes = pendientes.length
  const cantidadAbonados = abonados.length

  const montoTotalRechazado = list.reduce(
    (sum, c) => sum + (Number(c.importe) || 0),
    0
  )
  const montoTotalPendiente = pendientes.reduce(
    (sum, c) => sum + (Number(c.importe) || 0),
    0
  )
  const montoTotalRegularizado = abonados.reduce(
    (sum, c) => sum + (Number(c.importe) || 0),
    0
  )

  let fechaUltimoRechazo = null
  for (const cheque of list) {
    if (!cheque.fechaRechazo) {
      continue
    }
    const time = new Date(cheque.fechaRechazo).getTime()
    if (!Number.isFinite(time)) {
      continue
    }
    if (
      !fechaUltimoRechazo ||
      time > new Date(fechaUltimoRechazo).getTime()
    ) {
      fechaUltimoRechazo = cheque.fechaRechazo
    }
  }

  return {
    cantidadRechazados: totalRechazados,
    cantidadPendientes,
    cantidadAbonados,
    montoTotalRechazado,
    montoTotalPendiente,
    montoTotalRegularizado,
    fechaUltimoRechazo,
  }
}

/**
 * Calcula puntos de comportamiento comercial según reglas de negocio.
 *
 * @param {Array<{ estado?: string; importe?: number }>} cheques
 * @returns {number}
 */
export function calculateComportamientoComercialScore(cheques = []) {
  const metrics = computeComportamientoComercialMetrics(cheques)

  if (metrics.cantidadRechazados === 0) {
    return 10
  }

  if (metrics.montoTotalPendiente > MONTO_PENDIENTE_CRITICO) {
    return -30
  }

  if (metrics.cantidadPendientes >= 1) {
    return -20
  }

  if (metrics.cantidadRechazados > 3) {
    return -10
  }

  if (metrics.cantidadAbonados >= 2 && metrics.cantidadAbonados <= 3) {
    return 0
  }

  if (metrics.cantidadAbonados === 1) {
    return 5
  }

  return 0
}

/**
 * @param {Array<{ estado?: string; importe?: number }>} cheques
 * @returns {ComportamientoSemaphore}
 */
export function getComportamientoComercialSemaphore(cheques = []) {
  const metrics = computeComportamientoComercialMetrics(cheques)

  if (metrics.cantidadRechazados === 0) {
    return "good"
  }

  if (
    metrics.cantidadPendientes >= 1 ||
    metrics.montoTotalPendiente > MONTO_PENDIENTE_CRITICO
  ) {
    return "risky"
  }

  return "medium"
}

/**
 * @param {ComportamientoSemaphore} semaphore
 * @returns {string}
 */
export function getComportamientoComercialLabel(semaphore) {
  if (semaphore === "good") {
    return "Sin incidencias"
  }
  if (semaphore === "medium") {
    return "Rechazos regularizados"
  }
  if (semaphore === "risky") {
    return "Rechazos pendientes"
  }
  return "Sin dato"
}

/**
 * @param {Array<{ estado?: string; importe?: number; fechaRechazo?: string | null }>} cheques
 */
export function analyzeComportamientoComercial(cheques = []) {
  const metrics = computeComportamientoComercialMetrics(cheques)
  const score = calculateComportamientoComercialScore(cheques)
  const semaforo = getComportamientoComercialSemaphore(cheques)
  const etiqueta = getComportamientoComercialLabel(semaforo)

  return {
    ...metrics,
    scoreComportamiento: score,
    semaforo,
    etiqueta,
    disponible: true,
  }
}
