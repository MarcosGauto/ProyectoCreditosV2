import { existsSync, readFileSync, statSync } from "node:fs"

import path from "node:path"

import { NextResponse } from "next/server"

import {

  SC1_DOCS_ALLOWLIST,

  SC1_ROOT_ALLOWLIST,

} from "@/lib/sc1Help/sc1HelpCatalog"



export const runtime = "nodejs"



function docsRoot() {

  return path.join(process.cwd(), "docs")

}



function cwdRoot() {

  return process.cwd()

}



/**

 * @param {string | null} name

 * @returns {{ base: string; full: string } | null}

 */

function resolveAllowed(name) {

  if (!name || typeof name !== "string") return null

  const base = path.basename(name)

  if (base !== name) return null



  if (SC1_ROOT_ALLOWLIST.includes(base)) {

    const root = cwdRoot()

    const full = path.join(root, base)

    if (!full.startsWith(root)) return null

    return { base, full }

  }



  if (SC1_DOCS_ALLOWLIST.includes(base)) {

    const root = docsRoot()

    const full = path.join(root, base)

    if (!full.startsWith(root)) return null

    return { base, full }

  }



  return null

}



/**

 * GET /api/sc1-docs?list=1

 * GET /api/sc1-docs?file=NAME.md

 * GET /api/sc1-docs?download=NAME.pdf

 */

export async function GET(request) {

  const { requireApiAuth, API_STAFF_ROLES } = await import(

    "@/lib/auth/requireApiAuth"

  )

  const gate = await requireApiAuth(request, { roles: [...API_STAFF_ROLES] })

  if (!gate.ok) return gate.response



  const { searchParams } = request.nextUrl



  if (searchParams.get("list") === "1") {

    const available = {}

    for (const name of SC1_DOCS_ALLOWLIST) {

      available[name] = existsSync(path.join(docsRoot(), name))

    }

    for (const name of SC1_ROOT_ALLOWLIST) {

      available[name] = existsSync(path.join(cwdRoot(), name))

    }

    return NextResponse.json({ available })

  }



  const download = searchParams.get("download")

  const file = searchParams.get("file")

  const targetName = download || file

  const resolved = resolveAllowed(targetName)



  if (!resolved) {

    return NextResponse.json({ error: "Documento no permitido." }, { status: 400 })

  }



  if (!existsSync(resolved.full)) {

    return NextResponse.json(

      { error: "No disponible", file: resolved.base, available: false },

      { status: 404 }

    )

  }



  try {

    const buf = readFileSync(resolved.full)

    const isDownload = Boolean(download)

    const lower = resolved.base.toLowerCase()

    let contentType = "text/plain; charset=utf-8"

    if (lower.endsWith(".md")) contentType = "text/markdown; charset=utf-8"

    else if (lower.endsWith(".pdf")) contentType = "application/pdf"

    else if (lower.endsWith(".xlsx")) {

      contentType =

        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    } else if (lower.endsWith(".html")) contentType = "text/html; charset=utf-8"



    const headers = new Headers({

      "Content-Type": contentType,

      "Content-Length": String(statSync(resolved.full).size),

      "Cache-Control": "private, max-age=60",

    })

    if (isDownload) {

      headers.set(

        "Content-Disposition",

        `attachment; filename="${resolved.base}"`

      )

    }



    return new NextResponse(buf, { status: 200, headers })

  } catch {

    return NextResponse.json(

      { error: "No disponible", file: resolved.base },

      { status: 404 }

    )

  }

}


