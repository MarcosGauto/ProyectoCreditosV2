"use client"

import { useEffect, useMemo, useState } from "react"

import {
  resolveInflationFromMasterIndexes,
  subscribeInflationIndexes,
} from "@/lib/inflation/inflationIndexService"

/** @type {Array<{ id: string; period: string; value: number; source: string; updatedAt: unknown; updatedBy: string }>} */
let sharedIndexes = []
let sharedLoading = true
let sharedError = ""
/** @type {Set<(payload: { indexes: typeof sharedIndexes; loading: boolean; error: string }) => void>} */
const listeners = new Set()
/** @type {(() => void) | null} */
let unsubscribeShared = null

function emitShared() {
  const payload = {
    indexes: sharedIndexes,
    loading: sharedLoading,
    error: sharedError,
  }
  for (const listener of listeners) {
    listener(payload)
  }
}

function ensureSharedSubscription() {
  if (unsubscribeShared) {
    return
  }

  unsubscribeShared = subscribeInflationIndexes(
    (next) => {
      sharedIndexes = next
      sharedLoading = false
      sharedError = ""
      emitShared()
    },
    (subscriptionError) => {
      console.error("[inflation_index] subscription", subscriptionError)
      sharedLoading = false
      sharedError = "No se pudo cargar la tabla maestra de índices IPC."
      emitShared()
    }
  )
}

export function useInflationIndexes() {
  const [state, setState] = useState({
    indexes: sharedIndexes,
    loading: sharedLoading,
    error: sharedError,
  })

  useEffect(() => {
    ensureSharedSubscription()
    listeners.add(setState)
    setState({
      indexes: sharedIndexes,
      loading: sharedLoading,
      error: sharedError,
    })

    return () => {
      listeners.delete(setState)
      if (listeners.size === 0 && unsubscribeShared) {
        unsubscribeShared()
        unsubscribeShared = null
        sharedLoading = true
        sharedError = ""
      }
    }
  }, [])

  return state
}

/**
 * @param {string | Date | null | undefined} closingDate
 */
export function useInflationFactorFromMaster(closingDate) {
  const { indexes, loading, error } = useInflationIndexes()
  const resolved = useMemo(
    () => resolveInflationFromMasterIndexes(indexes, closingDate),
    [indexes, closingDate]
  )

  return {
    ...resolved,
    loading,
    error,
  }
}
