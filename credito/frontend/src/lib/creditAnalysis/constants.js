import { collection } from "firebase/firestore"
import { db } from "@/service/firebase"

/** Versión del motor de cálculo crediticio (cambiar al modificar fórmulas). */
export const ENGINE_VERSION = "1.0.0"

/** Versión del esquema Firestore de análisis versionado. */
export const SCHEMA_VERSION = 2

/** Umbral de alerta para snapshot inline (bytes estimados). No bloquea escritura. */
export const SNAPSHOT_SIZE_ALERT_BYTES = 800 * 1024

export const CREDIT_ANALYSIS_COLLECTION = "credit_analysis"
export const LATEST_DOC_ID = "latest"
export const DRAFT_DOC_ID = "draft"
export const VERSIONS_STORE_DOC_ID = "_store"
export const VERSIONS_SUBCOLLECTION = "versions"
export const SECTIONS_SUBCOLLECTION = "sections"

/**
 * Subcolección: empresas/{cuit}/credit_analysis/_store/versions
 *
 * @param {string} cuit
 */
export function creditAnalysisVersionsCol(cuit) {
  return collection(
    db,
    "empresas",
    cuit,
    CREDIT_ANALYSIS_COLLECTION,
    VERSIONS_STORE_DOC_ID,
    VERSIONS_SUBCOLLECTION
  )
}

/** @typedef {"published" | "archived" | "superseded"} AnalysisVersionStatus */
