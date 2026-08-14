import {
  normalizeNosisAnalisis,
  nosisAnalisisFromDoc,
  getNosisScoreSourceLabel,
  estadoComercialToSemaphore,
  normalizeNosisEstadoComercial,
} from "@/lib/nosisOfficialAnalysis"

export {
  normalizeNosisAnalisis,
  nosisAnalisisFromDoc,
  getNosisScoreSourceLabel,
  estadoComercialToSemaphore,
  normalizeNosisEstadoComercial,
}

/** @typedef {"draft" | "pending" | "confirmed"} NosisValidationStatus */

/**
 * @typedef {Object} ConsultasUltimos4Meses
 * @property {number} [jun]
 * @property {number} may
 * @property {number} abr
 * @property {number} mar
 * @property {number} feb
 * @property {number} [ene]
 * @property {number} total
 * @property {number} promedio
 */

/** @type {const} */
export const CONSULTAS_ULTIMOS_MESES = [
  { key: "jun", label: "Jun" },
  { key: "may", label: "May" },
  { key: "abr", label: "Abr" },
  { key: "mar", label: "Mar" },
  { key: "feb", label: "Feb" },
  { key: "ene", label: "Ene" },
]

export const CONSULTAS_ULTIMOS_MESES_COUNT = CONSULTAS_ULTIMOS_MESES.length

/**
 * @typedef {"jun26" | "may26" | "abr26" | "mar26" | "feb26" | "ene26" | "total"} ConsultasSeguimientoColumnKey
 */

/**
 * @typedef {Partial<Record<ConsultasSeguimientoColumnKey, number>>} ConsultasSeguimientoRow
 */

/**
 * @typedef {Object} ConsultasSeguimientosTable
 * @property {ConsultasSeguimientoRow | null} bancarias
 * @property {ConsultasSeguimientoRow | null} financieras
 * @property {ConsultasSeguimientoRow | null} comerciales
 * @property {ConsultasSeguimientoRow | null} totales
 */

/**
 * @typedef {import("@/lib/nosisFullReport").NosisFullReport} NosisFullReport
 */
/**
 * @typedef {Object} NosisIndicators
 * @property {string} situacionBcra
 * @property {ConsultasUltimos4Meses | null} [consultasUltimos4Meses]
 * @property {boolean} moraVigente
 * @property {string} cantidadCheques
 * @property {string} montoCheques
 * @property {string} chequesRechazadosTotal
 * @property {string} chequesAbonados
 * @property {string} chequesPendientes
 * @property {string} montoRechazadoTotal
 * @property {string} montoAbonado
 * @property {string} montoPendiente
 * @property {boolean} chequesHistoricoParsed
 * @property {string} chequesImpagos
 * @property {boolean} juiciosConcursos
 */

