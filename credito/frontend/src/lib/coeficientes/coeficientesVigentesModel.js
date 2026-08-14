import {
  compareTarjetaManualPlans,
  compareTarjetasByOrden,
  getTarjetaByCodigo,
  isCoefFinalDirectoTarjeta,
  isManualTarjeta,
  resolveTarjetaCodigo,
} from "@/lib/coeficientes/coeficientesTarjetasModel";
import { getTarjetasCache } from "@/lib/coeficientes/coeficientesTarjetasCache";
import { normalizeInstallment } from "@/lib/coeficientes/coeficientesCalculo";

/** @typedef {"activa" | "historica"} ImportacionEstado */

/**
 * @typedef {{
 *   cuotas: string | number;
 *   coeficienteBase: number;
 *   interesAdicional?: number;
 *   coeficienteFinal?: number;
 *   activo?: boolean;
 * }} CoeficienteImportRecord
 */

/**
 * @typedef {{
 *   id: string;
 *   tarjeta: string;
 *   importedAt: string | null;
 *   importedBy: string | null;
 *   vigenciaDesde: string | null;
 *   estado: ImportacionEstado;
 *   records: CoeficienteImportRecord[];
 *   recordCount: number;
 * }} CoeficienteImportacion
 */

/**
 * @typedef {{
 *   tarjeta: string;
 *   cuotas: string | number;
 *   coeficienteBase: number;
 *   coeficienteBaseImportado?: number;
 *   interesAdicional?: number;
 *   coeficienteFinal?: number;
 *   vigenciaDesde?: string | null;
 * }} CoeficienteVigenteRow
 */

export const COEFICIENTES_IMPORTACIONES_COLLECTION = "coeficientesImportaciones";

/**
 * @param {unknown} value
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} [tarjetas]
 */
export function normalizeCardName(value, tarjetas) {
  return resolveTarjetaCodigo(value, tarjetas);
}

/**
 * @param {string} codigo
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} [tarjetas]
 */
export function isManualAcquirer(codigo, tarjetas) {
  const list = tarjetas ?? getTarjetasCache();
  return isManualTarjeta(codigo, list);
}

/**
 * @param {unknown} value
 * @returns {string | number}
 */
export function normalizeCuotasLabel(value) {
  const raw = String(value ?? "").trim();
  const upper = raw.toUpperCase();
  if (upper === "DÉBITO" || upper === "DEBITO" || upper === "DEB") {
    return "Débito";
  }
  if (upper === "1 CUOTA" || upper === "1") {
    return 1;
  }
  const cuotasLabelMatch = raw.match(/^(\d+(?:[.,]\d+)?)\s*cuotas?$/i);
  if (cuotasLabelMatch) {
    const n = Number(cuotasLabelMatch[1].replace(",", "."));
    if (Number.isFinite(n) && n > 0) {
      return Math.trunc(n);
    }
  }
  const n = Number(raw.replace(",", "."));
  if (Number.isFinite(n) && n > 0) {
    return Math.trunc(n);
  }
  return raw;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 */
export function numOr(value, fallback) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {string | number} a
 * @param {string | number} b
 */
export function compareCuotas(a, b) {
  if (a === "Débito") return -1;
  if (b === "Débito") return 1;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) {
    return na - nb;
  }
  return String(a).localeCompare(String(b), "es");
}

/**
 * @param {CoeficienteImportRecord[]} records
 */
export function sortImportRecords(records) {
  return [...records].sort((a, b) => compareCuotas(a.cuotas, b.cuotas));
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} data
 * @returns {CoeficienteImportacion}
 */
export function parseImportacionDoc(id, data) {
  const records = Array.isArray(data.records)
    ? data.records.map((row) => ({
        cuotas: normalizeCuotasLabel(row?.cuotas),
        coeficienteBase: numOr(row?.coeficienteBase, 0),
        interesAdicional: numOr(row?.interesAdicional, 0),
        coeficienteFinal: numOr(row?.coeficienteFinal, 0),
        activo: row?.activo === false ? false : true,
      }))
    : [];

  const importedAt =
    data.importedAt &&
    typeof data.importedAt === "object" &&
    typeof data.importedAt.toDate === "function"
      ? data.importedAt.toDate().toISOString()
      : typeof data.importedAt === "string"
        ? data.importedAt
        : null;

  return {
    id,
    tarjeta: normalizeCardName(data.tarjeta),
    importedAt,
    importedBy: typeof data.importedBy === "string" ? data.importedBy : null,
    vigenciaDesde:
      typeof data.vigenciaDesde === "string" ? data.vigenciaDesde : null,
    estado: data.estado === "activa" ? "activa" : "historica",
    records: sortImportRecords(records),
    recordCount:
      typeof data.recordCount === "number" ? data.recordCount : records.length,
  };
}

