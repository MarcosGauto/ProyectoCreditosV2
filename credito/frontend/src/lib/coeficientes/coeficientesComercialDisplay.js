import {
  calcularPrecioFinanciado,
  calcularTasaDirecta,
  calcularValorCuota,
} from "@/lib/coeficientes/coeficientesCalculo";
import {
  buildCommercialCuotasRows,
  buildMergedComercialCuotasKeys,
  normalizeCuotaComercialKey,
} from "@/lib/coeficientes/coeficientesComercialCuotasModel";
import { resolveCommercialCardsFromSets } from "@/lib/coeficientes/coeficientesComercialPivot";
import {
  buildTablasVigentesDisplayIndex,
  getTablasVigentesCoefFinal,
  getTablasVigentesDisplayRow,
  isTarjetaCoefComercialUniforme,
} from "@/lib/coeficientes/tablasVigentesDisplay";
import {
  getConsumoTarjetasActivas,
  getTarjetaByCodigo,
  normalizeTarjetaCodigo,
  filterConsumoTarjetas,
} from "@/lib/coeficientes/coeficientesTarjetasModel";
import { getTarjetasCache } from "@/lib/coeficientes/coeficientesTarjetasCache";

/** @typedef {'TODAS' | 'CREDITO' | 'DEBITO' | 'EMPRESAS'} ComercialCuotasFilter */

export const COMERCIAL_METRIC_TABLES = [
  {
    id: "coeficienteFinal",
    title: "Coeficientes finales",
    format: "coef",
    accent: "text-red-300 font-medium",
  },
  {
    id: "tasaDirecta",
    title: "Tasa directa",
    format: "pct",
    accent: "text-amber-300/90",
  },
  {
    id: "valorCuota",
    title: "Valor cuota",
    format: "money",
    accent: "text-sky-300/90",
  },
  {
    id: "precioFinanciado",
    title: "Precio financiado",
    format: "money",
    accent: "text-emerald-300/90",
  },
];

/**
 * @param {string | number} cuotas
 */
function cuotasKey(cuotas) {
  return normalizeCuotaComercialKey(cuotas);
}

/**
 * @param {Array<string | number>} cuotasRows
 * @param {ComercialCuotasFilter} filter
 */
export function filterComercialCuotasRows(cuotasRows, filter) {
  if (filter === "TODAS") return cuotasRows;
  if (filter === "DEBITO") {
    return cuotasRows.filter((c) => cuotasKey(c) === "DEBITO");
  }
  if (filter === "CREDITO") {
    return cuotasRows.filter((c) => {
      const key = cuotasKey(c);
      return key !== "DEBITO" && key !== "1";
    });
  }
  return cuotasRows;
}

/**
 * Vista comercial de solo lectura.
 * Coeficiente final desde Tablas Vigentes (`coefFinalDisplay`).
 * Tasa directa, valor cuota y precio financiado se derivan del mismo coef. final y el PVP.
 *
 * @param {Array<{
 *   tarjeta: string;
 *   cuotas: string | number;
 *   coeficienteBase?: number;
 *   coeficienteBaseImportado?: number;
 * }>} vigentesRaw
 * @param {string[] | null} cuotasVisibles
 * @param {import("./coeficientesCalculo").CoeficientesGlobales} globales
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} [tarjetasList]
 * @param {number} [basePrice]
 */
export function buildComercialDisplay(
  vigentesRaw,
  cuotasVisibles = null,
  globales,
  tarjetasList = null,
  basePrice = 1000
) {
  const tarjetas =
    tarjetasList?.length > 0
      ? getConsumoTarjetasActivas(tarjetasList)
      : getConsumoTarjetasActivas(getTarjetasCache());

  const configKeys = buildMergedComercialCuotasKeys(cuotasVisibles);
  const cuotasRows = buildCommercialCuotasRows(configKeys);
  const pvp = Number(basePrice) || 0;

  const { displayTable, cellMap, tarjetas: activas } =
    buildTablasVigentesDisplayIndex(vigentesRaw, globales, tarjetas);

  const cardsInData = new Set(
    displayTable.map((r) => normalizeTarjetaCodigo(r.tarjeta))
  );
  const activaOrder = tarjetas.map((t) => t.codigo);
  const activaSet = new Set(activaOrder);
  const cards = resolveCommercialCardsFromSets(activaOrder, activaSet, cardsInData);

  /**
   * @param {string | number} cuotas
   * @param {string} tarjeta
   */
  function getCell(cuotas, tarjeta) {
    const tarjetaNorm = normalizeTarjetaCodigo(tarjeta);
    const coefFinal = getTablasVigentesCoefFinal(
      cellMap,
      tarjeta,
      cuotas,
      activas
    );
    if (coefFinal == null) return null;

    const displayRow = getTablasVigentesDisplayRow(cellMap, tarjeta, cuotas);
    const tarjetaConfig = getTarjetaByCodigo(activas, tarjetaNorm);

    return {
      coeficienteFinal: coefFinal,
      tasaDirecta: calcularTasaDirecta(coefFinal),
      precioFinanciado: calcularPrecioFinanciado(pvp, coefFinal),
      valorCuota: calcularValorCuota(pvp, coefFinal, cuotas),
      sinArancelNiInteres:
        Boolean(displayRow?.sinArancelNiInteres) ||
        isTarjetaCoefComercialUniforme(tarjetaConfig),
    };
  }

  return { cards, cuotasRows, getCell, tarjetas: activas, displayTable };
}

/**
 * @param {import("./coeficientesVigentesModel").CoeficienteImportacion[]} importaciones
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} tarjetas
 */
export function getComercialVigenciaDesde(importaciones, tarjetas) {
  const consumoCodes = new Set(
    filterConsumoTarjetas(tarjetas)
      .filter((t) => t.activo)
      .map((t) => t.codigo)
  );

  const dates = importaciones
    .filter(
      (imp) =>
        imp.estado === "activa" &&
        consumoCodes.has(normalizeTarjetaCodigo(imp.tarjeta)) &&
        imp.vigenciaDesde
    )
    .map((imp) => imp.vigenciaDesde)
    .filter(Boolean);

  if (!dates.length) return null;
  return dates.sort((a, b) => String(a).localeCompare(String(b)))[0];
}
