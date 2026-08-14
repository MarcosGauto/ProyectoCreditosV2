"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Save,
} from "lucide-react"

import { BalanceExcelPrequalificationSection } from "@/components/financialAnalysis/BalanceExcelPrequalificationSection"
import { UploadButton } from "@/components/financialAnalysis/UploadButton"
import { Input } from "@/components/ui/input"
import { MoneyNumberInput } from "@/components/ui/MoneyNumberInput"
import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"
import { parseBalanceFile } from "@/lib/balance/parseBalanceFile"
import { formatMoneyWithSymbol } from "@/lib/money"
import {
  applyDerivedBalanceFields,
  balanceDocToFormValues,
  DEFAULT_MONEDA,
  getValidationStatusBadge,
} from "@/lib/balanceIndicators"
import { computeBalanceIndicatorWarnings } from "@/lib/balanceIndicatorValidations"
import { saveBalanceIndicators } from "@/lib/saveBalanceIndicators"
import {
  BALANCE_SLOT_LABELS,
  normalizeBalanceSlot,
  validateEjercicioNotDuplicated,
} from "@/lib/balancePairModel"
import {
  BALANCE_NO_ATTACHMENT_BADGE,
  hasBalanceAttachment,
} from "@/lib/balanceLocalUpload"
import { BalanceInflationPanel } from "@/components/financialAnalysis/BalanceInflationPanel"
import {
  buildFallbackInflationFactor,
  calculateInflationFactor,
  toYearMonth,
} from "@/lib/inflation/balanceInflation"
import {
  buildManualInflationFactor,
  inflationToManualFormFields,
  isAutomaticInflation,
  parseLocaleDecimalInput,
} from "@/lib/inflation/inflationManualSync"

/** @typedef {"editable" | "computed"} RowKind */

/**
 * @typedef {Object} FormRow
 * @property {string} field
 * @property {string} label
 * @property {RowKind} kind
 * @property {boolean} [optional]
 */

/**
 * @type {Array<{ section: string; rows: FormRow[] }>}
 */
const FORM_SECTIONS = [
  {
    section: "ACTIVO",
    rows: [
      { field: "activoCorriente", label: "Activo Corriente", kind: "editable" },
      { field: "activoNoCorriente", label: "Activo No Corriente", kind: "editable" },
      { field: "totalActivo", label: "Total Activo", kind: "computed" },
    ],
  },
  {
    section: "PASIVO",
    rows: [
      { field: "pasivoCorriente", label: "Pasivo Corriente", kind: "editable" },
      { field: "pasivoNoCorriente", label: "Pasivo No Corriente", kind: "editable" },
      { field: "totalPasivo", label: "Total Pasivo", kind: "computed" },
    ],
  },
  {
    section: "PATRIMONIO",
    rows: [
      { field: "patrimonioNeto", label: "Patrimonio Neto", kind: "computed" },
    ],
  },
  {
    section: "RESULTADOS",
    rows: [
      { field: "ventas", label: "Ventas contables", kind: "editable" },
      { field: "compras", label: "Compras", kind: "editable" },
      { field: "costos", label: "Costos", kind: "editable" },
    ],
  },
]

const MONEY_FIELDS_ALLOW_NEGATIVE = new Set()

const EDITABLE_FIELDS = FORM_SECTIONS.flatMap((section) =>
  section.rows.filter((row) => row.kind === "editable").map((row) => row.field)
)

/**
 * @param {{
 *   field: string;
 *   label: string;
 *   value: string;
 *   onChange: (value: string) => void;
 *   inputRef?: (el: HTMLInputElement | null) => void;
 *   onKeyDown?: (event: import("react").KeyboardEvent<HTMLInputElement>) => void;
 *   warning?: boolean;
 *   optional?: boolean;
 * }} props
 */
