"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, deleteDoc, getDoc, getDocFromServer } from "firebase/firestore"

import { UploadButton } from "@/components/financialAnalysis/UploadButton"
import { Accordion } from "@/components/ui/accordion"
import { useAuth } from "@/app/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/service/firebase"
import { fetchFinancialDocumentation } from "@/lib/fetchAnalysisFirestore"
import {
  FINANCIAL_DOCUMENT_TYPES,
  inferPeriodoFromFileName,
  uploadFinancialDocument,
} from "@/lib/uploadFinancialDocument"
import {
  BALANCES_STORAGE_ENABLED,
  BALANCE_NO_ATTACHMENT_BADGE,
  buildPendingBalanceDoc,
  isPendingBalanceId,
} from "@/lib/balanceLocalUpload"
import {
  IVA_STORAGE_ENABLED,
  IIBB_STORAGE_ENABLED,
  buildPendingFiscalDoc,
  isPendingFiscalId,
} from "@/lib/fiscalLocalUpload"
import {
  buildEstadoDocumentalItems,
  formatLatestBalancePeriod,
  formatLatestFiscalPeriod,
  getLatestDocument,
} from "@/lib/getLatestDocumentPeriod"
import { DocumentUploadSection } from "@/components/financialAnalysis/DocumentUploadSection"
import { BalanceIndicatorsForm } from "@/components/financialAnalysis/BalanceIndicatorsForm"
import { BalancePairPanel } from "@/components/financialAnalysis/BalancePairPanel"
import {
  assignSlotForNewBalance,
  normalizeBalanceSlot,
} from "@/lib/balancePairModel"
import { IvaIndicatorsForm } from "@/components/financialAnalysis/IvaIndicatorsForm"
import { IibbIndicatorsForm } from "@/components/financialAnalysis/IibbIndicatorsForm"
import { hasConfirmedBalanceIndicators } from "@/lib/balanceIndicators"
import {
  hasBalanceContableIndicators,
  hasConfirmedBalanceContable,
} from "@/lib/balanceContableModel"
import { hasConfirmedIvaIndicators } from "@/lib/ivaIndicators"
import { hasConfirmedIibbIndicators } from "@/lib/iibbIndicators"
import { getCoeficienteTipoEmpresa } from "@/lib/scoring/prequalification"
import { useAnalysisTipoEmpresa } from "@/hooks/useAnalysisTipoEmpresa"
import { EmpresaWebsiteCard } from "@/components/financialAnalysis/EmpresaWebsiteCard"
import { NosisUploadPanel } from "@/components/financialAnalysis/NosisUploadPanel"
import {
  getEmpresaWebsiteUrl,
  mergeEmpresaWebsiteIntoEmpresa,
} from "@/lib/empresaWebsite"