export const EMPTY_NOSIS_INDICATORS = {
  situacionBcra: "",
  consultasUltimos4Meses: null,
  moraVigente: false,
  cantidadCheques: "",
  montoCheques: "",
  chequesRechazadosTotal: "",
  chequesAbonados: "",
  chequesPendientes: "",
  montoRechazadoTotal: "",
  montoAbonado: "",
  montoPendiente: "",
  chequesHistoricoParsed: false,
  chequesImpagos: "",
  juiciosConcursos: false,
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function parseNosisNumber(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return 0
  }
  const normalized = String(raw)
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {unknown} raw
 * @returns {ConsultasUltimos4Meses | null}
 */
export function normalizeConsultasUltimos4Meses(raw) {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const row = /** @type {Record<string, unknown>} */ (raw)
  const jun = Number(row.jun ?? row.jun26 ?? 0)
  const may = Number(row.may ?? row.may26 ?? 0)
  const abr = Number(row.abr ?? row.abr26 ?? 0)
  const mar = Number(row.mar ?? row.mar26 ?? 0)
  const feb = Number(row.feb ?? row.feb26 ?? 0)
  const ene = Number(row.ene ?? row.ene26 ?? 0)
  const total = Number(row.total ?? 0)
  const promedio = Number(row.promedio ?? 0)

  const hasSixMonths = CONSULTAS_ULTIMOS_MESES.every(({ key }) => {
    const rawValue = row[key] ?? row[`${key}26`]
    return rawValue !== undefined && rawValue !== null && Number.isFinite(Number(rawValue))
  })

  const monthValues = hasSixMonths
    ? [jun, may, abr, mar, feb, ene]
    : [may, abr, mar, feb]

  if (!monthValues.some((n) => Number.isFinite(n) && n > 0)) {
    return null
  }

  const resolvedTotal =
    total > 0 ? total : monthValues.reduce((acc, value) => acc + (value || 0), 0)
  if (resolvedTotal <= 0) {
    return null
  }

  const divisor = hasSixMonths ? CONSULTAS_ULTIMOS_MESES_COUNT : 4
  const resolvedPromedio =
    promedio > 0 ? promedio : Math.round((resolvedTotal / divisor) * 100) / 100

  if (hasSixMonths) {
    return {
      jun: Number.isFinite(jun) ? jun : 0,
      may: Number.isFinite(may) ? may : 0,
      abr: Number.isFinite(abr) ? abr : 0,
      mar: Number.isFinite(mar) ? mar : 0,
      feb: Number.isFinite(feb) ? feb : 0,
      ene: Number.isFinite(ene) ? ene : 0,
      total: resolvedTotal,
      promedio: resolvedPromedio,
    }
  }

  return {
    may: Number.isFinite(may) ? may : 0,
    abr: Number.isFinite(abr) ? abr : 0,
    mar: Number.isFinite(mar) ? mar : 0,
    feb: Number.isFinite(feb) ? feb : 0,
    total: resolvedTotal,
    promedio: resolvedPromedio,
  }
}

/**
 * @param {unknown} raw
 * @returns {ConsultasSeguimientoRow | null}
 */
function normalizeConsultasSeguimientoRow(raw) {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const row = /** @type {Record<string, unknown>} */ (raw)
  /** @type {ConsultasSeguimientoRow} */
  const normalized = {}

  for (const [key, value] of Object.entries(row)) {
    const n = Number(value)
    if (Number.isFinite(n)) {
      normalized[/** @type {ConsultasSeguimientoColumnKey} */ (key)] = n
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null
}

/**
 * @param {unknown} raw
 * @returns {ConsultasSeguimientosTable | null}
 */
export function normalizeConsultasSeguimientos(raw) {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const table = /** @type {Record<string, unknown>} */ (raw)
  const bancarias = normalizeConsultasSeguimientoRow(table.bancarias)
  const financieras = normalizeConsultasSeguimientoRow(table.financieras)
  const comerciales = normalizeConsultasSeguimientoRow(table.comerciales)
  const totales =
    normalizeConsultasSeguimientoRow(table.totales) ??
    normalizeConsultasMensual(table.totales)

  if (!bancarias && !financieras && !comerciales && !totales) {
    return null
  }

  return { bancarias, financieras, comerciales, totales }
}

/**
 * @param {unknown} raw
 * @returns {Partial<Record<"jun26" | "may26" | "abr26" | "mar26" | "feb26" | "ene26", number>> | null}
 */
export function normalizeConsultasMensual(raw) {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const row = /** @type {Record<string, unknown>} */ (raw)
  /** @type {Partial<Record<"jun26" | "may26" | "abr26" | "mar26" | "feb26" | "ene26", number>>} */
  const normalized = {}

  for (const key of ["jun26", "may26", "abr26", "mar26", "feb26", "ene26"]) {
    const value = row[key]
    if (value === undefined || value === null) {
      continue
    }
    const n = Number(value)
    if (Number.isFinite(n)) {
      normalized[/** @type {"jun26" | "may26" | "abr26" | "mar26" | "feb26" | "ene26"} */ (
        key
      )] = n
    }
  }

  return Object.keys(normalized).length >= 4 ? normalized : null
}

/**
 * @typedef {Object} NosisSociedadEntry
 * @property {string | null} razonSocial
 * @property {string | null} fechaPublicacion
 * @property {string | null} constitucion
 * @property {string | null} domicilio
 * @property {string | null} fuente
 * @property {string | null} detalle
 */

/**
 * @param {unknown} raw
 * @returns {NosisSociedadEntry[]}
 */
export function normalizeSociedades(raw) {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const row = /** @type {Record<string, unknown>} */ (item)
      return {
        razonSocial:
          typeof row.razonSocial === "string" ? row.razonSocial : null,
        fechaPublicacion:
          typeof row.fechaPublicacion === "string"
            ? row.fechaPublicacion
            : null,
        constitucion:
          typeof row.constitucion === "string" ? row.constitucion : null,
        domicilio: typeof row.domicilio === "string" ? row.domicilio : null,
        fuente: typeof row.fuente === "string" ? row.fuente : null,
        detalle: typeof row.detalle === "string" ? row.detalle : null,
      }
    })
    .filter(
      (entry) =>
        entry.razonSocial ||
        entry.constitucion ||
        entry.fuente ||
        (entry.detalle && entry.detalle.length > 20)
    )
}

/**
 * @param {Record<string, unknown>} doc
 * @returns {number}
 */
export function getNosisDocSortTime(doc) {
  const raw = doc.fechaCarga ?? doc.createdAt ?? doc.updatedAt ?? 0

  if (raw && typeof raw === "object") {
    const timestamp = /** @type {{ toDate?: () => Date; seconds?: number; nanoseconds?: number }} */ (
      raw
    )
    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate().getTime()
    }
    if (typeof timestamp.seconds === "number") {
      return timestamp.seconds * 1000 + (timestamp.nanoseconds ?? 0) / 1_000_000
    }
  }

  const parsed = new Date(String(raw)).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * @param {Record<string, unknown>} doc
 * @returns {string}
 */
export function formatNosisFechaCarga(doc) {
  const ms = getNosisDocSortTime(doc)
  if (ms > 0) {
    return new Date(ms).toISOString()
  }
  return String(doc.fechaCarga ?? doc.createdAt ?? "")
}

/**
 * @param {unknown[]} reports
 */
export function logNosisReportsOrder(reports) {
  if (!Array.isArray(reports)) {
    return
  }

  console.log(
    "NOSIS REPORTS ORDER",
    [...reports]
      .sort((a, b) => getNosisDocSortTime(b) - getNosisDocSortTime(a))
      .map((report) => {
        const row = /** @type {Record<string, unknown>} */ (report)
        const indicadores =
          row.indicadores && typeof row.indicadores === "object"
            ? /** @type {Record<string, unknown>} */ (row.indicadores)
            : null
        const parsedData =
          row.parsedData && typeof row.parsedData === "object"
            ? /** @type {Record<string, unknown>} */ (row.parsedData)
            : null
        const consultas =
          parsedData?.consultas && typeof parsedData.consultas === "object"
            ? /** @type {Record<string, unknown>} */ (parsedData.consultas)
                .ultimos4Meses
            : null

        return {
          id: row.id ?? row.firestoreId ?? null,
          fechaCarga: formatNosisFechaCarga(row),
          consultasEnParsedData: consultas ?? null,
          consultasTopLevel:
            row.consultasUltimos4Meses ??
            indicadores?.consultasUltimos4Meses ??
            null,
        }
      })
  )
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function optionalNumberToString(value) {
  if (value === null || value === undefined) {
    return ""
  }
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    return ""
  }
  return String(Math.round(n))
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function optionalAmountToString(value) {
  if (value === null || value === undefined) {
    return ""
  }
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    return ""
  }
  return String(n)
}

/**
 * @param {unknown} raw
 * @returns {NosisFullReport | null}
 */
export function normalizeNosisFullReport(raw) {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const row = /** @type {Record<string, unknown>} */ (raw)
  const ident = row.identificacion && typeof row.identificacion === "object"
    ? /** @type {Record<string, unknown>} */ (row.identificacion)
    : {}
  const bcra = row.bcra && typeof row.bcra === "object"
    ? /** @type {Record<string, unknown>} */ (row.bcra)
    : {}
  const cheques = row.cheques && typeof row.cheques === "object"
    ? /** @type {Record<string, unknown>} */ (row.cheques)
    : {}
  const consultas = row.consultas && typeof row.consultas === "object"
    ? /** @type {Record<string, unknown>} */ (row.consultas)
    : {}
  const referencias = row.referencias && typeof row.referencias === "object"
    ? /** @type {Record<string, unknown>} */ (row.referencias)
    : {}
  const juicios = row.juicios && typeof row.juicios === "object"
    ? /** @type {Record<string, unknown>} */ (row.juicios)
    : {}
  const concursos = row.concursos && typeof row.concursos === "object"
    ? /** @type {Record<string, unknown>} */ (row.concursos)
    : {}
  const actividad = row.actividad && typeof row.actividad === "object"
    ? /** @type {Record<string, unknown>} */ (row.actividad)
    : {}
  const rawSections =
    row.rawSections && typeof row.rawSections === "object"
      ? /** @type {Record<string, string>} */ (row.rawSections)
      : {}

  return {
    identificacion: {
      razonSocial:
        typeof ident.razonSocial === "string" ? ident.razonSocial : null,
      cuit: typeof ident.cuit === "string" ? ident.cuit : null,
      fechaInforme:
        typeof ident.fechaInforme === "string" ? ident.fechaInforme : null,
    },
    bcra: {
      situacion: typeof bcra.situacion === "string" ? bcra.situacion : null,
      moraVigente: Boolean(bcra.moraVigente),
      entidades:
        typeof bcra.entidades === "number" ? bcra.entidades : null,
      deudaTotal:
        typeof bcra.deudaTotal === "string" ? bcra.deudaTotal : null,
    },
    cheques: {
      rechazados:
        typeof cheques.rechazados === "number" ? cheques.rechazados : null,
      recuperados:
        typeof cheques.recuperados === "number" ? cheques.recuperados : null,
      pendientes:
        typeof cheques.pendientes === "number" ? cheques.pendientes : null,
      montoRechazado:
        typeof cheques.montoRechazado === "number"
          ? cheques.montoRechazado
          : null,
      montoRecuperado:
        typeof cheques.montoRecuperado === "number"
          ? cheques.montoRecuperado
          : null,
      montoPendiente:
        typeof cheques.montoPendiente === "number"
          ? cheques.montoPendiente
          : null,
      impagos: typeof cheques.impagos === "number" ? cheques.impagos : null,
      historicoParsed: Boolean(cheques.historicoParsed),
      historico:
        cheques.historico && typeof cheques.historico === "object"
          ? /** @type {Record<string, unknown>} */ (cheques.historico)
          : null,
    },
    consultas: {
      ultimos4Meses: normalizeConsultasUltimos4Meses(consultas.ultimos4Meses),
      mensual: normalizeConsultasMensual(consultas.mensual),
      historico:
        consultas.historico && typeof consultas.historico === "object"
          ? /** @type {Record<string, unknown>} */ (consultas.historico)
          : null,
      detalleMensual: Array.isArray(consultas.detalleMensual)
        ? consultas.detalleMensual.filter((item) => item && typeof item === "object")
        : [],
    },
    consultasSeguimientos: normalizeConsultasSeguimientos(
      row.consultasSeguimientos ?? row.consultas_seguimientos
    ),
    referencias: {
      negativas:
        typeof referencias.negativas === "number" ? referencias.negativas : null,
      detalleNegativas: Array.isArray(referencias.detalleNegativas)
        ? referencias.detalleNegativas.map(String)
        : [],
    },
    juicios: {
      cantidad:
        typeof juicios.cantidad === "number" ? juicios.cantidad : null,
      monto: typeof juicios.monto === "string" ? juicios.monto : null,
      detectado: Boolean(juicios.detectado),
    },
    concursos: {
      existe: Boolean(concursos.existe),
    },
    actividad: {
      antiguedad:
        typeof actividad.antiguedad === "string" ? actividad.antiguedad : null,
      empleados:
        typeof actividad.empleados === "number" ? actividad.empleados : null,
      sucursales:
        typeof actividad.sucursales === "number" ? actividad.sucursales : null,
      rubro: typeof actividad.rubro === "string" ? actividad.rubro : null,
    },
    observaciones: Array.isArray(row.observaciones)
      ? row.observaciones.map(String)
      : [],
    sociedades: normalizeSociedades(row.sociedades),
    analisis: normalizeNosisAnalisis(row.analisis),
    rawSections,
  }
}

/**
 * @param {NosisFullReport | null | undefined} report
 * @returns {NosisIndicators}
 */
export function nosisFullReportToIndicators(report) {
  if (!report) {
    return { ...EMPTY_NOSIS_INDICATORS }
  }

  const cheques = report.cheques ?? {}
  const bcra = report.bcra ?? {}
  const consultas = report.consultas ?? {}
  const juicios = report.juicios ?? {}
  const concursos = report.concursos ?? {}

  const pendientes = cheques.pendientes ?? null
  const rechazados = cheques.rechazados ?? null
  const montoPendiente = cheques.montoPendiente ?? null
  const montoRechazado = cheques.montoRechazado ?? null

  return {
    situacionBcra: String(bcra.situacion ?? ""),
    consultasUltimos4Meses: normalizeConsultasUltimos4Meses(
      consultas.ultimos4Meses
    ),
    moraVigente: Boolean(bcra.moraVigente),
    cantidadCheques: optionalNumberToString(pendientes ?? rechazados),
    montoCheques: optionalAmountToString(montoPendiente ?? montoRechazado),
    chequesRechazadosTotal: optionalNumberToString(rechazados),
    chequesAbonados: optionalNumberToString(cheques.recuperados),
    chequesPendientes: optionalNumberToString(pendientes),
    montoRechazadoTotal: optionalAmountToString(montoRechazado),
    montoAbonado: optionalAmountToString(cheques.montoRecuperado),
    montoPendiente: optionalAmountToString(montoPendiente),
    chequesHistoricoParsed: Boolean(cheques.historicoParsed),
    chequesImpagos: optionalNumberToString(cheques.impagos),
    juiciosConcursos: Boolean(
      juicios.detectado ||
        (typeof juicios.cantidad === "number" && juicios.cantidad > 0) ||
        concursos.existe
    ),
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {NosisFullReport | null}
 */
export function nosisParsedDataFromDoc(doc) {
  if (!doc || typeof doc !== "object") {
    return null
  }

  const row = /** @type {Record<string, unknown>} */ (doc)
  return normalizeNosisFullReport(row.parsedData ?? row.parsed_data)
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {NosisIndicators}
 */
function nosisDocToIndicatorsLegacy(doc) {
  if (!doc || typeof doc !== "object") {
    return { ...EMPTY_NOSIS_INDICATORS }
  }

  const row = /** @type {Record<string, unknown>} */ (doc)
  const ind =
    row.indicadores && typeof row.indicadores === "object"
      ? /** @type {Record<string, unknown>} */ (row.indicadores)
      : row

  const rawConsultas =
    ind.consultasUltimos4Meses ??
    ind.consultas_ultimos_4_meses ??
    row.consultasUltimos4Meses

  const mapped = {
    situacionBcra: String(ind.situacionBcra ?? ind.situacion_bcra ?? ""),
    consultasUltimos4Meses: normalizeConsultasUltimos4Meses(rawConsultas),
    moraVigente: Boolean(ind.moraVigente ?? ind.mora_vigente),
    cantidadCheques: String(ind.cantidadCheques ?? ind.cantidad_cheques ?? ""),
    montoCheques: String(ind.montoCheques ?? ind.monto_cheques ?? ""),
    chequesRechazadosTotal: String(
      ind.chequesRechazadosTotal ?? ind.cheques_rechazados_total ?? ""
    ),
    chequesAbonados: String(ind.chequesAbonados ?? ind.cheques_abonados ?? ""),
    chequesPendientes: String(ind.chequesPendientes ?? ind.cheques_pendientes ?? ""),
    montoRechazadoTotal: String(
      ind.montoRechazadoTotal ?? ind.monto_rechazado_total ?? ""
    ),
    montoAbonado: String(ind.montoAbonado ?? ind.monto_abonado ?? ""),
    montoPendiente: String(ind.montoPendiente ?? ind.monto_pendiente ?? ""),
    chequesHistoricoParsed: Boolean(
      ind.chequesHistoricoParsed ?? ind.cheques_historico_parsed
    ),
    chequesImpagos: String(ind.chequesImpagos ?? ind.cheques_impagos ?? ""),
    juiciosConcursos: Boolean(
      ind.juiciosConcursos ?? ind.juicios_concursos ?? ind.tieneJuicios
    ),
  }

  if (mapped.chequesHistoricoParsed) {
    console.log("NOSIS nosisDocToIndicators", {
      cantidadCheques: mapped.cantidadCheques,
      montoCheques: mapped.montoCheques,
      chequesPendientes: mapped.chequesPendientes,
      montoPendiente: mapped.montoPendiente,
    })
  }

  console.log("NOSIS FLOW [5/5] nosisDocToIndicators", {
    rawConsultas,
    consultasUltimos4Meses: mapped.consultasUltimos4Meses,
    cantidadCheques: mapped.cantidadCheques,
    montoCheques: mapped.montoCheques,
  })

  return mapped
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {NosisIndicators}
 */
export function nosisDocToIndicators(doc) {
  if (!doc || typeof doc !== "object") {
    return { ...EMPTY_NOSIS_INDICATORS }
  }

  const parsedData = nosisParsedDataFromDoc(doc)
  if (parsedData) {
    const mapped = nosisFullReportToIndicators(parsedData)
    if (!mapped.consultasUltimos4Meses) {
      const row = /** @type {Record<string, unknown>} */ (doc)
      const ind =
        row.indicadores && typeof row.indicadores === "object"
          ? /** @type {Record<string, unknown>} */ (row.indicadores)
          : row
      mapped.consultasUltimos4Meses = normalizeConsultasUltimos4Meses(
        ind.consultasUltimos4Meses ??
          ind.consultas_ultimos_4_meses ??
          row.consultasUltimos4Meses
      )
    }
    console.log("NOSIS FLOW [5/5] nosisDocToIndicators from parsedData", {
      consultasUltimos4Meses: mapped.consultasUltimos4Meses,
      cantidadCheques: mapped.cantidadCheques,
      montoCheques: mapped.montoCheques,
    })
    return mapped
  }

  return nosisDocToIndicatorsLegacy(doc)
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {boolean}
 */
export function hasNosisDownloadUrl(doc) {
  if (!doc || typeof doc !== "object") {
    return false
  }
  const url = doc.downloadURL ?? doc.url
  return typeof url === "string" && url.trim().length > 0
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {boolean}
 */
export function isNosisStorageDisabled(doc) {
  if (!doc || typeof doc !== "object") {
    return true
  }
  return doc.storageDisabled === true
}

/**
 * Informe válido en Firestore aunque no tenga bucket ni downloadURL.
 *
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {boolean}
 */
export function isNosisReportPresent(doc) {
  if (!doc || typeof doc !== "object") {
    return false
  }

  if (hasNosisDownloadUrl(doc)) {
    return true
  }
  if (doc.storageDisabled === true) {
    return true
  }
  if (doc.indicadores && typeof doc.indicadores === "object") {
    return true
  }
  if (typeof doc.nombre === "string" && doc.nombre.trim().length > 0) {
    return true
  }
  if (doc.parsedFromPdf === true) {
    return true
  }
  if (doc.parsedData && typeof doc.parsedData === "object") {
    return true
  }
  if (typeof doc.scoreNosis === "number") {
    return true
  }
  if (
    doc.validationStatus === "pending" ||
    doc.validationStatus === "confirmed" ||
    doc.validationStatus === "draft"
  ) {
    return true
  }

  return false
}

/**
 * Etiqueta de origen del PDF (sin enlaces a Storage).
 *
 * @param {Record<string, unknown> | null | undefined} doc
 * @param {boolean} [storageEnabled=false]
 * @returns {string | null}
 */
export function getNosisPdfDisplayLabel(doc, storageEnabled = false) {
  if (!isNosisReportPresent(doc)) {
    return null
  }
  if (storageEnabled && hasNosisDownloadUrl(doc)) {
    return null
  }
  return "PDF procesado localmente"
}

/**
 * Subtítulo para tarjetas de estado documental (sin enlaces a Storage).
 *
 * @param {Record<string, unknown> | null | undefined} doc
 * @param {boolean} [storageEnabled=false]
 * @returns {string | null}
 */
export function getNosisPdfSubtitle(doc, storageEnabled = false) {
  if (!isNosisReportPresent(doc)) {
    return null
  }

  const localLabel = getNosisPdfDisplayLabel(doc, storageEnabled)
  const name =
    typeof doc.nombre === "string" && doc.nombre.trim()
      ? doc.nombre.trim()
      : null

  if (localLabel) {
    return name ? `${name} · ${localLabel}` : localLabel
  }

  return name
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {boolean}
 */
export function hasConfirmedNosisIndicators(doc) {
  if (!doc) {
    return false
  }
  return (
    doc.validationStatus === "confirmed" ||
    doc.indicadoresConfirmados === true
  )
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @returns {"Confirmado" | "Pendiente" | "No cargado"}
 */
export function getNosisDocumentStatus(doc) {
  if (!doc || !isNosisReportPresent(doc)) {
    return "No cargado"
  }
  if (hasConfirmedNosisIndicators(doc)) {
    return "Confirmado"
  }
  return "Pendiente"
}

/**
 * @param {unknown[]} docs
 * @returns {Record<string, unknown> | null}
 */
export function getLatestNosisReport(docs) {
  if (!Array.isArray(docs) || docs.length === 0) {
    return null
  }
  return /** @type {Record<string, unknown>} */ (
    [...docs].sort(
      (a, b) => getNosisDocSortTime(b) - getNosisDocSortTime(a)
    )[0]
  )
}
