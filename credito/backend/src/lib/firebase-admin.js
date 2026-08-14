/**
 * Firebase Admin — punto único de inicialización (Node.js).
 *
 * Variables de entorno soportadas:
 * - FIREBASE_SERVICE_ACCOUNT_JSON: JSON completo del service account (p. ej. serverless).
 * - FIREBASE_SERVICE_ACCOUNT_PATH: ruta absoluta o relativa al JSON (prioridad si no hay JSON inline).
 * - GOOGLE_APPLICATION_CREDENTIALS: estándar GCP; usado por applicationDefault() si no hay cert explícito.
 * - FIREBASE_STORAGE_BUCKET: bucket por defecto (ej. proyecto.appspot.com) — recomendado para Storage.
 * - FIREBASE_PROJECT_ID: opcional; si falta, suele inferirse del service account.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * @param {Record<string, unknown>} account
 */
function normalizeServiceAccount(account) {
  const key = account.private_key;
  if (typeof key === "string") {
    account.private_key = key.replace(/\\n/g, "\n");
  }
  return account;
}

function loadCredentialFromJsonString(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON está definida pero vacía."
    );
  }
  const parsed = JSON.parse(trimmed);
  normalizeServiceAccount(parsed);
  return cert(parsed);
}

function loadCredentialFromFilePath(filePath) {
  const abs = resolve(filePath);
  const parsed = JSON.parse(readFileSync(abs, "utf8"));
  normalizeServiceAccount(parsed);
  return cert(parsed);
}

function stripEnvValue(value) {
  if (!value) return "";
  return String(value)
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/,\s*$/, "");
}

function loadCredentialFromLegacyEnv() {
  const clientEmail = stripEnvValue(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKeyRaw = stripEnvValue(process.env.FIREBASE_PRIVATE_KEY);
  const projectId = stripEnvValue(process.env.FIREBASE_PROJECT_ID);

  if (!clientEmail || !privateKeyRaw) {
    return null;
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  return cert({
    type: "service_account",
    project_id: projectId || undefined,
    client_email: clientEmail,
    private_key: privateKey,
  });
}

function resolveCredential() {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inlineJson) {
    return loadCredentialFromJsonString(inlineJson);
  }

  const explicitPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() || "";

  const legacy = loadCredentialFromLegacyEnv();
  if (legacy) {
    return legacy;
  }

  if (explicitPath) {
    return loadCredentialFromFilePath(explicitPath);
  }

  // GCP / local: usa GOOGLE_APPLICATION_CREDENTIALS u otras fuentes de ADC
  return applicationDefault();
}

function buildAppOptions() {
  /** @type {import("firebase-admin/app").AppOptions} */
  const options = {
    credential: resolveCredential(),
  };

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  if (storageBucket) {
    options.storageBucket = storageBucket;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (projectId) {
    options.projectId = projectId;
  }

  return options;
}

if (getApps().length === 0) {
  const options = buildAppOptions();
  const credentialSource = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? "FIREBASE_SERVICE_ACCOUNT_JSON"
    : process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? "FIREBASE_SERVICE_ACCOUNT_PATH"
      : process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
        ? "FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY"
        : "applicationDefault";
  console.log(
    `[firebase-admin] Inicializando proyecto ${options.projectId ?? "(inferido)"} — credencial: ${credentialSource}`
  );
  initializeApp(options);
}

/** @type {import("firebase-admin/firestore").Firestore} */
export const db = getFirestore();

/** @type {import("firebase-admin/auth").Auth} */
export const auth = getAuth();

/** @type {import("@google-cloud/storage").Bucket} */
export const bucket = getStorage().bucket();
