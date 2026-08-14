"use client"



import { useCallback, useEffect, useMemo, useState } from "react"

import { BookOpen, Download, FileText, Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"

import { authFetch } from "@/lib/auth/authFetch"

import {

  SC1_HELP_DOCS,

  SC1_HELP_DOWNLOADS,

  getHelpDocById,

  slugifyHeading,

} from "@/lib/sc1Help/sc1HelpCatalog"

import { Sc1MarkdownViewer } from "@/components/settings/help/Sc1MarkdownViewer"



/**

 * Centro de Ayuda SC-1.0 — solo lectura.

 * Estilo alineado al bloque Cockpit SC-1.0 (zinc, tipografía compacta).

 *

 * @param {{

 *   initialDocId?: string | null;

 *   initialSection?: string | null;

 * }} props

 */

export function HelpCenterTab({

  initialDocId = null,

  initialSection = null,

}) {

  const [available, setAvailable] = useState(

    /** @type {Record<string, boolean>} */ ({})

  )

  const [availabilityLoaded, setAvailabilityLoaded] = useState(false)

  const [activeDocId, setActiveDocId] = useState(

    initialDocId || SC1_HELP_DOCS[0]?.id || null

  )

  const [section, setSection] = useState(initialSection)

  const [markdown, setMarkdown] = useState("")

  const [loadingDoc, setLoadingDoc] = useState(false)

  const [docError, setDocError] = useState(/** @type {string | null} */ (null))

  const [query, setQuery] = useState("")

  const [searchHits, setSearchHits] = useState(

    /** @type {Array<{ docId: string; title: string; heading: string; sectionId: string; snippet: string }>} */ ([])

  )

  const [searching, setSearching] = useState(false)



  useEffect(() => {

    let cancelled = false

    authFetch("/api/sc1-docs?list=1")

      .then((r) => r.json())

      .then((data) => {

        if (!cancelled) {

          setAvailable(data.available ?? {})

          setAvailabilityLoaded(true)

        }

      })

      .catch(() => {

        if (!cancelled) {

          setAvailable({})

          setAvailabilityLoaded(true)

        }

      })

    return () => {

      cancelled = true

    }

  }, [])



  useEffect(() => {

    if (initialDocId) setActiveDocId(initialDocId)

    if (initialSection) setSection(initialSection)

  }, [initialDocId, initialSection])



  const activeDoc = useMemo(

    () => (activeDocId ? getHelpDocById(activeDocId) : null),

    [activeDocId]

  )



  const uniqueSearchDocs = useMemo(() => {

    const seen = new Set()

    /** @type {typeof SC1_HELP_DOCS} */

    const out = []

    for (const doc of SC1_HELP_DOCS) {

      if (seen.has(doc.file)) continue

      seen.add(doc.file)

      out.push(doc)

    }

    return out

  }, [])



  const loadDoc = useCallback(async (doc) => {

    if (!doc || doc.kind !== "markdown") return

    setLoadingDoc(true)

    setDocError(null)

    try {

      const res = await authFetch(

        `/api/sc1-docs?file=${encodeURIComponent(doc.file)}`

      )

      if (!res.ok) {

        setMarkdown("")

        setDocError("No disponible")

        return

      }

      const text = await res.text()

      setMarkdown(text)

    } catch {

      setMarkdown("")

      setDocError("No disponible")

    } finally {

      setLoadingDoc(false)

    }

  }, [])



  useEffect(() => {

    if (!activeDoc) return

    const targetSection = section || activeDoc.defaultSection || null

    setSection(targetSection)

    void loadDoc(activeDoc)

  }, [activeDoc, loadDoc]) // eslint-disable-line react-hooks/exhaustive-deps -- section applied after load via scrollToId



  const openDoc = (docId, sectionId = null) => {

    const doc = getHelpDocById(docId)

    if (!doc) return

    setActiveDocId(docId)

    setSection(sectionId || doc.defaultSection || null)

  }



  const runSearch = async () => {

    const q = query.trim().toLowerCase()

    if (q.length < 2) {

      setSearchHits([])

      return

    }

    setSearching(true)

    /** @type {typeof searchHits} */

    const hits = []

    try {

      for (const doc of uniqueSearchDocs) {

        if (doc.kind !== "markdown") continue

        if (available[doc.file] === false) continue

        const res = await authFetch(

          `/api/sc1-docs?file=${encodeURIComponent(doc.file)}`

        )

        if (!res.ok) continue

        const text = await res.text()

        const lines = text.split(/\r?\n/)

        let currentHeading = doc.title

        let currentId = slugifyHeading(doc.title)

        for (let i = 0; i < lines.length; i += 1) {

          const line = lines[i]

          const hm = /^(#{1,4})\s+(.+)$/.exec(line)

          if (hm) {

            currentHeading = hm[2].replace(/\s+#*\s*$/, "").trim()

            currentId = slugifyHeading(currentHeading)

          }

          if (line.toLowerCase().includes(q)) {

            const topic =

              SC1_HELP_DOCS.find(

                (t) =>

                  t.file === doc.file &&

                  (!t.defaultSection || t.defaultSection === currentId)

              ) || SC1_HELP_DOCS.find((t) => t.file === doc.file)

            hits.push({

              docId: topic?.id || doc.id,

              title: topic?.title || doc.title,

              heading: currentHeading,

              sectionId: currentId,

              snippet: line.trim().slice(0, 160),

            })

            if (hits.length >= 40) break

          }

        }

        if (hits.length >= 40) break

      }

    } finally {

      setSearching(false)

      setSearchHits(hits)

    }

  }



  return (

    <section

      aria-label="Centro de Ayuda SC-1.0"

      className="space-y-5 border-t border-border/80 pt-7"

    >

      <div className="flex flex-wrap items-end justify-between gap-3">

        <div>

          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">

            Documentación oficial

          </p>

          <h2 className="mt-1 flex items-center gap-2 text-base font-semibold text-foreground">

            <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />

            Centro de Ayuda

          </h2>

          <p className="mt-0.5 text-xs text-muted-foreground">

            Solo lectura — reutiliza la documentación existente. No modifica

            motores ni políticas.

          </p>

        </div>

      </div>



      <div className="flex flex-wrap gap-2">

        {SC1_HELP_DOWNLOADS.map((dl) => {

          const ok = availabilityLoaded ? available[dl.file] === true : null

          if (ok === false) {

            return (

              <span

                key={dl.id}

                className="inline-flex items-center gap-2 rounded-lg border border-border/80 px-3 py-2 text-xs text-muted-foreground"

              >

                <Download className="h-3.5 w-3.5" aria-hidden />

                {dl.title}: No disponible

              </span>

            )

          }

          return (

            <Button

              key={dl.id}

              type="button"

              variant="secondary"

              size="sm"

              onClick={async () => {

                try {

                  const res = await authFetch(

                    `/api/sc1-docs?download=${encodeURIComponent(dl.file)}`

                  )

                  if (!res.ok) return

                  const blob = await res.blob()

                  const url = URL.createObjectURL(blob)

                  const a = document.createElement("a")

                  a.href = url

                  a.download = dl.file

                  a.click()

                  URL.revokeObjectURL(url)

                } catch {

                  /* ignore */

                }

              }}

            >

              <Download className="mr-2 h-3.5 w-3.5" aria-hidden />

              {dl.title}

              {ok === null ? "…" : ""}

            </Button>

          )

        })}

      </div>



      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

        <div className="relative flex-1">

          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

          <input

            type="search"

            value={query}

            onChange={(e) => setQuery(e.target.value)}

            onKeyDown={(e) => {

              if (e.key === "Enter") void runSearch()

            }}

            placeholder="Buscar: coverage, confidence, liquidez, BCRA…"

            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"

          />

        </div>

        <Button

          type="button"

          variant="secondary"

          size="sm"

          disabled={searching || query.trim().length < 2}

          onClick={() => void runSearch()}

        >

          {searching ? (

            <Loader2 className="mr-2 h-4 w-4 animate-spin" />

          ) : null}

          Buscar

        </Button>

      </div>



      {searchHits.length > 0 ? (

        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border/80 bg-muted/50 p-2 text-sm">

          {searchHits.map((hit, idx) => (

            <li key={`${hit.docId}-${hit.sectionId}-${idx}`}>

              <button

                type="button"

                className="w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/80"

                onClick={() => openDoc(hit.docId, hit.sectionId)}

              >

                <span className="font-medium text-foreground/80">{hit.title}</span>

                <span className="text-muted-foreground"> · </span>

                <span className="text-muted-foreground">{hit.heading}</span>

                <div className="truncate text-xs text-muted-foreground">{hit.snippet}</div>

              </button>

            </li>

          ))}

        </ul>

      ) : null}



      <div className="grid gap-6 lg:grid-cols-[minmax(11rem,14rem)_1fr]">

        <nav

          aria-label="Temas de ayuda"

          className="space-y-0.5 border-t border-border/80 pt-3 lg:border-t-0 lg:border-r lg:pr-4 lg:pt-0"

        >

          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">

            Temas

          </p>

          {SC1_HELP_DOCS.map((doc) => {

            const missing =

              availabilityLoaded && available[doc.file] === false

            const active = doc.id === activeDocId

            return (

              <button

                key={doc.id}

                type="button"

                disabled={missing}

                onClick={() => openDoc(doc.id, doc.defaultSection || null)}

                className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${

                  active

                    ? "bg-secondary/90 text-foreground"

                    : missing

                      ? "cursor-not-allowed text-zinc-700"

                      : "text-muted-foreground hover:bg-muted hover:text-foreground/80"

                }`}

              >

                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />

                <span>

                  <span className="block font-medium">{doc.title}</span>

                  <span className="block text-[11px] text-muted-foreground">

                    {missing ? "No disponible" : doc.description}

                  </span>

                </span>

              </button>

            )

          })}

        </nav>



        <div className="min-h-[24rem] space-y-3">

          {activeDoc ? (

            <div>

              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">

                Tema

              </p>

              <h3 className="mt-1 text-base font-semibold text-foreground">

                {activeDoc.title}

              </h3>

              <p className="mt-0.5 text-xs text-muted-foreground">

                {activeDoc.file}

                {section ? ` · #${section}` : ""}

              </p>

            </div>

          ) : null}



          <div className="rounded-xl border border-border/80 bg-muted/50 p-4 sm:p-5">

            {loadingDoc ? (

              <div className="flex items-center gap-2 text-xs text-muted-foreground">

                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />

                Cargando documento…

              </div>

            ) : null}

            {docError ? (

              <div

                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"

                role="status"

              >

                {docError}

              </div>

            ) : null}

            {!loadingDoc && !docError && markdown ? (

              <Sc1MarkdownViewer

                key={`${activeDocId}-${section || ""}-${markdown.length}`}

                markdown={markdown}

                scrollToId={section}

              />

            ) : null}

            {!loadingDoc && !docError && !markdown ? (

              <p className="text-sm text-muted-foreground">Seleccioná un tema.</p>

            ) : null}

          </div>

        </div>

      </div>

    </section>

  )

}


