"use client"

/**
 * Renderizado Markdown ligero (solo lectura).
 * Ids de heading = slugifyHeading para anclas / búsqueda.
 */

import { useEffect } from "react"
import { slugifyHeading } from "@/lib/sc1Help/sc1HelpCatalog"

/**
 * @param {string} text
 */
function inlineFormat(text) {
  const parts = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let m
  let key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index))
    }
    const token = m[0]
    if (token.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-slate-100">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-secondary px-1 py-0.5 text-[0.85em] text-amber-100/90"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith("[")) {
      const label = token.slice(1, token.indexOf("]"))
      const href = token.slice(token.indexOf("(") + 1, -1)
      parts.push(
        <a
          key={key++}
          href={href}
          className="text-sky-300 underline underline-offset-2 hover:text-sky-200"
        >
          {label}
        </a>
      )
    }
    last = m.index + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

/**
 * @param {{ markdown: string; scrollToId?: string | null }} props
 */
export function Sc1MarkdownViewer({ markdown, scrollToId = null }) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n")
  /** @type {React.ReactNode[]} */
  const nodes = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim()
      i += 1
      const buf = []
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i])
        i += 1
      }
      i += 1
      nodes.push(
        <pre
          key={key++}
          className="my-3 overflow-x-auto rounded-lg border border-border bg-card p-3 text-xs text-foreground/80"
        >
          <code data-lang={lang || undefined}>{buf.join("\n")}</code>
        </pre>
      )
      continue
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const title = heading[2].replace(/\s+#*\s*$/, "").trim()
      const id = slugifyHeading(title)
      const Tag = /** @type {"h1" | "h2" | "h3" | "h4"} */ (`h${level}`)
      const size =
        level === 1
          ? "text-xl mt-8 mb-3"
          : level === 2
            ? "text-lg mt-7 mb-2"
            : level === 3
              ? "text-base mt-5 mb-2"
              : "text-sm mt-4 mb-1"
      nodes.push(
        <Tag
          key={key++}
          id={id}
          className={`${size} scroll-mt-24 font-semibold text-foreground`}
        >
          {title}
        </Tag>
      )
      i += 1
      continue
    }

    if (
      line.trim().startsWith("|") &&
      i + 1 < lines.length &&
      lines[i + 1].includes("---")
    ) {
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        if (!/^\s*\|?\s*:?-+:?\s*\|/.test(lines[i])) {
          rows.push(
            lines[i]
              .split("|")
              .slice(1, -1)
              .map((c) => c.trim())
          )
        }
        i += 1
      }
      if (rows.length > 0) {
        const [header, ...body] = rows
        nodes.push(
          <div key={key++} className="my-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-xs text-foreground/80">
              <thead>
                <tr className="border-b border-border bg-muted/80">
                  {header.map((cell, idx) => (
                    <th
                      key={idx}
                      className="px-2 py-1.5 font-medium text-foreground"
                    >
                      {inlineFormat(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-border/80">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-2 py-1.5 align-top">
                        {inlineFormat(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""))
        i += 1
      }
      nodes.push(
        <ul
          key={key++}
          className="my-2 list-disc space-y-1 pl-5 text-sm text-foreground/80"
        >
          {items.map((item, idx) => (
            <li key={idx}>{inlineFormat(item)}</li>
          ))}
        </ul>
      )
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""))
        i += 1
      }
      nodes.push(
        <ol
          key={key++}
          className="my-2 list-decimal space-y-1 pl-5 text-sm text-foreground/80"
        >
          {items.map((item, idx) => (
            <li key={idx}>{inlineFormat(item)}</li>
          ))}
        </ol>
      )
      continue
    }

    if (line.trim() === "") {
      i += 1
      continue
    }

    if (line.trim() === "---") {
      nodes.push(<hr key={key++} className="my-6 border-border" />)
      i += 1
      continue
    }

    if (line.trim().startsWith(">")) {
      const buf = []
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""))
        i += 1
      }
      nodes.push(
        <blockquote
          key={key++}
          className="my-3 border-l-2 border-sky-500/50 bg-sky-500/5 px-3 py-2 text-sm text-foreground/80"
        >
          {buf.map((b, idx) => (
            <p key={idx} className="mb-1 last:mb-0">
              {inlineFormat(b)}
            </p>
          ))}
        </blockquote>
      )
      continue
    }

    nodes.push(
      <p key={key++} className="my-2 text-sm leading-relaxed text-foreground/80">
        {inlineFormat(line)}
      </p>
    )
    i += 1
  }

  return <Sc1MarkdownBody scrollToId={scrollToId}>{nodes}</Sc1MarkdownBody>
}

/**
 * @param {{ children: React.ReactNode; scrollToId?: string | null }} props
 */
function Sc1MarkdownBody({ children, scrollToId }) {
  useEffect(() => {
    if (!scrollToId) return
    const t = window.setTimeout(() => {
      const el = document.getElementById(scrollToId)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 80)
    return () => window.clearTimeout(t)
  }, [scrollToId, children])

  return <article className="sc1-md max-w-none">{children}</article>
}