function TableCurrencyRow({
  field,
  label,
  value,
  onChange,
  inputRef,
  onKeyDown,
  warning,
  optional,
}) {
  return (
    <tr
      className={`border-b border-border ${
        warning ? "bg-yellow-500/[0.06]" : "hover:bg-accent/40"
      }`}
    >
      <td className="py-3 pr-4 text-sm text-foreground/80 font-medium whitespace-nowrap">
        {label}
        {optional && (
          <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
        )}
      </td>
      <td className="py-2 pl-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            $
          </span>
          <MoneyNumberInput
            inputRef={inputRef}
            data-field={field}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            allowNegative={MONEY_FIELDS_ALLOW_NEGATIVE.has(field)}
            placeholder="0"
            className={`h-11 pl-8 text-right text-lg font-semibold tabular-nums border-border bg-background/40 text-foreground focus-visible:ring-red-500/40 ${
              warning ? "border-yellow-500/40" : ""
            }`}
          />
        </div>
      </td>
    </tr>
  )
}

/**
 * @param {{
 *   label: string;
 *   value: string;
 *   showAutoBadge?: boolean;
 *   valueTone?: "default" | "positive" | "negative";
 *   warning?: boolean;
 * }} props
 */
function ReadonlyCurrencyRow({
  label,
  value,
  showAutoBadge = true,
  valueTone = "default",
  warning,
}) {
  const parsed = parseBalanceAmount(value)
  const toneClass =
    valueTone === "positive"
      ? "text-green-400"
      : valueTone === "negative"
        ? "text-red-400"
        : "text-foreground"

  return (
    <tr
      className={`border-b border-border bg-muted/30 ${
        warning ? "bg-yellow-500/[0.06]" : ""
      }`}
    >
      <td className="py-3 pr-4 align-top">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-foreground/80 font-medium">{label}</span>
          {showAutoBadge && (
            <span className="inline-flex w-fit items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
              Calculado automáticamente
            </span>
          )}
        </div>
      </td>
      <td className="py-2 pl-2">
        <div
          className="h-11 flex items-center justify-end rounded-md border border-border bg-background/25 px-3"
          aria-readonly="true"
        >
          <span className={`text-lg font-semibold tabular-nums ${toneClass}`}>
            {value === "" ? (
              <span className="text-muted-foreground text-base font-normal">—</span>
            ) : (
              formatMoneyWithSymbol(value)
            )}
          </span>
        </div>
        {parsed !== null && valueTone !== "default" && (
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {parsed > 0 ? "Patrimonio positivo" : parsed < 0 ? "Patrimonio negativo" : ""}
          </p>
        )}
      </td>
    </tr>
  )
}

/**
 * @param {{
 *   cuit: string;
 *   balanceDoc: Record<string, unknown> & { id: string };
 *   sourceFile?: File | null;
 *   fileKind?: "excel" | "pdf" | "image" | "other";
 *   usuario?: string | null;
 *   onSaved?: (doc: Record<string, unknown>) => void;
 *   onCancel?: () => void;
 *   compact?: boolean;
 *   storageDisabled?: boolean;
 *   balanceSlot?: "actual" | "anterior" | null;
 *   existingBalances?: unknown[];
 *   embedded?: boolean;
 *   coeficiente?: number | null;
 * }} props
 */
