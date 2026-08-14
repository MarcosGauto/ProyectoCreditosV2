import fs from "fs"
import path from "path"

const root = path.resolve("src")
const exts = new Set([".js", ".jsx", ".ts", ".tsx"])

/** @type {Array<[RegExp, string]>} */
const rules = [
  [/bg-\[#0b1220\]/g, "bg-card"],
  [/bg-\[#0f0f10\]/g, "bg-sidebar"],
  [/bg-\[#080e1a\]/g, "bg-muted"],
  [/bg-\[#0a0a0a\]/g, "bg-background"],
  [/bg-\[#111111\]/g, "bg-card"],
  [/bg-\[#121a2a\]/g, "bg-panel-elevated"],
  [/bg-\[#0e1522\]/g, "bg-panel"],
  [/bg-\[#1a1a1a\]/g, "bg-card"],
  [/bg-\[#0d0d0d\]/g, "bg-muted"],
  [/border-white\/10/g, "border-border"],
  [/border-white\/\[0\.06\]/g, "border-border"],
  [/border-white\/\[0\.04\]/g, "border-border"],
  [/border-white\/8/g, "border-border"],
  [/border-white\/5/g, "border-border"],
  [/border-zinc-800/g, "border-border"],
  [/border-zinc-700/g, "border-border"],
  [/hover:bg-zinc-800\/60/g, "hover:bg-accent"],
  [/hover:bg-zinc-800/g, "hover:bg-accent"],
  [/bg-zinc-800\/60/g, "bg-accent"],
  [/bg-zinc-900\/50/g, "bg-muted/50"],
  [/bg-zinc-900/g, "bg-muted"],
  [/bg-zinc-800/g, "bg-secondary"],
  [/text-zinc-400/g, "text-muted-foreground"],
  [/text-zinc-500/g, "text-muted-foreground"],
  [/text-zinc-600/g, "text-muted-foreground"],
  [/text-slate-600/g, "text-muted-foreground"],
  [/text-slate-500/g, "text-muted-foreground"],
  [/text-slate-400/g, "text-muted-foreground"],
  [/text-slate-300/g, "text-foreground/80"],
  [/placeholder:text-zinc-500/g, "placeholder:text-muted-foreground"],
  [/placeholder:text-slate-600/g, "placeholder:text-muted-foreground"],
  [/hover:text-white/g, "hover:text-foreground"],
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
let replacements = 0

for (const file of walk(root)) {
  const text = fs.readFileSync(file, "utf8")
  let next = text

  for (const [re, to] of rules) {
    const matches = next.match(re)
    if (matches) replacements += matches.length
    next = next.replace(re, to)
  }

  next = next
    .split("\n")
    .map((line) => {
      if (/bg-red-/.test(line)) return line
      return line.replace(/\btext-white\b/g, "text-foreground")
    })
    .join("\n")

  next = next.replace(/\bbg-black\b/g, "bg-background")

  if (next !== text) {
    fs.writeFileSync(file, next)
    filesChanged += 1
  }
}

console.log(JSON.stringify({ filesChanged, replacements }, null, 2))
