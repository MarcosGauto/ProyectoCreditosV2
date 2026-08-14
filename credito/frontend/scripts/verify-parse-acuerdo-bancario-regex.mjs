/**
 * Verificación regex Acuerdo Bancario / Bancarias Generales.
 *
 * Ejecutar desde PowerShell (sin &&):
 *   Set-Location frontend
 *   node --import ./scripts/register-alias.mjs scripts/verify-parse-acuerdo-bancario-regex.mjs
 */

import { parseAcuerdoBancarioRegexFromText } from "../src/lib/coeficientes/parsers/parseAcuerdoBancarioRegex.js";

const sampleTable = `
Cuotas TNA Tasa Directa Coeficiente Coeficiente con IVA TEA CFT
2 85,00% 12,34 1,0215 1,0450 15,00 18,00
3 90,00% 13,00 1,0320 1,0550 16,00 19,00
4 95,00% 14,00 1,0426 1,0650 17,00 20,00
5 100,00% 15,00 1,0532 1,0750 18,00 21,00
6 105,00% 16,00 1,0638 1,0850 19,00 22,00
`;

const { rows, ocrDetectedRows, ocrDiscardedRows } =
  parseAcuerdoBancarioRegexFromText(sampleTable);

const expected = [
  { cuotas: 2, coeficienteBase: 1.0215 },
  { cuotas: 3, coeficienteBase: 1.032 },
  { cuotas: 4, coeficienteBase: 1.0426 },
  { cuotas: 5, coeficienteBase: 1.0532 },
  { cuotas: 6, coeficienteBase: 1.0638 },
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

console.log("=== Validación parseAcuerdoBancarioRegex ===");
console.log("Archivo parser: src/lib/coeficientes/parsers/parseAcuerdoBancarioRegex.js");
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
