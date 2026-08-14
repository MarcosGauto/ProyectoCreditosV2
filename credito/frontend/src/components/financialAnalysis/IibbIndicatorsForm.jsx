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
import { parseBalanceAmount, formatBalanceSummaryAmount } from "@/lib/balanceFinancialSummary"
import {
  DEFAULT_IIBB_ALICUOTA,
  iibbDocToFormValues,
  getIibbValidationBadge,
  resolveIibbComputedValues,
  parseAlicuotaPercent,
} from "@/lib/iibbIndicators"
import { parseIibbExcelFile } from "@/lib/parseIibbExcel"
import { saveIibbIndicators } from "@/lib/saveIibbIndicators"
import { FISCAL_NO_ATTACHMENT_BADGE } from "@/lib/fiscalLocalUpload"

/** Permite decimales en alícuota (ej. 2.75, 3.5, 5). */
function sanitizeAlicuotaInput(input) {
  let cleaned = input.replace(/[^\d.,]/g, "").replace(",", ".")
  const parts = cleaned.split(".")
  if (parts.length > 2) {
    cleaned = `${parts[0]}.${parts.slice(1).join("")}`
  }
  return cleaned
}

/**
 * @param {{
 *   cuit: string;
 *   iibbDoc: Record<string, unknown> & { id: string };
 *   sourceFile?: File | null;
 *   fileKind?: "excel" | "pdf" | "other";
 *   usuario?: string | null;
 *   onSaved?: (doc: Record<string, unknown>) => void;
 *   onCancel?: () => void;
 *   compact?: boolean;
 *   storageDisabled?: boolean;
 * }} props
 */
