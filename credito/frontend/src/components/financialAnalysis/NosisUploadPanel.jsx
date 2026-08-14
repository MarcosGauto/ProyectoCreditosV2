"use client"

import { useMemo, useRef, useState } from "react"
import { FileText, Loader2, Shield, Trash2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { NosisIndicatorsForm } from "@/components/financialAnalysis/NosisIndicatorsForm"
import {
  getLatestNosisReport,
  getNosisDocumentStatus,
  getNosisPdfSubtitle,
  hasConfirmedNosisIndicators,
} from "@/lib/nosisModel"
import { deleteNosisReport, uploadNosisReport } from "@/lib/uploadNosisReport"
import { USE_FIREBASE_STORAGE } from "@/lib/storageConfig"

/**
 * @param {unknown[]} docs
 */
function sortNosisDocsNewestFirst(docs) {
  return [...docs].sort((a, b) => {
    const da = new Date(String(a.fechaCarga ?? a.createdAt ?? 0)).getTime()
    const db = new Date(String(b.fechaCarga ?? b.createdAt ?? 0)).getTime()
    return db - da
  })
}

/**
 * @param {{
 *   cuit: string;
 *   nosisDocs?: unknown[];
 *   usuario?: string | null;
 *   onUpdated?: () => void | Promise<void>;
 * }} props
 */
export function NosisUploadPanel({
  cuit,
  nosisDocs = [],
  usuario = null,
  onUpdated,
}) {
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null))
  const [error, setError] = useState("")

  const sortedDocs = useMemo(
    () => sortNosisDocsNewestFirst(nosisDocs),
    [nosisDocs]
  )

  const latest = getLatestNosisReport(nosisDocs)
  const status = getNosisDocumentStatus(latest)
  const confirmed = hasConfirmedNosisIndicators(latest)

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    setError("")
    try {
      await uploadNosisReport({ cuit, file, usuario })
      await onUpdated?.()
    } catch (err) {
      console.error("[NosisUploadPanel]", err)
      setError("No se pudo procesar el informe NOSIS.")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  /**
   * @param {Record<string, unknown> & { id?: string; firestoreId?: string }} report
   */
  const handleDelete = async (report) => {
    const reportId = String(report.firestoreId ?? report.id ?? "")
    if (!reportId) {
      return
    }

    if (!window.confirm("¿Desea eliminar este informe NOSIS?")) {
      return
    }

    setDeletingId(reportId)
    setError("")
    try {
      await deleteNosisReport(cuit, reportId)
      await onUpdated?.()
    } catch (err) {
      console.error("[NosisUploadPanel] delete", err)
      setError("No se pudo eliminar el informe NOSIS.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AccordionItem
      value="nosis"
      className="rounded-lg border border-border bg-muted overflow-hidden"
    >
      <AccordionTrigger className="px-3 py-2 hover:no-underline">
        <div className="flex items-center gap-2 text-left min-w-0">
          <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">Informe NOSIS</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {nosisDocs.length > 0
                ? `${nosisDocs.length} informe(s) · ${status}`
                : USE_FIREBASE_STORAGE
                  ? "PDF opcional · Comportamiento crediticio"
                  : "PDF local · indicadores en Firestore (sin Storage)"}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-3 pb-3 pt-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2 min-h-[44px]">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleUpload(file)
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={uploading || Boolean(deletingId)}
            className="h-8 text-xs"
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 mr-1" />
                Agregar PDF
              </>
            )}
          </Button>
          {!USE_FIREBASE_STORAGE && (
            <span className="text-[10px] text-muted-foreground">
              Modo dev: sin bucket Storage
            </span>
          )}
        </div>

        {sortedDocs.length > 0 && (
          <ul className="space-y-1.5">
            {sortedDocs.map((raw) => {
              const report = /** @type {Record<string, unknown> & { id: string; firestoreId: string }} */ (
                raw
              )
              const reportId = String(report.firestoreId ?? report.id)
              const docStatus = getNosisDocumentStatus(report)
              const isDeleting = deletingId === reportId

              return (
                <li
                  key={reportId}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted px-2 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-foreground/80 truncate flex items-center gap-1">
                      <FileText className="w-3 h-3 shrink-0 text-muted-foreground" />
                      {getNosisPdfSubtitle(report, USE_FIREBASE_STORAGE) ??
                        String(report.nombre ?? "Informe NOSIS")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{docStatus}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={uploading || Boolean(deletingId)}
                    className="h-7 text-[10px] shrink-0"
                    onClick={() => void handleDelete(report)}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3 mr-0.5" />
                        Eliminar
                      </>
                    )}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        {latest && !confirmed && (
          <NosisIndicatorsForm
            cuit={cuit}
            doc={/** @type {Record<string, unknown> & { id: string }} */ (latest)}
            usuario={usuario}
            onSaved={onUpdated}
          />
        )}

        {latest && confirmed && (
          <p className="text-[11px] text-green-400">
            Indicadores NOSIS confirmados
            {typeof latest.scoreNosis === "number"
              ? ` · Score ${latest.scoreNosis}/100`
              : ""}
            {latest.nosisAnalisis?.estado
              ? ` · ${latest.nosisAnalisis.estado}`
              : ""}
            {latest.scoreSource === "informe"
              ? " · Fuente: Informe NOSIS"
              : latest.scoreSource === "calculo_interno"
                ? " · Fuente: Cálculo interno"
                : ""}
          </p>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
