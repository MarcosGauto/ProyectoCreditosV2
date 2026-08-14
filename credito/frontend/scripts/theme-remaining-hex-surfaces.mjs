import fs from "node:fs"
import path from "node:path"

const SRC = path.resolve("src")

const REPLACEMENTS = [
  ["shadow-[0_12px_40px_rgba(0,0,0,0.25)]", "shadow-card"],
  ["shadow-[0_0_40px_rgba(0,0,0,0.25)]", "shadow-card"],
  ["border-[#1F2937]", "border-border"],
  ["bg-[#0B1220]/80", "bg-background/80"],
  ["bg-[#0B1220]/60", "bg-muted/60"],
  ["bg-[#0B1220]", "bg-background"],
  ["bg-[#111827]", "bg-card"],
  ["bg-[#18181b]/80", "bg-card"],
  ["bg-[#121212]", "bg-card"],
  ["bg-[#111]/40", "bg-muted/40"],
  ["bg-[#111]", "bg-card"],
  ["bg-[#0c1320]", "bg-muted"],
  ["bg-[#10182a]", "bg-accent"],
  ["bg-[#252525]", "bg-muted"],
  ["bg-[#e6eef9]", "bg-muted"],
  ["border-white/20", "border-border"],
  ["border-white/10", "border-border"],
]

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else if (/\.(js|jsx)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

const files = walk(SRC)
const changed = []
let totalHits = 0

for (const file of files) {
  let src = fs.readFileSync(file, "utf8")
  const original = src
  let hits = 0
  for (const [from, to] of REPLACEMENTS) {
    if (!src.includes(from)) continue
    const count = src.split(from).length - 1
    src = src.split(from).join(to)
    hits += count
  }
  if (src !== original) {
    fs.writeFileSync(file, src)
    changed.push({ file: path.relative(SRC, file), hits })
    totalHits += hits
  }
}

console.log(
  JSON.stringify(
    { filesChanged: changed.length, totalHits, files: changed.map((c) => c.file) },
    null,
    2
  )
)