export function IibbIndicatorsForm({
  cuit,
  iibbDoc,
  sourceFile = null,
  fileKind = "other",
  usuario = null,
  onSaved,
  onCancel,
  compact = false,
  storageDisabled = false,
}) {
  const [values, setValues] = useState(() => iibbDocToFormValues(iibbDoc))
  const [detectedFields, setDetectedFields] = useState(/** @type {string[]} */ ([]))
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [localStatus, setLocalStatus] = useState(
    String(iibbDoc.validationStatus ?? "draft")
  )

  const validationBadge = getIibbValidationBadge({ validationStatus: localStatus })

  const computed = useMemo(() => resolveIibbComputedValues(values), [values])

  const alicuotaUsed =
    parseAlicuotaPercent(computed.alicuota) ?? DEFAULT_IIBB_ALICUOTA

  const basePreview = parseBalanceAmount(computed.baseImponible)

  useEffect(() => {
    setValues(iibbDocToFormValues(iibbDoc))
    setDetectedFields([])
    setError("")
    setSuccess("")
    setLocalStatus(String(iibbDoc.validationStatus ?? "draft"))
  }, [iibbDoc.id])

  useEffect(() => {
    if (!sourceFile || fileKind !== "excel") {
      return
    }

    let cancelled = false

    const runParse = async () => {
      setParsing(true)
      setError("")
      try {
        const { values: extracted, detected } =
          await parseIibbExcelFile(sourceFile)
        if (cancelled) {
          return
        }

        const merged = resolveIibbComputedValues({
          ...iibbDocToFormValues(iibbDoc),
          ...extracted,
          periodo: String(iibbDoc.periodo ?? extracted.periodo ?? ""),
          alicuota:
            extracted.alicuota ||
            String(DEFAULT_IIBB_ALICUOTA),
        })

        setValues(merged)
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
  }, [sourceFile, fileKind, iibbDoc])

  const resolveIndicatorsSource = () => {
    if (fileKind === "excel" && detectedFields.length > 0) {
      return "excel"
    }
    if (fileKind === "pdf") {
      return "pdf"
    }
    return "manual"
  }

  const markDraftIfConfirmed = () => {
    if (localStatus === "confirmed") {
      setLocalStatus("draft")
    }
  }

  const patchPeriodo = (raw) => {
    setValues((prev) => ({ ...prev, periodo: raw }))
    setSuccess("")
    markDraftIfConfirmed()
  }

  const patchImpuesto = (raw) => {
    setValues((prev) =>
      resolveIibbComputedValues({
        ...prev,
        impuestoDeterminado: raw,
        alicuota: prev.alicuota || String(DEFAULT_IIBB_ALICUOTA),
      })
    )
    setSuccess("")
    markDraftIfConfirmed()
  }

  const patchAlicuota = (raw) => {
    setValues((prev) =>
      resolveIibbComputedValues({
        ...prev,
        alicuota: raw,
      })
    )
    setSuccess("")
    markDraftIfConfirmed()
  }

  const patchJurisdiccion = (raw) => {
    setValues((prev) => ({ ...prev, jurisdiccion: raw }))
    setSuccess("")
    markDraftIfConfirmed()
  }

  const handleSave = async (validationStatus) => {
    const payload = resolveIibbComputedValues(values)

    if (!payload.impuestoDeterminado.trim()) {
      setError("Ingresá el impuesto determinado.")
      return
    }

    if (parseAlicuotaPercent(payload.alicuota) === null) {
      setError("La alícuota debe ser un porcentaje mayor a 0.")
      return
    }

    if (!payload.baseImponible.trim()) {
      setError(
        "No se pudo calcular la base imponible. Verificá impuesto y alícuota."
      )
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const saved = await saveIibbIndicators(cuit, iibbDoc.id, payload, {
        usuario,
        indicatorsSource: resolveIndicatorsSource(),
        validationStatus,
        nombre: String(iibbDoc.nombre ?? "Declaración IIBB"),
      })

      setLocalStatus(validationStatus)
      setSuccess(
        validationStatus === "confirmed"
          ? "Indicadores IIBB confirmados y guardados."
          : "Borrador IIBB guardado."
      )
      onSaved?.({
        ...iibbDoc,
        ...saved,
        validationStatus,
      })
    } catch (saveError) {
      console.error(saveError)
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Error al guardar indicadores IIBB."
      )
    } finally {
      setSaving(false)
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
            Indicadores IIBB
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {String(iibbDoc.nombre ?? "Declaración IIBB")}
          </p>
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

      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        La base imponible se calcula como{" "}
        <span className="text-foreground/80">
          Impuesto ÷ (Alícuota ÷ 100)
        </span>
        . Modificá la alícuota antes de guardar; la base se actualiza al instante.
      </p>

      <div className="mb-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
          Período (AAAAMM)
        </label>
        <Input
          value={values.periodo}
          onChange={(event) =>
            patchPeriodo(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="202403"
          className="h-11 border-border bg-background/40 text-foreground"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            <tr className="border-b border-border hover:bg-accent/40">
              <td className="py-3 pr-4 text-sm text-foreground/80 font-medium whitespace-nowrap">
                Impuesto determinado
              </td>
              <td className="py-2 pl-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <MoneyNumberInput
                    value={values.impuestoDeterminado}
                    onChange={patchImpuesto}
                    placeholder="0"
                    className="h-11 pl-8 text-right text-lg font-semibold tabular-nums border-border bg-background/40 text-foreground"
                  />
                </div>
              </td>
            </tr>

            <tr className="border-b border-border hover:bg-accent/40">
              <td className="py-3 pr-4 text-sm text-foreground/80 font-medium whitespace-nowrap">
                Alícuota IIBB (%)
              </td>
              <td className="py-2 pl-2">
                <div className="relative">
                  <Input
                    inputMode="decimal"
                    value={values.alicuota}
                    onChange={(event) =>
                      patchAlicuota(sanitizeAlicuotaInput(event.target.value))
                    }
                    onBlur={() => {
                      if (!values.alicuota.trim()) {
                        patchAlicuota(String(DEFAULT_IIBB_ALICUOTA))
                      }
                    }}
                    placeholder={String(DEFAULT_IIBB_ALICUOTA)}
                    className="h-11 pr-8 text-right text-lg font-semibold tabular-nums border-border bg-background/40 text-foreground"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  Por defecto {DEFAULT_IIBB_ALICUOTA}% — admite decimales (ej. 2.75, 5)
                </p>
              </td>
            </tr>

            <tr className="border-b border-border bg-muted/30">
              <td className="py-3 pr-4 text-sm text-foreground/80 font-medium whitespace-nowrap">
                Base imponible
                <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                  Calculada
                </span>
              </td>
              <td className="py-2 pl-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <MoneyNumberInput
                    readOnly
                    tabIndex={-1}
                    value={computed.baseImponible}
                    onChange={() => {}}
                    placeholder="—"
                    className="h-11 pl-8 text-right text-lg font-semibold tabular-nums border-border bg-background/60 text-foreground cursor-default"
                  />
                </div>
                {basePreview !== null && values.impuestoDeterminado && (
                  <p className="text-xs text-muted-foreground mt-1 text-right tabular-nums">
                    {formatBalanceSummaryAmount(
                      parseBalanceAmount(values.impuestoDeterminado) ?? 0
                    )}{" "}
                    ÷ ({alicuotaUsed}% ÷ 100) ={" "}
                    {formatBalanceSummaryAmount(basePreview)}
                  </p>
                )}
              </td>
            </tr>

            <tr className="border-b border-border hover:bg-accent/40">
              <td className="py-3 pr-4 text-sm text-foreground/80 font-medium whitespace-nowrap">
                Jurisdicción
                <span className="ml-1 text-xs text-muted-foreground">(opc.)</span>
              </td>
              <td className="py-2 pl-2">
                <Input
                  value={values.jurisdiccion}
                  onChange={(event) => patchJurisdiccion(event.target.value)}
                  placeholder="CABA, BA, etc."
                  className="h-11 border-border bg-background/40 text-foreground"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background/30 px-4 py-3 text-sm text-foreground/80">
        <span className="text-muted-foreground">Alícuota utilizada: </span>
        <span className="font-semibold text-foreground tabular-nums">
          {alicuotaUsed}%
        </span>
        {basePreview !== null && (
          <>
            <span className="text-muted-foreground mx-2">·</span>
            <span className="text-muted-foreground">Base para crédito: </span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatBalanceSummaryAmount(basePreview)}
            </span>
          </>
        )}
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
