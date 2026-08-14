/**
 * Motor de cálculo unificado para coeficientes de tarjetas.
 *
 * Coeficiente Final se expresa en puntos porcentuales (ej. 7,60).
 *
 * Reglas:
 * - Débito: Final = Arancel Débito.
 * - 1 cuota: Final = Arancel Crédito.
 * - 2+ cuotas: Coef. % = (Coeficiente Base − 1) × 100
 *              Final = (Arancel Crédito + Coef. %) × Interés Adicional.
 *
 * Interés Adicional es FACTOR multiplicador (1 = sin recargo, 1,14 = +14%).
 */

import { isCoefFinalDirectoTarjeta, isManualTarjeta } from "@/lib/coeficientes/coeficientesTarjetasModel";
import { getTarjetasCache } from "@/lib/coeficientes/coeficientesTarjetasCache";

/**
 * @param {string | number} inst
 * @returns {"DEBITO" | "UNA_CUOTA" | number | string}
 */
export function normalizeInstallment(inst) {
  const raw = String(inst ?? "")
    .trim()
    .toUpperCase();
  if (raw === "DÉBITO" || raw === "DEBITO") {
    return "DEBITO";
  }
  if (raw === "1" || raw === "1 CUOTA") {
    return "UNA_CUOTA";
  }
  const cuotasLabelMatch = String(inst ?? "")
    .trim()
    .match(/^(\d+)\s*cuotas?$/i);
  if (cuotasLabelMatch) {
    return Number(cuotasLabelMatch[1]);
  }
  const n = Number(inst);
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  return raw;
}

/**
 * @typedef {{ arancelDeb: number; arancelCre: number; interes: number }} CoeficientesGlobales
 */

/**
 * Factor de interés adicional (1 = sin recargo, 1,14 = +14%).
 *
 * @param {CoeficientesGlobales} globales
 */
export function getInteresFactor(globales) {
  const factor = Number(globales?.interes);
  return Number.isFinite(factor) && factor > 0 ? factor : 1;
}

/**
 * Factor aplicado según tipo de cuota (1 si no aplica).
 *
 * @param {string | number} inst
 * @param {CoeficientesGlobales} globales
 */
export function getInteresAdicionalAplicado(inst, globales) {
  const kind = normalizeInstallment(inst);
  if (kind === "DEBITO" || kind === "UNA_CUOTA") {
    return 1;
  }
  return getInteresFactor(globales);
}

/**
 * Coef. % a partir del coeficiente base importado (ej. 1,0487 → 4,87).
 *
 * @param {number} coeficienteBaseImportado
 */
export function calcularCoefPorcentajeDesdeBase(coeficienteBaseImportado) {
  const base = Number(coeficienteBaseImportado);
  if (!Number.isFinite(base) || base < 1) {
    return null;
  }
  return parseFloat(((base - 1) * 100).toFixed(2));
}

/**
 * Formato legible de Coef. % para tablas (null → "—").
 * @param {number | null | undefined} value
 */
