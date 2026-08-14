/**
 * Verificación regex FAVA (FavaCard).
 *
 * Ejecutar desde PowerShell:
 *   Set-Location frontend
 *   node --import ./scripts/register-alias.mjs scripts/verify-parse-fava-regex.mjs
 */

import { parseFavaRegexFromText } from "../src/lib/coeficientes/parsers/parseFavaRegex.js";

const sampleTable = `
Cuotas del Plan % de descuento Factor de Venta Importe cuota cada $1000 T.N.A. T.E.M.
2 0,00% 1.1059 110,59 85,00% 6,50%
3 0,00% 1.1428 114,28 90,00% 7,00%
4 0,00% 1.1805 118,05 95,00% 7,50%
5 0,00% 1.2190 121,90 100,00% 8,00%
24 0,00% 2.1507 215,07 120,00% 10,00%
`;

const { rows, ocrDetectedRows, ocrDiscardedRows } =
  parseFavaRegexFromText(sampleTable);

const expected = [
  { cuotas: 2, coeficienteBase: 1.1059 },
  { cuotas: 3, coeficienteBase: 1.1428 },
  { cuotas: 4, coeficienteBase: 1.1805 },
  { cuotas: 5, coeficienteBase: 1.219 },
  { cuotas: 24, coeficienteBase: 2.1507 },
];

const recordsOk =
  rows.length === expected.length &&
  expected.every((exp, i) => {
    const row = rows[i];
    return (
      Number(row.cuotas) === exp.cuotas &&
      Math.abs(row.coeficienteBase - exp.coeficienteBase) < 0.0001
    );
  });

console.log("=== Validación parseFavaRegex ===");
console.log("Resultado:", recordsOk ? "OK" : "FAIL");
console.log("Registros detectados:", rows.length);
console.log("Registros descartados:", ocrDiscardedRows.length);
console.log("Primeras 5 filas detectadas:");
ocrDetectedRows.slice(0, 5).forEach((row, index) => {
  console.log(`  ${index + 1}. ${row.line}`);
});

if (!recordsOk) {
  console.error("Detalle rows:", rows);
  process.exit(1);
}
