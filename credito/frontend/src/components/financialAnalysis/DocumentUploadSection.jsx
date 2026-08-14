"use client"

import { useEffect, useRef, useState } from "react"
import { Pencil, Trash2, Loader2, ChevronDown, Eye, EyeOff, Plus } from "lucide-react"

import { UploadButton } from "@/components/financialAnalysis/UploadButton"
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

/**
 * @param {string | null | undefined} periodo
 */
export function formatPeriodoLabel(periodo) {
  if (!periodo) {
    return "—"
  }
  const value = String(periodo)
  if (/^\d{6}$/.test(value)) {
    return `${value.slice(4, 6)}/${value.slice(0, 4)}`
  }
  return value
}

/**
 * @param {string | null | undefined} latestLabel
 */
function formatLatestPeriodShort(latestLabel) {
  if (!latestLabel) {
    return "—"
  }
  return latestLabel.replace(/^Último:\s*/i, "").trim()
}

/**
 * @param {{
 *   section: {
 *     key: string;
 *     title: string;
 *     icon: import("react").ComponentType<{ className?: string }>;
 *     accepted: string;
 *   };
 *   documents: Array<Record<string, unknown> & { id: string }>;
 *   latestPeriodLabel?: string | null;
 *   loading?: boolean;
 *   onFilesSelected: (files: FileList | null) => void;
 *   onEdit: (documentItem: Record<string, unknown> & { id: string }) => void;
 *   onDelete: (documentItem: Record<string, unknown> & { id: string }) => void;
 *   getDocStatus: (documentItem: Record<string, unknown>) => { label: string; tone: "success" | "warning" };
 *   editButtonLabel?: string;
 *   defaultTableOpen?: boolean;
 *   onEditLatest?: () => void;
 *   children?: import("react").ReactNode;
 * }} props
 */
