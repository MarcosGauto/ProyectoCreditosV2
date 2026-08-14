/**
 * Verificación regex VISA / MASTER ESTÁNDAR.
 * Ejecutar: node scripts/verify-parse-visa-estandar-regex.mjs
 */

const VISA_ROW_REGEX = /(\d{1,2})\s+(?:\d+[,.]\d+%?)\s+(\d,\d{4})/g;

const sampleTable = `
Cuotas TNA no bonificada Coeficiente Coeficiente con IVA
2 103,00% 1,1275 1,1549
3 103,00% 1,1733 1,2123
4 103,00% 1,2202 1,2722
5 103,00% 1,2682 1,3300
6 103,00% 1,3175 1,3890
7 103,00% 1,3678 1,4495
8 103,00% 1,4192 1,5110
9 103,00% 1,4716 1,5735
10 103,00% 1,5250 1,6370
11 103,00% 1,5794 1,7015
12 103,00% 1,6348 1,7670
13 103,00% 1,6912 1,8335
14 103,00% 1,7486 1,9010
15 103,00% 1,8070 1,9695
16 103,00% 1,8664 2,0390
17 103,00% 1,9268 2,1095
18 103,00% 2,0502 2,1700
`;

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || /cuotas|tna|coeficiente con iva/i.test(trimmed)) {
    return null;
  }
  const match = trimmed.match(
    /^\s*(\d{1,2})\s+\S+\s+(\d,\d{4})(?:\s+\d,\d{4})?\s*$/
  );
  if (!match) return null;
  return {
    cuotas: Number(match[1]),
    coeficiente: Number(match[2].replace(",", ".")),
  };
}

/** @type {{ cuotas: number; coeficiente: number }[]} */
const records = [];
const lines = sampleTable.split(/\r?\n/);
for (const line of lines) {
  const row = parseLine(line);
  if (row) records.push(row);
}

const expectedFirst = [
  { cuotas: 2, coeficiente: 1.1275 },
  { cuotas: 3, coeficiente: 1.1733 },
  { cuotas: 4, coeficiente: 1.2202 },
  { cuotas: 5, coeficiente: 1.2682 },
  { cuotas: 6, coeficiente: 1.3175 },
];

const expectedLast = { cuotas: 18, coeficiente: 2.0502 };

const countOk = records.length === 17;
const firstOk =
  JSON.stringify(records.slice(0, 5)) === JSON.stringify(expectedFirst);
const lastOk =
  records[records.length - 1]?.cuotas === expectedLast.cuotas &&
  records[records.length - 1]?.coeficiente === expectedLast.coeficiente;

console.log("Registros encontrados:", records.length, countOk ? "OK" : "FAIL");
console.log("Primeras filas:", firstOk ? "OK" : "FAIL", records.slice(0, 5));
console.log("Última fila 18:", lastOk ? "OK" : "FAIL", records.at(-1));
console.log("Regex:", VISA_ROW_REGEX.source);

if (!countOk || !firstOk || !lastOk) {
  process.exit(1);
}