/**
 * @param {CoeficienteImportacion[]} importaciones
 * @param {import("./coeficientesCalculo").CoeficientesGlobales} [globales]
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} [tarjetas]
 * @returns {CoeficienteVigenteRow[]}
 */
export function buildVigentesFromImportaciones(
  importaciones,
  globales,
  tarjetas
) {
  const list = tarjetas ?? getTarjetasCache();
  const activas = importaciones.filter((imp) => imp.estado === "activa");
  /** @type {CoeficienteVigenteRow[]} */
  const rows = [];
  /** @type {Set<string>} */
  const cards = new Set();

  for (const imp of activas) {
    cards.add(imp.tarjeta);
    for (const record of imp.records) {
      if (record.activo === false) continue;
      const cuotas = record.cuotas;
      const isManualConsumo =
        isManualAcquirer(imp.tarjeta, list) &&
        !isCoefFinalDirectoTarjeta(imp.tarjeta, list);
      const kind = normalizeInstallment(cuotas);
      if (
        isManualConsumo &&
        (kind === "DEBITO" || kind === "UNA_CUOTA")
      ) {
        continue;
      }
      const isArancelRow =
        !isManualAcquirer(imp.tarjeta, list) &&
        (cuotas === "Débito" || cuotas === 1);
      rows.push({
        tarjeta: imp.tarjeta,
        cuotas,
        coeficienteBase: record.coeficienteBase,
        coeficienteBaseImportado: isArancelRow ? 0 : record.coeficienteBase,
        interesAdicional: record.interesAdicional,
        coeficienteFinal: record.coeficienteFinal,
        vigenciaDesde: imp.vigenciaDesde,
      });
    }
  }

  if (globales) {
    for (const card of cards) {
      if (
        isManualAcquirer(card, list) &&
        isCoefFinalDirectoTarjeta(card, list)
      ) {
        continue;
      }
      const hasDebito = rows.some(
        (r) => r.tarjeta === card && r.cuotas === "Débito"
      );
      const hasUnaCuota = rows.some(
        (r) => r.tarjeta === card && r.cuotas === 1
      );

      if (!hasDebito) {
        rows.push({
          tarjeta: card,
          cuotas: "Débito",
          coeficienteBase: 0,
          coeficienteBaseImportado: 0,
          vigenciaDesde: null,
        });
      }
      if (!hasUnaCuota) {
        rows.push({
          tarjeta: card,
          cuotas: 1,
          coeficienteBase: 0,
          coeficienteBaseImportado: 0,
          vigenciaDesde: null,
        });
      }
    }
  }

  return rows.sort((a, b) => {
    const cardCmp = compareTarjetasByOrden(a.tarjeta, b.tarjeta, list);
    if (cardCmp !== 0) return cardCmp;
    const tarjetaConfig = getTarjetaByCodigo(list, a.tarjeta);
    if (tarjetaConfig?.tipoCarga === "manual") {
      return compareTarjetaManualPlans(tarjetaConfig, a.cuotas, b.cuotas);
    }
    return compareCuotas(a.cuotas, b.cuotas);
  });
}

/**
 * Migra estructura legacy coefficients.cards → registros de importación.
 *
 * @param {Record<string, unknown>} legacyCoefficients
 * @returns {Array<{ tarjeta: string; records: CoeficienteImportRecord[] }>}
 */
export function migrateLegacyCoefficients(legacyCoefficients) {
  if (!legacyCoefficients || typeof legacyCoefficients !== "object") {
    return [];
  }

  const installments = Array.isArray(legacyCoefficients.installments)
    ? legacyCoefficients.installments
    : [];
  const cards =
    legacyCoefficients.cards && typeof legacyCoefficients.cards === "object"
      ? legacyCoefficients.cards
      : {};

  return Object.entries(cards).map(([card, rows]) => {
    const list = Array.isArray(rows) ? rows : Object.values(rows ?? {});
    const records = list
      .map((cell, idx) => {
        const cuotas = installments[idx] ?? idx;
        const base = numOr(cell?.puro ?? cell?.coeficienteBase, 0);
        if (!base && cell?.isDisabledVisual) {
          return null;
        }
        return {
          cuotas: normalizeCuotasLabel(cuotas),
          coeficienteBase: base,
        };
      })
      .filter(Boolean);

    return {
      tarjeta: normalizeCardName(card),
      records,
    };
  });
}
