/**
 * Firebase Admin (server-only) — Next.js API routes.
 * Credenciales vía env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * o GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT_JSON.
 */

import { existsSync, readFileSync } from "node:fs"
import admin from "firebase-admin"

function initAdmin() {
  if (admin.apps.length) return admin.app()

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    undefined

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) {
    const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return admin.initializeApp({
      credential: admin.credential.cert(cred),
      projectId: cred.project_id || projectId,
    })
  }

  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim()
  if (saPath && existsSync(saPath)) {
    const cred = JSON.parse(readFileSync(saPath, "utf8"))
    return admin.initializeApp({
      credential: admin.credential.cert(cred),
      projectId: cred.project_id || projectId,
    })
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim()
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
  if (clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    })
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp({ projectId })
  }

  throw new Error(
    "Firebase Admin no configurado. Definir FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (u otra credencial soportada)."
  )
}

export function getFirebaseAdmin() {
  initAdmin()
  return admin
}

