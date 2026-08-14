/**
 * Targeted Dark-palette → semantic tokens.
 * Only known dark hex/zinc surfaces used as the old fintech Dark look.
 * Does not touch brand reds, status colors, or light-on-color badges.
 */
import fs from "fs"
import path from "path"

const root = path.resolve("src")
const exts = new Set([".js", ".jsx", ".ts", ".tsx"])

/** @type {Array<[string, string]>} */
const replacements = [
  ["bg-[#0D0D0D]/80", "bg-muted/80"],
  ["bg-[#0D0D0D]", "bg-muted"],
  ["border-[#3B3B3B]/80", "border-border"],
  ["border-[#3B3B3B]/60", "border-border"],
  ["border-[#3B3B3B]", "border-border"],
  ["bg-[#1F1F1F]", "bg-card"],
  ["bg-[#020817]", "bg-background"],
  ["bg-[#141414]", "bg-card"],
  ["bg-[#262626]", "bg-muted"],
  ["bg-[#1A1A1A]", "bg-card"],
  ["bg-[#2a2a2a]/80", "bg-muted/80"],
  ["bg-[#2A2A2A]", "bg-muted"],
  ["bg-[#0c0c0e]/95", "bg-background/95"],
  ["bg-[#0c0c0e]", "bg-background"],
  ["bg-[#0e0e11]", "bg-background"],
  ["bg-[#121215]", "bg-card"],
  ["text-[#ADADAD]", "text-muted-foreground"],
  ["hover:border-[#4a4a4a]", "hover:border-border"],
  ["from-[#1F1F1F] to-[#141414]", "from-card to-muted"],
  ["bg-[#1a1f2e]/80", "bg-info/10"],
  ["bg-[#2A1414]", "bg-danger/10"],
  ["hover:bg-white/[0.02]", "hover:bg-accent/40"],
  ["hover:bg-white/[0.03]", "hover:bg-accent/40"],
  ["bg-white/[0.02]", "bg-muted/30"],
  ["bg-gray-900", "bg-card"],
  ["bg-zinc-950/55", "bg-muted/60"],
  ["bg-zinc-950/40", "bg-muted/50"],
  ["[color-scheme:dark]", ""],
]

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next") continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (exts.has(path.extname(ent.name))) out.push(p)
  }
  return out
}

let filesChanged = 0
let totalHits = 0
/** @type {Record<string, number>} */
const byFile = {}

for (const file of walk(root)) {
  let text = fs.readFileSync(file, "utf8")
  let next = text
  let hits = 0
  for (const [from, to] of replacements) {
    if (!next.includes(from)) continue
    const count = next.split(from).length - 1
    hits += count
    next = next.split(from).join(to)
  }

  // Primary dark-on-light text zinc used as body copy (not zinc-50 badges).
  next = next.replace(/\btext-zinc-50\b/g, () => {
    hits += 1
    return "text-foreground"
  })
  next = next.replace(/\btext-zinc-100\b/g, () => {
    hits += 1
    return "text-foreground"
  })
  next = next.replace(/\btext-zinc-200\b/g, () => {
    hits += 1
    return "text-foreground/80"
  })
  next = next.replace(/\btext-zinc-300\b/g, () => {
    hits += 1
    return "text-muted-foreground"
  })
  next = next.replace(/\bhover:text-zinc-100\b/g, () => {
    hits += 1
    return "hover:text-foreground"
  })
  next = next.replace(/\bhover:text-zinc-200\b/g, () => {
    hits += 1
    return "hover:text-foreground"
  })
  next = next.replace(/\bhover:text-zinc-50\b/g, () => {
    hits += 1
    return "hover:text-foreground"
  })

  if (next !== text) {
    fs.writeFileSync(file, next)
    filesChanged += 1
    totalHits += hits
    byFile[path.relative(root, file)] = hits
  }
}

console.log(JSON.stringify({ filesChanged, totalHits, files: Object.keys(byFile).sort() }, null, 2))
