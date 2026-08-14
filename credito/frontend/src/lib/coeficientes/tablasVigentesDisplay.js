/**

 * Cálculo exclusivo para la vista Tablas Vigentes (no altera importación ni almacenamiento).

 */



import {

  calcularCoefFinalDirecto,

  calcularCoefPorcentajeDesdeBase,

  calcularCoeficienteFinal,

  calcularManualTarjetaCoeficienteFinal,

  getInteresAdicionalAplicado,

  getInteresFactor,

  normalizeInstallment,

} from "@/lib/coeficientes/coeficientesCalculo";

import {

  isCoefFinalDirectoTarjeta,

  isManualTarjeta,

  getConsumoTarjetasActivas,

  getTarjetaByCodigo,

  normalizeTarjetaCodigo,

} from "@/lib/coeficientes/coeficientesTarjetasModel";
import {
  buildCommercialCuotasRows,
  buildMergedComercialCuotasKeys,
  normalizeCuotaComercialKey,
} from "@/lib/coeficientes/coeficientesComercialCuotasModel";
import { getManualPlanesEditables } from "@/lib/coeficientes/coeficientesManualTarjetaModel";
import { tarjetaPermiteCuotaComercial } from "@/lib/coeficientes/coeficientesTarjetaPlanesModel";

import { getTarjetasCache } from "@/lib/coeficientes/coeficientesTarjetasCache";



/** @deprecated Usar calcularCoefPorcentajeDesdeBase */

export function calcTablasVigentesCoefPorcentaje(coeficienteBase) {

  return calcularCoefPorcentajeDesdeBase(coeficienteBase);

}



/** @deprecated Usar calcularCoeficienteFinal */

export function calcTablasVigentesCoeficienteFinal(cuotas, coeficienteBase, globales) {

  return calcularCoeficienteFinal(cuotas, coeficienteBase, globales);

}



/**

 * Mercado Pago: Coef. % = (Base − 1) × 100; Coef. Final = Coef. % (sin arancel ni interés).

 * @param {number} coeficienteBase

 */

function buildCoefFinalDirectoDisplayRow(row, coeficienteBase) {

  const coefPorcentaje = calcularCoefPorcentajeDesdeBase(coeficienteBase);

  const coefFinal = calcularCoefFinalDirecto(coeficienteBase);



  return {

    tarjeta: row.tarjeta,

    cuotas: row.cuotas,

    coeficienteBase,

    coefPorcentajeDisplay: coefPorcentaje,

    arancelCreditoDisplay: null,

    interesAdicionalDisplay: null,

    coefFinalDisplay: coefFinal,

    sinArancelNiInteres: true,

  };

}



/**

 * @param {{

 *   tarjeta: string;

 *   cuotas: string | number;

 *   coeficienteBase?: number;

 *   coeficienteBaseImportado?: number;

 * }} row

 * @param {{ arancelDeb: number; arancelCre: number; interes: number }} globales

 */

