/** @typedef {"Consumo" | "Empresas"} CoeficientesHistorialTipo */

/**
 * @typedef {
 *   | "Importación Excel"
 *   | "Importación Regex"
 *   | "Importación Gemini"
 *   | "Edición Manual"
 *   | "Restauración"
 * } CoeficientesHistorialOrigen
 */

/**
 * Fila de coeficientes alineada con Tablas Vigentes (consumo).
 * @typedef {{
 *   tarjeta: string;
 *   cuotas: string | number;
 *   coeficienteBase?: number;
 *   coefPorcentajeDisplay?: number | null;
 *   arancelCreditoDisplay?: number | null;
 *   interesAdicionalDisplay?: number | null;
 *   coefFinalDisplay?: number | null;
 *   vigenciaDesde?: string | null;
 *   sinArancelNiInteres?: boolean;
 * }} CoeficientesHistorialConsumoRow
 */

/**
 * @typedef {{
 *   productoCodigo: string;
 *   lineaId: string;
 *   lineaNombre: string;
 *   plazo: string;
 *   tna: number;
 *   comision: number;
 *   vigenciaDesde?: string | null;
 * }} CoeficientesHistorialEmpresasRow
 */

/**
 * @typedef {{
 *   tarjeta: string;
 *   vigenciaDesde: string | null;
 *   records: Array<{
 *     cuotas: string | number;
 *     coeficienteBase: number;
 *     interesAdicional?: number;
 *     coeficienteFinal?: number;
 *   }>;
 * }} CoeficientesHistorialImportacionSnapshot
 */

/**
 * @typedef {{
 *   productoCodigo: string;
 *   vigenciaDesde: string | null;
 *   lineas: import("./coeficientesEmpresasModel").EmpresaFinanciacionLinea[];
 * }} CoeficientesHistorialEmpresasSnapshot
 */

/**
 * @typedef {{
 *   id: string;
 *   fechaVigencia: string | null;
 *   fechaCreacion: string | null;
 *   usuario: string | null;
 *   tipo: CoeficientesHistorialTipo;
 *   origen: CoeficientesHistorialOrigen;
 *   observaciones: string | null;
 *   tarjetaCount: number;
 *   coeficienteCount: number;
 *   coeficientes: Array<CoeficientesHistorialConsumoRow | CoeficientesHistorialEmpresasRow>;
 *   importacionesSnapshot?: CoeficientesHistorialImportacionSnapshot[];
 *   empresasSnapshot?: CoeficientesHistorialEmpresasSnapshot[];
 *   globalesSnapshot?: import("./coeficientesNucleoModel").CoeficientesGlobales | null;
 *   historialOrigenId?: string | null;
 * }} CoeficientesHistorialEntry
 */

export const COEFICIENTES_HISTORIAL_COLLECTION = "coeficientes_historial";

export const COEFICIENTES_HISTORIAL_ORIGENES = /** @type {const} */ ([
  "Importación Excel",
  "Importación Regex",
  "Importación Gemini",
  "Edición Manual",
  "Restauración",
]);

/**
 * @param {unknown} importMethod
 * @returns {CoeficientesHistorialOrigen}
 */
export function mapImportMethodToOrigen(importMethod) {
  const m = String(importMethod ?? "").trim();
  if (m === "Gemini") return "Importación Gemini";
  if (m.startsWith("Regex") || m === "OCR" || m.toLowerCase().includes("regex")) {
    return "Importación Regex";
  }
  if (m === "Excel" || m === "CSV") return "Importación Excel";
  if (m === "Manual") return "Edición Manual";
  return "Importación Excel";
}

/**
 * @param {unknown} value
 * @returns {CoeficientesHistorialOrigen}
 */
export function normalizeHistorialOrigen(value) {
  const s = String(value ?? "").trim();
  if (COEFICIENTES_HISTORIAL_ORIGENES.includes(/** @type {CoeficientesHistorialOrigen} */ (s))) {
    return /** @type {CoeficientesHistorialOrigen} */ (s);
  }
  return "Edición Manual";
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} data
 * @returns {CoeficientesHistorialEntry}
 */
