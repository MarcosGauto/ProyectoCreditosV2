"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  getCoeficienteTipoEmpresa,
  normalizeTipoEmpresa,
} from "@/lib/scoring/prequalification"
import {
  loadCreditAnalysisResult,
  saveAnalysisEmpresaConfig,
} from "@/lib/saveCreditAnalysisResult"

/**
 * Tipo de empresa y coeficiente global del análisis (`credit_analysis/latest`).
 *
 * @param {string | undefined} cuit
 */
export function useAnalysisTipoEmpresa(cuit) {
  const [tipoEmpresa, setTipoEmpresaState] = useState("")
  const [coeficienteEmpresa, setCoeficienteEmpresaState] = useState(
    /** @type {number | null} */ (null)
  )
  const [analysis, setAnalysis] = useState(
    /** @type {Record<string, unknown> | null} */ (null)
  )
  const [loaded, setLoaded] = useState(false)
  const initialSyncDone = useRef(false)
  const userChangedTipo = useRef(false)

  const applyAnalysisConfig = useCallback((data) => {
    if (!data) {
      return
    }

    const tipoRaw = data.tipoEmpresa
    const tipo =
      typeof tipoRaw === "string" && tipoRaw.trim()
        ? normalizeTipoEmpresa(tipoRaw) ?? tipoRaw.trim()
        : ""

    const coefRaw = data.coeficienteEmpresa
    const coefFromDoc =
      coefRaw != null && Number.isFinite(Number(coefRaw))
        ? Number(coefRaw)
        : null

    const coef =
      coefFromDoc != null && coefFromDoc > 0
        ? coefFromDoc
        : tipo
          ? getCoeficienteTipoEmpresa(tipo)
          : null

    if (tipo) {
      setTipoEmpresaState(tipo)
    }
    if (coef != null) {
      setCoeficienteEmpresaState(coef)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    initialSyncDone.current = false
    userChangedTipo.current = false

    if (!cuit) {
      setLoaded(true)
      return
    }

    setLoaded(false)

    loadCreditAnalysisResult(cuit)
      .then((data) => {
        if (cancelled || userChangedTipo.current) {
          return
        }
        setAnalysis(data)
        applyAnalysisConfig(data)
        initialSyncDone.current = true
      })
      .catch((error) => {
        console.error("[useAnalysisTipoEmpresa] load", error)
      })
      .finally(() => {
        if (!cancelled) {
          setLoaded(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [cuit, applyAnalysisConfig])

  useEffect(() => {
    console.log("tipoEmpresa render", tipoEmpresa)
    console.log("analysis.tipoEmpresa", analysis?.tipoEmpresa)
    console.log("coeficienteEmpresa", coeficienteEmpresa)
    console.log("analysis.coeficienteEmpresa", analysis?.coeficienteEmpresa)
  }, [tipoEmpresa, analysis?.tipoEmpresa, coeficienteEmpresa, analysis?.coeficienteEmpresa])

  const handleTipoEmpresa = useCallback(
    async (value) => {
      const tipoKey = normalizeTipoEmpresa(value)
      const nextTipo = tipoKey ?? (typeof value === "string" ? value : "")
      const nextCoef = tipoKey ? getCoeficienteTipoEmpresa(tipoKey) : null

      userChangedTipo.current = true
      setTipoEmpresaState(nextTipo)
      setCoeficienteEmpresaState(nextCoef)
      setAnalysis((prev) => ({
        ...(prev ?? {}),
        tipoEmpresa: nextTipo || null,
        coeficienteEmpresa: nextCoef,
      }))

      if (!cuit) {
        return
      }

      try {
        await saveAnalysisEmpresaConfig(cuit, {
          tipoEmpresa: nextTipo,
          coeficienteEmpresa: nextCoef,
        })
      } catch (error) {
        console.error("[useAnalysisTipoEmpresa] save empresa config", error)
        throw error
      }
    },
    [cuit]
  )

  return {
    tipoEmpresa,
    coeficienteEmpresa,
    handleTipoEmpresa,
    analysis,
    loaded,
  }
}
