/** @typedef {"admin" | "analista" | "usuario"} UserRole */

export const USERS_COLLECTION = "users";

export const USER_ROLES = /** @type {const} */ (["admin", "analista", "usuario"]);

export const DEFAULT_USER_ROLE = "usuario";

/** @type {{ value: UserRole; label: string }[]} */
export const USER_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "analista", label: "Analista" },
  { value: "usuario", label: "Usuario" },
];

/**
 * @typedef {{
 *   uid: string;
 *   email: string;
 *   displayName: string;
 *   role: UserRole;
 *   createdAt?: string | null;
 * }} UserProfile
 */

/**
 * @param {unknown} role
 * @returns {UserRole}
 */
export function normalizeUserRole(role) {
  const value = String(role ?? "")
    .trim()
    .toLowerCase();
  if (USER_ROLES.includes(/** @type {UserRole} */ (value))) {
    return /** @type {UserRole} */ (value);
  }
  return DEFAULT_USER_ROLE;
}

/**
 * @param {unknown} role
 */
export function isValidUserRole(role) {
  return USER_ROLES.includes(normalizeUserRole(role));
}

/**
 * @param {UserRole} role
 */
export function roleLabel(role) {
  return USER_ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
}
