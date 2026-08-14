/**
 * Carga masiva (upsert) de la tabla maestra IPC en Firestore: inflation_index/{YYYY-MM}.
 *
 * El sistema calcula: coeficiente = value(mes actual) / value(mes de cierre).
 * Por lo tanto `value` debe ser un NIVEL DE ÍNDICE (serie encadenada, creciente),
 * nunca una variación porcentual (mensual o interanual).
 *
 * Uso:
 *   node scripts/seedInflationIndex.mjs --file=serie.txt                 (dry-run)
 *   node scripts/seedInflationIndex.mjs --file=serie.txt --commit        (escribe)
 *   node scripts/seedInflationIndex.mjs --file=varmensual.txt --from-monthly-variation --commit
 *
 * Formatos de --file:
 *   .json  → [{ "date": "2023-01-31", "value": 98.8 }] o [{ "period": "2023-01", "value": 98.8 }]
 *   .txt / .csv → una fila por línea: "31/01/2023   98,8" (también acepta 2023-01-31 y punto decimal)
 *
 * Opciones:
 *   --source=INDEC              Valor del campo source (default: INDEC)
 *   --updated-by=seed-script    Valor del campo updatedBy (default: seed-script)
 *   --from-monthly-variation    Los valores son variación % mensual: se encadena un índice
 *   --base=100                  Base del índice encadenado (default: 100)
 *   --check=2024-12-31          Muestra el coeficiente resultante para esa fecha de cierre
 *   --allow-any-shape           Omite la validación de serie creciente (usar con cuidado)
 *   --commit                    Escribe en Firestore (sin este flag es dry-run)
 */

import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, "..")

const COLLECTION = "inflation_index"
const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const opts = {}
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/)
    if (!match) continue
    opts[match[1]] = match[2] ?? true
  }
  return opts
}

/**
 * "31/01/2023" | "2023-01-31" → { period: "2023-01", date: "2023-01-31" }
 * @param {string} raw
 */
function parseDateToken(raw) {
  const value = String(raw ?? "").trim()

  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const [, day, month, year] = slash
    return {
      period: `${year}-${month.padStart(2, "0")}`,
      date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    }
  }

  const iso = value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/)
  if (iso) {
    const [, year, month, day] = iso
    const period = `${year}-${month}`
    return {
      period,
      date: day ? `${period}-${day}` : lastDayOfMonth(period),
    }
  }

  throw new Error(`Fecha inválida: "${raw}" (esperado DD/MM/AAAA o AAAA-MM[-DD]).`)
}

/**
 * @param {string} period YYYY-MM
 */
function lastDayOfMonth(period) {
  const [year, month] = period.split("-").map(Number)
  const day = new Date(year, month, 0).getDate()
  return `${period}-${String(day).padStart(2, "0")}`
}

/**
 * Acepta 1202.979, "1202,979", "1.202,979" y "1,202.979".
 *
 * @param {unknown} raw
 */
function parseNumber(raw) {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) {
      throw new Error(`Valor numérico inválido: ${raw}.`)
    }
    return raw
  }

  let text = String(raw ?? "").trim().replace(/\s/g, "")
  const dots = text.split(".").length - 1
  const commas = text.split(",").length - 1

  if (dots > 0 && commas > 0) {
    // El separador decimal es el último que aparece.
    const decimal = text.lastIndexOf(",") > text.lastIndexOf(".") ? "," : "."
    const thousands = decimal === "," ? "." : ","
    text = text.split(thousands).join("")
    if (decimal === ",") text = text.replace(",", ".")
  } else if (commas > 1 || dots > 1) {
    // Solo separadores de miles repetidos: 1.202.979
    text = text.split(commas > 1 ? "," : ".").join("")
  } else if (commas === 1) {
    text = text.replace(",", ".")
  }

  const value = Number(text)
  if (!Number.isFinite(value)) {
    throw new Error(`Valor numérico inválido: "${raw}".`)
  }
  return value
}

/**
 * @param {string} filePath
 * @returns {Array<{ period: string; date: string; value: number }>}
 */
function readSeries(filePath) {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(projectRoot, filePath)
  const content = readFileSync(absolute, "utf8")

  if (absolute.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(content)
    const rows = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.series)
        ? parsed.series
        : null
    if (!rows) {
      throw new Error(
        "El JSON debe ser un array de registros o un objeto con la clave `series`."
      )
    }
    return rows.map((row) => {
      const token = row.date ?? row.period
      const { period, date } = parseDateToken(token)
      return { period, date, value: parseNumber(row.value) }
    })
  }

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      // La coma es separador decimal (98,8), así que solo se corta por
      // espacios, tabs o punto y coma; el CSV con comas se maneja aparte.
      let parts = line.split(/[\s;\t]+/).filter(Boolean)
      if (parts.length < 2 && line.includes(",")) {
        parts = line.split(",").map((part) => part.trim()).filter(Boolean)
      }
      if (parts.length < 2) {
        throw new Error(`Línea inválida: "${line}".`)
      }
      const rawValue = parts[parts.length - 1]
      const { period, date } = parseDateToken(parts[0])
      return { period, date, value: parseNumber(rawValue) }
    })
}

/**
 * Convierte variaciones % mensuales en un índice encadenado (base arbitraria).
 *
 * @param {Array<{ period: string; date: string; value: number }>} series
 * @param {number} base
 */
