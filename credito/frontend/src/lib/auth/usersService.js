import { db } from "@/service/firebase";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { getAuthApiBaseUrl } from "@/lib/auth/userRole";
import {
  DEFAULT_USER_ROLE,
  normalizeUserRole,
  USERS_COLLECTION,
} from "@/lib/auth/usersModel";

/**
 * @param {import("firebase/firestore").DocumentSnapshot} snap
 */
function parseUserDoc(snap) {
  const data = snap.data() ?? {};
  const createdAt = data.createdAt?.toDate?.() ?? null;

  return {
    uid: snap.id,
    email: data.email ?? "",
    displayName: data.displayName ?? "",
    role: normalizeUserRole(data.role),
    createdAt: createdAt ? createdAt.toISOString() : null,
  };
}

/**
 * @param {import("firebase/auth").User} firebaseUser
 */
export async function ensureUserProfile(firebaseUser) {
  const ref = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const snap = await getDoc(ref);
  const email = firebaseUser.email ?? "";
  const displayName =
    firebaseUser.displayName || email.split("@")[0] || "Usuario";

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: firebaseUser.uid,
      email,
      displayName,
      role: DEFAULT_USER_ROLE,
      createdAt: serverTimestamp(),
    });
    const created = await getDoc(ref);
    return parseUserDoc(created);
  }

  const updates = {};
  if (email && snap.data()?.email !== email) updates.email = email;
  if (displayName && !snap.data()?.displayName) updates.displayName = displayName;
  if (!snap.data()?.role) updates.role = DEFAULT_USER_ROLE;

  if (Object.keys(updates).length) {
    await setDoc(ref, updates, { merge: true });
  }

  const refreshed = await getDoc(ref);
  return parseUserDoc(refreshed);
}

/**
 * @param {string} uid
 */
export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return parseUserDoc(snap);
}

/**
 * @param {import("firebase/auth").User} firebaseUser
 */
export async function fetchUserProfileFromApi(firebaseUser) {
  const token = await firebaseUser.getIdToken();
  const res = await fetch(`${getAuthApiBaseUrl()}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    uid: data.uid,
    email: data.email ?? "",
    displayName: data.displayName ?? data.name ?? "",
    role: normalizeUserRole(data.role),
    createdAt: data.createdAt ?? null,
  };
}

/**
 * @param {Response} res
 */
async function parseErrorResponse(res) {
  const raw = await res.text();
  if (!raw) return { error: res.statusText || "Error desconocido" };
  try {
    return JSON.parse(raw);
  } catch {
    return { error: raw };
  }
}

/**
 * @param {Response} res
 * @param {string} endpointLabel
 * @param {string} url
 */
async function throwApiError(res, endpointLabel, url) {
  const err = await parseErrorResponse(res);

  console.log(`[usersService] ${endpointLabel} — falló`);
  console.log("Endpoint:", url);
  console.log("Status:", res.status);
  console.log("StatusText:", res.statusText);
  console.log("Response:", err);

  const detail =
    err.error ??
    err.message ??
    err.details?.message ??
    err.details ??
    (typeof err.details === "object" ? JSON.stringify(err.details) : null) ??
    (typeof err === "string" ? err : null) ??
    res.statusText;

  throw new Error(
    `[${res.status} ${res.statusText}] ${endpointLabel}: ${detail}`
  );
}

/**
 * @param {import("firebase/auth").User} firebaseUser
 */
export async function fetchAllUsers(firebaseUser) {
  const baseUrl = getAuthApiBaseUrl();
  const url = `${baseUrl}/api/users`;
  const token = await firebaseUser.getIdToken();

  console.log("[usersService] fetchAllUsers — GET /api/users");
  console.log("URL completa:", url);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await throwApiError(res, "GET /api/users", url);
  }

  const list = await res.json();
  return Array.isArray(list)
    ? list.map((u) => ({
        ...u,
        role: normalizeUserRole(u.role),
      }))
    : [];
}

/**
 * @param {import("firebase/auth").User} firebaseUser
 * @param {string} uid
 * @param {import("./usersModel").UserRole} role
 */
export async function saveUserRole(firebaseUser, uid, role) {
  const baseUrl = getAuthApiBaseUrl();
  const url = `${baseUrl}/api/users/${uid}`;
  const token = await firebaseUser.getIdToken();
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    await throwApiError(res, `PATCH /api/users/${uid}`, url);
  }
  return res.json();
}

/**
 * @param {import("firebase/auth").User} firebaseUser
 * @param {string} uid
 */
export async function promoteUserToAdmin(firebaseUser, uid) {
  const baseUrl = getAuthApiBaseUrl();
  const url = `${baseUrl}/api/users/${uid}/promote-admin`;
  const token = await firebaseUser.getIdToken();
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    await throwApiError(res, `POST /api/users/${uid}/promote-admin`, url);
  }
  return res.json();
}
