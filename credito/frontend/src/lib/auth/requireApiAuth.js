/**
 * AuthN/AuthZ para rutas Next.js /api/*.
 * Valida Bearer Firebase ID token y rol en Firestore users/{uid}.
 */

import { NextResponse } from "next/server"
import { getFirebaseAdmin } from "@/lib/auth/firebaseAdminApp"
import { normalizeUserRole } from "@/lib/auth/usersModel"

/**
 * @param {Request} request
 * @param {{
 *   roles?: Array<"admin" | "analista" | "usuario">;
 * }} [options]
 * @returns {Promise<
 *   | { ok: true; uid: string; email: string | null; role: string; decoded: import("firebase-admin/auth").DecodedIdToken }
 *   | { ok: false; response: NextResponse }
 * >}
 */
export async function requireApiAuth(request, options = {}) {
  const authHeader = request.headers.get("authorization") || ""
  const match = /^Bearer\s+(.+)$/i.exec(authHeader)
  const idToken = match?.[1]?.trim() || null

  if (!idToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No autenticado", code: "UNAUTHENTICATED" },
        { status: 401 }
      ),
    }
  }

  try {
    const admin = getFirebaseAdmin()
    const decoded = await admin.auth().verifyIdToken(idToken)
    const uid = decoded.uid
    const email = decoded.email ?? null

    let firestoreRole = null
    try {
      const snap = await admin.firestore().collection("users").doc(uid).get()
      if (snap.exists) {
        firestoreRole = snap.data()?.role ?? null
      }
    } catch {
      firestoreRole = null
    }

    let role = normalizeUserRole(firestoreRole || decoded.role)
    const adminEmails = (
      process.env.ADMIN_EMAILS ||
      process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
      ""
    )
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    if (
      role !== "admin" &&
      email &&
      adminEmails.includes(email.toLowerCase())
    ) {
      role = "admin"
    }

    const allowed = options.roles
    if (Array.isArray(allowed) && allowed.length > 0) {
      if (!allowed.includes(/** @type {"admin"|"analista"|"usuario"} */ (role))) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "Acceso denegado", code: "FORBIDDEN", role },
            { status: 403 }
          ),
        }
      }
    }

    return { ok: true, uid, email, role, decoded }
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Token inválido o expirado", code: "INVALID_TOKEN" },
        { status: 401 }
      ),
    }
  }
}

/** Staff: admin | analista (OCR, análisis, docs, inflation). */
export const API_STAFF_ROLES = /** @type {const} */ (["admin", "analista"])

/** Solo admin (ajustes sensibles vía API si aplica). */
export const API_ADMIN_ROLES = /** @type {const} */ (["admin"])

