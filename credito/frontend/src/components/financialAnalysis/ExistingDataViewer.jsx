"use client"

import { useEffect } from "react"
import {
  BALANCE_NO_ATTACHMENT_BADGE,
  hasBalanceAttachment,
} from "@/lib/balanceLocalUpload"
import {
  FISCAL_NO_ATTACHMENT_BADGE,
  hasFiscalAttachment,
} from "@/lib/fiscalLocalUpload"
import {
  formatWebsiteDisplayLabel,
  getEmpresaWebsiteUrl,
} from "@/lib/empresaWebsite"
import {
  hasLocalesLoaded,
  mergeSucursalesFromFirestore,
} from "@/lib/sucursalesModel"
import {
  getLatestNosisReport,
  getNosisDocumentStatus,
  getNosisPdfSubtitle,
} from "@/lib/nosisModel"
import { USE_FIREBASE_STORAGE } from "@/lib/storageConfig"
import { FileText, Globe, Shield, Store } from "lucide-react"

const TONE = {
  success: "text-green-400",
  warning: "text-yellow-400",
  danger: "text-red-400",
  muted: "text-muted-foreground",
}

const DOT = {
  success: "bg-green-400",
  warning: "bg-yellow-400",
  danger: "bg-red-400",
  muted: "bg-slate-500",
}

function resolveDocStatus(docs, isFiscal) {
  if (!docs || docs.length === 0) {
    return { tone: "danger", label: "Pendiente" }
  }

  const latest = docs[0]
  const hasFile = isFiscal
    ? hasFiscalAttachment(latest)
    : hasBalanceAttachment(latest)

  if (latest.validationStatus === "confirmed" || latest.indicadoresConfirmados) {
    return { tone: "success", label: "Confirmado" }
  }

  if (hasFile) {
    return { tone: "warning", label: "Pendiente validación" }
  }

  return { tone: "warning", label: "Sin adjunto" }
}

function latestPeriod(docs) {
  if (!docs || docs.length === 0) return null
  const latest = docs[0]
  return latest.periodo ?? latest.fechaCierre ?? latest.fecha_cierre ?? latest.fecha ?? null
}

export function ExistingDataViewer({ data }) {
  const iva = data?.iva ?? []
  const iibb = data?.iibb ?? []
  const balances = data?.balances ?? []
  const locales = data?.locales ?? []
  const nosisDocs = data?.nosis ?? []
  const latestNosis = getLatestNosisReport(nosisDocs)
  const nosisStatus = getNosisDocumentStatus(latestNosis)
  const websiteUrl = getEmpresaWebsiteUrl(data?.empresa)
  const sucursales = mergeSucursalesFromFirestore(data?.empresa, locales)
  const hasLocales = hasLocalesLoaded(data?.empresa, locales)
  const cantidadLocales = sucursales.length
  const cantidadImagenes = locales.length

  useEffect(() => {
    console.log("LOCALES DEBUG", {
      locales,
      cantidadLocales,
      cantidadImagenes,
      status: hasLocales ? "confirmed" : "optional",
    })
    console.log("[ExistingDataViewer → Render]", {
      ivaCount: iva.length,
      iibbCount: iibb.length,
      balancesCount: balances.length,
      localesCount: locales.length,
      hasWebsite: Boolean(websiteUrl),
      hasLocales,
    })
  }, [
    data,
    iva,
    iibb,
    balances,
    locales,
    websiteUrl,
    hasLocales,
    cantidadLocales,
    cantidadImagenes,
  ])

  const categories = [
    { key: "iva", label: "IVA", docs: iva, fiscal: true },
    { key: "iibb", label: "IIBB", docs: iibb, fiscal: true },
    { key: "balances", label: "Balances", docs: balances, fiscal: false },
    { key: "locales", label: "Locales", docs: locales, fiscal: false },
    { key: "web", label: "Web", docs: [], fiscal: false },
    { key: "nosis", label: "NOSIS", docs: nosisDocs, fiscal: false },
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((cat) => {
          const status =
            cat.key === "nosis"
              ? {
                  tone:
                    nosisStatus === "Confirmado"
                      ? "success"
                      : nosisStatus === "Pendiente"
                        ? "warning"
                        : "muted",
                  label: nosisStatus,
                }
              : cat.key === "web"
              ? websiteUrl
                ? { tone: "success", label: "Confirmado" }
                : { tone: "muted", label: "Opcional" }
              : cat.key === "locales"
                ? {
                    tone: hasLocales ? "success" : "muted",
                    label: hasLocales ? "Confirmado" : "Opcional",
                  }
                : resolveDocStatus(cat.docs, cat.fiscal)
          const period = latestPeriod(cat.docs)
          const webSubtitle = websiteUrl
            ? `Último registro: ${formatWebsiteDisplayLabel(websiteUrl)}`
            : null

          return (
            <div
              key={cat.key}
              className="bg-muted border border-border rounded-xl px-4 py-3.5 min-h-[90px] flex flex-col justify-center gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {cat.key === "locales" ? (
                    <Store className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : cat.key === "nosis" ? (
                    <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : cat.key === "web" ? (
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {cat.label}
                    {cat.key === "web" && !websiteUrl && (
                      <span className="text-muted-foreground text-xs font-normal ml-1">
                        (opc.)
                      </span>
                    )}
                  </span>
                </div>
                {cat.key === "locales" ? (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {cantidadLocales}{" "}
                    {cantidadLocales === 1 ? "local" : "locales"}
                  </span>
                ) : cat.key === "web" ? null : cat.key === "nosis" ? (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {cat.docs.length}{" "}
                    {cat.docs.length === 1 ? "informe" : "informes"}
                  </span>
                ) : cat.key !== "web" ? (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {cat.docs.length}{" "}
                    {cat.docs.length === 1 ? "archivo" : "archivos"}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[status.tone]}`} />
                <span className={`text-sm font-medium ${TONE[status.tone]}`}>
                  {status.label}
                </span>
              </div>

              {period && (
                <p className="text-xs text-muted-foreground leading-snug">
                  Último período: {String(period)}
                </p>
              )}

              {cat.key === "web" && webSubtitle && (
                <p className="text-xs text-muted-foreground leading-snug">{webSubtitle}</p>
              )}

              {cat.key === "nosis" && latestNosis && (
                <p className="text-xs text-muted-foreground leading-snug">
                  {getNosisPdfSubtitle(latestNosis, USE_FIREBASE_STORAGE) ??
                    "PDF procesado localmente"}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