export function DocumentUploadSection({
  section,
  documents,
  latestPeriodLabel = null,
  loading = false,
  onFilesSelected,
  onEdit,
  onDelete,
  getDocStatus,
  editButtonLabel = "Editar",
  defaultTableOpen = false,
  onEditLatest,
  children,
}) {
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const [selectedFileLabel, setSelectedFileLabel] = useState("")
  const [tableVisible, setTableVisible] = useState(defaultTableOpen)

  const Icon = section.icon
  const hasDocuments = documents.length > 0
  const inputId = `upload-${section.key}`
  const lastPeriod = formatLatestPeriodShort(latestPeriodLabel)

  useEffect(() => {
    console.log("DOCUMENTS DEBUG", {
      section: section.key,
      documents,
    })

    const ids = documents.map((d) => d.id)
    const duplicados = ids.filter((id, index) => ids.indexOf(id) !== index)

    if (duplicados.length > 0) {
      console.log("IDS DUPLICADOS", {
        section: section.key,
        duplicados: [...new Set(duplicados)],
        filas: documents.filter((d) => duplicados.includes(d.id)),
      })
    }
  }, [documents, section.key])

  const openFilePicker = () => {
    inputRef.current?.click()
  }

  const handleFileChange = (files) => {
    const first = files?.[0]
    setSelectedFileLabel(first?.name ?? "")
    onFilesSelected(files)
  }

  return (
    <AccordionItem
      value={section.key}
      className="border border-border rounded-lg bg-muted overflow-hidden mb-2 last:mb-0"
    >
      <AccordionTrigger className="group px-3 py-2 hover:no-underline hover:bg-accent/40 [&>svg:last-child]:hidden">
        <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          <Icon className="w-4 h-4 shrink-0 text-red-400" />
          <span className="text-sm font-semibold text-foreground truncate">
            {section.title}
          </span>
          {hasDocuments && (
            <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
              · {documents.length} arch. · {lastPeriod}
            </span>
          )}
        </div>
        {hasDocuments && (
          <span className="text-[10px] font-medium text-muted-foreground shrink-0 ml-2">
            {documents.length}
          </span>
        )}
      </AccordionTrigger>

      <AccordionContent className="pb-0">
        <div className="px-3 pb-3 pt-0 border-t border-border">
          <input
            ref={inputRef}
            type="file"
            accept={section.accepted}
            multiple
            className="hidden"
            id={inputId}
            onChange={(event) => {
              handleFileChange(event.target.files)
              event.target.value = ""
            }}
          />

          {hasDocuments ? (
            <div className="flex flex-wrap items-center gap-2 py-2 min-h-[40px]">
              <p className="text-xs text-muted-foreground flex-1 min-w-[140px]">
                <span className="text-foreground/80 font-medium">
                  {documents.length}
                </span>{" "}
                archivo{documents.length === 1 ? "" : "s"}
                <span className="text-muted-foreground mx-1.5">·</span>
                Último período:{" "}
                <span className="text-foreground/80 tabular-nums">{lastPeriod}</span>
              </p>
              <UploadButton variant="primary" onClick={openFilePicker}>
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </UploadButton>
              {onEditLatest && (
                <UploadButton variant="secondary" onClick={onEditLatest}>
                  <Pencil className="w-3.5 h-3.5" />
                  {editButtonLabel}
                </UploadButton>
              )}
              <UploadButton
                variant="secondary"
                onClick={() => setTableVisible((v) => !v)}
              >
                {tableVisible ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    Ver
                  </>
                )}
              </UploadButton>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 py-2 px-2 rounded-md border border-border bg-background/25 my-2"
              style={{ maxHeight: 70 }}
            >
              <UploadButton variant="primary" onClick={openFilePicker}>
                <Plus className="w-3.5 h-3.5" />
                Agregar archivo
              </UploadButton>
              <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                {selectedFileLabel || (
                  <span className="text-muted-foreground">Ningún archivo seleccionado</span>
                )}
              </p>
              <span className="text-[10px] text-muted-foreground shrink-0 hidden md:inline">
                {section.accepted}
              </span>
            </div>
          )}

          {loading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pb-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Cargando...
            </p>
          )}

          {hasDocuments && tableVisible && !loading && (
            <div className="rounded-md border border-border overflow-hidden max-h-[220px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-1.5 font-semibold">Archivo</th>
                    <th className="px-2 py-1.5 font-semibold w-14">Período</th>
                    <th className="px-2 py-1.5 font-semibold w-16">Estado</th>
                    <th className="px-2 py-1.5 font-semibold w-28 text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((documentItem) => {
                    const status = getDocStatus(documentItem)
                    return (
                      <tr
                        key={documentItem.id}
                        className="border-t border-border hover:bg-accent/40"
                      >
                        <td className="px-2 py-1 min-w-0">
                          <p className="text-[11px] font-medium text-foreground truncate max-w-[220px]">
                            {String(documentItem.nombre ?? documentItem.id)}
                          </p>
                        </td>
                        <td className="px-2 py-1 text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                          {formatPeriodoLabel(
                            documentItem.periodo != null
                              ? String(documentItem.periodo)
                              : null
                          )}
                        </td>
                        <td className="px-2 py-1">
                          <span
                            className={`inline-flex text-[10px] font-semibold px-1 py-0.5 rounded border ${
                              status.tone === "success"
                                ? "border-green-500/30 bg-green-500/10 text-green-400"
                                : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                            }`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-2 py-1">
                          <div className="flex items-center justify-end gap-1">
                            <UploadButton
                              variant="secondary"
                              size="table"
                              onClick={() => onEdit(documentItem)}
                            >
                              <Pencil className="w-3 h-3" />
                              {editButtonLabel}
                            </UploadButton>
                            <UploadButton
                              variant="danger"
                              size="table"
                              onClick={() => onDelete(documentItem)}
                            >
                              <Trash2 className="w-3 h-3" />
                              Eliminar
                            </UploadButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {children ? (
            <div className="mt-2 border-t border-border pt-2">{children}</div>
          ) : null}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
