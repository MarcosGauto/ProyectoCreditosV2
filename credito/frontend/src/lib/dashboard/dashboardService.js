import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore"

import { db } from "@/service/firebase"
import { formatChequeImporte } from "@/lib/chequesRechazadosModel"
import { fetchAllChequesRechazados } from "@/lib/chequesRechazadosService"
import { DASHBOARD_KPI_DEFINITIONS } from "@/lib/dashboard/dashboardConfig"
import { getResultadoCoberturaLabel } from "@/lib/coverageRequirements"

/** @typedef {"cuenta_corriente" | "usd" | "financing" | "calificacion" | "cheques" | "coeficientes"} DashboardActivityModule */

/**
 * @typedef {object} DashboardKpiValue
 * @property {string} value
 * @property {string} [description]
 * @property {boolean} hasData
 * @property {string} [emptyLabel]
 */

/**
 * @typedef {object} DashboardActivityItem
 * @property {string} id
 * @property {DashboardActivityModule} module
 * @property {string} title
 * @property {string} subtitle
 * @property {string} timestamp
 * @property {string} [href]
 */

/**
 * @typedef {object} DashboardSummary
 * @property {Record<string, DashboardKpiValue>} kpis
 * @property {DashboardActivityItem[]} recentActivity
 */

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function toIsoTimestamp(value) {
  if (!value) {
    return null
  }
  if (typeof value === "string") {
    return value
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof /** @type {{ toDate: () => Date }} */ (value).toDate === "function"
  ) {
    return /** @type {{ toDate: () => Date }} */ (value).toDate().toISOString()
  }
  return null
}

/**
 * @param {string | null} iso
 * @returns {number}
 */
function timestampSortKey(iso) {
  if (!iso) {
    return 0
  }
  const time = new Date(iso).getTime()
  return Number.isFinite(time) ? time : 0
}

/**
 * @param {string | null} iso
 * @returns {string}
 */
export function formatDashboardActivityDate(iso) {
  if (!iso) {
    return "—"
  }
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}

/**
 * @returns {Promise<DashboardKpiValue>}
 */
async function fetchCuentaCorrienteKpi() {
  try {
    const snap = await getDocs(collection(db, "cuenta_orden"))
    const count = snap.size
    return {
      value: count > 0 ? String(count) : "—",
      description: count === 1 ? "CUIT registrado" : "CUITs registrados",
      hasData: count > 0,
      emptyLabel: "Sin operaciones",
    }
  } catch (error) {
    console.warn("[dashboard] cuenta_orden", error)
    return {
      value: "—",
      description: "Módulo disponible",
      hasData: false,
      emptyLabel: "Sin datos aún",
    }
  }
}

/**
 * @returns {Promise<DashboardKpiValue>}
 */
async function fetchUsdKpi() {
  try {
    const snap = await getDocs(
      query(collection(db, "historialUsd"), orderBy("timestamp", "desc"), limit(1))
    )
    if (snap.empty) {
      return {
        value: "—",
        description: "Cotización oficial",
        hasData: false,
        emptyLabel: "Sin cotización",
      }
    }
    const data = snap.docs[0].data()
    const venta = data.venta ?? data.compra ?? null
    return {
      value: venta != null ? `$ ${venta}` : "—",
      description: data.fecha ? `Última: ${data.fecha}` : "Cotización USD",
      hasData: venta != null,
      emptyLabel: "Sin cotización",
    }
  } catch (error) {
    console.warn("[dashboard] historialUsd", error)
    return {
      value: "—",
      description: "Herramienta activa",
      hasData: false,
      emptyLabel: "Sin cotización",
    }
  }
}

/**
 * @returns {Promise<DashboardKpiValue>}
 */
async function fetchFinancingKpi() {
  return {
    value: "Activo",
    description: "Simulador de tasas",
    hasData: true,
    emptyLabel: "Sin simulaciones guardadas",
  }
}

/**
 * @returns {Promise<DashboardKpiValue>}
 */
