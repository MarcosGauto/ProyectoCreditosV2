"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { formatFechaInicioActividadInput } from "@/lib/coverageRequirements"
import { TIPO_OPERACION } from "@/lib/coverageRequirements"
import {
  getCoeficienteTipoEmpresa,
  normalizeTipoEmpresa,
} from "@/lib/scoring/prequalification"
import { draftPartialDiffersFromPublished } from "@/lib/creditAnalysis/draftSchema"
import { hydrateAnalysisDraft } from "@/lib/creditAnalysis/hydrateAnalysisDraft"
import { isDraftConflictError } from "@/lib/creditAnalysis/DraftConflictError"
import { saveDraftPartial } from "@/lib/creditAnalysis/saveDraftPartial"

const AUTOSAVE_DEBOUNCE_MS = 1000

/**
 * @param {Record<string, unknown>} fields
 */
function applyHydratedFields(fields) {
  const tipoRaw = fields.tipoEmpresa
  const tipo =
    typeof tipoRaw === "string" && tipoRaw.trim()
      ? normalizeTipoEmpresa(tipoRaw) ?? tipoRaw.trim()
      : ""

  const coefRaw = fields.coeficienteEmpresa
  const coefFromDoc =
    coefRaw != null && Number.isFinite(Number(coefRaw)) ? Number(coefRaw) : null
  const coeficienteEmpresa =
    coefFromDoc != null && coefFromDoc > 0
      ? coefFromDoc
      : tipo
        ? getCoeficienteTipoEmpresa(tipo)
        : null

  const montoCreditoOtorgado =
    fields.montoCreditoOtorgado != null &&
    Number.isFinite(Number(fields.montoCreditoOtorgado))
      ? Number(fields.montoCreditoOtorgado)
      : null

  const tipoOperacion =
    fields.tipoOperacion === TIPO_OPERACION.NOMINADO ||
    fields.tipoOperacion === TIPO_OPERACION.DISCRECIONAL
      ? fields.tipoOperacion
      : TIPO_OPERACION.NOMINADO

  const fechaInicioActividad =
    typeof fields.fechaInicioActividad === "string" &&
    fields.fechaInicioActividad.trim()
      ? fields.fechaInicioActividad.trim()
      : null

  const facturasAlContado =
    fields.facturasAlContado === true || fields.facturasAlContado === false
      ? fields.facturasAlContado
      : null

  const analisisBalanceIA =
    fields.analisisBalanceIA && typeof fields.analisisBalanceIA === "object"
      ? /** @type {import("@/lib/balance/balanceGeminiAnalysis").BalanceGeminiAnalysisResult} */ (
          fields.analisisBalanceIA
        )
      : null

  return {
    tipoEmpresa: tipo,
    coeficienteEmpresa,
    recomendacionAnalista:
      typeof fields.recomendacionAnalista === "string"
        ? fields.recomendacionAnalista
        : "",
    montoCreditoOtorgado,
    montoCreditoInput:
      montoCreditoOtorgado != null
        ? String(Math.round(montoCreditoOtorgado))
        : "",
    tipoOperacion,
    fechaInicioActividad,
    fechaInicioActividadInput: fechaInicioActividad
      ? formatFechaInicioActividadInput(fechaInicioActividad)
      : "",
    facturasAlContado,
    analisisBalanceIA,
  }
}

/**
 * @param {string | undefined} cuit
 * @param {string | null | undefined} [autosavedBy]
 * @param {{ autosaveEnabled?: boolean }} [options]
 */