export function parseHistorialDoc(id, data) {
  const toIso = (ts) => {
    if (ts && typeof ts === "object" && typeof ts.toDate === "function") {
      return ts.toDate().toISOString();
    }
    return typeof ts === "string" ? ts : null;
  };

  const tipo = data.tipo === "Empresas" ? "Empresas" : "Consumo";

  /** @type {Array<CoeficientesHistorialConsumoRow | CoeficientesHistorialEmpresasRow>} */
  const coeficientes = Array.isArray(data.coeficientes)
    ? data.coeficientes.map((row) => {
        if (tipo === "Empresas") {
          return {
            productoCodigo: String(row?.productoCodigo ?? ""),
            lineaId: String(row?.lineaId ?? ""),
            lineaNombre: String(row?.lineaNombre ?? ""),
            plazo: String(row?.plazo ?? ""),
            tna: Number(row?.tna) || 0,
            comision: Number(row?.comision) || 0,
            vigenciaDesde:
              typeof row?.vigenciaDesde === "string" ? row.vigenciaDesde : null,
          };
        }
        return {
          tarjeta: String(row?.tarjeta ?? ""),
          cuotas: row?.cuotas ?? "",
          coeficienteBase: Number(row?.coeficienteBase) || 0,
          coefPorcentajeDisplay:
            row?.coefPorcentajeDisplay == null
              ? null
              : Number(row.coefPorcentajeDisplay),
          arancelCreditoDisplay:
            row?.arancelCreditoDisplay == null
              ? null
              : Number(row.arancelCreditoDisplay),
          interesAdicionalDisplay:
            row?.interesAdicionalDisplay == null
              ? null
              : Number(row.interesAdicionalDisplay),
          coefFinalDisplay:
            row?.coefFinalDisplay == null ? null : Number(row.coefFinalDisplay),
          vigenciaDesde:
            typeof row?.vigenciaDesde === "string" ? row.vigenciaDesde : null,
          sinArancelNiInteres: row?.sinArancelNiInteres === true,
        };
      })
    : [];

  const importacionesSnapshot = Array.isArray(data.importacionesSnapshot)
    ? data.importacionesSnapshot.map((imp) => ({
        tarjeta: String(imp?.tarjeta ?? ""),
        vigenciaDesde:
          typeof imp?.vigenciaDesde === "string" ? imp.vigenciaDesde : null,
        records: Array.isArray(imp?.records)
          ? imp.records.map((r) => ({
              cuotas: r?.cuotas ?? "",
              coeficienteBase: Number(r?.coeficienteBase) || 0,
              interesAdicional: Number(r?.interesAdicional) || 0,
              coeficienteFinal: Number(r?.coeficienteFinal) || 0,
            }))
          : [],
      }))
    : undefined;

  const empresasSnapshot = Array.isArray(data.empresasSnapshot)
    ? data.empresasSnapshot.map((e) => ({
        productoCodigo: String(e?.productoCodigo ?? ""),
        vigenciaDesde:
          typeof e?.vigenciaDesde === "string" ? e.vigenciaDesde : null,
        lineas: Array.isArray(e?.lineas)
          ? e.lineas.map((l, idx) => ({
              id: String(l?.id ?? `${idx + 1}`),
              nombre: String(l?.nombre ?? ""),
              plazo: String(l?.plazo ?? ""),
              tna: Number(l?.tna) || 0,
              comision: Number(l?.comision) || 0,
              observaciones: String(l?.observaciones ?? ""),
              orden: Number(l?.orden) || idx + 1,
              activo: l?.activo !== false,
            }))
          : [],
      }))
    : undefined;

  return {
    id,
    fechaVigencia:
      typeof data.fechaVigencia === "string" ? data.fechaVigencia : null,
    fechaCreacion: toIso(data.fechaCreacion),
    usuario: typeof data.usuario === "string" ? data.usuario : null,
    tipo,
    origen: normalizeHistorialOrigen(data.origen),
    observaciones:
      typeof data.observaciones === "string" ? data.observaciones : null,
    tarjetaCount:
      typeof data.tarjetaCount === "number"
        ? data.tarjetaCount
        : coeficientes.length,
    coeficienteCount:
      typeof data.coeficienteCount === "number"
        ? data.coeficienteCount
        : coeficientes.length,
    coeficientes,
    importacionesSnapshot,
    empresasSnapshot,
    globalesSnapshot:
      data.globalesSnapshot && typeof data.globalesSnapshot === "object"
        ? {
            arancelDeb: Number(data.globalesSnapshot.arancelDeb) || 0,
            arancelCre: Number(data.globalesSnapshot.arancelCre) || 0,
            interes: Number(data.globalesSnapshot.interes) || 0,
          }
        : null,
    historialOrigenId:
      typeof data.historialOrigenId === "string" ? data.historialOrigenId : null,
  };
}

/**
 * @param {Array<string | null | undefined>} dates
 * @returns {string | null}
 */
export function maxVigenciaDate(dates) {
  const valid = dates.filter((d) => typeof d === "string" && d.trim());
  if (!valid.length) return null;
  return [...valid].sort((a, b) => String(b).localeCompare(String(a)))[0];
}
