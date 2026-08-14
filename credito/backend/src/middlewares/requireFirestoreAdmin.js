import { getUserRoleFromFirestore } from "../services/users.service.js";
import { normalizeUserRole } from "../lib/userRoles.js";

function getAdminEmailsFromEnv() {
  return (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function resolveAdminRole(firestoreRole, claimRole, email) {
  let role = normalizeUserRole(firestoreRole || claimRole);
  const adminEmails = getAdminEmailsFromEnv();
  const emailNorm = email?.toLowerCase();
  if (role !== "admin" && emailNorm && adminEmails.includes(emailNorm)) {
    role = "admin";
  }
  return role;
}

/**
 * Verifica admin usando Firestore users/{uid} con fallback a claims + ADMIN_EMAILS.
 */
export async function requireFirestoreAdmin(req, res, next) {
  try {
    if (!req.user?.uid) {
      console.warn("[requireFirestoreAdmin] Sin uid en req.user");
      return res.status(401).json({ ok: false, error: "No autenticado" });
    }

    let firestoreRole = null;
    let firestoreError = null;

    try {
      firestoreRole = await getUserRoleFromFirestore(req.user.uid);
    } catch (err) {
      firestoreError = err;
      console.warn(
        "[requireFirestoreAdmin] Firestore no disponible:",
        err?.message || err
      );
    }

    const claimRole = req.user.role;
    const role = resolveAdminRole(
      firestoreRole,
      claimRole,
      req.user.email
    );

    console.log("[requireFirestoreAdmin]", {
      uid: req.user.uid,
      email: req.user.email,
      firestoreRole,
      claimRole,
      resolvedRole: role,
      firestoreError: firestoreError?.message ?? null,
    });

    if (role !== "admin") {
      return res.status(403).json({
        ok: false,
        error: "Acceso denegado",
        details: {
          message: 'Se requiere role === "admin"',
          firestoreRole: firestoreRole ?? null,
          claimRole: claimRole ?? null,
          resolvedRole: role,
          firestoreError: firestoreError?.message ?? null,
        },
      });
    }

    req.resolvedRole = role;
    return next();
  } catch (err) {
    console.error("requireFirestoreAdmin:", err);
    return res.status(500).json({
      ok: false,
      error: "Error verificando permisos",
      details: err?.message || String(err),
    });
  }
}