export function formatCoefPorcentajeDisplay(value) {
  if (value == null) {
    return "—";
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "—";
  }
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Coeficiente final (%).
 *
 * @param {string | number} inst
 * @param {number} coeficienteBaseImportado
 * @param {CoeficientesGlobales} globales
 */
export function calcularCoeficienteFinal(inst, coeficienteBaseImportado, globales) {
  const kind = normalizeInstallment(inst);
  const arDeb = Number(globales?.arancelDeb) || 0;
  const arCre = Number(globales?.arancelCre) || 0;
  const factor = getInteresFactor(globales);

  if (kind === "DEBITO") {
    return parseFloat(arDeb.toFixed(2));
  }
  if (kind === "UNA_CUOTA") {
    return parseFloat(arCre.toFixed(2));
  }

  const coefPct = calcularCoefPorcentajeDesdeBase(coeficienteBaseImportado);
  if (coefPct == null) {
    return 0;
  }

  return parseFloat(((arCre + coefPct) * factor).toFixed(2));
}

/**
 * Mercado Pago y tarjetas coefFinalDirecto: Coef. Final = Coef. % = (Coef. Base − 1) × 100.
 * Sin arancel ni interés adicional.
 *
 * @param {number} coeficienteBaseImportado
 */
export function calcularCoefFinalDirecto(coeficienteBaseImportado) {
  const coefPct = calcularCoefPorcentajeDesdeBase(coeficienteBaseImportado);
  return coefPct ?? 0;
}

/**
 * Tasa directa a partir del coeficiente final (%).
 *
 * @param {number} coefFinal
 */
export function calcularTasaDirecta(coefFinal) {
  const pct = Number(coefFinal) || 0;
  if (pct <= 0) {
    return 0;
  }
  return parseFloat(((pct / (pct + 100)) * 100).toFixed(2));
}

/**
 * Tasa mensual implícita con cuotas iguales y recargo total coefFinal%.
 * @param {number} coefFinalPct
 * @param {number} numCuotas
 */
function calcularTasaMensualDesdeCoefFinal(coefFinalPct, numCuotas) {
  const cf = Number(coefFinalPct) / 100;
  if (!Number.isFinite(cf) || cf <= 0 || numCuotas <= 0) return 0;

  const pmt = (1 + cf) / numCuotas;
  let lo = 0;
  let hi = 0.5;

  for (let iter = 0; iter < 80; iter++) {
    const r = (lo + hi) / 2;
    let pv = 0;
    for (let t = 1; t <= numCuotas; t++) {
      pv += pmt / Math.pow(1 + r, t);
    }
    if (pv > 1) lo = r;
    else hi = r;
  }

  return (lo + hi) / 2;
}

/**
 * CFT (%): costo financiero total = coeficiente final.
 * @param {number} coefFinalPct
 */
export function calcularCFT(coefFinalPct) {
  const n = Number(coefFinalPct);
  return Number.isFinite(n) ? parseFloat(n.toFixed(2)) : 0;
}

/**
 * TNA (%) nominal anual desde coeficiente final y cuotas.
 * @param {number} coefFinalPct
 * @param {string | number} cuotas
 */
export function calcularTNA(coefFinalPct, cuotas) {
  const kind = normalizeInstallment(cuotas);
  const cf = Number(coefFinalPct) || 0;
  if (cf <= 0) return 0;

  if (kind === "DEBITO" || kind === "UNA_CUOTA") {
    return parseFloat(cf.toFixed(2));
  }

  const n = typeof kind === "number" ? kind : Number(cuotas) || 0;
  if (n <= 1) return parseFloat(cf.toFixed(2));

  const im = calcularTasaMensualDesdeCoefFinal(cf, n);
  return parseFloat((im * 12 * 100).toFixed(2));
}

/**
 * TEA (%) efectiva anual desde coeficiente final y cuotas.
 * @param {number} coefFinalPct
 * @param {string | number} cuotas
 */
export function calcularTEA(coefFinalPct, cuotas) {
  const kind = normalizeInstallment(cuotas);
  const cf = Number(coefFinalPct) || 0;
  if (cf <= 0) return 0;

  if (kind === "DEBITO" || kind === "UNA_CUOTA") {
    return parseFloat(cf.toFixed(2));
  }

  const n = typeof kind === "number" ? kind : Number(cuotas) || 0;
  if (n <= 1) return parseFloat(cf.toFixed(2));

  const im = calcularTasaMensualDesdeCoefFinal(cf, n);
  return parseFloat(((Math.pow(1 + im, 12) - 1) * 100).toFixed(2));
}

/**
 * Métricas comerciales derivadas del coeficiente final unificado.
 * @param {number} coefFinalPct
 * @param {string | number} cuotas
 */
export function buildComercialMetricasDesdeCoefFinal(coefFinalPct, cuotas) {
  const coeficienteFinal = calcularCFT(coefFinalPct);
  return {
    coeficienteFinal,
    tasaDirecta: calcularTasaDirecta(coeficienteFinal),
    tna: calcularTNA(coeficienteFinal, cuotas),
    tea: calcularTEA(coeficienteFinal, cuotas),
    cft: coeficienteFinal,
  };
}

/**
 * @param {number} basePrice
 * @param {number} coefFinal
 */
export function calcularPrecioFinanciado(basePrice, coefFinal) {
  const pvp = Number(basePrice) || 0;
  const pct = Number(coefFinal) || 0;
  return parseFloat((pvp * (1 + pct / 100)).toFixed(2));
}

/**
 * @param {number} basePrice
 * @param {number} coefFinal
 * @param {string | number} inst
 */
export function calcularValorCuota(basePrice, coefFinal, inst) {
  const kind = normalizeInstallment(inst);
  const total = calcularPrecioFinanciado(basePrice, coefFinal);

  if (kind === "DEBITO" || kind === "UNA_CUOTA") {
    return total;
  }

  const cuotasNum = typeof kind === "number" ? kind : Number(inst) || 1;
  return parseFloat((total / cuotasNum).toFixed(2));
}

/**
 * @param {string | number} cuotas
 * @param {number} coeficienteBaseImportado
 * @param {CoeficientesGlobales} globales
 */
export function buildStoredRecord(cuotas, coeficienteBaseImportado, globales) {
  const kind = normalizeInstallment(cuotas);
  const interesAdicional = getInteresAdicionalAplicado(cuotas, globales);
  const coeficienteBase =
    kind === "DEBITO" || kind === "UNA_CUOTA"
      ? 0
      : Number(coeficienteBaseImportado) || 0;
  const coeficienteFinal = calcularCoeficienteFinal(
    cuotas,
    coeficienteBaseImportado,
    globales
  );

  return {
    cuotas,
    coeficienteBase,
    interesAdicional,
    coeficienteFinal,
  };
}

/**
 * @param {Array<{ cuotas: string | number; coeficienteBase: number }>} records
 * @param {CoeficientesGlobales} globales
 */
export function buildStoredRecords(records, globales) {
  return records.map((row) =>
    buildStoredRecord(row.cuotas, row.coeficienteBase, globales)
  );
}

/**
 * Enriquece registros de importación para visualización (historial, etc.).
 *
 * @param {Array<{ cuotas: string | number; coeficienteBase: number }>} records
 * @param {CoeficientesGlobales} globales
 */
export function enrichImportacionRecords(records, globales) {
  return buildStoredRecords(
    records.map((row) => ({
      cuotas: row.cuotas,
      coeficienteBase: row.coeficienteBase,
    })),
    globales
  );
}

/**
 * @param {{
 *   tarjeta: string;
 *   cuotas: string | number;
 *   coeficienteBase: number;
 *   coeficienteBaseImportado?: number;
 * }} row
 * @param {CoeficientesGlobales} globales
 * @param {number} [basePrice]
 */
export function enrichVigenteRow(row, globales, basePrice = 0) {
  const tarjetas = getTarjetasCache();
  const isManual = isManualTarjeta(row.tarjeta, tarjetas);
  const isFinalDirecto = isCoefFinalDirectoTarjeta(row.tarjeta, tarjetas);
  const kind = normalizeInstallment(row.cuotas);
  const baseImportado = isManual || isFinalDirecto
    ? Number(row.coeficienteBase ?? row.coeficienteBaseImportado ?? 0) || 0
    : (row.coeficienteBaseImportado ??
      (kind === "DEBITO" || kind === "UNA_CUOTA" ? 0 : row.coeficienteBase ?? 0));
  const interesAdicional = isFinalDirecto
    ? null
    : isManual
      ? getInteresFactor(globales)
      : getInteresAdicionalAplicado(row.cuotas, globales);
  const coeficienteFinal = isFinalDirecto
    ? calcularCoefFinalDirecto(baseImportado)
    : kind === "DEBITO" || kind === "UNA_CUOTA"
      ? calcularCoeficienteFinal(row.cuotas, baseImportado, globales)
      : isManual
        ? calcularManualTarjetaCoeficienteFinal(baseImportado, globales)
        : calcularCoeficienteFinal(row.cuotas, baseImportado, globales);
  const tasaDirecta = calcularTasaDirecta(coeficienteFinal);
  const precioFinanciado = calcularPrecioFinanciado(basePrice, coeficienteFinal);
  const valorCuota = calcularValorCuota(basePrice, coeficienteFinal, row.cuotas);

  return {
    ...row,
    coeficienteBaseImportado: baseImportado,
    coeficienteBase: baseImportado,
    interesAdicionalAplicado: interesAdicional,
    coeficienteFinal,
    tasaDirecta,
    precioFinanciado,
    valorCuota,
  };
}

/**
 * @param {Array<{ tarjeta: string; cuotas: string | number; coeficienteBase: number }>} rows
 * @param {CoeficientesGlobales} globales
 * @param {number} [basePrice]
 */
export function enrichVigentesTable(rows, globales, basePrice = 0) {
  return rows.map((row) => enrichVigenteRow(row, globales, basePrice));
}

/**
 * @param {number} coeficienteBaseImportado
 * @param {CoeficientesGlobales} globales
 */
export function calcularManualTarjetaCoeficienteFinal(
  coeficienteBaseImportado,
  globales
) {
  const coefPct = calcularCoefPorcentajeDesdeBase(coeficienteBaseImportado);
  if (coefPct == null) {
    return 0;
  }
  const arCre = Number(globales?.arancelCre) || 0;
  const factor = getInteresFactor(globales);
  return parseFloat(((arCre + coefPct) * factor).toFixed(2));
}

/** @deprecated Usar calcularManualTarjetaCoeficienteFinal */
export const calcularNaranjaCoeficienteFinal = calcularManualTarjetaCoeficienteFinal;

/**
 * @param {number} factor
 */
export function formatInteresFactor(factor) {
  const n = Number(factor);
  if (!Number.isFinite(n) || n === 1) {
    return "×1 (sin recargo)";
  }
  return `×${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

/**
 * @param {string | number} cuotas
 * @param {number} coeficienteBaseImportado
 * @param {CoeficientesGlobales} globales
 * @param {number} [pvp]
 * @param {string | null} [tarjetaCodigo]
 */
export function buildCalculoDebug(
  cuotas,
  coeficienteBaseImportado,
  globales,
  pvp = 1000,
  tarjetaCodigo = null
) {
  const tarjetas = getTarjetasCache();
  if (isCoefFinalDirectoTarjeta(tarjetaCodigo, tarjetas)) {
    const base = Number(coeficienteBaseImportado) || 0;
    const coefPct = calcularCoefPorcentajeDesdeBase(base) ?? 0;
    const coeficienteFinal = coefPct;
    const precioFinanciado = calcularPrecioFinanciado(pvp, coeficienteFinal);
    const valorCuota = calcularValorCuota(pvp, coeficienteFinal, cuotas);
    const tasaDirecta = calcularTasaDirecta(coeficienteFinal);

    return {
      cuotas,
      coeficienteBaseImportado: base,
      coeficienteBase: base,
      interesAdicional: null,
      coeficienteFinal,
      precioFinanciado,
      valorCuota,
      tasaDirecta,
      pvp,
      sinArancelNiInteres: true,
      formulaFinal: `(Coef. Base − 1) × 100 = Coef. % ${coefPct} → Coef. Final = ${coeficienteFinal}`,
      formulaPrecio: `${pvp} × (1 + ${coeficienteFinal} / 100) = ${precioFinanciado}`,
      formulaTasaDirecta: `${coeficienteFinal} / (${coeficienteFinal} + 100) × 100 = ${tasaDirecta}%`,
    };
  }

  const kind = normalizeInstallment(cuotas);
  const arDeb = Number(globales.arancelDeb) || 0;
  const arCre = Number(globales.arancelCre) || 0;
  const factor = getInteresFactor(globales);
  const interesAdicional = getInteresAdicionalAplicado(cuotas, globales);
  const coeficienteFinal = calcularCoeficienteFinal(
    cuotas,
    coeficienteBaseImportado,
    globales
  );
  const precioFinanciado = calcularPrecioFinanciado(pvp, coeficienteFinal);
  const valorCuota = calcularValorCuota(pvp, coeficienteFinal, cuotas);
  const tasaDirecta = calcularTasaDirecta(coeficienteFinal);

  let formulaFinal = "";
  if (kind === "DEBITO") {
    formulaFinal = `Arancel Débito = ${arDeb}`;
  } else if (kind === "UNA_CUOTA") {
    formulaFinal = `Arancel Crédito = ${arCre}`;
  } else {
    const coefPct = calcularCoefPorcentajeDesdeBase(coeficienteBaseImportado) ?? 0;
    const suma = parseFloat((arCre + coefPct).toFixed(2));
    formulaFinal = `(Coef. % ${coefPct} + Arancel ${arCre}) × ${factor} = ${suma} × ${factor} = ${coeficienteFinal}`;
  }

  return {
    cuotas,
    coeficienteBaseImportado,
    coeficienteBase: coeficienteBaseImportado,
    interesAdicional,
    coeficienteFinal,
    precioFinanciado,
    valorCuota,
    tasaDirecta,
    pvp,
    formulaFinal,
    formulaPrecio: `${pvp} × (1 + ${coeficienteFinal} / 100) = ${precioFinanciado}`,
    formulaTasaDirecta: `${coeficienteFinal} / (${coeficienteFinal} + 100) × 100 = ${tasaDirecta}%`,
  };
}
