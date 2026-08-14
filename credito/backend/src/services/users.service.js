import admin from "../admin.js";
import { db } from "../lib/firebase-admin.js";
import { FieldValue } from "firebase-admin/firestore";
import {
  DEFAULT_USER_ROLE,
  normalizeUserRole,
} from "../lib/userRoles.js";

const USERS_COLLECTION = "users";

function usersCol() {
  return db.collection(USERS_COLLECTION);
}

/**
 * @param {FirebaseFirestore.DocumentSnapshot} snap
 */
function mapUserDoc(snap) {
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
 * @param {string} uid
 */
export async function getUserRoleFromFirestore(uid) {
  const snap = await usersCol().doc(uid).get();
  if (!snap.exists) return null;
  return normalizeUserRole(snap.data()?.role);
}

/**
 * @param {import("firebase-admin/auth").UserRecord} authUser
 */
async function ensureUserDocFromAuth(authUser) {
  const ref = usersCol().doc(authUser.uid);
  const snap = await ref.get();

  const email = authUser.email ?? "";
  const displayName =
    authUser.displayName || email.split("@")[0] || "Usuario";

  if (!snap.exists) {
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const role =
      email && adminEmails.includes(email.toLowerCase())
        ? "admin"
        : DEFAULT_USER_ROLE;

    await ref.set({
      uid: authUser.uid,
      email,
      displayName,
      role,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (role === "admin") {
      await admin.auth().setCustomUserClaims(authUser.uid, { role: "admin" });
    }

    const created = await ref.get();
    return mapUserDoc(created);
  }

  const updates = {};
  if (email && snap.data()?.email !== email) updates.email = email;
  if (displayName && !snap.data()?.displayName) updates.displayName = displayName;
  if (!snap.data()?.role) updates.role = DEFAULT_USER_ROLE;

  if (Object.keys(updates).length) {
    await ref.set(updates, { merge: true });
  }

  const refreshed = await ref.get();
  return mapUserDoc(refreshed);
}

/**
 * Lista usuarios desde Firestore; si falla, usa Firebase Auth como respaldo.
 */
export async function listUsers() {
  /** @type {Map<string, ReturnType<typeof mapUserDoc>>} */
  const byUid = new Map();

  try {
    const snap = await usersCol().get();
    snap.docs.forEach((docSnap) => {
      byUid.set(docSnap.id, mapUserDoc(docSnap));
    });
  } catch (firestoreErr) {
    console.warn(
      "[listUsers] Firestore no disponible, usando Firebase Auth:",
      firestoreErr?.message || firestoreErr
    );
  }

  const authList = await admin.auth().listUsers(1000);
  for (const authUser of authList.users) {
    if (!byUid.has(authUser.uid)) {
      try {
        const created = await ensureUserDocFromAuth(authUser);
        byUid.set(created.uid, created);
      } catch {
        byUid.set(authUser.uid, {
          uid: authUser.uid,
          email: authUser.email ?? "",
          displayName:
            authUser.displayName ||
            authUser.email?.split("@")[0] ||
            "Usuario",
          role: normalizeUserRole(authUser.customClaims?.role),
          createdAt: authUser.metadata?.creationTime ?? null,
        });
      }
    }
  }

  return Array.from(byUid.values()).sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });
}

/**
 * @param {string} uid
 * @param {string} role
 */
export async function updateUserRole(uid, role) {
  const normalized = normalizeUserRole(role);
  const ref = usersCol().doc(uid);

  let snap = await ref.get();
  if (!snap.exists) {
    const authUser = await admin.auth().getUser(uid);
    await ensureUserDocFromAuth(authUser);
    snap = await ref.get();
  }

  await ref.set({ role: normalized }, { merge: true });
  await admin.auth().setCustomUserClaims(uid, { role: normalized });

  const updated = await ref.get();
  return mapUserDoc(updated);
}

/**
 * @param {string} uid
 */
export async function promoteUserToAdmin(uid) {
  return updateUserRole(uid, "admin");
}

/**
 * @param {import("firebase-admin/auth").DecodedIdToken} decoded
 */
export async function ensureCurrentUserProfile(decoded) {
  try {
    const authUser = await admin.auth().getUser(decoded.uid);
    return ensureUserDocFromAuth(authUser);
  } catch {
    const ref = usersCol().doc(decoded.uid);
    const snap = await ref.get();
    if (snap.exists) return mapUserDoc(snap);

    await ref.set({
      uid: decoded.uid,
      email: decoded.email ?? "",
      displayName: decoded.name || decoded.email?.split("@")[0] || "Usuario",
      role: DEFAULT_USER_ROLE,
      createdAt: FieldValue.serverTimestamp(),
    });

    const created = await ref.get();
    return mapUserDoc(created);
  }
}
