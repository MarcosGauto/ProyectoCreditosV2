"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { DocumentacionComercialClientesTable } from "@/components/documentacionComercial/DocumentacionComercialClientesTable"
import { DocumentacionComercialHistorial } from "@/components/documentacionComercial/DocumentacionComercialHistorial"
import { DocumentacionComercialSearch } from "@/components/documentacionComercial/DocumentacionComercialSearch"
import { DocumentacionComercialSummaryCard } from "@/components/documentacionComercial/DocumentacionComercialSummaryCard"
import { DocumentacionComercialTable } from "@/components/documentacionComercial/DocumentacionComercialTable"
import {
  fetchDocumentacionComercial,
  fetchDocumentacionComercialVista,
} from "@/service/documentacionComercialService"

/**
 * Pantalla comercial: grilla de clientes + detalle documental.
 */
export function DocumentacionComercialPage() {
  const [rows, setRows] = useState(
    /** @type {Awaited<ReturnType<typeof fetchDocumentacionComercial>>} */ ([])
  )
  const [loading, setLoading] = useState(true)
  const [cuitQuery, setCuitQuery] = useState("")
  const [razonQuery, setRazonQuery] = useState("")
  const [selectedCuit, setSelectedCuit] = useState(
    /** @type {string | null} */ (null)
  )
  const [vista, setVista] = useState(
    /** @type {Awaited<ReturnType<typeof fetchDocumentacionComercialVista>>} */ (
      null
    )
  )
  const [vistaLoading, setVistaLoading] = useState(false)
  const [historialRow, setHistorialRow] = useState(
    /** @type {import("@/lib/documentacionComercial/documentacionComercialPresentation").ComercialDocRow | null} */ (
      null
    )
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchDocumentacionComercial()
      .then((data) => {
        if (active) setRows(data)
      })
      .catch((error) => {
        console.error("[DocumentacionComercialPage]", error)
        if (active) setRows([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const filteredRows = useMemo(() => {
    const cuitQ = cuitQuery.replace(/\D/g, "").trim()
    const nameQ = razonQuery.trim().toLowerCase()
    return rows.filter((row) => {
      const cuitOk =
        !cuitQ || String(row.cuit).replace(/\D/g, "").includes(cuitQ)
      const nameOk =
        !nameQ || String(row.cliente).toLowerCase().includes(nameQ)
      return cuitOk && nameOk
    })
  }, [rows, cuitQuery, razonQuery])

  useEffect(() => {
    if (!selectedCuit) {
      setVista(null)
      return
    }
    let active = true
    setVistaLoading(true)
    fetchDocumentacionComercialVista(selectedCuit)
      .then((data) => {
        if (active) setVista(data)
      })
      .catch((error) => {
        console.error("[DocumentacionComercialPage] vista", error)
        if (active) setVista(null)
      })
      .finally(() => {
        if (active) setVistaLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedCuit])

  const handleVer = useCallback((cuit) => {
    setSelectedCuit(cuit)
    setHistorialRow(null)
  }, [])

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-3 space-y-6 duration-500">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Documentación Comercial
        </h1>
        <p className="text-sm text-muted-foreground">
          Consultá el último documento vigente de cada tipo por cliente.
        </p>
      </header>

      <DocumentacionComercialSearch
        cuit={cuitQuery}
        razonSocial={razonQuery}
        onCuitChange={setCuitQuery}
        onRazonSocialChange={setRazonQuery}
      />

      <DocumentacionComercialClientesTable
        rows={filteredRows}
        loading={loading}
        selectedCuit={selectedCuit}
        onVer={handleVer}
      />

      {selectedCuit ? (
        vistaLoading || !vista ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-border bg-card">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            <DocumentacionComercialSummaryCard vista={vista} />
            <DocumentacionComercialTable
              documentos={vista.documentos}
              onHistorial={setHistorialRow}
            />
          </div>
        )
      ) : null}

      <DocumentacionComercialHistorial
        open={Boolean(historialRow)}
        row={historialRow}
        onClose={() => setHistorialRow(null)}
      />
    </div>
  )
}
