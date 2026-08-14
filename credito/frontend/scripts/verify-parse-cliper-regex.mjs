/**
 * Verificación regex CLIPER.
 *
 * Ejecutar desde PowerShell:
 *   Set-Location frontend
 *   node --import ./scripts/register-alias.mjs scripts/verify-parse-cliper-regex.mjs
 */

import { parseCliperRegexFromText } from "../src/lib/coeficientes/parsers/parseCliperRegex.js";

const sampleTable = `
Cuotas Coeficiente TNA TEA CFT
2 1.0971 85,00% 90,00% 95,00%
3 1.1309 90,00% 95,00% 100,00%
4 1.1652 95,00% 100,00% 105,00%
5 1.2000 100,00% 105,00% 110,00%
12 1.4965 120,00% 125,00% 130,00%
`;

const { rows, ocrDetectedRows, ocrDiscardedRows } =
  parseCliperRegexFromText(sampleTable);

const expected = [
  { cuotas: 2, coeficienteBase: 1.0971 },
  { cuotas: 3, coeficienteBase: 1.1309 },
  { cuotas: 4, coeficienteBase: 1.1652 },
  { cuotas: 5, coeficienteBase: 1.2 },
  { cuotas: 12, coeficienteBase: 1.4965 },
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

console.log("=== Validación parseCliperRegex ===");
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
