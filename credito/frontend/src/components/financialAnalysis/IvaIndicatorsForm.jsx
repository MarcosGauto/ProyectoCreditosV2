"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Save,
} from "lucide-react"

import { UploadButton } from "@/components/financialAnalysis/UploadButton"
import { Input } from "@/components/ui/input"
import { MoneyNumberInput } from "@/components/ui/MoneyNumberInput"
import {
  applyDerivedIvaFields,
  ivaDocToFormValues,
  getIvaValidationBadge,
} from "@/lib/ivaIndicators"
import { formatMoneyWithSymbol } from "@/lib/money"
import { parseIvaExcelFile } from "@/lib/parseIvaExcel"
import { saveIvaIndicators } from "@/lib/saveIvaIndicators"
import { FISCAL_NO_ATTACHMENT_BADGE } from "@/lib/fiscalLocalUpload"
import { getCoeficienteTipoEmpresa } from "@/lib/scoring/prequalification"

/** @type {Array<{ field: "debitoFiscal" | "creditoFiscal"; label: string }>} */
const EDITABLE_ROWS = [
  { field: "debitoFiscal", label: "Débito fiscal" },
  { field: "creditoFiscal", label: "Crédito fiscal" },
]

/** @type {Array<{ field: keyof import("@/lib/ivaIndicators").IvaIndicatorsFormValues; label: string }>} */
const CALCULATED_ROWS = [
  { field: "saldoTecnico", label: "Saldo técnico" },
  { field: "ventas105", label: "Ventas IVA 10,5%" },
  { field: "ventas21", label: "Ventas IVA 21%" },
  { field: "promedioVentas", label: "Promedio IVA" },
  { field: "creditoAsumible", label: "Crédito asumible IVA" },
]

/**
 * @param {{
 *   cuit: string;
 *   ivaDoc: Record<string, unknown> & { id: string };
 *   sourceFile?: File | null;
 *   fileKind?: "excel" | "pdf" | "other";
 *   usuario?: string | null;
 *   tipoEmpresa?: string | null;
 *   coeficiente?: number | null;
 *   onSaved?: (doc: Record<string, unknown>) => void;
 *   onCancel?: () => void;
 *   compact?: boolean;
 *   storageDisabled?: boolean;
 * }} props
 */
