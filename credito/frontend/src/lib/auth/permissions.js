import { normalizeUserRole } from "@/lib/auth/usersModel";

/** @typedef {import("./usersModel").UserRole} UserRole */

/**
 * @param {UserRole | string | null | undefined} role
 */
export function isAdminRole(role) {
  return normalizeUserRole(role) === "admin";
}

/**
 * @param {UserRole | string | null | undefined} role
 */
export function isAnalistaRole(role) {
  return normalizeUserRole(role) === "analista";
}

/**
 * @param {UserRole | string | null | undefined} role
 */
export function isUsuarioRole(role) {
  return normalizeUserRole(role) === "usuario";
}

export const PERMISSIONS = {
  GESTION_USUARIOS: ["admin"],
  IMPORT_COEFICIENTES: ["admin"],
  CONFIG_COEFICIENTES: ["admin"],
  HISTORIAL_COEFICIENTES: ["admin"],
  CONFIG_CREDITICIA: ["admin"],
  CALIFICACION_CREDITICIA: ["admin", "analista"],
  VISUALIZAR_COEFICIENTES: ["admin", "analista", "usuario"],
  CONSULTAS: ["admin", "analista", "usuario"],
};

/**
 * @param {UserRole | string | null | undefined} role
 * @param {keyof typeof PERMISSIONS} permission
 */
export function canAccess(role, permission) {
  const allowed = PERMISSIONS[permission] ?? [];
  return allowed.includes(normalizeUserRole(role));
}