export function BalanceIndicatorsForm({
  cuit,
  balanceDoc,
  sourceFile = null,
  fileKind = "other",
  usuario = null,
  onSaved,
  onCancel,
  compact = false,
  storageDisabled = false,
  balanceSlot = null,
  existingBalances = [],
  embedded = false,
  coeficiente = null,
}) {
  const [values, setValues] = useState(() =>
    applyDerivedBalanceFields(balanceDocToFormValues(balanceDoc))
  )
  const [detectedFields, setDetectedFields] = useState(/** @type {string[]} */ ([]))
  const [parseMethod, setParseMethod] = useState(
    /** @type {"excel" | "parser" | "gemini" | null} */ (null)
  )
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [localStatus, setLocalStatus] = useState(
    String(balanceDoc.validationStatus ?? "draft")
  )
  const [inflation, setInflation] = useState(
    /** @type {import("@/lib/inflation/balanceInflation").InflationFactorResult | null} */ (
      null
    )
  )
  const [inflationLoading, setInflationLoading] = useState(false)
  const [inflationError, setInflationError] = useState("")
  const [manualCoeficienteIpc, setManualCoeficienteIpc] = useState("")

  const inputRefs = useRef(/** @type {(HTMLInputElement | null)[]} */ ([]))
  const manualInflationLockedRef = useRef(false)
  const skipNextAutoFetchRef = useRef(false)

  const derivedValues = useMemo(
    () => applyDerivedBalanceFields(values),
    [values]
  )

  const warnings = useMemo(
    () => computeBalanceIndicatorWarnings(values),
    [values]
  )

  const validationBadge = getValidationStatusBadge({
    validationStatus: localStatus,
  })

  useEffect(() => {
    setValues(applyDerivedBalanceFields(balanceDocToFormValues(balanceDoc)))
    setDetectedFields([])
    setError("")
    setSuccess("")
    setLocalStatus(String(balanceDoc.validationStatus ?? "draft"))

    const storedInflation = /** @type {{ factor?: number; accumulated?: number; manual?: boolean; source?: string; ipcOrigen?: number; ipcDestino?: number }} */ (
      balanceDoc.inflationData
    )
    const isStoredManual =
      storedInflation?.manual === true || storedInflation?.source === "manual"

    const storedFactor =
      storedInflation?.factor != null &&
      Number.isFinite(Number(storedInflation.factor)) &&
      Number(storedInflation.factor) > 0
        ? Number(storedInflation.factor)
        : storedInflation?.accumulated != null &&
            Number.isFinite(Number(storedInflation.accumulated))
          ? Number(storedInflation.accumulated) + 1
          : null

    if (storedFactor != null && storedFactor > 0) {
      const factor = storedFactor
      const accumulated =
        storedInflation?.accumulated != null &&
        Number.isFinite(Number(storedInflation.accumulated))
          ? Number(storedInflation.accumulated)
          : factor - 1
      const restored = {
        factorInflacion: factor,
        accumulated,
        inflacionAcumuladaPct: accumulated * 100,
        ipcOrigen: Number(storedInflation?.ipcOrigen) || null,
        ipcDestino: Number(storedInflation?.ipcDestino) || null,
        fechaIPCOrigen: String(balanceDoc.fechaIPCOrigen ?? ""),
        fechaIPCDestino: String(balanceDoc.fechaIPCDestino ?? ""),
        sourceId: isStoredManual ? "manual" : String(balanceDoc.ipcSource ?? "firestore"),
        manual: isStoredManual,
        fallback: false,
        apiUnavailable: false,
      }
      setInflation(restored)
      const fields = inflationToManualFormFields(restored)
      setManualCoeficienteIpc(fields.coeficienteIpc)
      if (isStoredManual) {
        manualInflationLockedRef.current = true
        skipNextAutoFetchRef.current = true
      }
    } else {
      manualInflationLockedRef.current = false
      skipNextAutoFetchRef.current = false
    }
  }, [balanceDoc.id])

  /**
   * @param {string} fechaCierre
   * @param {boolean} [preferManual]
   */
  const resolveInflationForSave = async (fechaCierre, preferManual = false) => {
    if (preferManual || manualInflationLockedRef.current) {
      const factor = parseLocaleDecimalInput(manualCoeficienteIpc)
      return buildManualInflationFactor({
        factor: factor ?? inflation?.factorInflacion ?? 1,
        fechaIPCOrigen: toYearMonth(fechaCierre),
        fechaIPCDestino: toYearMonth(new Date()),
      })
    }

    try {
      const result = await calculateInflationFactor(fechaCierre)
      if (isAutomaticInflation(result)) {
        return result
      }
      return buildFallbackInflationFactor(
        toYearMonth(fechaCierre),
        toYearMonth(new Date()),
        result.warningMessage ??
          "No hay índice IPC disponible para las fechas indicadas."
      )
    } catch (ipcError) {
      console.error(ipcError)
      return buildFallbackInflationFactor(
        toYearMonth(fechaCierre),
        toYearMonth(new Date()),
        "No hay índice IPC disponible para las fechas indicadas."
      )
    }
  }

  /**
   * @param {import("@/lib/inflation/balanceInflation").InflationFactorResult} result
   */
  const applyInflationState = (result) => {
    setInflation(result)
    const fields = inflationToManualFormFields(result)
    setManualCoeficienteIpc(fields.coeficienteIpc)

    if (isAutomaticInflation(result)) {
      manualInflationLockedRef.current = false
      setInflationError("")
      return
    }

    manualInflationLockedRef.current = true
    setInflationError(
      result.warningMessage ??
        "No hay índice IPC disponible para las fechas indicadas."
    )
  }

  /**
   * @param {string} fechaCierre
   * @param {{ force?: boolean }} [options]
   */
  const fetchInflationFromApi = async (fechaCierre, { force = false } = {}) => {
    if (!fechaCierre) {
      setInflation(null)
      setInflationError("")
      setInflationLoading(false)
      return null
    }

    if (!force && manualInflationLockedRef.current) {
      return inflation
    }

    setInflationLoading(true)
    setInflationError("")

    try {
      const result = await resolveInflationForSave(fechaCierre, false)
      applyInflationState(result)
      return result
    } finally {
      setInflationLoading(false)
    }
  }

  useEffect(() => {
    if (!values.fechaCierre) {
      setInflation(null)
      setInflationError("")
      setInflationLoading(false)
      return
    }

    if (skipNextAutoFetchRef.current) {
      skipNextAutoFetchRef.current = false
      return
    }

    manualInflationLockedRef.current = false

    let cancelled = false

    const run = async () => {
      await fetchInflationFromApi(values.fechaCierre)
      if (cancelled) {
        return
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [values.fechaCierre])

  const applyManualCoeficienteIpc = (rawCoef) => {
    setManualCoeficienteIpc(rawCoef)
    manualInflationLockedRef.current = true
    const factor = parseLocaleDecimalInput(rawCoef)
    if (factor == null || factor <= 0) {
      return
    }
    const manual = buildManualInflationFactor({
      factor,
      fechaIPCOrigen: toYearMonth(values.fechaCierre),
      fechaIPCDestino: toYearMonth(new Date()),
    })
    setInflation(manual)
    setInflationError("")
  }

  const handleRecalculateIpc = () => {
    manualInflationLockedRef.current = false
    skipNextAutoFetchRef.current = false
    void fetchInflationFromApi(values.fechaCierre, { force: true })
  }

  useEffect(() => {
    if (!sourceFile || fileKind === "other") {
      return
    }

    let cancelled = false

    const runParse = async () => {
      setParsing(true)
      setError("")
      try {
        const result = await parseBalanceFile(sourceFile, { target: "single" })

        if (cancelled) {
          return
        }

        if (result.error) {
          setError(result.error)
          return
        }

        if (Object.keys(result.values).length > 0) {
          setValues((prev) => {
            const periodo =
              prev.periodo ||
              result.values.periodo ||
              String(balanceDoc.periodo ?? "")
            const ejercicio =
              prev.ejercicio ||
              result.values.ejercicio ||
              (periodo.length >= 4 ? periodo.slice(0, 4) : "")
            return applyDerivedBalanceFields({
              ...prev,
              ...result.values,
              ejercicio,
              periodo,
              moneda: prev.moneda || result.values.moneda || DEFAULT_MONEDA,
            })
          })
          setDetectedFields(result.detected)
          setParseMethod(result.method)
          setLocalStatus("draft")
        }

        if (result.warning) {
          setError(result.warning)
        }
      } catch (parseError) {
        console.error(parseError)
        if (!cancelled) {
          setError(
            "No se pudo leer el archivo automáticamente. Completá los campos manualmente."
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
  }, [sourceFile, fileKind, balanceDoc.periodo])

  const patch = (field, raw) => {
    setValues((prev) => {
      if (field === "ejercicio") {
        const year = String(raw).replace(/\D/g, "").slice(0, 4)
        return {
          ...prev,
          ejercicio: year,
          periodo: year.length === 4 ? `${year}12` : prev.periodo,
        }
      }
      if (field === "fechaCierre") {
        manualInflationLockedRef.current = false
        skipNextAutoFetchRef.current = false
      }
      return { ...prev, [field]: raw }
    })
    setSuccess("")
    if (localStatus === "confirmed") {
      setLocalStatus("draft")
    }
  }

  const resolveIndicatorsSource = () => {
    if (fileKind === "excel" && detectedFields.length > 0) {
      return "excel"
    }
    if ((fileKind === "pdf" || fileKind === "image") && detectedFields.length > 0) {
      return parseMethod === "gemini" ? "pdf" : "pdf"
    }
    if (fileKind === "pdf" || fileKind === "image") {
      return "pdf"
    }
    return "manual"
  }

  /**
   * @param {"draft" | "confirmed"} validationStatus
   */
  const handleSave = async (validationStatus) => {
    setSaving(true)
    setError("")
    setSuccess("")

    const payload = applyDerivedBalanceFields(values)
    const slot = normalizeBalanceSlot(
      balanceSlot ?? balanceDoc.balanceSlot ?? balanceDoc.balance_slot
    )

    if (slot) {
      const ejercicioError = validateEjercicioNotDuplicated(
        payload.ejercicio || payload.periodo,
        slot,
        existingBalances,
        balanceDoc.id
      )
      if (ejercicioError) {
        setError(ejercicioError)
        setSaving(false)
        return
      }
    }

    try {
      let inflationToSave = inflation
      if (payload.fechaCierre?.trim()) {
        inflationToSave = await resolveInflationForSave(
          payload.fechaCierre,
          manualInflationLockedRef.current
        )
        applyInflationState(inflationToSave)
      }

      const saved = await saveBalanceIndicators(cuit, balanceDoc.id, payload, {
        usuario,
        indicatorsSource: resolveIndicatorsSource(),
        validationStatus,
        nombre: String(
          balanceDoc.nombre ??
            (slot ? BALANCE_SLOT_LABELS[slot] : "Balance")
        ),
        inflation: inflationToSave,
        balanceSlot: slot,
        existingBalances,
      })

      setLocalStatus(validationStatus)
      setSuccess(
        validationStatus === "confirmed"
          ? "Indicadores confirmados y guardados."
          : "Borrador guardado. Podés confirmar cuando termines la revisión."
      )
      onSaved?.({
        ...balanceDoc,
        ...saved,
        validationStatus,
      })
    } catch (saveError) {
      console.error(saveError)
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Error al guardar los indicadores."
      )
    } finally {
      setSaving(false)
    }
  }

  const allInputFields = [
    "ejercicio",
    "fechaCierre",
    "moneda",
    ...EDITABLE_FIELDS,
  ]

  /**
   * @param {number} index
   * @param {import("react").KeyboardEvent<HTMLInputElement>} event
   */
  const handleTabNavigation = (index, event) => {
    if (event.key !== "Enter") {
      return
    }
    event.preventDefault()
    const next = inputRefs.current[index + 1]
    next?.focus()
  }

  const fileName = String(balanceDoc.nombre ?? "Balance")
  const warningIds = new Set(warnings.map((item) => item.id))

  const patrimonioParsed = parseBalanceAmount(derivedValues.patrimonioNeto)
  const patrimonioTone =
    patrimonioParsed === null
      ? "default"
      : patrimonioParsed > 0
        ? "positive"
        : patrimonioParsed < 0
          ? "negative"
          : "default"

  const slotLabel = balanceSlot
    ? BALANCE_SLOT_LABELS[balanceSlot]
    : null

  return (
    <div
      className={`${
        embedded
          ? ""
          : "rounded-3xl border border-border bg-gradient-to-b from-card to-muted shadow-2xl"
      } ${compact ? "p-5" : embedded ? "p-4" : "p-8"}`}
    >
      {!embedded && (
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-1">
            Planilla de análisis
          </p>
          <h3 className="text-2xl font-black text-foreground">
            {slotLabel ?? "Indicadores Financieros"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 truncate max-w-md">
            {fileName}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Totales y patrimonio se calculan solos. Enter avanza al siguiente campo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {validationBadge && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${validationBadge.className}`}
            >
              {localStatus === "confirmed" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {validationBadge.label}
            </span>
          )}
          {(storageDisabled || !hasBalanceAttachment(balanceDoc)) && (
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${BALANCE_NO_ATTACHMENT_BADGE.className}`}
            >
              {BALANCE_NO_ATTACHMENT_BADGE.label}
            </span>
          )}
        </div>
      </div>
      )}

      {(fileKind === "excel" || fileKind === "pdf" || fileKind === "image") &&
        parsing && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-background/20 px-4 py-3 text-sm text-foreground/80">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {fileKind === "excel"
            ? "Detectando indicadores desde Excel..."
            : parseMethod === "gemini" || fileKind === "image"
              ? "Procesando balance con IA..."
              : "Detectando cuentas del balance..."}
        </div>
      )}

      {(fileKind === "excel" || fileKind === "pdf" || fileKind === "image") &&
        !parsing &&
        detectedFields.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300">
          <FileSpreadsheet className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Valores iniciales detectados
            {parseMethod === "gemini" ? " (IA)" : ""}:{" "}
            <strong>{detectedFields.join(", ")}</strong>. Podés sobrescribir
            cualquier campo editable.
          </span>
        </div>
      )}

      {(fileKind === "pdf" || fileKind === "image") &&
        !parsing &&
        detectedFields.length === 0 &&
        !error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-200">
          <FileText className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            No se detectaron cuentas automáticamente. Completá los indicadores
            manualmente o reintentá con otro archivo.
          </span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mb-4 space-y-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-yellow-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Advertencias de consistencia (no bloquean el guardado)
          </p>
          <ul className="text-sm text-yellow-200/90 space-y-1 list-disc pl-5">
            {warnings.map((item) => (
              <li key={item.id}>{item.message}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[320px] border-collapse">
          <thead>
            <tr className="bg-background/30 border-b border-border">
              <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Concepto
              </th>
              <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Importe ({values.moneda || DEFAULT_MONEDA})
              </th>
            </tr>
          </thead>
          <tbody className="px-2">
            <tr>
              <td
                colSpan={2}
                className="pt-4 pb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                Datos generales
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-3 pr-4 text-sm text-foreground/80">Ejercicio</td>
              <td className="py-2 pl-2">
                <Input
                  ref={(el) => {
                    inputRefs.current[0] = el
                  }}
                  inputMode="numeric"
                  maxLength={4}
                  value={values.ejercicio}
                  onChange={(e) => patch("ejercicio", e.target.value)}
                  onKeyDown={(e) => handleTabNavigation(0, e)}
                  placeholder="2024"
                  className="h-11 border-border bg-background/40 text-foreground"
                />
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-3 pr-4 text-sm text-foreground/80">
                Fecha de cierre
              </td>
              <td className="py-2 pl-2">
                <Input
                  ref={(el) => {
                    inputRefs.current[1] = el
                  }}
                  type="date"
                  value={values.fechaCierre}
                  onChange={(e) => patch("fechaCierre", e.target.value)}
                  onKeyDown={(e) => handleTabNavigation(1, e)}
                  className="h-11 border-border bg-background/40 text-foreground"
                />
                {values.fechaCierre && (
                  <BalanceInflationPanel
                    inflation={inflation}
                    inflationLoading={inflationLoading}
                    inflationError={inflationError}
                    manualCoeficienteIpc={manualCoeficienteIpc}
                    onManualCoeficienteIpcChange={applyManualCoeficienteIpc}
                    onRecalculate={handleRecalculateIpc}
                    recalculateDisabled={!values.fechaCierre}
                  />
                )}
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-3 pr-4 text-sm text-foreground/80">Moneda</td>
              <td className="py-2 pl-2">
                <Input
                  ref={(el) => {
                    inputRefs.current[2] = el
                  }}
                  value={values.moneda}
                  onChange={(e) => patch("moneda", e.target.value)}
                  onKeyDown={(e) => handleTabNavigation(2, e)}
                  className="h-11 border-border bg-background/40 text-foreground"
                />
              </td>
            </tr>

            {FORM_SECTIONS.map(({ section, rows }) => (
              <Fragment key={section}>
                <tr>
                  <td
                    colSpan={2}
                    className="pt-6 pb-2 text-xs font-bold uppercase tracking-widest text-red-400/90"
                  >
                    {section}
                  </td>
                </tr>
                {rows.map((row) => {
                  if (row.kind === "computed") {
                    const isPatrimonio = row.field === "patrimonioNeto"
                    return (
                      <ReadonlyCurrencyRow
                        key={row.field}
                        label={row.label}
                        value={derivedValues[row.field]}
                        showAutoBadge
                        valueTone={isPatrimonio ? patrimonioTone : "default"}
                        warning={
                          isPatrimonio && warningIds.has("patrimonial")
                        }
                      />
                    )
                  }

                  const currentIndex = allInputFields.indexOf(row.field)

                  return (
                    <TableCurrencyRow
                      key={row.field}
                      field={row.field}
                      label={row.label}
                      value={values[row.field]}
                      onChange={(v) => patch(row.field, v)}
                      optional={row.optional}
                      inputRef={(el) => {
                        inputRefs.current[currentIndex] = el
                      }}
                      onKeyDown={(event) =>
                        handleTabNavigation(currentIndex, event)
                      }
                    />
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <BalanceExcelPrequalificationSection
        ejercicio={values.ejercicio || values.periodo || ""}
        values={derivedValues}
        inflation={inflation}
        inflationLoading={inflationLoading}
        coeficiente={coeficiente}
        storedFactor={
          balanceDoc.inflationData?.factor ??
          balanceDoc.factorActualizacion ??
          balanceDoc.factorInflacion ??
          null
        }
      />

      {(balanceDoc.validatedBy || balanceDoc.updatedAt) && (
        <p className="mt-4 text-xs text-muted-foreground">
          {balanceDoc.validatedBy
            ? `Última validación: ${String(balanceDoc.validatedBy)}`
            : ""}
          {balanceDoc.validatedAt
            ? ` · ${new Date(String(balanceDoc.validatedAt)).toLocaleString("es-AR")}`
            : ""}
        </p>
      )}

      <div className="flex flex-wrap gap-3 justify-end mt-6">
        {onCancel && (
          <UploadButton variant="secondary" size="md" onClick={onCancel}>
            Cerrar
          </UploadButton>
        )}
        <UploadButton
          variant="secondary"
          size="md"
          disabled={saving || parsing}
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
          disabled={saving || parsing}
          onClick={() => handleSave("confirmed")}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Confirmar indicadores
            </>
          )}
        </UploadButton>
      </div>
    </div>
  )
}
