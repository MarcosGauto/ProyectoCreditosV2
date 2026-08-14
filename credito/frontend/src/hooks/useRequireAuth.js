"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/service/firebase"
import { useAuth } from "@/app/context/AuthContext"

/**
 * @returns {{ user: import("firebase/auth").User | null; loading: boolean }}
 */
export function useRequireAuth() {
  const router = useRouter()
  const [user, setUser] = useState(
    /** @type {import("firebase/auth").User | null} */ (null)
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
      if (!firebaseUser) {
        router.push("/login")
      }
    })

    return () => unsubscribe()
  }, [router])

  return { user, loading }
}

/**
 * Requiere sesión + rol admin (usa AuthContext cuando ya está hidratado).
 * @returns {{
 *   user: import("firebase/auth").User | null;
 *   loading: boolean;
 *   isAdmin: boolean;
 * }}
 */
export function useRequireAdmin() {
  const router = useRouter()
  const { user, loading, isAdmin } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push("/login")
      return
    }
    if (!isAdmin) {
      router.push("/dashboard")
    }
  }, [loading, user, isAdmin, router])

  return useMemo(
    () => ({
      user: user ?? null,
      loading: Boolean(loading),
      isAdmin: Boolean(isAdmin),
    }),
    [user, loading, isAdmin]
  )
}
