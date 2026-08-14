"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, FileSpreadsheet, FileText, Loader2, Save } from "lucide-react"

import { BalanceInflationPanel } from "@/components/financialAnalysis/BalanceInflationPanel"
import { UploadButton } from "@/components/financialAnalysis/UploadButton"
import { Input } from "@/components/ui/input"
import { MoneyNumberInput } from "@/components/ui/MoneyNumberInput"
import { parseBalanceAmount } from "@/lib/balanceFinancialSummary"
import { DEFAULT_MONEDA, getValidationStatusBadge } from "@/lib/balanceIndicators"
import { computeBalanceIndicatorWarnings } from "@/lib/balanceIndicatorValidations"
import {
  applyDerivedContableFormValues,
  balanceContableLatestEjercicioLegacyDoc,
  balanceContableToFormValues,
  buildContableDocFromFormState,
  computePrequalificationFromContable,
  fieldForColumn,
  getBalanceVisualColumns,
  getColumnInflationFactor,
} from "@/lib/balanceContableModel"
import {
  BALANCE_RESULTADOS_ROWS,
  BALANCE_STRUCTURE_SECTIONS,
} from "@/lib/balanceContableFormConfig"
import {
  formatCoeficienteIpcDisplay,
  formatPrequalTableMoney,
} from "@/lib/balancePrequalificationPreview"
import { formatMoneyWithSymbol } from "@/lib/money"
import { saveBalanceContable } from "@/lib/saveBalanceContable"
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
import { getCoeficienteTipoEmpresa } from "@/lib/scoring/prequalification"
import { parseBalanceFile } from "@/lib/balance/parseBalanceFile"

/**
 * @param {import("@/lib/balanceContableModel").BalanceContableDoc | null | undefined} doc
 * @param {"actual" | "anterior"} column
 */
function inflationFromStoredColumn(doc, column) {
  if (!doc) {
    return null
  }
  const stored =
    column === "actual" ? doc.inflationDataActual : doc.inflationDataAnterior
  const factorNum = getColumnInflationFactor(doc, column)
  if (!stored && factorNum <= 1) {
    return null
  }
  const accumulated =
    stored?.accumulated != null && Number.isFinite(Number(stored.accumulated))
      ? Number(stored.accumulated)
      : factorNum - 1

  return {
    factorInflacion: factorNum,
    accumulated,
    inflacionAcumuladaPct: accumulated * 100,
    ipcOrigen: Number(stored?.ipcOrigen) || null,
    ipcDestino: Number(stored?.ipcDestino) || null,
    fechaIPCOrigen: String(
      column === "actual"
        ? doc.fechaCierreActual ?? ""
        : doc.fechaCierreAnterior ?? ""
    ),
    fechaIPCDestino: toYearMonth(new Date()) ?? "",
    sourceId: stored?.manual ? "manual" : String(stored?.source ?? "firestore"),
    manual: Boolean(stored?.manual || stored?.source === "manual"),
    fallback: false,
    apiUnavailable: false,
  }
}

/**
 * @param {Record<string, string>} derived
 * @param {"actual" | "anterior"} column
 */
function sliceColumnForWarnings(derived, column) {
  const suffix = column === "actual" ? "Actual" : "Anterior"
  return {
    ejercicio: derived[`ejercicio${suffix}`] ?? "",
    periodo: "",
    fechaCierre: derived[`fechaCierre${suffix}`] ?? "",
    moneda: derived.moneda ?? DEFAULT_MONEDA,
    activoCorriente: derived[`activoCorriente${suffix}`] ?? "",
    activoNoCorriente: derived[`activoNoCorriente${suffix}`] ?? "",
    totalActivo: derived[`totalActivo${suffix}`] ?? "",
    pasivoCorriente: derived[`pasivoCorriente${suffix}`] ?? "",
    pasivoNoCorriente: derived[`pasivoNoCorriente${suffix}`] ?? "",
    totalPasivo: derived[`totalPasivo${suffix}`] ?? "",
    patrimonioNeto: derived[`patrimonioNeto${suffix}`] ?? "",
    ventas: derived[`ventas${suffix}`] ?? "",
    compras: derived[`compras${suffix}`] ?? "",
    costos: derived[`costos${suffix}`] ?? "",
    resultadoOperativo: "",
    resultadoNeto: "",
    ebitda: "",
  }
}

