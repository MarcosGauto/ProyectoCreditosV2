import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { db, storage } from "@/service/firebase"
import { fetchAndPersistBcraByCuit } from "@/lib/bcra/bcraReportsRepository"
import { ensureEmpresaDocument } from "@/lib/uploadFinancialDocument"
import {
  CHEQUE_ESTADO,
  CHEQUES_RECHAZADOS_COLLECTION,
  normalizeCuit,
  parseChequeImporte,
} from "@/lib/chequesRechazadosModel"
import { analyzeComportamientoComercial } from "@/lib/comportamientoComercialScore"

/**
 * @param {string} cuit
 * @param {string} docId
 * @param {"cheque" | "nota-debito"} kind
 * @param {string} [ext]
 */
function buildStoragePath(cuit, docId, kind, ext = "jpg") {
  const normalized = normalizeCuit(cuit)
  if (kind === "nota-debito") {
    return `cheques-rechazados/${normalized}/${docId}/nota-debito.pdf`
  }
  return `cheques-rechazados/${normalized}/${docId}/cheque.${ext}`
}

/**
 * @param {import("firebase/firestore").DocumentSnapshot} snap
 */
function mapChequeDoc(snap) {
  const data = snap.data() ?? {}
  return {
    id: snap.id,
    ...data,
  }
}

/**
 * @param {string} cuit
 * @returns {Promise<string>}
 */
export async function resolveRazonSocialByCuit(cuit) {
  const normalized = normalizeCuit(cuit)
  if (!normalized) {
    return ""
  }

  try {
    const empresaSnap = await getDoc(doc(db, "empresas", normalized))
    if (empresaSnap.exists()) {
      const data = empresaSnap.data()
      const nombre =
        data.razonSocial ?? data.nombre ?? data.denominacion ?? null
      if (nombre && String(nombre).trim()) {
        return String(nombre).trim()
      }
    }
  } catch (error) {
    console.warn("[resolveRazonSocialByCuit] empresa", error)
  }

  try {
    const bcra = await fetchAndPersistBcraByCuit(normalized, {
      queryOrigin: "automatic",
    })
    if (bcra.ok && bcra.data) {
      const denominacion =
        bcra.data.denominacion ??
        bcra.data.razonSocial ??
        bcra.data.nombre ??
        null
      if (denominacion && String(denominacion).trim()) {
        return String(denominacion).trim()
      }
    }
  } catch (error) {
    console.warn("[resolveRazonSocialByCuit] bcra", error)
  }

  return ""
}

/**
 * @param {string | null | undefined} path
 */
async function deleteStorageFile(path) {
  if (!path) {
    return
  }
  try {
    await deleteObject(ref(storage, path))
  } catch (error) {
    console.warn("[deleteStorageFile]", path, error)
  }
}

/**
 * @param {string} storagePath
 * @param {File} file
 */
