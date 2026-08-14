import admin from "../admin.js";

// 🔹 Verifica token y agrega req.user
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer (.*)$/);

    const idToken = match ? match[1] : null;

    if (!idToken) {
      return res.status(401).json({ ok: false, error: "No token provided" });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);

    req.user = decoded;

    return next();
  } catch (err) {
    console.error("authenticateToken error:", err?.message || err);
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}

// 🔹 Middleware para validar roles
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || !req.user.role || req.user.role !== role) {
      return res.status(403).json({ ok: false, error: "Access denied" });
    }
    next();
  };
}

// 🔹 Default export (si lo usa alguna ruta)
export default authenticateToken;