async function fetchCalificacionesKpi() {
  try {
    const empresasSnap = await getDocs(query(collection(db, "empresas"), limit(200)))
    let conAnalisis = 0

    await Promise.all(
      empresasSnap.docs.map(async (empresaDoc) => {
        try {
          const analysisSnap = await getDoc(
            doc(db, "empresas", empresaDoc.id, "credit_analysis", "latest")
          )
          if (analysisSnap.exists()) {
            conAnalisis += 1
          }
        } catch {
          // ignorar errores por empresa
        }
      })
    )

    const totalEmpresas = empresasSnap.size
    const value = conAnalisis > 0 ? String(conAnalisis) : totalEmpresas > 0 ? String(totalEmpresas) : "—"

    return {
      value,
      description:
        conAnalisis > 0
          ? `${conAnalisis} con análisis guardado`
          : totalEmpresas > 0
            ? `${totalEmpresas} legajos`
            : "Legajos en plataforma",
      hasData: conAnalisis > 0 || totalEmpresas > 0,
      emptyLabel: "Sin calificaciones",
    }
  } catch (error) {
    console.warn("[dashboard] calificaciones", error)
    return {
      value: "—",
      description: "Análisis crediticio",
      hasData: false,
      emptyLabel: "Sin calificaciones",
    }
  }
}

/**
 * @returns {Promise<DashboardKpiValue>}
 */
async function fetchChequesKpi() {
  try {
    const cheques = await fetchAllChequesRechazados()
    const pendientes = cheques.filter((item) => item.estado === "pendiente").length
    return {
      value: String(cheques.length),
      description:
        pendientes > 0
          ? `${pendientes} pendiente${pendientes === 1 ? "" : "s"}`
          : cheques.length > 0
            ? "Sin pendientes"
            : "Registro comercial",
      hasData: cheques.length > 0,
      emptyLabel: "Sin registros",
    }
  } catch (error) {
    console.warn("[dashboard] cheques", error)
    return {
      value: "—",
      description: "Incidencias comerciales",
      hasData: false,
      emptyLabel: "Sin registros",
    }
  }
}

/**
 * @returns {Promise<DashboardKpiValue>}
 */
async function fetchCoeficientesKpi() {
  try {
    const snap = await getDoc(doc(db, "coeficientes", "coeficientesNucleo"))
    if (!snap.exists()) {
      return {
        value: "—",
        description: "Tablas de tarjetas",
        hasData: false,
        emptyLabel: "Sin configurar",
      }
    }
    const updatedAt = toIsoTimestamp(snap.data()?.updatedAt)
    return {
      value: "Configurado",
      description: updatedAt
        ? `Actualizado ${formatDashboardActivityDate(updatedAt)}`
        : "Coeficientes Núcleo",
      hasData: true,
      emptyLabel: "Sin configurar",
    }
  } catch (error) {
    console.warn("[dashboard] coeficientes", error)
    return {
      value: "—",
      description: "Tablas de tarjetas",
      hasData: false,
      emptyLabel: "Sin configurar",
    }
  }
}

const KPI_FETCHERS = {
  cuentaCorriente: fetchCuentaCorrienteKpi,
  diferenciaUsd: fetchUsdKpi,
  financiaciones: fetchFinancingKpi,
  calificaciones: fetchCalificacionesKpi,
  chequesRechazados: fetchChequesKpi,
  coeficientes: fetchCoeficientesKpi,
}

/**
 * @returns {Promise<Record<string, DashboardKpiValue>>}
 */
async function fetchDashboardKpis() {
  const entries = await Promise.all(
    DASHBOARD_KPI_DEFINITIONS.map(async (definition) => {
      const fetcher = KPI_FETCHERS[definition.id]
      const value = fetcher ? await fetcher() : {
        value: "—",
        hasData: false,
        emptyLabel: "Sin datos",
      }
      return [definition.id, value]
    })
  )

  return Object.fromEntries(entries)
}

/**
 * @returns {Promise<DashboardActivityItem[]>}
 */