async function uploadFile(storagePath, file) {
  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

/**
 * @param {string} usuario
 * @param {string} accion
 * @param {string} detalle
 * @returns {import("@/lib/chequesRechazadosModel").ChequeHistorialEntry}
 */
function buildHistorialEntry(usuario, accion, detalle) {
  return {
    fecha: new Date().toISOString(),
    usuario: usuario || "desconocido",
    accion,
    detalle,
  }
}

/**
 * @returns {Promise<import("@/lib/chequesRechazadosModel").ChequeRechazadoDoc[]>}
 */
export async function fetchAllChequesRechazados() {
  const q = query(
    collection(db, CHEQUES_RECHAZADOS_COLLECTION),
    orderBy("fechaRechazo", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map(mapChequeDoc)
}

/**
 * @param {string} cuit
 * @returns {Promise<import("@/lib/chequesRechazadosModel").ChequeRechazadoDoc[]>}
 */
export async function fetchChequesRechazadosByCuit(cuit) {
  const normalized = normalizeCuit(cuit)
  if (!normalized) {
    return []
  }

  const q = query(
    collection(db, CHEQUES_RECHAZADOS_COLLECTION),
    where("cuit", "==", normalized),
    orderBy("fechaRechazo", "desc")
  )

  try {
    const snap = await getDocs(q)
    return snap.docs.map(mapChequeDoc)
  } catch (error) {
    console.warn("[fetchChequesRechazadosByCuit] fallback sin índice", error)
    const all = await fetchAllChequesRechazados()
    return all.filter((item) => normalizeCuit(item.cuit) === normalized)
  }
}

/**
 * @param {string} id
 */
export async function fetchChequeRechazadoById(id) {
  const snap = await getDoc(doc(db, CHEQUES_RECHAZADOS_COLLECTION, id))
  if (!snap.exists()) {
    return null
  }
  return mapChequeDoc(snap)
}

/**
 * @param {{
 *   cuit: string;
 *   razonSocial?: string;
 *   numeroCheque: string;
 *   banco: string;
 *   fechaEmision?: string | null;
 *   fechaVencimiento?: string | null;
 *   fechaRechazo: string;
 *   motivoRechazo: string;
 *   importe: number | string;
 *   observaciones?: string;
 *   imagenCheque?: File | null;
 *   notaDebito?: File | null;
 *   usuario?: string | null;
 * }} input
 */
export async function createChequeRechazado(input) {
  const cuit = normalizeCuit(input.cuit)
  if (!cuit || cuit.length !== 11) {
    throw new Error("El CUIT debe tener 11 dígitos.")
  }

  await ensureEmpresaDocument(cuit)

  const razonSocial =
    input.razonSocial?.trim() ||
    (await resolveRazonSocialByCuit(cuit)) ||
    "Sin razón social"

  const importe = parseChequeImporte(input.importe)
  if (importe <= 0) {
    throw new Error("El importe debe ser mayor a cero.")
  }

  const docRef = doc(collection(db, CHEQUES_RECHAZADOS_COLLECTION))

  /** @type {Record<string, unknown>} */
  const payload = {
    cuit,
    razonSocial,
    numeroCheque: String(input.numeroCheque).trim(),
    banco: String(input.banco).trim(),
    fechaEmision: input.fechaEmision || null,
    fechaVencimiento: input.fechaVencimiento || null,
    fechaRechazo: input.fechaRechazo,
    motivoRechazo: String(input.motivoRechazo).trim(),
    importe,
    estado: CHEQUE_ESTADO.PENDIENTE,
    fechaAbono: null,
    observaciones: String(input.observaciones ?? "").trim(),
    observacionesPago: "",
    imagenChequeUrl: null,
    notaDebitoUrl: null,
    imagenChequeStoragePath: null,
    notaDebitoStoragePath: null,
    historial: [
      buildHistorialEntry(
        input.usuario ?? null,
        "creacion",
        "Alta de cheque rechazado"
      ),
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (input.imagenCheque) {
    const ext = input.imagenCheque.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = buildStoragePath(cuit, docRef.id, "cheque", ext)
    payload.imagenChequeStoragePath = path
    payload.imagenChequeUrl = await uploadFile(path, input.imagenCheque)
  }

  if (input.notaDebito) {
    const path = buildStoragePath(cuit, docRef.id, "nota-debito")
    payload.notaDebitoStoragePath = path
    payload.notaDebitoUrl = await uploadFile(path, input.notaDebito)
  }

  await setDoc(docRef, payload)

  return { id: docRef.id, ...payload }
}

/**
 * @param {string} id
 * @param {{
 *   cuit?: string;
 *   razonSocial?: string;
 *   numeroCheque?: string;
 *   banco?: string;
 *   fechaEmision?: string | null;
 *   fechaVencimiento?: string | null;
 *   fechaRechazo?: string;
 *   motivoRechazo?: string;
 *   importe?: number | string;
 *   estado?: import("@/lib/chequesRechazadosModel").ChequeEstado;
 *   fechaAbono?: string | null;
 *   observaciones?: string;
 *   observacionesPago?: string;
 *   imagenCheque?: File | null;
 *   notaDebito?: File | null;
 *   usuario?: string | null;
 * }} input
 */
export async function updateChequeRechazado(id, input) {
  const existing = await fetchChequeRechazadoById(id)
  if (!existing) {
    throw new Error("Cheque no encontrado.")
  }

  const cuit = normalizeCuit(input.cuit ?? existing.cuit)
  const historial = Array.isArray(existing.historial) ? [...existing.historial] : []

  /** @type {Record<string, unknown>} */
  const updates = {
    updatedAt: serverTimestamp(),
  }

  if (input.cuit) {
    updates.cuit = cuit
  }
  if (input.razonSocial !== undefined) {
    updates.razonSocial = input.razonSocial
  } else if (input.cuit && input.cuit !== existing.cuit) {
    updates.razonSocial =
      (await resolveRazonSocialByCuit(cuit)) || existing.razonSocial
  }
  if (input.numeroCheque !== undefined) {
    updates.numeroCheque = String(input.numeroCheque).trim()
  }
  if (input.banco !== undefined) {
    updates.banco = String(input.banco).trim()
  }
  if (input.fechaEmision !== undefined) {
    updates.fechaEmision = input.fechaEmision
  }
  if (input.fechaVencimiento !== undefined) {
    updates.fechaVencimiento = input.fechaVencimiento
  }
  if (input.fechaRechazo !== undefined) {
    updates.fechaRechazo = input.fechaRechazo
  }
  if (input.motivoRechazo !== undefined) {
    updates.motivoRechazo = String(input.motivoRechazo).trim()
  }
  if (input.importe !== undefined) {
    const importe = parseChequeImporte(input.importe)
    if (importe <= 0) {
      throw new Error("El importe debe ser mayor a cero.")
    }
    updates.importe = importe
  }
  if (input.observaciones !== undefined) {
    updates.observaciones = String(input.observaciones ?? "").trim()
  }

  if (input.estado !== undefined) {
    updates.estado = input.estado
    if (input.estado === CHEQUE_ESTADO.ABONADO) {
      if (!input.fechaAbono) {
        throw new Error("Indicá la fecha de cancelación al marcar como Abonado.")
      }
      updates.fechaAbono = input.fechaAbono
      updates.observacionesPago = String(input.observacionesPago ?? "").trim()
      historial.push(
        buildHistorialEntry(
          input.usuario ?? null,
          "cambio_estado",
          `Estado cambiado a Abonado. Fecha abono: ${input.fechaAbono}`
        )
      )
    } else if (input.estado === CHEQUE_ESTADO.PENDIENTE) {
      updates.fechaAbono = null
      historial.push(
        buildHistorialEntry(
          input.usuario ?? null,
          "cambio_estado",
          "Estado cambiado a Pendiente"
        )
      )
    }
  } else if (input.fechaAbono !== undefined) {
    updates.fechaAbono = input.fechaAbono
  }
  if (input.observacionesPago !== undefined && input.estado === undefined) {
    updates.observacionesPago = String(input.observacionesPago ?? "").trim()
  }

  if (input.imagenCheque) {
    await deleteStorageFile(existing.imagenChequeStoragePath)
    const ext = input.imagenCheque.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = buildStoragePath(cuit, id, "cheque", ext)
    updates.imagenChequeStoragePath = path
    updates.imagenChequeUrl = await uploadFile(path, input.imagenCheque)
    historial.push(
      buildHistorialEntry(
        input.usuario ?? null,
        "edicion",
        "Imagen del cheque reemplazada"
      )
    )
  }

  if (input.notaDebito) {
    await deleteStorageFile(existing.notaDebitoStoragePath)
    const path = buildStoragePath(cuit, id, "nota-debito")
    updates.notaDebitoStoragePath = path
    updates.notaDebitoUrl = await uploadFile(path, input.notaDebito)
    historial.push(
      buildHistorialEntry(
        input.usuario ?? null,
        "edicion",
        "Nota de débito reemplazada"
      )
    )
  }

  historial.push(
    buildHistorialEntry(input.usuario ?? null, "edicion", "Datos actualizados")
  )
  updates.historial = historial

  await updateDoc(doc(db, CHEQUES_RECHAZADOS_COLLECTION, id), updates)

  return fetchChequeRechazadoById(id)
}

/**
 * @param {string} id
 */
export async function deleteChequeRechazado(id) {
  const existing = await fetchChequeRechazadoById(id)
  if (!existing) {
    throw new Error("Cheque no encontrado.")
  }

  await deleteStorageFile(existing.imagenChequeStoragePath)
  await deleteStorageFile(existing.notaDebitoStoragePath)
  await deleteDoc(doc(db, CHEQUES_RECHAZADOS_COLLECTION, id))
}

/**
 * @returns {Promise<{
 *   total: number;
 *   pendientes: number;
 *   abonados: number;
 *   montoPendiente: number;
 *   ultimoRechazo: string | null;
 * }>}
 */
export async function fetchChequesRechazadosSummary() {
  const cheques = await fetchAllChequesRechazados()
  const metrics = analyzeComportamientoComercial(cheques)

  return {
    total: metrics.cantidadRechazados,
    pendientes: metrics.cantidadPendientes,
    abonados: metrics.cantidadAbonados,
    montoPendiente: metrics.montoTotalPendiente,
    ultimoRechazo: metrics.fechaUltimoRechazo,
  }
}
