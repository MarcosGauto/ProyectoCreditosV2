/** @type {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} */
let tarjetasCache = [];

/**
 * @param {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]} tarjetas
 */
export function setTarjetasCache(tarjetas) {
  tarjetasCache = tarjetas;
}

/**
 * @returns {import("./coeficientesTarjetasModel").CoeficienteTarjeta[]}
 */
export function getTarjetasCache() {
  return tarjetasCache;
}