/**
 * @param {{
 *   label: string;
 *   valueLeft: string;
 *   valueRight: string;
 *   onChangeLeft: (v: string) => void;
 *   onChangeRight: (v: string) => void;
 *   indent?: boolean;
 * }} props
 */
function DualMoneyRow({
  label,
  valueLeft,
  valueRight,
  onChangeLeft,
  onChangeRight,
  indent = false,
}) {
  return (
    <tr className="border-b border-border hover:bg-accent/40">
      <td
        className={`py-3 pr-4 text-sm text-foreground/80 font-medium whitespace-nowrap ${
          indent ? "pl-8" : ""
        }`}
      >
        {label}
      </td>
      <td className="py-2 px-2">
        <MoneyNumberInput
          value={valueLeft}
          onChange={onChangeLeft}
          className="h-10 text-right border-border bg-background/40 text-foreground tabular-nums"
        />
      </td>
      <td className="py-2 px-2">
        <MoneyNumberInput
          value={valueRight}
          onChange={onChangeRight}
          className="h-10 text-right border-border bg-background/40 text-foreground tabular-nums"
        />
      </td>
    </tr>
  )
}

/**
 * @param {{
 *   label: string;
 *   valueLeft: string;
 *   valueRight: string;
 *   toneLeft?: string;
 *   toneRight?: string;
 * }} props
 */
function DualReadonlyRow({
  label,
  valueLeft,
  valueRight,
  toneLeft = "text-foreground",
  toneRight = "text-foreground",
}) {
  const renderVal = (value) =>
    value === "" ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      formatMoneyWithSymbol(value)
    )

  return (
    <tr className="border-b border-border bg-muted/30">
      <td className="py-3 pr-4 text-sm text-foreground/80">
        <span className="font-medium">{label}</span>
        <span className="block text-[10px] text-blue-300/80 uppercase tracking-wide mt-0.5">
          Calculado automáticamente
        </span>
      </td>
      <td className={`py-2 px-2 text-right text-sm font-semibold tabular-nums ${toneLeft}`}>
        {renderVal(valueLeft)}
      </td>
      <td className={`py-2 px-2 text-right text-sm font-semibold tabular-nums ${toneRight}`}>
        {renderVal(valueRight)}
      </td>
    </tr>
  )
}

/**
 * @param {{
 *   cuit: string;
 *   balanceContable?: import("@/lib/balanceContableModel").BalanceContableDoc | null;
 *   usuario?: string | null;
 *   tipoEmpresa?: string | null;
 *   coeficienteEmpresa?: number | null;
 *   sourceFile?: File | null;
 *   fileKind?: "excel" | "pdf" | "image" | "other";
 *   onSaved?: () => void | Promise<void>;
 * }} props
 */
