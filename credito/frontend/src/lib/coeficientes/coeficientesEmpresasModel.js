import { normalizeTarjetaCodigo } from "@/lib/coeficientes/coeficientesTarjetasModel";

/** @typedef {"activa" | "historica"} EmpresaFinanciacionEstado */

/**
 * @typedef {{
 *   id: string;
 *   nombre: string;
 *   plazo?: string;
 *   tna: number;
 *   comision: number;
 *   observaciones: string;
 *   orden: number;
 *   activo: boolean;
 * }} EmpresaFinanciacionLinea
 */

/**
 * @typedef {{
 *   id: string;
 *   productoCodigo: string;
 *   lineas: EmpresaFinanciacionLinea[];
 *   vigenciaDesde: string | null;
 *   estado: EmpresaFinanciacionEstado;
 *   updatedAt: string | null;
 *   updatedBy: string | null;
 * }} EmpresaFinanciacion
 */

export const COEFICIENTES_EMPRESAS_FINANCIACION_COLLECTION =
  "coeficientesEmpresasFinanciacion";

/**
 * @param {unknown} value
 * @param {number} [fallback]
 */
export function numOrPercent(value, fallback = 0) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {unknown} value
 */
export function normalizeLineaId(value) {
  return normalizeTarjetaCodigo(value);
}

/**
 * @param {Record<string, unknown>} data
 */
function parseLinea(data) {
  return {
    id: normalizeLineaId(data.id ?? data.codigo ?? ""),
    nombre: String(data.nombre ?? "").trim(),
    plazo: String(data.plazo ?? "").trim(),
    tna: numOrPercent(data.tna),
    comision: numOrPercent(data.comision),
    observaciones: String(data.observaciones ?? "").trim(),
    orden: Number.isFinite(Number(data.orden)) ? Number(data.orden) : 999,
    activo: data.activo !== false,
  };
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} data
 * @returns {EmpresaFinanciacion}
 */
export function parseEmpresaFinanciacionDoc(id, data) {
  const toIso = (ts) => {
    if (ts && typeof ts === "object" && typeof ts.toDate === "function") {
      return ts.toDate().toISOString();
    }
    return typeof ts === "string" ? ts : null;
  };

  const lineas = Array.isArray(data.lineas)
    ? data.lineas.map((l) => parseLinea(l)).sort((a, b) => a.orden - b.orden)
    : [];

  return {
    id,
    productoCodigo: normalizeTarjetaCodigo(data.productoCodigo ?? id),
    lineas,
    vigenciaDesde:
      typeof data.vigenciaDesde === "string" ? data.vigenciaDesde : null,
    estado: data.estado === "historica" ? "historica" : "activa",
    updatedAt: toIso(data.updatedAt),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  };
}

/**
 * @param {EmpresaFinanciacionLinea[]} lineas
 */
export function sortEmpresaLineas(lineas) {
  return [...lineas].sort((a, b) => {
    const o = a.orden - b.orden;
    if (o !== 0) return o;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

/**
 * @param {EmpresaFinanciacionLinea[]} lineas
 */
export function getLineasActivas(lineas) {
  return sortEmpresaLineas(lineas.filter((l) => l.activo));
}

export const PYMENACION_COMERCIAL_AVISO =
  "Para Hasta 12 cuotas los intereses se devengan trimestralmente (meses 3 y 6). El cobro de cuotas comienza a partir del mes 7.";

/**
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} tarjetas
 * @param {EmpresaFinanciacion[]} financiaciones
 */
export function buildComercialEmpresasCards(tarjetas, financiaciones) {
  /** @type {Map<string, EmpresaFinanciacion>} */
  const finByCodigo = new Map(
    financiaciones.map((f) => [f.productoCodigo, f])
  );

  /** @type {Array<{
   *   key: string;
   *   productoCodigo: string;
   *   productoLabel: string;
   *   lineaNombre: string;
   *   plazo: string | null;
   *   tna: number;
   *   comision: number;
   *   vigenciaDesde: string | null;
   * }>} */
  const cards = [];

  for (const tarjeta of tarjetas) {
    if (!tarjeta.activo || tarjeta.categoria !== "EMPRESAS") continue;

    const fin = finByCodigo.get(tarjeta.codigo);
    if (!fin || fin.estado !== "activa") continue;

    for (const linea of getLineasActivas(fin.lineas)) {
      cards.push({
        key: `${tarjeta.codigo}_${linea.id}`,
        productoCodigo: tarjeta.codigo,
        productoLabel: tarjeta.codigo.replace(/_/g, " "),
        lineaNombre: linea.nombre,
        plazo: linea.plazo || null,
        tna: linea.tna,
        comision: linea.comision,
        vigenciaDesde: fin.vigenciaDesde,
      });
    }
  }

  return cards;
}

/**
 * @param {EmpresaFinanciacion[]} financiaciones
 * @param {string[]} productoCodigos
 */
export function getEmpresasVigenciaDesde(financiaciones, productoCodigos) {
  const set = new Set(productoCodigos);
  const dates = financiaciones
    .filter((f) => set.has(f.productoCodigo) && f.vigenciaDesde)
    .map((f) => f.vigenciaDesde)
    .filter(Boolean);

  if (!dates.length) return null;

  return dates.sort((a, b) => String(a).localeCompare(String(b)))[0];
}

/**
 * Agrupa líneas para PDF/web horizontal: PACTAR aparte; PYMENACION + BNA_CONECTA juntos.
 * @param {ReturnType<typeof buildComercialEmpresasCards>} cards
 */
export function buildPdfEmpresasGroups(cards) {
  const pactar = cards.filter((c) => c.productoCodigo === "PACTAR");
  const pymenacion = cards.filter(
    (c) =>
      c.productoCodigo === "PYMENACION" || c.productoCodigo === "BNA_CONECTA"
  );

  /** @type {Array<{ title: string; lineas: typeof cards }>} */
  const groups = [];
  if (pactar.length) groups.push({ title: "PACTAR", lineas: pactar });
  if (pymenacion.length) groups.push({ title: "PYMENACION", lineas: pymenacion });
  return groups;
}

/**
 * @param {ReturnType<typeof buildComercialEmpresasCards>[number]} linea
 * @param {string} groupTitle
 */
export function getPdfEmpresasColumnTitle(linea, groupTitle) {
  if (groupTitle === "PACTAR") {
    return linea.plazo || linea.lineaNombre;
  }
  return linea.lineaNombre;
}
