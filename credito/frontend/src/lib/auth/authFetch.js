/**
 * fetch autenticado (Bearer Firebase ID token) para /api/* del frontend.
 */

import { auth } from "@/service/firebase"

/**
 * @param {RequestInfo | URL} input
 * @param {RequestInit} [init]
 */
export async function authFetch(input, init = {}) {
  const user = auth.currentUser
  if (!user) {
    throw new Error("No autenticado")
  }
  const token = await user.getIdToken()
  const headers = new Headers(init.headers || {})
  headers.set("Authorization", `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
