import fs from "node:fs"
import path from "node:path"

const SRC = path.resolve("src")

const REPLACEMENTS = [
  ["bg-zinc-950/80", "bg-card"],
  ["bg-zinc-950/70", "bg-card"],
  ["bg-zinc-950/60", "bg-card"],
  ["bg-zinc-950/30", "bg-muted/40"],
  ["hover:bg-zinc-950", "hover:bg-muted"],
  ["bg-zinc-950", "bg-card"],
  ["text-slate-200", "text-foreground"],
  ["text-slate-300", "text-muted-foreground"],
  ["shadow-2xl shadow-black/30", "shadow-card"],
  ["hover:bg-white/5", "hover:bg-accent/40"],
  ["bg-gray-700/70", "bg-background"],
  ["bg-[#151d2e]", "bg-background"],
  ["focus:border-zinc-600", "focus:border-ring"],
  ["focus:border-zinc-500", "focus:border-ring"],
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
