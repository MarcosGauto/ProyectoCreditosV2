import { getTarjetasCache } from "@/lib/coeficientes/coeficientesTarjetasCache";
import { buildComercialDisplay } from "@/lib/coeficientes/coeficientesComercialDisplay";
import {
  getCommercialCardOrder,
  getConsumoTarjetasActivas,
  normalizeTarjetaCodigo,
} from "@/lib/coeficientes/coeficientesTarjetasModel";
import {
  isCuotaComercialSintetica,
  normalizeCuotaComercialKey,
} from "@/lib/coeficientes/coeficientesComercialCuotasModel";
import { compareCuotas } from "@/lib/coeficientes/coeficientesVigentesModel";

/**
 * @param {string[]} cards
 */
export function orderCommercialCards(cards) {
  const preferred = getCommercialCardOrder(getTarjetasCache());
  const normalizedInData = new Set(cards.map((c) => normalizeTarjetaCodigo(c)));
  /** @type {string[]} */
  const ordered = [];

  for (const code of preferred) {
    if (normalizedInData.has(code)) {
      ordered.push(code);
      normalizedInData.delete(code);
    }
  }

  return [
    ...ordered,
    ...[...normalizedInData].sort((a, b) => a.localeCompare(b, "es")),
  ];
}

/**
 * @param {string | number} cuotas
 */
export function cuotasKey(cuotas) {
  return normalizeCuotaComercialKey(cuotas);
}

/**
 * @param {Array<{ tarjeta: string; cuotas: string | number }>} vigentes
 */
export function dedupeVigentes(vigentes) {
  /** @type {Map<string, (typeof vigentes)[number]>} */
  const map = new Map();

  for (const row of vigentes) {
    const key = `${normalizeTarjetaCodigo(row.tarjeta)}|${cuotasKey(row.cuotas)}`;
    map.set(key, row);
  }

  return [...map.values()];
}

/**
 * @param {Array<{ cuotas: string | number }>} vigentes
 */
export function collectCuotasRows(vigentes) {
  /** @type {Map<string, string | number>} */
  const map = new Map();
  for (const row of vigentes) {
    const key = cuotasKey(row.cuotas);
    if (isCuotaComercialSintetica(key)) continue;
    map.set(key, row.cuotas);
  }
  return [...map.values()].sort(compareCuotas);
}

/**
 * @param {string[]} activaOrder
 * @param {Set<string>} activaSet
 * @param {Set<string>} cardsInData
 */
export function resolveCommercialCardsFromSets(activaOrder, activaSet, cardsInData) {
  if (activaOrder.length > 0) {
    const extra = [...cardsInData].filter(
      (c) => !activaOrder.includes(c) && (activaSet.size === 0 || activaSet.has(c))
    );
    return [...activaOrder, ...extra.sort((a, b) => a.localeCompare(b, "es"))];
  }
  return orderCommercialCards([...cardsInData]);
}

/**
 * Matriz comercial CUOTAS × TARJETAS (delega en buildComercialDisplay).
 * @deprecated Preferir buildComercialDisplay directamente.
 */
export function buildComercialPivot(
  vigentes,
  cuotasVisibles = null,
  globales = null,
  _basePrice = 0,
  tarjetasList = null
) {
  return buildComercialDisplay(vigentes, cuotasVisibles, globales, tarjetasList, _basePrice);
}
