/**
 * Resolución de rol de usuario (custom claims + lista de emails admin).
 */

/**
 * @returns {string[]}
 */
export function getConfiguredAdminEmails() {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * @param {unknown} claimRole
 * @param {string | null | undefined} email
 * @returns {string | null}
 */
export function resolveUserRole(claimRole, email) {
  if (typeof claimRole === "string" && claimRole.trim()) {
    return claimRole.trim().toLowerCase();
  }

  const emailNorm = email?.trim().toLowerCase();
  if (emailNorm && getConfiguredAdminEmails().includes(emailNorm)) {
    return "admin";
  }

  return null;
}

/**
 * @param {string | null | undefined} role
 * @param {string | null | undefined} email
 */
export function isAdminUser(role, email) {
  return resolveUserRole(role, email) === "admin";
}

/**
 * @returns {string}
 */
export function getAuthApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000"
  );
}

/**
 * @param {import("firebase/auth").User} firebaseUser
 * @returns {Promise<string | null>}
 */
export async function fetchRoleFromApi(firebaseUser) {
  try {
    const token = await firebaseUser.getIdToken();
    const res = await fetch(`${getAuthApiBaseUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user?.role ?? data.role ?? null;
  } catch (err) {
    console.warn("[userRole] fetchRoleFromApi:", err);
    return null;
  }
}

/**
 * Asigna claim admin en Firebase si el email está en ADMIN_EMAILS del backend.
 * @param {import("firebase/auth").User} firebaseUser
 */
export async function tryBootstrapAdminClaim(firebaseUser) {
  try {
    const token = await firebaseUser.getIdToken();
    const res = await fetch(`${getAuthApiBaseUrl()}/api/auth/bootstrap-admin`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    await firebaseUser.getIdToken(true);
    return data.role ?? "admin";
  } catch (err) {
    console.warn("[userRole] tryBootstrapAdminClaim:", err);
    return null;
  }
}
