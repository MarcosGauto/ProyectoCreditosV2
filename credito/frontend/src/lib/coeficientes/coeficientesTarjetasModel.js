/** @typedef {"automatica" | "manual"} TipoCargaTarjeta */
/** @typedef {"CONSUMO" | "EMPRESAS"} CategoriaTarjeta */

import { getTarjetasCache } from "@/lib/coeficientes/coeficientesTarjetasCache";
import {
  getParserDefinition,
  isRawBaseParser,
  listParserOptions,
} from "@/lib/coeficientes/parsers/parserDefinitions";

/**
 * @typedef {{
 *   cuotas: string | number;
 *   label: string;
 * }} ManualPlanDefinition
 */

/**
 * @typedef {{
 *   id: string;
 *   codigo: string;
 *   nombre: string;
 *   categoria: CategoriaTarjeta;
 *   tipoCarga: TipoCargaTarjeta;
 *   parser: string | null;
 *   manualPlanes: ManualPlanDefinition[];
 *   importPlanes?: ManualPlanDefinition[];
 *   orden: number;
 *   activo: boolean;
 *   coefFinalDirecto?: boolean;
 *   createdAt: string | null;
 *   updatedAt: string | null;
 *   updatedBy: string | null;
 * }} CoeficienteTarjeta
 */

export const COEFICIENTES_TARJETAS_COLLECTION = "coeficientesTarjetas";

/** Opciones de parser registrados en código (selector admin). */
export const AVAILABLE_PARSERS = listParserOptions();

/**
 * @param {unknown} value
 */
