/**
 * Wrapper retrocompatible: aplica la misma convención de credenciales que el
 * admin.js histórico (certificado junto a este archivo o bajo process.cwd())
 * y delega la inicialización única en ./lib/firebase-admin.js.
 *
 * Export default: namespace `firebase-admin` (admin.apps, admin.auth(), etc.).
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";
import { existsSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function applyLegacyEnvIfNeeded() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) return;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim()) return;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) return;

  const hasEnvCredentials =
    process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
    process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (hasEnvCredentials) {
    return;
  }

  const besideThisFile = path.join(__dirname, "certificates", "serviceAccountKey.json");
  const besideCwd = path.join(process.cwd(), "certificates", "serviceAccountKey.json");

  if (existsSync(besideThisFile)) {
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH = besideThisFile;
  } else if (existsSync(besideCwd)) {
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH = besideCwd;
  }

  if (!process.env.FIREBASE_STORAGE_BUCKET?.trim()) {
    process.env.FIREBASE_STORAGE_BUCKET = "analisisdecredito-497a4.appspot.com";
  }
}

applyLegacyEnvIfNeeded();

await import("./lib/firebase-admin.js");

export default admin;
