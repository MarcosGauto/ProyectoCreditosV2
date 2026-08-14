/**
 * Flag global para subida de archivos a Firebase Storage.
 * false = desarrollo local: parseo en cliente + solo Firestore.
 * true  = producción: Storage + Firestore.
 */
export const USE_FIREBASE_STORAGE =
  process.env.NEXT_PUBLIC_USE_FIREBASE_STORAGE === "true"
