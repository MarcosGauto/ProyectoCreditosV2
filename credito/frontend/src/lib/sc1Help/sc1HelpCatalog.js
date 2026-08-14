/**
 * Catálogo del Centro de Ayuda SC-1.0
 *
 * Solo referencia documentación oficial existente.
 * Para agregar un documento: sumarlo al allowlist + una entrada de tema/descarga aquí.
 * No modifica motores, contratos ni Settings de negocio.
 */

/** @typedef {{ id: string; title: string; description: string; file: string; kind: "markdown"; defaultSection?: string }} Sc1HelpDoc */
/** @typedef {{ id: string; title: string; file: string; mime: string; root?: "docs" | "cwd" }} Sc1HelpDownload */

/**
 * Navegación por temas (orden de UI).
 * Cada tema apunta a un .md oficial + ancla opcional (sin contenido nuevo).
 *
 * @type {Sc1HelpDoc[]}
 */
export const SC1_HELP_DOCS = [
  {
    id: "introduccion",
    title: "Introducción",
    description: "Qué es SC-1.0 y cómo ayuda al analista.",
    file: "MANUAL_ANALISTA_SC1.md",
    kind: "markdown",
    defaultSection: "1-que-es-sc-10",
  },
  {
    id: "score",
    title: "Score",
    description: "Cómo se calcula e interpreta el Score.",
    file: "MANUAL_ANALISTA_SC1.md",
    kind: "markdown",
    defaultSection: "3-como-calcula-el-score",
  },
  {
    id: "limite",
    title: "Límite",
    description: "Cómo se arma el límite sugerido.",
    file: "MANUAL_ANALISTA_SC1.md",
    kind: "markdown",
    defaultSection: "6-como-se-calcula-el-limite-sugerido",
  },
  {
    id: "politica",
    title: "Política",
    description: "Ajustes: pesos, bandas, límites y restricciones.",
    file: "MANUAL_ANALISTA_SC1.md",
    kind: "markdown",
    defaultSection: "7-seccion-ajustes",
  },
  {
    id: "projection",
    title: "Projection",
    description: "Cómo los Ajustes guardados impactan el próximo análisis.",
    file: "MANUAL_ANALISTA_SC1.md",
    kind: "markdown",
    defaultSection: "7-seccion-ajustes",
  },
  {
    id: "calibracion",
    title: "Calibración",
    description: "Metodología y utilidades de medición.",
    file: "SC1_CALIBRATION_PROCESS.md",
    kind: "markdown",
  },
  {
    id: "cutover",
    title: "Cutover",
    description: "Checklist técnico y operativo previo al cutover.",
    file: "SC1_CUTOVER_PLAN.md",
    kind: "markdown",
  },
  {
    id: "historial",
    title: "Historial",
    description: "Cómo leer versiones publicadas SC-1.0.",
    file: "MANUAL_ANALISTA_SC1.md",
    kind: "markdown",
    defaultSection: "55-historial",
  },
  {
    id: "cartera",
    title: "Cartera",
    description: "Columnas y filtros SC-1.0 en Cartera.",
    file: "MANUAL_ANALISTA_SC1.md",
    kind: "markdown",
    defaultSection: "56-cartera",
  },
  {
    id: "faq",
    title: "FAQ",
    description: "Preguntas frecuentes del analista.",
    file: "MANUAL_ANALISTA_SC1.md",
    kind: "markdown",
    defaultSection: "9-preguntas-frecuentes",
  },
]

/** Descargas opcionales (si el archivo no está, la UI muestra “No disponible”). */
export const SC1_HELP_DOWNLOADS = [
  {
    id: "manual-pdf",
    title: "Manual PDF",
    file: "MANUAL_ANALISTA_SC1.pdf",
    mime: "application/pdf",
    root: "docs",
  },
  {
    id: "workbook-xlsx",
    title: "Workbook Excel",
    file: "SC1_CALIBRATION_WORKBOOK.xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    root: "docs",
  },
  {
    id: "release-notes",
    title: "Release Notes",
    file: "RELEASE_NOTES_SC1.md",
    mime: "text/markdown; charset=utf-8",
    root: "cwd",
  },
  {
    id: "adr",
    title: "ADR",
    file: "ADR-SC1-SCORE-DIMENSION-MODEL.md",
    mime: "text/markdown; charset=utf-8",
    root: "docs",
  },
]

/**
 * Temas contextuales (?) → documento + ancla.
 * @type {Record<string, { docId: string; section: string; label: string }>}
 */
export const SC1_HELP_TOPICS = {
  "ajustes-score": {
    docId: "politica",
    section: "71-pesos",
    label: "Cómo funciona el Score",
  },
  "ajustes-pesos": {
    docId: "politica",
    section: "71-pesos",
    label: "Pesos",
  },
  "ajustes-bandas": {
    docId: "politica",
    section: "72-bandas-categorias",
    label: "Bandas",
  },
  "ajustes-confidence": {
    docId: "politica",
    section: "73-confidence-umbrales",
    label: "Confidence",
  },
  "ajustes-limite": {
    docId: "limite",
    section: "75-limites-pestana-limite",
    label: "Límite",
  },
  "ajustes-documentacion": {
    docId: "politica",
    section: "78-documentacion-alertas-e-ia-otras-pestanas",
    label: "Documentación",
  },
  "ajustes-alertas": {
    docId: "politica",
    section: "78-documentacion-alertas-e-ia-otras-pestanas",
    label: "Alertas",
  },
  "ajustes-ia": {
    docId: "politica",
    section: "78-documentacion-alertas-e-ia-otras-pestanas",
    label: "IA",
  },
}

/** Archivos permitidos bajo `docs/` (basename). */
export const SC1_DOCS_ALLOWLIST = Array.from(
  new Set([
    ...SC1_HELP_DOCS.map((d) => d.file),
    ...SC1_HELP_DOWNLOADS.filter((d) => (d.root || "docs") === "docs").map(
      (d) => d.file
    ),
    "MANUAL_AJUSTES_SC1.md",
    "SC1_USER_GUIDE.md",
    "SC1_PLATFORM_RELEASE.md",
    "SC1_SCORE_CALIBRATION.md",
    "SC1_BASELINE_REPORT.md",
    "MANUAL_ANALISTA_SC1.print.html",
  ])
)

/** Archivos permitidos en la raíz del frontend (`process.cwd()`). */
export const SC1_ROOT_ALLOWLIST = Array.from(
  new Set(
    SC1_HELP_DOWNLOADS.filter((d) => d.root === "cwd").map((d) => d.file)
  )
)

/**
 * @param {string} title
 */
export function slugifyHeading(title) {
  return String(title)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
}

/**
 * @param {string} id
 */
export function getHelpDocById(id) {
  return SC1_HELP_DOCS.find((d) => d.id === id) ?? null
}