export function buildTablasVigentesDisplayRow(row, globales) {

  const tarjetas = getTarjetasCache();

  const isManual = isManualTarjeta(row.tarjeta, tarjetas);

  const isFinalDirecto = isCoefFinalDirectoTarjeta(row.tarjeta, tarjetas);

  const kind = normalizeInstallment(row.cuotas);

  const baseImportado = isManual || isFinalDirecto

    ? Number(row.coeficienteBase ?? row.coeficienteBaseImportado ?? 0) || 0

    : (row.coeficienteBaseImportado ??

      row.coeficienteBase ??

      0);

  const coeficienteBase = isFinalDirecto
    ? Number(baseImportado) || 0
    : kind === "DEBITO" || kind === "UNA_CUOTA"
      ? 0
      : Number(baseImportado) || 0;



  if (isFinalDirecto) {

    return buildCoefFinalDirectoDisplayRow(row, coeficienteBase);

  }



  const arancelCredito = Number(globales?.arancelCre) || 0;

  const interesAdicionalAplicado = isManual

    ? getInteresFactor(globales)

    : getInteresAdicionalAplicado(row.cuotas, globales);

  const coefPorcentaje =
    kind === "DEBITO" || kind === "UNA_CUOTA"
      ? null
      : calcularCoefPorcentajeDesdeBase(coeficienteBase);

  const coeficienteFinal =
    kind === "DEBITO" || kind === "UNA_CUOTA"
      ? calcularCoeficienteFinal(row.cuotas, coeficienteBase, globales)
      : isManual
        ? calcularManualTarjetaCoeficienteFinal(coeficienteBase, globales)
        : calcularCoeficienteFinal(row.cuotas, coeficienteBase, globales);



  return {

    tarjeta: row.tarjeta,

    cuotas: row.cuotas,

    coeficienteBase,

    coefPorcentajeDisplay: coefPorcentaje,

    arancelCreditoDisplay:
      kind === "DEBITO" ? null : arancelCredito,

    interesAdicionalDisplay: interesAdicionalAplicado,

    coefFinalDisplay: coeficienteFinal,

    sinArancelNiInteres: false,

  };

}



/**

 * @param {Array<{ tarjeta: string; cuotas: string | number; coeficienteBase?: number }>} rows

 * @param {{ arancelDeb: number; arancelCre: number; interes: number }} globales

 */

export function buildTablasVigentesDisplayTable(rows, globales) {

  return rows.map((row) => buildTablasVigentesDisplayRow(row, globales));

}

/**
 * Índice único de Tablas Vigentes (tarjeta × cuota → fila display).
 * Fuente compartida: pantalla comercial, PDF y Tablas Vigentes.
 * @param {Array<{ tarjeta: string; cuotas: string | number; coeficienteBase?: number }>} vigentesRaw
 * @param {{ arancelDeb: number; arancelCre: number; interes: number }} globales
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} tarjetas
 */
export function buildTablasVigentesDisplayIndex(vigentesRaw, globales, tarjetas) {
  const activas = getConsumoTarjetasActivas(tarjetas);
  const activaSet = new Set(activas.map((t) => t.codigo));

  const displayTable = buildTablasVigentesDisplayTable(
    vigentesRaw.filter((r) =>
      activaSet.has(normalizeTarjetaCodigo(r.tarjeta))
    ),
    globales
  );

  /** @type {Map<string, (typeof displayTable)[number]>} */
  const cellMap = new Map();
  for (const row of displayTable) {
    cellMap.set(
      `${normalizeTarjetaCodigo(row.tarjeta)}|${vigentesCuotasKey(row.cuotas)}`,
      row
    );
  }

  return { displayTable, cellMap, tarjetas: activas };
}

/**
 * Mercado Pago y tarjetas manuales con un solo plan: un coeficiente para todas las filas comerciales.
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta | null} tarjeta
 */
export function isTarjetaCoefComercialUniforme(tarjeta) {
  if (!tarjeta) return false;
  if (tarjeta.coefFinalDirecto) return true;
  if (tarjeta.tipoCarga === "manual" && getManualPlanesEditables(tarjeta).length === 1) {
    return true;
  }
  return false;
}

/**
 * @param {Map<string, { tarjeta: string; coefFinalDisplay?: number | null }>} cellMap
 * @param {string} tarjetaCodigo
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta | null} tarjeta
 */
function resolveCoefFinalUniforme(cellMap, tarjetaCodigo, tarjeta) {
  if (!isTarjetaCoefComercialUniforme(tarjeta)) return null;

  const codigo = normalizeTarjetaCodigo(tarjetaCodigo);
  let fallback = null;

  for (const row of cellMap.values()) {
    if (normalizeTarjetaCodigo(row.tarjeta) !== codigo) continue;
    const v = Number(row.coefFinalDisplay);
    if (!Number.isFinite(v)) continue;
    if (v > 0) return v;
    if (fallback == null) fallback = v;
  }

  return fallback;
}

