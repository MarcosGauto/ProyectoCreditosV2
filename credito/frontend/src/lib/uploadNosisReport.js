import {
  collection,
  addDoc,
  getDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/service/firebase"
import { ensureEmpresaDocument } from "@/lib/uploadFinancialDocument"
import { parseNosisPdfFile } from "@/lib/parseNosisPdf"
import { calculateNosisScore } from "@/lib/nosisScore"
import { logNosisReportsOrder, normalizeNosisAnalisis } from "@/lib/nosisModel"
import { USE_FIREBASE_STORAGE } from "@/lib/storageConfig"

export const NOSIS_COLLECTION = "nosis_reports"

/**
 * @param {string} cuit
 * @param {string} fileName
 */
function buildNosisStoragePath(cuit, fileName) {
  const safeName = fileName.replace(/[^\w.\-() ]+/g, "_")
  return `empresas/${cuit}/nosis/${Date.now()}_${safeName}`
}

/**
 * @param {string} storagePath
 * @param {File} file
 * @returns {Promise<{ storagePath: string; downloadURL: string } | null>}
 */
async function uploadNosisPdfToStorage(storagePath, file) {
  if (!USE_FIREBASE_STORAGE) {
    return null
  }

  try {
    const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage")
    const { storage } = await import("@/service/firebase")
    const storageRef = ref(storage, storagePath)
    await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(storageRef)
    return { storagePath, downloadURL }
  } catch (error) {
    console.warn(
      "[uploadNosisReport] Storage no disponible — continuando solo con Firestore",
      error
    )
    return null
  }
}

/**
 * Lee el PDF localmente, parsea indicadores y persiste en Firestore.
 * Storage es opcional según USE_FIREBASE_STORAGE.
 *
 * @param {{
 *   cuit: string;
 *   file: File;
 *   usuario?: string | null;
 * }} params
 */
export async function uploadNosisReport({ cuit, file, usuario = null }) {
  if (!cuit || !file) {
    throw new Error("Faltan datos para procesar el informe NOSIS.")
  }

  if (!/\.pdf$/i.test(file.name)) {
    throw new Error("El informe NOSIS debe ser un archivo PDF.")
  }

  await ensureEmpresaDocument(cuit)

  let parsedResult = null
  try {
    parsedResult = await parseNosisPdfFile(file)
  } catch (error) {
    console.warn("[uploadNosisReport] PDF parse fallback", error)
  }

  const parsedData = parsedResult?.parsedData ?? null
  const indicadores = parsedResult?.indicators ?? {}
  const nosisAnalisis = normalizeNosisAnalisis(parsedData?.analisis ?? null)
  const officialScore =
    nosisAnalisis?.score != null && Number.isFinite(nosisAnalisis.score)
      ? Math.round(nosisAnalisis.score)
      : null
  const scoreNosis = parsedResult
    ? officialScore ?? calculateNosisScore(indicadores)
    : null
  const scoreSource = officialScore != null ? "informe" : "calculo_interno"

  console.log("NOSIS UPLOAD CONSULTAS", indicadores.consultasUltimos4Meses)
  console.log("NOSIS FULL REPORT UPLOAD", parsedData)

  console.log("NOSIS FLOW [3/5] uploadNosisReport payload", {
    consultasTopLevel: indicadores.consultasUltimos4Meses ?? null,
    consultasEnParsedData: parsedData?.consultas?.ultimos4Meses ?? null,
    consultasEnIndicadores: indicadores.consultasUltimos4Meses ?? null,
    cantidadCheques: indicadores.cantidadCheques,
    montoCheques: indicadores.montoCheques,
    parsedFromPdf: Boolean(parsedResult),
  })

  console.log("NOSIS UPLOAD INDICATORS", {
    cantidadCheques: indicadores.cantidadCheques,
    montoCheques: indicadores.montoCheques,
    chequesPendientes: indicadores.chequesPendientes,
    montoPendiente: indicadores.montoPendiente,
    chequesHistoricoParsed: indicadores.chequesHistoricoParsed,
  })

  let storagePath = null
  let downloadURL = null

  if (USE_FIREBASE_STORAGE) {
    storagePath = buildNosisStoragePath(cuit, file.name)
    const uploaded = await uploadNosisPdfToStorage(storagePath, file)
    if (uploaded) {
      storagePath = uploaded.storagePath
      downloadURL = uploaded.downloadURL
    }
  }

  /** @type {Record<string, unknown>} */
  const metadata = {
    nombre: file.name,
    tipoDocumento: "nosis",
    fechaCarga: serverTimestamp(),
    usuario: usuario || "desconocido",
    cuit,
    validationStatus: "pending",
    indicadores,
    parsedData,
    consultasUltimos4Meses:
      parsedData?.consultas?.ultimos4Meses ??
      indicadores.consultasUltimos4Meses ??
      null,
    scoreNosis,
    scoreSource,
    ...(nosisAnalisis
      ? {
          nosisAnalisis: {
            score: nosisAnalisis.score,
            estado: nosisAnalisis.estado,
            ...(nosisAnalisis.resultado
              ? { resultado: nosisAnalisis.resultado }
              : {}),
          },
        }
      : {}),
    parsedFromPdf: Boolean(parsedResult),
    processedLocally: !USE_FIREBASE_STORAGE,
    storageDisabled: !USE_FIREBASE_STORAGE || !downloadURL,
    schemaVersion: 2,
  }

  if (storagePath) {
    metadata.storagePath = storagePath
  }
  if (downloadURL) {
    metadata.downloadURL = downloadURL
    metadata.url = downloadURL
  }

  const docRef = await addDoc(
    collection(db, "empresas", cuit, NOSIS_COLLECTION),
    metadata
  )

  const savedSnap = await getDoc(doc(db, "empresas", cuit, NOSIS_COLLECTION, docRef.id))
  const savedData = savedSnap.exists() ? savedSnap.data() : null
  const savedIndicadores =
    savedData?.indicadores && typeof savedData.indicadores === "object"
      ? savedData.indicadores
      : null

  console.log("NOSIS FLOW [4/5] uploadNosisReport readBack", {
    docId: docRef.id,
    consultasTopLevel: savedData?.consultasUltimos4Meses ?? null,
    consultasEnParsedData: savedData?.parsedData?.consultas?.ultimos4Meses ?? null,
    consultasEnIndicadores: savedIndicadores?.consultasUltimos4Meses ?? null,
    cantidadCheques: savedIndicadores?.cantidadCheques ?? null,
    montoCheques: savedIndicadores?.montoCheques ?? null,
  })

  console.log("[NOSIS DEV MODE]", {
    storageEnabled: USE_FIREBASE_STORAGE,
    firestoreSaved: true,
    hasDownloadURL: Boolean(downloadURL),
    docId: docRef.id,
    consultasUltimos4Meses:
      indicadores.consultasUltimos4Meses ?? null,
  })

  return {
    id: docRef.id,
    ...metadata,
    fechaCarga: new Date().toISOString(),
  }
}

/**
 * @param {string} cuit
 */
export async function fetchNosisReports(cuit) {
  if (!cuit) {
    return []
  }

  const { getDocs } = await import("firebase/firestore")
  const snap = await getDocs(collection(db, "empresas", cuit, NOSIS_COLLECTION))
  const reports = snap.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      firestoreId: d.id,
    }
  })

  logNosisReportsOrder(reports)

  return reports
}

/**
 * Elimina un informe NOSIS en Firestore y su PDF en Storage si aplica.
 *
 * @param {string} cuit
 * @param {string} reportId
 */
export async function deleteNosisReport(cuit, reportId) {
  if (!cuit || !reportId) {
    throw new Error("CUIT e informe NOSIS requeridos.")
  }

  const { doc, getDoc, deleteDoc } = await import("firebase/firestore")
  const docRef = doc(db, "empresas", cuit, NOSIS_COLLECTION, reportId)
  const snap = await getDoc(docRef)

  if (!snap.exists()) {
    throw new Error("Informe NOSIS no encontrado.")
  }

  const data = snap.data()
  const storagePath =
    typeof data.storagePath === "string" ? data.storagePath.trim() : ""

  if (storagePath) {
    try {
      const { ref, deleteObject } = await import("firebase/storage")
      const { storage } = await import("@/service/firebase")
      await deleteObject(ref(storage, storagePath))
    } catch (error) {
      console.warn(
        "[deleteNosisReport] No se pudo eliminar el archivo en Storage",
        storagePath,
        error
      )
    }
  }

  await deleteDoc(docRef)
}
