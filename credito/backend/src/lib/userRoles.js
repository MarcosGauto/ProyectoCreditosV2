/** @typedef {"admin" | "analista" | "usuario"} UserRole */

export const USER_ROLES = /** @type {const} */ (["admin", "analista", "usuario"]);

export const DEFAULT_USER_ROLE = "usuario";

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
