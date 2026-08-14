/**
 * Verificación manual del ejemplo de Tablas Vigentes.
 * Ejecutar: node scripts/verify-tablas-vigentes-calc.mjs
 */

const base = 1.0487;
const arancelCre = 1.8;
const interes = 1.14;

const coefPct = parseFloat(((base - 1) * 100).toFixed(2));
const coefFinal = parseFloat(((coefPct + arancelCre) * interes).toFixed(2));

const okPct = coefPct === 4.87;
const okFinal = coefFinal === 7.6;

const invalidLow = calcPct(0.97);
const invalidZero = calcPct(0);
const validOne = calcPct(1);

function calcPct(base) {
  if (!Number.isFinite(base) || base < 1) return null;
  return parseFloat(((base - 1) * 100).toFixed(2));
}

const okInvalidLow = invalidLow === null;
const okInvalidZero = invalidZero === null;
const okValidOne = validOne === 0;

console.log("Coef. Base:", base);
console.log("Coef. %:", coefPct, okPct ? "OK" : "FAIL (esperado 4.87)");
console.log(
  "Coef. Final:",
  coefFinal,
  okFinal ? "OK" : "FAIL (esperado 7.60)"
);
console.log("Fórmula:", `(${coefPct} + ${arancelCre}) × ${interes} = ${coefFinal}`);
console.log("base < 1 → null:", invalidLow, okInvalidLow ? "OK" : "FAIL");
console.log("base = 0 → null:", invalidZero, okInvalidZero ? "OK" : "FAIL");
console.log("base = 1 → 0:", validOne, okValidOne ? "OK" : "FAIL");

if (!okPct || !okFinal || !okInvalidLow || !okInvalidZero || !okValidOne) {
  process.exit(1);
}
