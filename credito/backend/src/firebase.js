/**
 * Wrapper retrocompatible: asegura la misma cadena de inicialización que antes
 * (vía ./admin.js: env legacy + lib) y reexporta db, auth, bucket y el default admin.
 */
import admin from "./admin.js";

export { db, auth, bucket } from "./lib/firebase-admin.js";
export default admin;