async function fetchRecentActivity() {
  /** @type {DashboardActivityItem[]} */
  const items = []

  try {
    const cheques = await fetchAllChequesRechazados()
    cheques.slice(0, 5).forEach((cheque) => {
      items.push({
        id: `cheque-${cheque.id}`,
        module: "cheques",
        title: `Cheque rechazado · ${cheque.razonSocial}`,
        subtitle: `${cheque.numeroCheque} · ${formatChequeImporte(cheque.importe)} · ${cheque.estado}`,
        timestamp:
          toIsoTimestamp(cheque.updatedAt) ??
          toIsoTimestamp(cheque.fechaRechazo) ??
          "",
        href: `/dashboard/cheques-rechazados/${cheque.id}`,
      })
    })
  } catch (error) {
    console.warn("[dashboard] activity cheques", error)
  }

  try {
    const empresasSnap = await getDocs(query(collection(db, "empresas"), limit(30)))
    const analysisRows = await Promise.all(
      empresasSnap.docs.map(async (empresaDoc) => {
        const analysisSnap = await getDoc(
          doc(db, "empresas", empresaDoc.id, "credit_analysis", "latest")
        )
        if (!analysisSnap.exists()) {
          return null
        }
        const data = analysisSnap.data()
        const empresaData = empresaDoc.data()
        return {
          id: `calificacion-${empresaDoc.id}`,
          module: /** @type {DashboardActivityModule} */ ("calificacion"),
          title: `Calificación · ${String(data.razonSocial ?? empresaData.razonSocial ?? empresaDoc.id)}`,
          subtitle: `CUIT ${empresaDoc.id} · ${getResultadoCoberturaLabel(String(data.resultadoCobertura ?? ""))}`,
          timestamp: toIsoTimestamp(data.updatedAt) ?? "",
          href: `/dashboard/analysis/${empresaDoc.id}`,
        }
      })
    )
    analysisRows.filter(Boolean).forEach((row) => items.push(/** @type {DashboardActivityItem} */ (row)))
  } catch (error) {
    console.warn("[dashboard] activity calificaciones", error)
  }

  try {
    const usdSnap = await getDocs(
      query(collection(db, "historialUsd"), orderBy("timestamp", "desc"), limit(3))
    )
    usdSnap.docs.forEach((docSnap) => {
      const data = docSnap.data()
      items.push({
        id: `usd-${docSnap.id}`,
        module: "usd",
        title: `Cotización USD · $ ${data.venta ?? data.compra ?? "—"}`,
        subtitle: `${data.fecha ?? "—"} · ${data.fuente ?? "Ámbito"}`,
        timestamp: toIsoTimestamp(data.timestamp) ?? "",
        href: "/dashboard/usdhistory",
      })
    })
  } catch (error) {
    console.warn("[dashboard] activity usd", error)
  }

  try {
    const cuentaSnap = await getDocs(query(collection(db, "cuenta_orden"), limit(10)))
    await Promise.all(
      cuentaSnap.docs.map(async (cuitDoc) => {
        try {
          const historialSnap = await getDocs(
            query(
              collection(db, "cuenta_orden", cuitDoc.id, "historial"),
              orderBy("fecha", "desc"),
              limit(1)
            )
          )
          if (historialSnap.empty) {
            return
          }
          const data = historialSnap.docs[0].data()
          items.push({
            id: `cuenta-${historialSnap.docs[0].id}`,
            module: "cuenta_corriente",
            title: `Cuenta corriente · CUIT ${cuitDoc.id}`,
            subtitle: `Acreditar $ ${Number(data.montoAcreditar ?? 0).toLocaleString("es-AR")}`,
            timestamp: toIsoTimestamp(data.fecha) ?? "",
            href: "/dashboard/cuenta-orden",
          })
        } catch {
          // índice o permisos por CUIT
        }
      })
    )
  } catch (error) {
    console.warn("[dashboard] activity cuenta_orden", error)
  }

  return items
    .sort((a, b) => timestampSortKey(b.timestamp) - timestampSortKey(a.timestamp))
    .slice(0, 10)
}

/**
 * Punto único para alimentar el dashboard. Preparado para ampliar con más colecciones.
 *
 * @returns {Promise<DashboardSummary>}
 */
export async function fetchDashboardSummary() {
  const [kpis, recentActivity] = await Promise.all([
    fetchDashboardKpis(),
    fetchRecentActivity(),
  ])

  return { kpis, recentActivity }
}