export function useAnalysisDraft(cuit, autosavedBy = null, options = {}) {
  const autosaveEnabled = options.autosaveEnabled !== false

  const [hydrated, setHydrated] = useState(false)
  const [draftRevision, setDraftRevision] = useState(
    /** @type {number | null} */ (null)
  )
  const [saveStatus, setSaveStatus] = useState(
    /** @type {"idle" | "pending" | "saving" | "saved" | "error" | "conflict"} */ (
      "idle"
    )
  )
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const [hasConflict, setHasConflict] = useState(false)
  const [recoveredFromDraft, setRecoveredFromDraft] = useState(false)

  const [tipoEmpresa, setTipoEmpresa] = useState("")
  const [coeficienteEmpresa, setCoeficienteEmpresa] = useState(
    /** @type {number | null} */ (null)
  )
  const [recomendacionAnalista, setRecomendacionAnalista] = useState("")
  const [montoCreditoOtorgado, setMontoCreditoOtorgado] = useState(
    /** @type {number | null} */ (null)
  )
  const [montoCreditoInput, setMontoCreditoInput] = useState("")
  const [tipoOperacion, setTipoOperacionState] = useState(TIPO_OPERACION.NOMINADO)
  const [fechaInicioActividad, setFechaInicioActividad] = useState(
    /** @type {string | null} */ (null)
  )
  const [fechaInicioActividadInput, setFechaInicioActividadInput] = useState("")
  const [facturasAlContado, setFacturasAlContadoState] = useState(
    /** @type {boolean | null} */ (null)
  )
  const [analisisBalanceIA, setAnalisisBalanceIAState] = useState(
    /** @type {import("@/lib/balance/balanceGeminiAnalysis").BalanceGeminiAnalysisResult | null} */ (
      null
    )
  )

  const [publishedVersion, setPublishedVersion] = useState(
    /** @type {Record<string, unknown> | null} */ (null)
  )

  const publishedBaselineRef = useRef(/** @type {Record<string, unknown>} */ ({}))
  const pendingDeltaRef = useRef(/** @type {Record<string, unknown>} */ ({}))
  const debounceTimerRef = useRef(
    /** @type {ReturnType<typeof setTimeout> | null} */ (null)
  )
  const draftRevisionRef = useRef(/** @type {number | null} */ (null))
  const hasConflictRef = useRef(false)
  const autosaveEnabledRef = useRef(autosaveEnabled)
  const autosavedByRef = useRef(autosavedBy)

  useEffect(() => {
    autosaveEnabledRef.current = autosaveEnabled
  }, [autosaveEnabled])

  useEffect(() => {
    autosavedByRef.current = autosavedBy
  }, [autosavedBy])

  useEffect(() => {
    draftRevisionRef.current = draftRevision
  }, [draftRevision])

  useEffect(() => {
    hasConflictRef.current = hasConflict
  }, [hasConflict])

  const applyStateFromHydration = useCallback((hydration) => {
    const next = applyHydratedFields(hydration.fields)
    setTipoEmpresa(next.tipoEmpresa)
    setCoeficienteEmpresa(next.coeficienteEmpresa)
    setRecomendacionAnalista(next.recomendacionAnalista)
    setMontoCreditoOtorgado(next.montoCreditoOtorgado)
    setMontoCreditoInput(next.montoCreditoInput)
    setTipoOperacionState(next.tipoOperacion)
    setFechaInicioActividad(next.fechaInicioActividad)
    setFechaInicioActividadInput(next.fechaInicioActividadInput)
    setFacturasAlContadoState(next.facturasAlContado)
    setAnalisisBalanceIAState(next.analisisBalanceIA)
    setDraftRevision(hydration.draftRevision)
    setPublishedVersion(hydration.publishedVersion)
    publishedBaselineRef.current = hydration.publishedBaseline
    setRecoveredFromDraft(hydration.recoveredFromDraft)
    pendingDeltaRef.current = {}
    setHasPendingChanges(false)
    setHasConflict(false)
    setSaveStatus("idle")
  }, [])

  const reloadDraftFromServer = useCallback(async () => {
    if (!cuit) {
      return
    }

    const hydration = await hydrateAnalysisDraft(cuit)
    applyStateFromHydration(hydration)
    setHydrated(true)
  }, [applyStateFromHydration, cuit])

  useEffect(() => {
    let cancelled = false

    if (!cuit) {
      setHydrated(true)
      return
    }

    setHydrated(false)

    hydrateAnalysisDraft(cuit)
      .then((hydration) => {
        if (cancelled) {
          return
        }
        applyStateFromHydration(hydration)
      })
      .catch((error) => {
        console.error("[useAnalysisDraft] hydrate", error)
      })
      .finally(() => {
        if (!cancelled) {
          setHydrated(true)
        }
      })

    return () => {
      cancelled = true
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [applyStateFromHydration, cuit])

  const persistPending = useCallback(async () => {
    if (!cuit || !autosaveEnabledRef.current || hasConflictRef.current) {
      return
    }

    const delta = pendingDeltaRef.current
    if (Object.keys(delta).length === 0) {
      setHasPendingChanges(false)
      setSaveStatus("idle")
      return
    }

    setSaveStatus("saving")

    try {
      const result = await saveDraftPartial(cuit, delta, {
        autosavedBy: autosavedByRef.current,
        expectedRevision: draftRevisionRef.current,
      })

      if (!result) {
        setHasPendingChanges(false)
        setSaveStatus("idle")
        return
      }

      pendingDeltaRef.current = {}
      setHasPendingChanges(false)
      setDraftRevision(result.draftRevision)
      setSaveStatus("saved")
    } catch (error) {
      if (isDraftConflictError(error)) {
        setHasConflict(true)
        setSaveStatus("conflict")
        return
      }

      console.error("[useAnalysisDraft] autosave", error)
      setSaveStatus("error")
    }
  }, [cuit])

  const scheduleAutosave = useCallback(() => {
    if (!autosaveEnabledRef.current || hasConflictRef.current) {
      return
    }

    if (Object.keys(pendingDeltaRef.current).length === 0) {
      return
    }

    setSaveStatus("pending")
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      void persistPending()
    }, AUTOSAVE_DEBOUNCE_MS)
  }, [persistPending])

  const queueAutosave = useCallback(
    (delta, { immediate = false } = {}) => {
      if (!autosaveEnabledRef.current || hasConflictRef.current || !cuit) {
        return
      }

      const keys = Object.keys(delta)
      if (keys.length === 0) {
        return
      }

      Object.assign(pendingDeltaRef.current, delta)
      setHasPendingChanges(true)

      if (immediate) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = null
        }
        void persistPending()
        return
      }

      scheduleAutosave()
    },
    [cuit, persistPending, scheduleAutosave]
  )

  const flushAutosave = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    if (Object.keys(pendingDeltaRef.current).length === 0) {
      return
    }

    await persistPending()
  }, [persistPending])

  const acknowledgePublish = useCallback(() => {
    pendingDeltaRef.current = {}
    setHasPendingChanges(false)
    setDraftRevision(null)
    setHasConflict(false)
    setSaveStatus("idle")
    publishedBaselineRef.current = {
      tipoEmpresa: tipoEmpresa || null,
      coeficienteEmpresa,
      recomendacionAnalista,
      montoCreditoOtorgado,
      tipoOperacion,
      fechaInicioActividad,
      facturasAlContado,
      analisisBalanceIA,
    }
  }, [
    analisisBalanceIA,
    coeficienteEmpresa,
    facturasAlContado,
    fechaInicioActividad,
    montoCreditoOtorgado,
    recomendacionAnalista,
    tipoEmpresa,
    tipoOperacion,
  ])

  const handleTipoEmpresa = useCallback(
    (value) => {
      const tipoKey = normalizeTipoEmpresa(value)
      const nextTipo = tipoKey ?? (typeof value === "string" ? value : "")
      const nextCoef = tipoKey ? getCoeficienteTipoEmpresa(tipoKey) : null

      setTipoEmpresa(nextTipo)
      setCoeficienteEmpresa(nextCoef)
      queueAutosave({
        tipoEmpresa: nextTipo || null,
        coeficienteEmpresa: nextCoef,
      })
    },
    [queueAutosave]
  )

  const updateRecomendacionAnalista = useCallback(
    (value) => {
      setRecomendacionAnalista(value)
      queueAutosave({ recomendacionAnalista: value })
    },
    [queueAutosave]
  )

  const handleMontoCreditoInputChange = useCallback(
    (raw) => {
      setMontoCreditoInput(raw)
      const parsed =
        raw.trim() === ""
          ? null
          : Number.isFinite(Number(raw.replace(/\./g, "").replace(",", ".")))
            ? Number(raw.replace(/\./g, "").replace(",", "."))
            : null
      setMontoCreditoOtorgado(parsed)
      queueAutosave({ montoCreditoOtorgado: parsed })
    },
    [queueAutosave]
  )

  const updateTipoOperacion = useCallback(
    (value) => {
      setTipoOperacionState(value)
      queueAutosave({ tipoOperacion: value })
    },
    [queueAutosave]
  )

  const updateFechaInicioActividadInput = useCallback(
    (value, isoValue) => {
      setFechaInicioActividadInput(value)
      setFechaInicioActividad(isoValue)
      queueAutosave({ fechaInicioActividad: isoValue })
    },
    [queueAutosave]
  )

  const updateFacturasAlContado = useCallback(
    (value) => {
      setFacturasAlContadoState(value)
      queueAutosave({ facturasAlContado: value })
    },
    [queueAutosave]
  )

  const updateAnalisisBalanceIA = useCallback(
    (value) => {
      setAnalisisBalanceIAState(value)
      queueAutosave({ analisisBalanceIA: value }, { immediate: true })
    },
    [queueAutosave]
  )

  const currentDraftFields = useMemo(
    () => ({
      tipoEmpresa: tipoEmpresa || null,
      coeficienteEmpresa,
      recomendacionAnalista,
      montoCreditoOtorgado,
      tipoOperacion,
      fechaInicioActividad,
      facturasAlContado,
      analisisBalanceIA,
    }),
    [
      analisisBalanceIA,
      coeficienteEmpresa,
      facturasAlContado,
      fechaInicioActividad,
      montoCreditoOtorgado,
      recomendacionAnalista,
      tipoEmpresa,
      tipoOperacion,
    ]
  )

  const hasUnpublishedChanges = useMemo(() => {
    if (draftRevision == null) {
      return false
    }

    return draftPartialDiffersFromPublished(
      currentDraftFields,
      publishedBaselineRef.current
    )
  }, [currentDraftFields, draftRevision])

  const draftSaveLabel = useMemo(() => {
    if (hasConflict) {
      return null
    }
    if (saveStatus === "saving" || saveStatus === "pending") {
      return "Guardando..."
    }
    if (saveStatus === "saved" && !hasPendingChanges) {
      return "Guardado"
    }
    return null
  }, [hasConflict, hasPendingChanges, saveStatus])

  return {
    hydrated,
    draftRevision,
    saveStatus,
    hasPendingChanges,
    hasUnpublishedChanges,
    hasConflict,
    recoveredFromDraft,
    draftSaveLabel,
    publishedVersion,
    tipoEmpresa,
    coeficienteEmpresa,
    recomendacionAnalista,
    montoCreditoOtorgado,
    montoCreditoInput,
    tipoOperacion,
    fechaInicioActividad,
    fechaInicioActividadInput,
    facturasAlContado,
    analisisBalanceIA,
    handleTipoEmpresa,
    updateRecomendacionAnalista,
    handleMontoCreditoInputChange,
    updateTipoOperacion,
    updateFechaInicioActividadInput,
    updateFacturasAlContado,
    updateAnalisisBalanceIA,
    flushAutosave,
    reloadDraftFromServer,
    acknowledgePublish,
  }
}