/**
 * @param {Map<string, { tarjeta: string; cuotas: string | number; coefFinalDisplay?: number | null; sinArancelNiInteres?: boolean }>} cellMap
 * @param {string} tarjeta
 * @param {string | number} cuotas
 */
export function getTablasVigentesDisplayRow(cellMap, tarjeta, cuotas) {
  const codigo = normalizeTarjetaCodigo(tarjeta);
  const targetKey = vigentesCuotasKey(cuotas);
  let row = cellMap.get(`${codigo}|${targetKey}`);
  if (!row) {
    for (const mapRow of cellMap.values()) {
      if (normalizeTarjetaCodigo(mapRow.tarjeta) !== codigo) continue;
      if (vigentesCuotasKey(mapRow.cuotas) === targetKey) {
        row = mapRow;
        break;
      }
    }
  }
  return row ?? null;
}

/**
 * @param {Map<string, { coefFinalDisplay?: number | null }>} cellMap
 * @param {string} tarjeta
 * @param {string | number} cuotas
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} [tarjetas]
 */
export function getTablasVigentesCoefFinal(cellMap, tarjeta, cuotas, tarjetas = null) {
  const codigo = normalizeTarjetaCodigo(tarjeta);
  const list = tarjetas ?? getTarjetasCache();
  const tarjetaConfig = getTarjetaByCodigo(list, codigo);

  if (isTarjetaCoefComercialUniforme(tarjetaConfig)) {
    const uniforme = resolveCoefFinalUniforme(cellMap, codigo, tarjetaConfig);
    if (uniforme != null && uniforme > 0) return uniforme;
    return null;
  }

  const row = getTablasVigentesDisplayRow(cellMap, tarjeta, cuotas);
  const value = row?.coefFinalDisplay;
  const numeric =
    value != null && Number.isFinite(Number(value)) ? Number(value) : null;

  if (numeric == null || numeric === 0) {
    return null;
  }

  if (!tarjetaPermiteCuotaComercial(tarjetaConfig, cuotas)) {
    return null;
  }

  return numeric;
}

/**
 * @param {string | number} cuotas
 */
function vigentesCuotasKey(cuotas) {
  return normalizeCuotaComercialKey(cuotas);
}

/**
 * Misma fuente que Tablas Vigentes, pivotada para PDF (cuotas × tarjetas).
 * Filas de cuotas según configuración comercial activa (`cuotasComercialesVisibles`).
 * @param {Array<{ tarjeta: string; cuotas: string | number; coeficienteBase?: number }>} vigentesRaw
 * @param {{ arancelDeb: number; arancelCre: number; interes: number }} globales
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} tarjetas
 * @param {string[] | null} [cuotasComercialesVisibles]
 */
export function buildTablasVigentesPdfPivot(
  vigentesRaw,
  globales,
  tarjetas,
  cuotasComercialesVisibles = null
) {
  const { displayTable, cellMap, tarjetas: activas } =
    buildTablasVigentesDisplayIndex(vigentesRaw, globales, tarjetas);

  const cardsInData = new Set(
    displayTable.map((r) => normalizeTarjetaCodigo(r.tarjeta))
  );
  const cards = activas
    .map((t) => t.codigo)
    .filter((c) => cardsInData.has(c));
  for (const c of cardsInData) {
    if (!cards.includes(c)) {
      cards.push(c);
    }
  }

  const configKeys = buildMergedComercialCuotasKeys(cuotasComercialesVisibles);
  const cuotasRows = buildCommercialCuotasRows(configKeys);

  /**
   * @param {string | number} cuotas
   * @param {string} tarjeta
   */
  function getCoefFinal(cuotas, tarjeta) {
    return getTablasVigentesCoefFinal(cellMap, tarjeta, cuotas, activas);
  }

  return {
    cards,
    cuotasRows,
    tablaVigentesData: displayTable,
    tarjetas: activas,
    getCoefFinal,
  };
}