export function BalanceContableForm({
  cuit,
  balanceContable = null,
  usuario = null,
  tipoEmpresa = "",
  coeficienteEmpresa = null,
  sourceFile = null,
  fileKind = "other",
  onSaved,
}) {
  const [values, setValues] = useState(() =>
    balanceContableToFormValues(balanceContable)
  )
  const [inflationActual, setInflationActual] = useState(null)
  const [inflationAnterior, setInflationAnterior] = useState(null)
  const [manualCoefActual, setManualCoefActual] = useState("")
  const [manualCoefAnterior, setManualCoefAnterior] = useState("")
  const [inflationLoading, setInflationLoading] = useState({
    actual: false,
    anterior: false,
  })
  const [inflationError, setInflationError] = useState({
    actual: "",
    anterior: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [localStatus, setLocalStatus] = useState(
    String(balanceContable?.validationStatus ?? "draft")
  )
  const [parsing, setParsing] = useState(false)
  const [detectedFields, setDetectedFields] = useState(/** @type {string[]} */ ([]))
  const [parseMethod, setParseMethod] = useState(
    /** @type {"excel" | "parser" | "gemini" | null} */ (null)
  )
  const [indicatorsSource, setIndicatorsSource] = useState(
    String(balanceContable?.indicatorsSource ?? "manual")
  )

  const lockActualRef = useRef(false)
  const lockAnteriorRef = useRef(false)

  const coeficiente = useMemo(
    () =>
      coeficienteEmpresa != null && coeficienteEmpresa > 0
        ? coeficienteEmpresa
        : getCoeficienteTipoEmpresa(tipoEmpresa || null),
    [coeficienteEmpresa, tipoEmpresa]
  )

  const { leftColumn, rightColumn, leftYear, rightYear } = useMemo(
    () => getBalanceVisualColumns(values),
    [values.ejercicioActual, values.ejercicioAnterior]
  )

  const derivedValues = useMemo(
    () => applyDerivedContableFormValues(values),
    [values]
  )

  const warnings = useMemo(
    () =>
      computeBalanceIndicatorWarnings(
        sliceColumnForWarnings(derivedValues, "actual")
      ),
    [derivedValues]
  )

  const liveDoc = useMemo(
    () =>
      buildContableDocFromFormState(
        derivedValues,
        inflationActual,
        inflationAnterior,
        balanceContable?.id
      ),
    [derivedValues, inflationActual, inflationAnterior, balanceContable?.id]
  )

  const preview = useMemo(
    () => computePrequalificationFromContable(liveDoc, coeficiente ?? null),
    [liveDoc, coeficiente]
  )

  const validationBadge = getValidationStatusBadge({
    validationStatus: localStatus,
  })

  const patrimonioToneActual = useMemo(() => {
    const parsed = parseBalanceAmount(derivedValues.patrimonioNetoActual)
    if (parsed === null) {
      return "default"
    }
    if (parsed > 0) {
      return "positive"
    }
    if (parsed < 0) {
      return "negative"
    }
    return "default"
  }, [derivedValues.patrimonioNetoActual])

  const patrimonioToneAnterior = useMemo(() => {
    const parsed = parseBalanceAmount(derivedValues.patrimonioNetoAnterior)
    if (parsed === null) {
      return "default"
    }
    if (parsed > 0) {
      return "positive"
    }
    if (parsed < 0) {
      return "negative"
    }
    return "default"
  }, [derivedValues.patrimonioNetoAnterior])

  useEffect(() => {
    setValues(balanceContableToFormValues(balanceContable))
    setLocalStatus(String(balanceContable?.validationStatus ?? "draft"))
    setError("")
    setSuccess("")

    const restoredActual = inflationFromStoredColumn(balanceContable, "actual")
    const restoredAnterior = inflationFromStoredColumn(
      balanceContable,
      "anterior"
    )
    setInflationActual(restoredActual)
    setInflationAnterior(restoredAnterior)
    if (restoredActual) {
      setManualCoefActual(inflationToManualFormFields(restoredActual).coeficienteIpc)
      lockActualRef.current = Boolean(restoredActual.manual)
    }
    if (restoredAnterior) {
      setManualCoefAnterior(
        inflationToManualFormFields(restoredAnterior).coeficienteIpc
      )
      lockAnteriorRef.current = Boolean(restoredAnterior.manual)
    }
  }, [balanceContable])

  const patch = (field, raw) => {
    setValues((prev) => ({ ...prev, [field]: raw }))
    setSuccess("")
  }

  const fetchIpcForColumn = useCallback(
    async (column, { force = false } = {}) => {
      const fecha =
        column === "actual"
          ? values.fechaCierreActual
          : values.fechaCierreAnterior
      if (!fecha?.trim()) {
        return
      }
      if (!force && (column === "actual" ? lockActualRef : lockAnteriorRef).current) {
        return
      }

      setInflationLoading((prev) => ({ ...prev, [column]: true }))
      setInflationError((prev) => ({ ...prev, [column]: "" }))

      try {
        const result = await calculateInflationFactor(fecha)
        const setInflation =
          column === "actual" ? setInflationActual : setInflationAnterior
        const setManual =
          column === "actual" ? setManualCoefActual : setManualCoefAnterior
        const lockRef = column === "actual" ? lockActualRef : lockAnteriorRef

        if (isAutomaticInflation(result)) {
          setInflation(result)
          setManual(inflationToManualFormFields(result).coeficienteIpc)
          lockRef.current = false
        } else {
          const fallback = buildFallbackInflationFactor(
            toYearMonth(fecha),
            toYearMonth(new Date()),
            result?.warningMessage ??
              "No hay índice IPC disponible para las fechas indicadas."
          )
          setInflation(fallback)
          setManual("1")
          lockRef.current = true
          setInflationError((prev) => ({
            ...prev,
            [column]: fallback.warningMessage ?? "",
          }))
        }
      } catch (ipcError) {
        console.error(ipcError)
        setInflationError((prev) => ({
          ...prev,
          [column]: "Error al consultar la API de inflación.",
        }))
      } finally {
        setInflationLoading((prev) => ({ ...prev, [column]: false }))
      }
    },
    [values.fechaCierreActual, values.fechaCierreAnterior]
  )

  useEffect(() => {
    if (values.fechaCierreActual && !lockActualRef.current) {
      void fetchIpcForColumn("actual")
    }
  }, [values.fechaCierreActual, fetchIpcForColumn])

  useEffect(() => {
    if (values.fechaCierreAnterior && !lockAnteriorRef.current) {
      void fetchIpcForColumn("anterior")
    }
  }, [values.fechaCierreAnterior, fetchIpcForColumn])

  useEffect(() => {
    if (!sourceFile || fileKind === "other") {
      return
    }

    let cancelled = false

    const runParse = async () => {
      setParsing(true)
      setError("")
      try {
        const result = await parseBalanceFile(sourceFile, {
          target: "contable",
        })

        if (cancelled) {
          return
        }

        if (result.error) {
          setError(result.error)
          return
        }

        if (Object.keys(result.values).length > 0) {
          setValues((prev) =>
            applyDerivedContableFormValues({
              ...prev,
              ...result.values,
              moneda: prev.moneda || result.values.moneda || "ARS",
            })
          )
          setDetectedFields(result.detected)
          setParseMethod(result.method)
          setIndicatorsSource(
            result.method === "gemini"
              ? "pdf"
              : result.fileKind === "excel"
                ? "excel"
                : "pdf"
          )
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

    void runParse()

    return () => {
      cancelled = true
    }
  }, [sourceFile, fileKind])

  const applyManualCoef = (column, rawCoef) => {
    const setManual =
      column === "actual" ? setManualCoefActual : setManualCoefAnterior
    const setInflation =
      column === "actual" ? setInflationActual : setInflationAnterior
    const lockRef = column === "actual" ? lockActualRef : lockAnteriorRef
    const fecha =
      column === "actual" ? values.fechaCierreActual : values.fechaCierreAnterior

    setManual(rawCoef)
    lockRef.current = true
    const factor = parseLocaleDecimalInput(rawCoef)
    if (factor == null || factor <= 0) {
      return
    }
    setInflation(
      buildManualInflationFactor({
        factor,
        fechaIPCOrigen: toYearMonth(fecha),
        fechaIPCDestino: toYearMonth(new Date()),
      })
    )
    setInflationError((prev) => ({ ...prev, [column]: "" }))
  }

  const handleSave = async (validationStatus) => {
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const payload = buildContableDocFromFormState(
        applyDerivedContableFormValues(values),
        inflationActual,
        inflationAnterior,
        balanceContable?.id
      )

      await saveBalanceContable(cuit, payload, {
        usuario,
        validationStatus,
        indicatorsSource,
        inflationActual,
        inflationAnterior,
      })

      setLocalStatus(validationStatus)
      setSuccess(
        validationStatus === "confirmed"
          ? "Balance contable confirmado."
          : "Borrador guardado."
      )
      await onSaved?.()
    } catch (saveError) {
      console.error(saveError)
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el balance."
      )
    } finally {
      setSaving(false)
    }
  }

  const getMetricRow = (rubro, column) =>
    preview.tablas[rubro]?.find(
      (r) => /** @type {{ columna?: string }} */ (r).columna === column
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${validationBadge.className}`}
        >
          {validationBadge.label}
        </span>
        <span className="text-xs text-muted-foreground">
          Información contable · 2 ejercicios (estructura PDF)
        </span>
      </div>

      {warnings.length > 0 && (
        <ul className="text-xs text-yellow-300/90 space-y-1 list-disc pl-5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
          {warnings.map((item) => (
            <li key={item.id}>{item.message}</li>
          ))}
        </ul>
      )}

      {parsing && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background/20 px-4 py-3 text-sm text-foreground/80">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {parseMethod === "gemini" || fileKind === "image"
            ? "Procesando balance con IA..."
            : "Detectando cuentas del balance..."}
        </div>
      )}

      {!parsing && detectedFields.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300">
          {fileKind === "excel" ? (
            <FileSpreadsheet className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <FileText className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>
            Cuentas detectadas
            {parseMethod === "gemini" ? " (IA)" : ""}:{" "}
            <strong>{detectedFields.slice(0, 8).join(", ")}</strong>
            {detectedFields.length > 8 ? "…" : ""}. Revise y confirme los valores.
          </span>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-muted">
        <table className="w-full min-w-[720px] text-sm border-collapse">
          <thead>
            <tr className="bg-background/40 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-3 px-4 text-left font-semibold w-[40%]">
                Ejercicio cerrado
              </th>
              <th className="py-3 px-4 text-right font-semibold tabular-nums">
                {leftYear}
              </th>
              <th className="py-3 px-4 text-right font-semibold tabular-nums">
                {rightYear}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-3 px-4 text-foreground/80">Moneda</td>
              <td colSpan={2} className="py-2 px-2">
                <Input
                  value={values.moneda}
                  onChange={(e) => patch("moneda", e.target.value)}
                  className="h-10 border-border bg-background/40 text-foreground max-w-[120px] ml-auto"
                />
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-3 px-4 text-foreground/80">Fecha de cierre</td>
              <td className="py-2 px-2">
                <Input
                  type="date"
                  value={values.fechaCierreAnterior}
                  onChange={(e) => patch("fechaCierreAnterior", e.target.value)}
                  className="h-10 border-border bg-background/40 text-foreground"
                />
              </td>
              <td className="py-2 px-2">
                <Input
                  type="date"
                  value={values.fechaCierreActual}
                  onChange={(e) => patch("fechaCierreActual", e.target.value)}
                  className="h-10 border-border bg-background/40 text-foreground"
                />
              </td>
            </tr>

            {BALANCE_STRUCTURE_SECTIONS.map(({ section, rows }) => (
              <Fragment key={section}>
                <tr>
                  <td
                    colSpan={3}
                    className="pt-5 pb-2 px-4 text-xs font-bold uppercase tracking-widest text-red-400/90"
                  >
                    {section}
                  </td>
                </tr>
                {rows.map((row) => {
                  if (row.kind === "computed") {
                    const isPatrimonio = row.field === "patrimonioNeto"
                    const toneClass = (tone) =>
                      tone === "positive"
                        ? "text-green-400"
                        : tone === "negative"
                          ? "text-red-400"
                          : "text-foreground"
                    return (
                      <DualReadonlyRow
                        key={row.field}
                        label={row.label}
                        valueLeft={derivedValues[fieldForColumn(row.field, leftColumn)]}
                        valueRight={derivedValues[fieldForColumn(row.field, rightColumn)]}
                        toneLeft={
                          isPatrimonio
                            ? toneClass(patrimonioToneAnterior)
                            : "text-foreground"
                        }
                        toneRight={
                          isPatrimonio
                            ? toneClass(patrimonioToneActual)
                            : "text-foreground"
                        }
                      />
                    )
                  }

                  return (
                    <DualMoneyRow
                      key={row.field}
                      label={row.label}
                      indent={row.indent}
                      valueLeft={values[fieldForColumn(row.field, leftColumn)]}
                      valueRight={values[fieldForColumn(row.field, rightColumn)]}
                      onChangeLeft={(v) =>
                        patch(fieldForColumn(row.field, leftColumn), v)
                      }
                      onChangeRight={(v) =>
                        patch(fieldForColumn(row.field, rightColumn), v)
                      }
                    />
                  )
                })}
              </Fragment>
            ))}

            <tr>
              <td
                colSpan={3}
                className="pt-6 pb-2 px-4 text-xs font-bold uppercase tracking-widest text-amber-400/90"
              >
                Indicadores Comerciales
              </td>
            </tr>
            {BALANCE_RESULTADOS_ROWS.map(({ field, label }) => (
              <DualMoneyRow
                key={field}
                label={label}
                valueLeft={values[fieldForColumn(field, leftColumn)]}
                valueRight={values[fieldForColumn(field, rightColumn)]}
                onChangeLeft={(v) => patch(fieldForColumn(field, leftColumn), v)}
                onChangeRight={(v) => patch(fieldForColumn(field, rightColumn), v)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-blue-300 mb-2 uppercase tracking-wide">
            IPC · {leftYear} (solo resultados)
          </p>
          <BalanceInflationPanel
            inflation={inflationAnterior}
            inflationLoading={inflationLoading.anterior}
            inflationError={inflationError.anterior}
            manualCoeficienteIpc={manualCoefAnterior}
            onManualCoeficienteIpcChange={(v) => applyManualCoef("anterior", v)}
            onRecalculate={() => {
              lockAnteriorRef.current = false
              void fetchIpcForColumn("anterior", { force: true })
            }}
            recalculateDisabled={!values.fechaCierreAnterior}
          />
        </div>
        <div>
          <p className="text-xs font-semibold text-blue-300 mb-2 uppercase tracking-wide">
            IPC · {rightYear} (solo resultados)
          </p>
          <BalanceInflationPanel
            inflation={inflationActual}
            inflationLoading={inflationLoading.actual}
            inflationError={inflationError.actual}
            manualCoeficienteIpc={manualCoefActual}
            onManualCoeficienteIpcChange={(v) => applyManualCoef("actual", v)}
            onRecalculate={() => {
              lockActualRef.current = false
              void fetchIpcForColumn("actual", { force: true })
            }}
            recalculateDisabled={!values.fechaCierreActual}
          />
        </div>
      </div>

      {!coeficiente && (
        <p className="text-xs text-amber-300 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          Seleccionar tipo de empresa para crédito calculado y pre-calificación.
        </p>
      )}

      <p className="text-xs font-bold uppercase tracking-widest text-red-400/90">
        Pre-calificación Excel (desde resultados)
      </p>

      {BALANCE_RESULTADOS_ROWS.map(({ field, label }) => (
        <div
          key={`pre-${field}`}
          className="overflow-x-auto rounded-xl border border-border bg-muted"
        >
          <p className="px-4 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
            {label}
          </p>
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="text-muted-foreground uppercase tracking-wider border-b border-border">
                <th className="px-3 py-2 text-left">Concepto</th>
                <th className="px-3 py-2 text-right">{leftYear}</th>
                <th className="px-3 py-2 text-right">{rightYear}</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              {[
                { label: "Promedio mensual", key: "promedioMensual" },
                { label: "Coeficiente IPC", key: "coefInflacion", ipc: true },
                { label: "Ventas actualizada", key: "valorActualizado" },
                { label: "Crédito calculado", key: "creditoCalculado" },
              ].map(({ label: rowLabel, key, ipc }) => (
                <tr key={key} className="border-b border-border">
                  <td className="px-3 py-2 text-muted-foreground">{rowLabel}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {ipc
                      ? formatCoeficienteIpcDisplay(
                          Number(getMetricRow(field, leftColumn)?.[key]) || 1
                        )
                      : formatPrequalTableMoney(
                          Number(getMetricRow(field, leftColumn)?.[key]) || 0
                        )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {ipc
                      ? formatCoeficienteIpcDisplay(
                          Number(getMetricRow(field, rightColumn)?.[key]) || 1
                        )
                      : formatPrequalTableMoney(
                          Number(getMetricRow(field, rightColumn)?.[key]) || 0
                        )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="flex flex-wrap gap-3 justify-end">
        <UploadButton
          variant="secondary"
          disabled={saving}
          onClick={() => handleSave("draft")}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar borrador
        </UploadButton>
        <UploadButton variant="primary" disabled={saving} onClick={() => handleSave("confirmed")}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Confirmar balance
        </UploadButton>
      </div>
    </div>
  )
}

/** Para ratios / resumen: ejercicio actual como balance único. */
export function getBalanceContableActualSnapshot(
  balanceContable
) {
  return balanceContableLatestEjercicioLegacyDoc(balanceContable)
}