function chainMonthlyVariations(series, base) {
  let level = base
  return series.map((row, position) => {
    if (position > 0) {
      level *= 1 + row.value / 100
    }
    return { ...row, value: Number(level.toFixed(6)) }
  })
}

/**
 * @param {Array<{ period: string; date: string; value: number }>} series
 */
function validateSeries(series, { allowAnyShape }) {
  const errors = []
  const seen = new Set()

  for (const row of series) {
    if (!PERIOD_PATTERN.test(row.period)) {
      errors.push(`Período inválido: ${row.period}`)
    }
    if (!(row.value > 0)) {
      errors.push(`Valor <= 0 en ${row.period}: ${row.value}`)
    }
    if (seen.has(row.period)) {
      errors.push(`Período duplicado: ${row.period}`)
    }
    seen.add(row.period)
  }

  const sorted = [...series].sort((a, b) => a.period.localeCompare(b.period))
  const drops = []
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].value < sorted[i - 1].value) {
      drops.push(
        `${sorted[i - 1].period} (${sorted[i - 1].value}) → ${sorted[i].period} (${sorted[i].value})`
      )
    }
  }

  if (drops.length > 0 && !allowAnyShape) {
    errors.push(
      [
        `La serie no es creciente: ${drops.length} caída(s) detectada(s).`,
        "Un nivel de índice IPC nunca baja con inflación positiva.",
        "Si cargaste variaciones % (mensual/interanual), NO son compatibles:",
        "el coeficiente saldría mal (por ejemplo < 1, deflactando las ventas).",
        "Opciones: usar el índice nivel general, o pasar la variación mensual",
        "con --from-monthly-variation, o forzar con --allow-any-shape.",
        `Primeras caídas: ${drops.slice(0, 5).join(" | ")}`,
      ].join("\n  ")
    )
  }

  return { errors, sorted }
}

/**
 * @param {Array<{ period: string; value: number }>} sorted
 * @param {string} closingDate
 */
function previewCoefficient(sorted, closingDate) {
  const { period: originPeriod } = parseDateToken(closingDate)
  const currentPeriod = new Date().toISOString().slice(0, 7)
  const byPeriod = new Map(sorted.map((row) => [row.period, row.value]))
  const origin = byPeriod.get(originPeriod)

  // Misma regla que resolveInflationFromMasterIndexes: último período <= mes actual.
  const latest = [...sorted]
    .reverse()
    .find((row) => row.period <= currentPeriod)

  console.log(`\nVerificación de coeficiente (cierre ${closingDate}):`)
  console.log(`  IPC cierre  ${originPeriod}: ${origin ?? "AUSENTE"}`)
  console.log(
    `  IPC actual  ${latest?.period ?? currentPeriod}: ${latest?.value ?? "AUSENTE"}`
  )

  if (origin == null || latest == null) {
    console.log(
      "  Coeficiente: no se calcula (falta un índice). La UI mostrará el aviso de Ajustes → Índices IPC."
    )
    return
  }

  console.log(`  Coeficiente: ${(latest.value / origin).toFixed(6)}`)
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))

  if (!opts.file) {
    console.error("Falta --file=<ruta>. Ver encabezado del script para el uso.")
    process.exit(1)
  }

  let series = readSeries(String(opts.file))

  if (opts["from-monthly-variation"]) {
    const base = Number(opts.base ?? 100)
    series = chainMonthlyVariations(
      [...series].sort((a, b) => a.period.localeCompare(b.period)),
      Number.isFinite(base) && base > 0 ? base : 100
    )
    console.log(
      `Variaciones mensuales encadenadas a índice (base ${base} en ${series[0]?.period}).`
    )
  }

  const { errors, sorted } = validateSeries(series, {
    allowAnyShape: Boolean(opts["allow-any-shape"]),
  })

  console.log(`Registros leídos: ${sorted.length}`)
  if (sorted.length > 0) {
    console.log(
      `Rango: ${sorted[0].period} (${sorted[0].value}) → ${sorted[sorted.length - 1].period} (${sorted[sorted.length - 1].value})`
    )
  }

  if (errors.length > 0) {
    console.error("\nLa serie NO se importó. Problemas detectados:")
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    process.exit(1)
  }

  if (opts.check) {
    previewCoefficient(sorted, String(opts.check))
  }

  if (!opts.commit) {
    console.log("\nDry-run: no se escribió nada. Agregá --commit para importar.")
    return
  }

  const nextEnv = await import("@next/env")
  ;(nextEnv.loadEnvConfig ?? nextEnv.default.loadEnvConfig)(projectRoot)
  const { getFirebaseAdmin } = await import("../src/lib/auth/firebaseAdminApp.js")
  const db = getFirebaseAdmin().firestore()

  const source = String(opts.source ?? "INDEC")
  const updatedBy = String(opts["updated-by"] ?? "seed-script")
  const { FieldValue } = await import("firebase-admin/firestore")

  let written = 0
  for (let start = 0; start < sorted.length; start += 400) {
    const chunk = sorted.slice(start, start + 400)
    const batch = db.batch()
    for (const row of chunk) {
      batch.set(
        db.collection(COLLECTION).doc(row.period),
        {
          period: row.period,
          date: row.date,
          value: row.value,
          source,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy,
        },
        { merge: true }
      )
    }
    await batch.commit()
    written += chunk.length
    console.log(`Upsert ${written}/${sorted.length}…`)
  }

  console.log(`\nListo: ${written} períodos escritos en ${COLLECTION}.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