import {
  Building2,
  Landmark,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react"

const SECTION_BALANCES = {
  key: FINANCIAL_DOCUMENT_TYPES.BALANCES,
  title: "Balances Contables",
  icon: Landmark,
  accepted: ".xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp",
}

const SECTION_IVA = {
  key: FINANCIAL_DOCUMENT_TYPES.IVA,
  title: "Declaraciones IVA",
  icon: FileSpreadsheet,
  accepted: ".xlsx,.xls,.pdf",
}

const SECTION_IIBB = {
  key: FINANCIAL_DOCUMENT_TYPES.IIBB,
  title: "Declaraciones IIBB",
  icon: Building2,
  accepted: ".xlsx,.xls,.pdf",
}

const EMPTY_DOCS = {
  balances: [],
  balanceContable: null,
  iva: [],
  iibb: [],
  locales: [],
  nosis: [],
}

/**
 * @param {string} sectionKey
 * @param {string} docId
 */
function isPendingDocId(sectionKey, docId) {
  if (sectionKey === FINANCIAL_DOCUMENT_TYPES.BALANCES) {
    return isPendingBalanceId(docId)
  }
  if (sectionKey === FINANCIAL_DOCUMENT_TYPES.IVA) {
    return isPendingFiscalId(docId, "iva")
  }
  if (sectionKey === FINANCIAL_DOCUMENT_TYPES.IIBB) {
    return isPendingFiscalId(docId, "iibb")
  }
  return false
}

export default function UploadPage({ params }) {
  const { cuit } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [documents, setDocuments] = useState(EMPTY_DOCS)
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [continuing, setContinuing] = useState(false)
  const [validationMessage, setValidationMessage] = useState("")
  const [fileStatuses, setFileStatuses] = useState({})
  const [balanceEditor, setBalanceEditor] = useState(null)
  const [balancePendingFile, setBalancePendingFile] = useState(
    /** @type {{ file: File; fileKind: string } | null} */ (null)
  )
  const [ivaEditor, setIvaEditor] = useState(null)
  const [iibbEditor, setIibbEditor] = useState(null)
  const [openSections, setOpenSections] = useState(/** @type {string[]} */ ([]))
  const [empresa, setEmpresa] = useState(null)
  const { tipoEmpresa, coeficienteEmpresa } = useAnalysisTipoEmpresa(cuit)

  const getFileKind = (fileName) => {
    if (/\.(xlsx|xls)$/i.test(fileName)) {
      return "excel"
    }
    if (/\.pdf$/i.test(fileName)) {
      return "pdf"
    }
    if (/\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(fileName)) {
      return "image"
    }
    return "other"
  }

  const fetchEmpresaFromFirestore = useCallback(async () => {
    const empresaRef = doc(db, "empresas", cuit)
    try {
      const empresaSnap = await getDocFromServer(empresaRef)
      return empresaSnap.exists()
        ? { id: empresaSnap.id, ...empresaSnap.data() }
        : null
    } catch {
      const empresaSnap = await getDoc(empresaRef)
      return empresaSnap.exists()
        ? { id: empresaSnap.id, ...empresaSnap.data() }
        : null
    }
  }, [cuit])

  const handleEmpresaWebsiteSaved = useCallback(({ paginaWeb }) => {
    if (!paginaWeb) {
      return
    }

    setEmpresa((prev) => mergeEmpresaWebsiteIntoEmpresa(prev, paginaWeb))
  }, [])

  const loadDocuments = useCallback(async () => {
    if (!cuit) {
      return
    }

    setLoadingDocs(true)
    try {
      const [financial, empresaData] = await Promise.all([
        fetchFinancialDocumentation(cuit),
        fetchEmpresaFromFirestore(),
      ])
      setDocuments({
        balances: financial.balances ?? [],
        balanceContable: financial.balanceContable ?? null,
        iva: financial.iva ?? [],
        iibb: financial.iibb ?? [],
        locales: financial.locales ?? [],
        nosis: financial.nosis ?? [],
      })
      setEmpresa((prev) => {
        const fetchedWebsite = getEmpresaWebsiteUrl(empresaData)
        const prevWebsite = getEmpresaWebsiteUrl(prev)
        if (prevWebsite && !fetchedWebsite) {
          return mergeEmpresaWebsiteIntoEmpresa(empresaData, prevWebsite)
        }
        return empresaData
      })
    } catch (error) {
      console.error("Error cargando documentación:", error)
      setDocuments(EMPTY_DOCS)
    } finally {
      setLoadingDocs(false)
    }
  }, [cuit, fetchEmpresaFromFirestore])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const usuario =
    user?.email || user?.displayName || user?.uid || "desconocido"

  const hasMinimumDocs =
    hasBalanceContableIndicators(documents.balanceContable) &&
    documents.iva.length > 0 &&
    documents.iibb.length > 0

  const hasConfirmedBalance = hasConfirmedBalanceContable(
    documents.balanceContable
  )
  const hasConfirmedIva = documents.iva.some(hasConfirmedIvaIndicators)
  const hasConfirmedIibb = documents.iibb.some(hasConfirmedIibbIndicators)

  const estadoDocumentalItems = useMemo(
    () =>
      buildEstadoDocumentalItems({
        iva: documents.iva,
        iibb: documents.iibb,
        balances: documents.balances,
        locales: documents.locales,
        nosis: documents.nosis,
        empresa,
      }),
    [documents, empresa]
  )

  const documentalToneClass = {
    success: "text-green-400",
    warning: "text-yellow-400",
    danger: "text-red-400",
    muted: "text-muted-foreground",
  }

  const ensureSectionOpen = (sectionKey) => {
    setOpenSections((prev) =>
      prev.includes(sectionKey) ? prev : [...prev, sectionKey]
    )
  }

  /**
   * @param {string} label
   * @param {unknown} validationStatus
   */
  const notifyIndicatorSaved = (label, validationStatus) => {
    if (validationStatus === "confirmed") {
      toast({
        title: `${label} guardado`,
        description:
          "Indicadores confirmados. Podés seguir cargando documentación.",
      })
    }
  }

  const handleBalanceSaved = (updatedDoc) => {
    const wasPending = isPendingBalanceId(balanceEditor?.doc?.id ?? "")
    const editorId = balanceEditor?.doc?.id

    setDocuments((prev) => {
      const slot = normalizeBalanceSlot(updatedDoc.balanceSlot)
      const withoutEditor =
        wasPending && editorId
          ? prev.balances.filter((item) => item.id !== editorId)
          : prev.balances
      const withoutSlotDup =
        slot != null
          ? withoutEditor.filter(
              (item) =>
                item.id === updatedDoc.id ||
                normalizeBalanceSlot(item.balanceSlot) !== slot
            )
          : withoutEditor

      const exists = withoutSlotDup.some((item) => item.id === updatedDoc.id)
      return {
        ...prev,
        balances: exists
          ? withoutSlotDup.map((item) =>
              item.id === updatedDoc.id ? { ...item, ...updatedDoc } : item
            )
          : [...withoutSlotDup, updatedDoc],
      }
    })
    setBalanceEditor({
      doc: updatedDoc,
      file: balanceEditor?.file ?? null,
      fileKind: balanceEditor?.fileKind ?? "other",
      isPending: false,
    })
    notifyIndicatorSaved("Balance", updatedDoc.validationStatus)
  }

  const handleIvaSaved = (updatedDoc) => {
    const wasPending = isPendingFiscalId(ivaEditor?.doc?.id ?? "", "iva")
    const editorId = ivaEditor?.doc?.id

    setDocuments((prev) => {
      const withoutPending =
        wasPending && editorId
          ? prev.iva.filter((item) => item.id !== editorId)
          : prev.iva
      const exists = withoutPending.some((item) => item.id === updatedDoc.id)

      return {
        ...prev,
        iva: exists
          ? withoutPending.map((item) =>
              item.id === updatedDoc.id ? { ...item, ...updatedDoc } : item
            )
          : [...withoutPending, updatedDoc],
      }
    })
    setIvaEditor({
      doc: updatedDoc,
      file: ivaEditor?.file ?? null,
      fileKind: ivaEditor?.fileKind ?? "other",
      isPending: false,
    })
    notifyIndicatorSaved("IVA", updatedDoc.validationStatus)
  }

  const handleIibbSaved = (updatedDoc) => {
    const wasPending = isPendingFiscalId(iibbEditor?.doc?.id ?? "", "iibb")
    const editorId = iibbEditor?.doc?.id

    setDocuments((prev) => {
      const withoutPending =
        wasPending && editorId
          ? prev.iibb.filter((item) => item.id !== editorId)
          : prev.iibb
      const exists = withoutPending.some((item) => item.id === updatedDoc.id)

      return {
        ...prev,
        iibb: exists
          ? withoutPending.map((item) =>
              item.id === updatedDoc.id ? { ...item, ...updatedDoc } : item
            )
          : [...withoutPending, updatedDoc],
      }
    })
    setIibbEditor({
      doc: updatedDoc,
      file: iibbEditor?.file ?? null,
      fileKind: iibbEditor?.fileKind ?? "other",
      isPending: false,
    })
    notifyIndicatorSaved("IIBB", updatedDoc.validationStatus)
  }

  /**
   * @param {typeof FINANCIAL_DOCUMENT_TYPES[keyof typeof FINANCIAL_DOCUMENT_TYPES]} sectionKey
   * @param {Record<string, unknown> & { id: string }} documentItem
   */
  const handleDeleteDocument = async (sectionKey, documentItem) => {
    const nombre = String(documentItem.nombre ?? documentItem.id)
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) {
      return
    }

    const pending = isPendingDocId(sectionKey, documentItem.id)

    if (!pending) {
      try {
        await deleteDoc(
          doc(db, "empresas", cuit, sectionKey, documentItem.id)
        )
      } catch (error) {
        console.error("Error eliminando documento:", error)
        setValidationMessage("No se pudo eliminar el documento.")
        return
      }
    }

    setDocuments((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].filter(
        (item) => item.id !== documentItem.id
      ),
    }))

    if (balanceEditor?.doc?.id === documentItem.id) {
      setBalanceEditor(null)
    }
    if (ivaEditor?.doc?.id === documentItem.id) {
      setIvaEditor(null)
    }
    if (iibbEditor?.doc?.id === documentItem.id) {
      setIibbEditor(null)
    }
  }

  const handleFilesSelected = async (tipoDocumento, fileList) => {
    if (!fileList?.length) {
      return
    }

    setValidationMessage("")
    ensureSectionOpen(tipoDocumento)

    for (const file of Array.from(fileList)) {
      const trackingId = `${tipoDocumento}-${Date.now()}-${file.name}`

      setFileStatuses((prev) => ({
        ...prev,
        [trackingId]: {
          status: "uploading",
          nombre: file.name,
        },
      }))

      try {
        if (
          tipoDocumento === FINANCIAL_DOCUMENT_TYPES.BALANCES &&
          !BALANCES_STORAGE_ENABLED
        ) {
          setBalancePendingFile({
            file,
            fileKind: getFileKind(file.name),
          })
          setFileStatuses((prev) => ({
            ...prev,
            [trackingId]: {
              status: "success",
              nombre: file.name,
              message:
                "Leyendo balance en el formulario debajo. Revise y confirme los valores.",
            },
          }))
          setOpenSections((prev) =>
            prev.includes(FINANCIAL_DOCUMENT_TYPES.BALANCES)
              ? prev
              : [...prev, FINANCIAL_DOCUMENT_TYPES.BALANCES]
          )
          continue
        }

        if (
          tipoDocumento === FINANCIAL_DOCUMENT_TYPES.IVA &&
          !IVA_STORAGE_ENABLED
        ) {
          const periodo = inferPeriodoFromFileName(file.name)
          const pendingDoc = buildPendingFiscalDoc(file.name, periodo, "iva")

          setIvaEditor({
            doc: pendingDoc,
            file,
            fileKind: getFileKind(file.name),
            isPending: true,
          })

          setFileStatuses((prev) => ({
            ...prev,
            [trackingId]: {
              status: "success",
              nombre: file.name,
              message: "Completá y guardá los indicadores de IVA.",
            },
          }))
          continue
        }

        if (
          tipoDocumento === FINANCIAL_DOCUMENT_TYPES.IIBB &&
          !IIBB_STORAGE_ENABLED
        ) {
          const periodo = inferPeriodoFromFileName(file.name)
          const pendingDoc = buildPendingFiscalDoc(file.name, periodo, "iibb")

          setIibbEditor({
            doc: pendingDoc,
            file,
            fileKind: getFileKind(file.name),
            isPending: true,
          })

          setFileStatuses((prev) => ({
            ...prev,
            [trackingId]: {
              status: "success",
              nombre: file.name,
              message: "Completá y guardá los indicadores de IIBB.",
            },
          }))
          continue
        }

        const saved = await uploadFinancialDocument({
          cuit,
          file,
          tipoDocumento,
          usuario,
        })

        setDocuments((prev) => {
          const list = prev[tipoDocumento] ?? []
          if (list.some((item) => item.id === saved.id)) {
            return {
              ...prev,
              [tipoDocumento]: list.map((item) =>
                item.id === saved.id ? { ...item, ...saved } : item
              ),
            }
          }
          return {
            ...prev,
            [tipoDocumento]: [...list, saved],
          }
        })

        if (tipoDocumento === FINANCIAL_DOCUMENT_TYPES.BALANCES) {
          setBalanceEditor({
            doc: saved,
            file,
            fileKind: getFileKind(file.name),
            isPending: false,
          })
        }

        if (tipoDocumento === FINANCIAL_DOCUMENT_TYPES.IVA) {
          setIvaEditor({
            doc: saved,
            file,
            fileKind: getFileKind(file.name),
            isPending: false,
          })
        }

        if (tipoDocumento === FINANCIAL_DOCUMENT_TYPES.IIBB) {
          setIibbEditor({
            doc: saved,
            file,
            fileKind: getFileKind(file.name),
            isPending: false,
          })
        }

        setFileStatuses((prev) => ({
          ...prev,
          [trackingId]: {
            status: "success",
            nombre: file.name,
          },
        }))
      } catch (error) {
        console.error("Error subiendo archivo:", error)
        setFileStatuses((prev) => ({
          ...prev,
          [trackingId]: {
            status: "error",
            nombre: file.name,
            message:
              error instanceof Error
                ? error.message
                : "No se pudo subir el archivo.",
          },
        }))
      }
    }
  }

  const handleContinue = async () => {
    setValidationMessage("")

    if (!hasMinimumDocs) {
      const missing = []
      if (documents.balances.length === 0) {
        missing.push("al menos 1 balance")
      }
      if (documents.iva.length === 0) {
        missing.push("al menos 1 declaración de IVA")
      }
      if (documents.iibb.length === 0) {
        missing.push("al menos 1 declaración de IIBB")
      }

      setValidationMessage(
        `Completá la documentación obligatoria: ${missing.join(", ")}.`
      )
      return
    }

    setContinuing(true)
    try {
      router.push(`/dashboard/analysis/${cuit}`)
    } finally {
      setContinuing(false)
    }
  }

  const recentStatuses = Object.entries(fileStatuses)
    .filter(([, value]) => value.status === "uploading" || value.status === "error")
    .slice(-3)

  /**
   * @param {typeof FINANCIAL_DOCUMENT_TYPES[keyof typeof FINANCIAL_DOCUMENT_TYPES]} sectionKey
   * @param {Record<string, unknown>} documentItem
   */
  const getDocStatus = (sectionKey, documentItem) => {
    const confirmed =
      sectionKey === FINANCIAL_DOCUMENT_TYPES.BALANCES
        ? hasConfirmedBalanceIndicators(documentItem)
        : sectionKey === FINANCIAL_DOCUMENT_TYPES.IVA
          ? hasConfirmedIvaIndicators(documentItem)
          : hasConfirmedIibbIndicators(documentItem)

    return confirmed
      ? { label: "Cargado", tone: /** @type {const} */ ("success") }
      : { label: "Pendiente", tone: /** @type {const} */ ("warning") }
  }

  /**
   * @param {typeof FINANCIAL_DOCUMENT_TYPES[keyof typeof FINANCIAL_DOCUMENT_TYPES]} sectionKey
   * @param {Record<string, unknown> & { id: string }} documentItem
   */
  const handleEditDoc = (sectionKey, documentItem) => {
    ensureSectionOpen(sectionKey)
    const fileKind = getFileKind(String(documentItem.nombre ?? ""))
    if (sectionKey === FINANCIAL_DOCUMENT_TYPES.BALANCES) {
      setBalanceEditor({ doc: documentItem, file: null, fileKind })
    }
    if (sectionKey === FINANCIAL_DOCUMENT_TYPES.IVA) {
      setIvaEditor({ doc: documentItem, file: null, fileKind })
    }
    if (sectionKey === FINANCIAL_DOCUMENT_TYPES.IIBB) {
      setIibbEditor({ doc: documentItem, file: null, fileKind })
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="w-full px-4 py-3 lg:px-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-3 py-3 mb-2 border-b border-border">
          <div className="min-w-0 flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tight truncate">
              Carga documental
            </h1>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {cuit}
            </span>
          </div>
          <UploadButton variant="nav" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver
          </UploadButton>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          <div className="lg:col-span-8 space-y-2">
            <Accordion
              type="multiple"
              value={openSections}
              onValueChange={setOpenSections}
              className="space-y-0"
            >
              <DocumentUploadSection
                section={SECTION_BALANCES}
                documents={documents.balances}
                latestPeriodLabel={formatLatestBalancePeriod(documents.balances)}
                loading={loadingDocs}
                editButtonLabel="Editar indicadores"
                onFilesSelected={(files) =>
                  handleFilesSelected(SECTION_BALANCES.key, files)
                }
                onEdit={(documentItem) =>
                  handleEditDoc(SECTION_BALANCES.key, documentItem)
                }
                onDelete={(documentItem) =>
                  handleDeleteDocument(SECTION_BALANCES.key, documentItem)
                }
                getDocStatus={(documentItem) =>
                  getDocStatus(SECTION_BALANCES.key, documentItem)
                }
                onEditLatest={() => {
                  const latest = getLatestDocument(documents.balances)
                  if (latest) {
                    handleEditDoc(SECTION_BALANCES.key, latest)
                  }
                }}
              >
                <div className="rounded-lg border border-red-500/20 bg-muted/80 overflow-hidden">
                  <div className="px-2.5 py-1.5 border-b border-red-500/15 bg-red-500/[0.05] flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-foreground">
                      Balance contable (2 ejercicios)
                    </p>
                    {!hasConfirmedBalance && (
                      <span className="text-[10px] text-yellow-400">
                        Pendiente
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <BalancePairPanel
                      cuit={cuit}
                      balanceContable={documents.balanceContable}
                      usuario={usuario}
                      tipoEmpresa={tipoEmpresa}
                      coeficienteEmpresa={coeficienteEmpresa}
                      sourceFile={
                        balanceEditor?.file ?? balancePendingFile?.file ?? null
                      }
                      fileKind={
                        balanceEditor?.fileKind ??
                        balancePendingFile?.fileKind ??
                        "other"
                      }
                      onSaved={loadDocuments}
                    />
                  </div>
                </div>
              </DocumentUploadSection>
            </Accordion>

            <Accordion
              type="multiple"
              value={openSections}
              onValueChange={setOpenSections}
              className="space-y-0"
            >
              <DocumentUploadSection
                section={SECTION_IVA}
                documents={documents.iva}
                latestPeriodLabel={formatLatestFiscalPeriod(documents.iva)}
                loading={loadingDocs}
                onFilesSelected={(files) =>
                  handleFilesSelected(SECTION_IVA.key, files)
                }
                onEdit={(documentItem) =>
                  handleEditDoc(SECTION_IVA.key, documentItem)
                }
                onDelete={(documentItem) =>
                  handleDeleteDocument(SECTION_IVA.key, documentItem)
                }
                getDocStatus={(documentItem) =>
                  getDocStatus(SECTION_IVA.key, documentItem)
                }
              >
                {ivaEditor && (
                  <IvaIndicatorsForm
                    cuit={cuit}
                    ivaDoc={ivaEditor.doc}
                    sourceFile={ivaEditor.file}
                    fileKind={ivaEditor.fileKind}
                    tipoEmpresa={tipoEmpresa || undefined}
                    coeficiente={coeficienteEmpresa}
                    usuario={usuario}
                    storageDisabled={!IVA_STORAGE_ENABLED}
                    compact
                    onSaved={handleIvaSaved}
                    onCancel={() => setIvaEditor(null)}
                  />
                )}
              </DocumentUploadSection>

              <DocumentUploadSection
                section={SECTION_IIBB}
                documents={documents.iibb}
                latestPeriodLabel={formatLatestFiscalPeriod(documents.iibb)}
                loading={loadingDocs}
                onFilesSelected={(files) =>
                  handleFilesSelected(SECTION_IIBB.key, files)
                }
                onEdit={(documentItem) =>
                  handleEditDoc(SECTION_IIBB.key, documentItem)
                }
                onDelete={(documentItem) =>
                  handleDeleteDocument(SECTION_IIBB.key, documentItem)
                }
                getDocStatus={(documentItem) =>
                  getDocStatus(SECTION_IIBB.key, documentItem)
                }
              >
                {iibbEditor && (
                  <IibbIndicatorsForm
                    cuit={cuit}
                    iibbDoc={iibbEditor.doc}
                    sourceFile={iibbEditor.file}
                    fileKind={iibbEditor.fileKind}
                    usuario={usuario}
                    storageDisabled={!IIBB_STORAGE_ENABLED}
                    compact
                    onSaved={handleIibbSaved}
                    onCancel={() => setIibbEditor(null)}
                  />
                )}
              </DocumentUploadSection>

              <NosisUploadPanel
                cuit={cuit}
                nosisDocs={documents.nosis}
                usuario={usuario}
                onUpdated={loadDocuments}
              />
            </Accordion>

            {recentStatuses.length > 0 && (
              <div className="rounded-md border border-border bg-background/30 px-2.5 py-1.5 space-y-0.5">
                {recentStatuses.map(([id, item]) => (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="truncate text-muted-foreground">{item.nombre}</span>
                    {item.status === "uploading" && (
                      <span className="text-yellow-400 shrink-0 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Subiendo
                      </span>
                    )}
                    {item.status === "error" && (
                      <span className="text-red-400 shrink-0 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Error
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-border bg-muted px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                {validationMessage ? (
                  <p className="text-[11px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {validationMessage}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Mínimo: 1 balance, 1 IVA, 1 IIBB
                  </p>
                )}
              </div>
              <UploadButton
                variant="nav"
                disabled={continuing}
                onClick={handleContinue}
                className="shrink-0"
              >
                {continuing ? (
                  "Procesando..."
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5" />
                    Continuar análisis
                  </>
                )}
              </UploadButton>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-3 space-y-2">
              <div className="rounded-lg border border-border bg-muted px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  CUIT
                </p>
                <p className="text-lg font-black tabular-nums leading-tight">
                  {cuit}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasMinimumDocs ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {hasMinimumDocs ? "Mínimo completo" : "Incompleto"}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted px-3 py-2.5">
                <p className="text-xs font-bold mb-2">Estado documental</p>
                <div className="space-y-1">
                  {estadoDocumentalItems
                    .filter((item) => !item.optional || item.confirmed)
                    .map((item) => (
                      <div
                        key={item.label}
                        className="rounded border border-border bg-muted px-2 py-1 space-y-0.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] text-muted-foreground">
                            {item.label}
                            {item.optional && !item.confirmed && (
                              <span className="text-muted-foreground ml-0.5">(opc.)</span>
                            )}
                          </span>
                          <span
                            className={`text-[10px] tabular-nums shrink-0 ${documentalToneClass[item.tone]}`}
                          >
                            {item.confirmed && (
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1 align-middle"
                                aria-hidden="true"
                              />
                            )}
                            {item.status}
                            {item.vigencyEmoji ? ` ${item.vigencyEmoji}` : ""}
                          </span>
                        </div>
                        {item.subtitle && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <EmpresaWebsiteCard
                cuit={cuit}
                empresa={empresa}
                onUpdated={handleEmpresaWebsiteSaved}
              />

              <div className="rounded-lg border border-border bg-muted px-3 py-2.5">
                <p className="text-xs font-bold mb-2">Documentación requerida</p>
                <ul className="space-y-1 text-[11px]">
                  <ReqLine
                    ok={hasBalanceContableIndicators(documents.balanceContable)}
                    label="Balance contable"
                  />
                  <ReqLine ok={documents.iva.length > 0} label={`IVA (${documents.iva.length})`} />
                  <ReqLine
                    ok={documents.iibb.length > 0}
                    label={`IIBB (${documents.iibb.length})`}
                  />
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function ReqLine({ ok, label }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={ok ? "text-green-400" : "text-muted-foreground"}>
        {ok ? "✓" : "—"}
      </span>
    </li>
  )
}
