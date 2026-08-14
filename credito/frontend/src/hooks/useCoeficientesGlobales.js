"use client"

import { useCallback, useEffect, useState } from "react"

import { DEFAULT_COEFICIENTES_GLOBALES } from "@/lib/coeficientes/coeficientesNucleoModel"
import {
  saveCoeficientesGlobales,
  subscribeCoeficientesGlobales,
} from "@/lib/coeficientes/coeficientesNucleoService"

/**
 * @param {{ userEmail?: string | null }} [options]
 */
export function useCoeficientesGlobales(options = {}) {
  const [globales, setGlobales] = useState({ ...DEFAULT_COEFICIENTES_GLOBALES })
  const [updatedAt, setUpdatedAt] = useState(/** @type {string | null} */ (null))
  const [updatedBy, setUpdatedBy] = useState(/** @type {string | null} */ (null))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeCoeficientesGlobales((payload) => {
      setGlobales(payload.globales)
      setUpdatedAt(payload.updatedAt)
      setUpdatedBy(payload.updatedBy)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const saveGlobales = useCallback(
    async (draft) => {
      setSaving(true)
      setError(null)
      try {
        await saveCoeficientesGlobales(draft, options.userEmail ?? null)
      } catch (err) {
        console.error("[useCoeficientesGlobales] save", err)
        setError("No se pudieron guardar los parámetros globales.")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [options.userEmail]
  )

  return {
    globales,
    updatedAt,
    updatedBy,
    loading,
    saving,
    error,
    saveGlobales,
  }
}