export function normalizeTarjetaCodigo(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

/**
 * @param {string} fragment
 */
function escapeRegExp(fragment) {
  return fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resuelve un texto de cabecera o id histórico al código de tarjeta en Firestore.
 * @param {unknown} value
 * @param {CoeficienteTarjeta[]} [tarjetas]
 */
export function resolveTarjetaCodigo(value, tarjetas) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const list = tarjetas ?? getTarjetasCache();
  const asCodigo = normalizeTarjetaCodigo(raw);
  const byCodigo = getTarjetaByCodigo(list, asCodigo);
  if (byCodigo) return byCodigo.codigo;

  const upper = raw.toUpperCase();
  const byNombre = list.find((t) => t.nombre.trim().toUpperCase() === upper);
  if (byNombre) return byNombre.codigo;

  const byNombreNorm = list.find(
    (t) => normalizeTarjetaCodigo(t.nombre) === asCodigo
  );
  if (byNombreNorm) return byNombreNorm.codigo;

  return asCodigo;
}

/**
 * Patrones de cabecera para matrices multi-tarjeta (nombre visible de cada tarjeta activa).
 * @param {CoeficienteTarjeta[]} [tarjetas]
 */
export function buildCardHeaderPatterns(tarjetas) {
  return getConsumoTarjetasActivas(tarjetas ?? getTarjetasCache()).map((t) => ({
    codigo: t.codigo,
    pattern: new RegExp(`^${escapeRegExp(t.nombre.trim())}$`, "i"),
  }));
}

/**
 * @param {unknown} value
 */
export function validateTarjetaCodigo(value) {
  const codigo = normalizeTarjetaCodigo(value);
  if (!codigo) {
    return { ok: false, error: "El código interno es obligatorio." };
  }
  if (codigo.length < 2 || codigo.length > 40) {
    return { ok: false, error: "El código debe tener entre 2 y 40 caracteres." };
  }
  return { ok: true, codigo };
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} data
 * @returns {CoeficienteTarjeta}
 */
export function parseTarjetaDoc(id, data) {
  const mapPlanes = (list) =>
    Array.isArray(list)
      ? list.map((p) => ({
          cuotas:
            typeof p?.cuotas === "number"
              ? p.cuotas
              : String(p?.cuotas ?? "").trim(),
          label: String(p?.label ?? p?.cuotas ?? "").trim(),
        }))
      : [];

  const manualPlanes = mapPlanes(data.manualPlanes);
  const importPlanes = mapPlanes(data.importPlanes);

  const toIso = (ts) => {
    if (ts && typeof ts === "object" && typeof ts.toDate === "function") {
      return ts.toDate().toISOString();
    }
    return typeof ts === "string" ? ts : null;
  };

  const tipoCarga = data.tipoCarga === "manual" ? "manual" : "automatica";
  const parserRaw =
    data.parser ?? data.parserKey ?? (tipoCarga === "manual" ? null : data.codigo ?? id);
  const codigo = normalizeTarjetaCodigo(data.codigo ?? id);
  const categoria = data.categoria === "EMPRESAS" ? "EMPRESAS" : "CONSUMO";

  return {
    id,
    codigo,
    nombre: String(data.nombre ?? data.codigo ?? id).trim(),
    categoria,
    tipoCarga,
    parser:
      tipoCarga === "manual"
        ? null
        : normalizeTarjetaCodigo(parserRaw) || null,
    manualPlanes,
    importPlanes,
    orden: Number.isFinite(Number(data.orden ?? data.displayOrder))
      ? Number(data.orden ?? data.displayOrder)
      : 999,
    activo:
      data.activo !== undefined
        ? data.activo !== false
        : data.enabled !== false,
    coefFinalDirecto:
      data.coefFinalDirecto === true || codigo === "MERCADO_PAGO",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  };
}

/**
 * @param {CoeficienteTarjeta[]} tarjetas
 */
export function sortTarjetas(tarjetas) {
  return [...tarjetas].sort((a, b) => {
    const order = a.orden - b.orden;
    if (order !== 0) return order;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

/**
 * Solo tarjetas activas, ordenadas.
 * @param {CoeficienteTarjeta[]} tarjetas
 */
export function getTarjetasActivas(tarjetas) {
  return sortTarjetas(tarjetas.filter((t) => t.activo));
}

/**
 * @param {CoeficienteTarjeta | null | undefined} tarjeta
 */
export function isConsumoTarjeta(tarjeta) {
  return (tarjeta?.categoria ?? "CONSUMO") === "CONSUMO";
}

/**
 * @param {CoeficienteTarjeta | null | undefined} tarjeta
 */
export function isEmpresasTarjeta(tarjeta) {
  return tarjeta?.categoria === "EMPRESAS";
}

/**
 * @param {CoeficienteTarjeta[]} tarjetas
 */
export function filterConsumoTarjetas(tarjetas) {
  return tarjetas.filter(isConsumoTarjeta);
}

/**
 * @param {CoeficienteTarjeta[]} tarjetas
 */
export function filterEmpresasTarjetas(tarjetas) {
  return tarjetas.filter(isEmpresasTarjeta);
}

/**
 * @param {CoeficienteTarjeta[]} tarjetas
 */
export function getConsumoTarjetasActivas(tarjetas) {
  return getTarjetasActivas(filterConsumoTarjetas(tarjetas));
}

/**
 * @param {CoeficienteTarjeta[]} tarjetas
 */
export function getEmpresasTarjetasActivas(tarjetas) {
  return getTarjetasActivas(filterEmpresasTarjetas(tarjetas));
}

/**
 * @param {CoeficienteTarjeta[]} tarjetas
 * @param {string} codigo
 */
export function getTarjetaByCodigo(tarjetas, codigo) {
  const normalized = normalizeTarjetaCodigo(codigo);
  return tarjetas.find((t) => t.codigo === normalized) ?? null;
}

/**
 * Tarjetas cuyo coeficiente importado ya es el final (ej. Mercado Pago).
 * No aplican arancel ni interés adicional en Tablas Vigentes.
 * @param {string} codigo
 * @param {CoeficienteTarjeta[]} [tarjetas]
 */
export function isCoefFinalDirectoTarjeta(codigo, tarjetas = []) {
  const normalized = normalizeTarjetaCodigo(codigo);
  const tarjeta = getTarjetaByCodigo(tarjetas, normalized);
  if (tarjeta) return tarjeta.coefFinalDirecto === true;
  return normalized === "MERCADO_PAGO";
}

/**
 * @param {CoeficienteTarjeta[]} tarjetas
 */
export function getImportTarjetas(tarjetas) {
  return getConsumoTarjetasActivas(tarjetas).filter(
    (t) => t.tipoCarga === "automatica" && t.parser
  );
}

/**
 * @param {CoeficienteTarjeta[]} tarjetas
 */
export function getManualTarjetas(tarjetas) {
  return getConsumoTarjetasActivas(tarjetas).filter(
    (t) => t.tipoCarga === "manual"
  );
}

/**
 * @param {CoeficienteTarjeta[]} tarjetas
 */
export function getEmpresasTarjetas(tarjetas) {
  return sortTarjetas(filterEmpresasTarjetas(tarjetas));
}

/**
 * @param {string} codigo
 * @param {CoeficienteTarjeta[]} [tarjetas]
 */
export function isManualTarjeta(codigo, tarjetas = []) {
  const tarjeta = getTarjetaByCodigo(tarjetas, codigo);
  return isConsumoTarjeta(tarjeta) && tarjeta?.tipoCarga === "manual";
}

/**
 * @param {string} codigo
 * @param {CoeficienteTarjeta[]} [tarjetas]
 */
export function isRawBaseTarjeta(codigo, tarjetas = []) {
  const tarjeta = getTarjetaByCodigo(tarjetas, codigo);
  if (!tarjeta || !isConsumoTarjeta(tarjeta)) return false;
  if (tarjeta.tipoCarga === "manual") return true;
  if (tarjeta.coefFinalDirecto) return true;
  return isRawBaseParser(tarjeta.parser);
}

/**
 * @param {string} codigo
 * @param {CoeficienteTarjeta[]} [tarjetas]
 */
export function getTarjetaDisplayLabel(codigo, tarjetas = []) {
  const normalized = normalizeTarjetaCodigo(codigo);
  const tarjeta = getTarjetaByCodigo(tarjetas, normalized);
  return tarjeta?.nombre ?? normalized;
}

/**
 * @param {CoeficienteTarjeta | null} tarjeta
 * @param {unknown} a
 * @param {unknown} b
 */
export function compareTarjetaManualPlans(tarjeta, a, b) {
  const order = (tarjeta?.manualPlanes ?? []).map((p) => String(p.cuotas));
  const ia = order.indexOf(String(a));
  const ib = order.indexOf(String(b));
  if (ia >= 0 && ib >= 0) return ia - ib;
  if (ia >= 0) return -1;
  if (ib >= 0) return 1;
  return String(a).localeCompare(String(b), "es");
}

/**
 * @param {string} codigoA
 * @param {string} codigoB
 * @param {CoeficienteTarjeta[]} tarjetas
 */
export function compareTarjetasByOrden(codigoA, codigoB, tarjetas) {
  const a = getTarjetaByCodigo(tarjetas, codigoA);
  const b = getTarjetaByCodigo(tarjetas, codigoB);
  const ordenA = a?.orden ?? 9999;
  const ordenB = b?.orden ?? 9999;
  if (ordenA !== ordenB) return ordenA - ordenB;
  return String(codigoA).localeCompare(String(codigoB), "es");
}

/**
 * Códigos de tarjetas activas en orden comercial.
 * @param {CoeficienteTarjeta[]} tarjetas
 */
export function getCommercialCardOrder(tarjetas) {
  return getConsumoTarjetasActivas(tarjetas).map((t) => t.codigo);
}

/**
 * @param {string | null | undefined} parserKey
 */
export function isParserRegistered(parserKey) {
  return Boolean(getParserDefinition(parserKey));
}
