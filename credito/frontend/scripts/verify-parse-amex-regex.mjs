/**
 * Verificación del parser AMEX (regex).
 * Ejecutar: node scripts/verify-parse-amex-regex.mjs
 */

const AMEX_SIMPLE_REGEX = /(\d{1,2})\s+(\d\.\d{4})/g;

const examples = [
  "2 1.1148",
  "3 1.1568",
  "4 1.1998",
  "30 2.7453",
];

const AMEX_LINE = /^\s*(\d{1,2})\s+(\d\.\d{4})\s*$/;

/** @type {{ cuotas: number; coeficiente: number }[]} */
const records = [];

for (const line of examples) {
  const match = line.match(AMEX_LINE);
  if (!match) {
    console.error("FAIL parse:", line);
    process.exit(1);
  }
  records.push({
    cuotas: Number(match[1]),
    coeficiente: Number(match[2]),
  });
}

const expected = [
  { cuotas: 2, coeficiente: 1.1148 },
  { cuotas: 3, coeficiente: 1.1568 },
  { cuotas: 4, coeficiente: 1.1998 },
  { cuotas: 30, coeficiente: 2.7453 },
];

const ok = JSON.stringify(records) === JSON.stringify(expected);
console.log("Registros:", records);
console.log("Regex principal:", AMEX_SIMPLE_REGEX.source);
console.log(ok ? "OK" : "FAIL");
if (!ok) process.exit(1);
