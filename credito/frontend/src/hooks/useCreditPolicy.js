"use client"

import { useCallback, useEffect, useState } from "react"
import { createDefaultCreditPolicy } from "@/lib/creditPolicy/defaultCreditPolicy"
import {
  fetchActiveCreditPolicy,
  resetActiveCreditPolicy,
  saveActiveCreditPolicy,
} from "@/lib/creditPolicy/creditPolicyService"
import { resolveCreditPolicy } from "@/lib/creditPolicy/resolveCreditPolicy"
import {
  getScoringWeightValidation,
  getGeneralScoreWeightValidation,
  SCORING_WEIGHT_SAVE_BLOCKED_MESSAGE,
  GENERAL_SCORE_WEIGHT_SAVE_BLOCKED_MESSAGE,
} from "@/lib/creditPolicy/creditPolicyScoring"

/** @typedef {import("@/lib/creditPolicy/creditPolicyTypes").CreditPolicy} CreditPolicy */

/**
 * @param {{ userEmail?: string | null }} [options]
 */
export function useCreditPolicy(options = {}) {
  const [policy, setPolicy] = useState(
    /** @type {CreditPolicy} */ (createDefaultCreditPolicy())
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const active = await fetchActiveCreditPolicy()
      setPolicy(active)
    } catch (err) {
      console.error("[useCreditPolicy] fetch", err)
      setError("No se pudo cargar la política crediticia.")
      setPolicy(createDefaultCreditPolicy())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const savePolicy = useCallback(
    async (draft) => {
      const normalized = resolveCreditPolicy(draft)
      const weightValidation = getScoringWeightValidation(
        normalized.indicadoresFinancieros
      )
      if (!weightValidation.isValid) {
        setError(SCORING_WEIGHT_SAVE_BLOCKED_MESSAGE)
        throw new Error(SCORING_WEIGHT_SAVE_BLOCKED_MESSAGE)
      }

      const generalWeightValidation = getGeneralScoreWeightValidation(
        normalized.estadoGeneral
      )
      if (!generalWeightValidation.isValid) {
        setError(GENERAL_SCORE_WEIGHT_SAVE_BLOCKED_MESSAGE)
        throw new Error(GENERAL_SCORE_WEIGHT_SAVE_BLOCKED_MESSAGE)
      }

      setSaving(true)
      setError(null)
      try {
        const saved = await saveActiveCreditPolicy(
          normalized,
          options.userEmail ?? null
        )
        setPolicy(saved)
        return saved
      } catch (err) {
        console.error("[useCreditPolicy] save", err)
        setError("No se pudo guardar la política crediticia.")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [options.userEmail]
  )

  const restoreDefaults = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const restored = await resetActiveCreditPolicy(options.userEmail ?? null)
      setPolicy(restored)
      return restored
    } catch (err) {
      console.error("[useCreditPolicy] reset", err)
      setError("No se pudo restaurar la política por defecto.")
      throw err
    } finally {
      setSaving(false)
    }
  }, [options.userEmail])

  return {
    policy,
    setPolicy,
    loading,
    saving,
    error,
    refresh,
    savePolicy,
    restoreDefaults,
  }
}
