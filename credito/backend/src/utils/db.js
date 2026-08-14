/**
 * Wrapper retrocompatible: garantiza inicialización (orden: admin.js → lib)
 * antes de reexportar db y auth para quienes importan desde utils/db.js.
 */
import "../admin.js";

export { db, auth } from "../lib/firebase-admin.js";