export function IvaIndicatorsForm({
  cuit,
  ivaDoc,
  sourceFile = null,
  fileKind = "other",
  usuario = null,
  tipoEmpresa = null,
  coeficiente: coeficienteProp = null,
  onSaved,
  onCancel,
  compact = false,
  storageDisabled = false,
}) {
  const coeficiente =
    coeficienteProp ?? getCoeficienteTipoEmpresa(tipoEmpresa) ?? null

  const [values, setValues] = useState(() =>
    applyDerivedIvaFields(ivaDocToFormValues(ivaDoc), coeficiente)
  )
  const [detectedFields, setDetectedFields] = useState(/** @type {string[]} */ ([]))
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [localStatus, setLocalStatus] = useState(
    String(ivaDoc.validationStatus ?? "draft")
  )

  const derivedValues = useMemo(
    () => applyDerivedIvaFields(values, coeficiente),
    [values, coeficiente]
  )

  const validationBadge = getIvaValidationBadge({ validationStatus: localStatus })

  useEffect(() => {
    setValues(applyDerivedIvaFields(ivaDocToFormValues(ivaDoc), coeficiente))
    setDetectedFields([])
    setError("")
    setSuccess("")
    setLocalStatus(String(ivaDoc.validationStatus ?? "draft"))
  }, [ivaDoc.id, coeficiente])

  useEffect(() => {
    if (!sourceFile || fileKind !== "excel") {
      return
    }

    let cancelled = false

    const runParse = async () => {
      setParsing(true)
      setError("")
      try {
        const { values: extracted, detected } = await parseIvaExcelFile(sourceFile)
        if (cancelled) {
          return
        }
        setValues((prev) =>
          applyDerivedIvaFields(
            {
              ...prev,
              ...extracted,
              periodo: prev.periodo || String(ivaDoc.periodo ?? ""),
            },
            coeficiente
          )
        )
        setDetectedFields(detected)
        setLocalStatus("draft")
      } catch (parseError) {
        console.error(parseError)
        if (!cancelled) {
          setError(
            "No se pudo leer el Excel automáticamente. Completá los campos manualmente."
          )
        }
      } finally {
        if (!cancelled) {
          setParsing(false)
        }
      }
    }

    runParse()
    return () => {
      cancelled = true
    }
  }, [sourceFile, fileKind, ivaDoc.periodo, coeficiente])

  const resolveIndicatorsSource = () => {
    if (fileKind === "excel" && detectedFields.length > 0) {
      return "excel"
    }
    if (fileKind === "pdf") {
      return "pdf"
    }
    return "manual"
  }

  const handleSave = async (validationStatus) => {
    setSaving(true)
    setError("")
    setSuccess("")

    const payload = applyDerivedIvaFields(values, coeficiente)

    try {
      const saved = await saveIvaIndicators(cuit, ivaDoc.id, payload, {
        usuario,
        indicatorsSource: resolveIndicatorsSource(),
        validationStatus,
        nombre: String(ivaDoc.nombre ?? "Declaración IVA"),
        coeficiente,
      })

      setLocalStatus(validationStatus)
      setSuccess(
        validationStatus === "confirmed"
          ? "Indicadores IVA confirmados y guardados."
          : "Borrador IVA guardado."
      )
      onSaved?.({
        ...ivaDoc,
        ...saved,
        validationStatus,
      })
    } catch (saveError) {
      console.error(saveError)
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Error al guardar indicadores IVA."
      )
    } finally {
      setSaving(false)
    }
  }

  const patch = (field, raw) => {
    setValues((prev) =>
      applyDerivedIvaFields({ ...prev, [field]: raw }, coeficiente)
    )
    setSuccess("")
    if (localStatus === "confirmed") {
      setLocalStatus("draft")
    }
  }

  return (
    <div
      className={`rounded-3xl border border-border bg-muted text-foreground ${
        compact ? "p-5" : "p-8 shadow-card"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h3 className={`font-bold ${compact ? "text-base" : "text-xl"}`}>
            Indicadores IVA
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {String(ivaDoc.nombre ?? "Declaración IVA")}
          </p>
          {coeficiente != null && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Coeficiente empresa:{" "}
              {coeficiente.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {validationBadge && (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${validationBadge.className}`}
            >
              {validationBadge.label}
            </span>
          )}
          {storageDisabled && (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${FISCAL_NO_ATTACHMENT_BADGE.className}`}
            >
              {FISCAL_NO_ATTACHMENT_BADGE.label}
            </span>
          )}
        </div>
      </div>

      {parsing && (
        <p className="text-sm text-muted-foreground flex items-center gap-2 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Leyendo Excel...
        </p>
      )}

      {detectedFields.length > 0 && (
        <p className="text-xs text-green-400/90 mb-4 flex items-center gap-1">
          <FileSpreadsheet className="w-4 h-4" />
          Detectado automáticamente: {detectedFields.join(", ")}
        </p>
      )}

      {fileKind === "pdf" && (
        <p className="text-xs text-muted-foreground mb-4">
          PDF: completá los indicadores manualmente.
        </p>
      )}

      {!coeficiente && (
        <p className="text-xs text-amber-300/90 mb-4 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2">
          Sin tipo de empresa definido: el crédito asumible se calculará cuando
          haya coeficiente en el análisis crediticio.
        </p>
      )}

      <div className="mb-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
          Período (AAAAMM)
        </label>
        <Input
          value={values.periodo}
          onChange={(event) =>
            patch("periodo", event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="202403"
          className="h-11 border-border bg-background/40 text-foreground"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full">
          <tbody>
            {EDITABLE_ROWS.map((row) => (
              <tr
                key={row.field}
                className="border-b border-border hover:bg-accent/40"
              >
                <td className="py-3 pr-4 text-sm text-foreground/80 font-medium whitespace-nowrap">
                  {row.label}
                </td>
                <td className="py-2 pl-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <MoneyNumberInput
                      value={values[row.field]}
                      onChange={(val) => patch(row.field, val)}
                      placeholder="0"
                      className="h-11 pl-8 text-right text-lg font-semibold tabular-nums border-border bg-background/40 text-foreground"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-2xl border border-blue-500/20 bg-info/10 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-300/90 mb-3">
          Indicadores calculados automáticamente
        </p>
        <table className="w-full">
          <tbody>
            {CALCULATED_ROWS.map((row) => (
              <tr
                key={row.field}
                className="border-b border-border last:border-0"
              >
                <td className="py-2.5 pr-4 text-sm text-muted-foreground font-medium whitespace-nowrap">
                  {row.label}
                </td>
                <td className="py-2 pl-2">
                  <div
                    className="h-11 flex items-center justify-end rounded-md border border-border bg-background/25 px-3 opacity-90"
                    aria-readonly="true"
                  >
                    <span className="text-base font-semibold tabular-nums text-blue-100">
                      {formatMoneyWithSymbol(derivedValues[row.field] || "0")}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-muted-foreground mt-3">
          Fórmulas Excel: saldo = débito + crédito · ventas 21% = débito ÷ 0,21
          · ventas 10,5% = débito ÷ 0,105 · promedio IVA = (21% + 10,5%) ÷ 2 ·
          crédito asumible IVA = promedio × coeficiente
          {coeficiente != null
            ? ` (coef. ${coeficiente.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })})`
            : ""}
          .
        </p>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {success && (
        <p className="mt-4 text-sm text-green-400 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          {success}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <UploadButton
          variant="secondary"
          size="md"
          disabled={saving}
          onClick={() => handleSave("draft")}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar borrador
            </>
          )}
        </UploadButton>
        <UploadButton
          variant="primary"
          size="md"
          disabled={saving}
          onClick={() => handleSave("confirmed")}
        >
          <CheckCircle2 className="w-4 h-4" />
          Confirmar indicadores
        </UploadButton>
        {onCancel && (
          <UploadButton variant="secondary" size="md" onClick={onCancel}>
            Cerrar
          </UploadButton>
        )}
      </div>
    </div>
  )
}
