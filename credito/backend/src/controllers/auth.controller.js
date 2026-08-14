// backend/controllers/auth.controller.js
import { normalizeUserRole } from "../lib/userRoles.js";
import {
  ensureCurrentUserProfile,
  promoteUserToAdmin,
} from "../services/users.service.js";

function getAdminEmailsFromEnv() {
  return (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const me = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "No authenticated user" });
    }

    const profile = await ensureCurrentUserProfile(req.user);
    let role = normalizeUserRole(profile.role);

    const adminEmails = getAdminEmailsFromEnv();
    if (
      role !== "admin" &&
      req.user.email &&
      adminEmails.includes(req.user.email.toLowerCase())
    ) {
      const promoted = await promoteUserToAdmin(req.user.uid);
      role = normalizeUserRole(promoted.role);
    }

    return res.json({
      ok: true,
      user: {
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
        name: profile.displayName,
        role,
        createdAt: profile.createdAt,
      },
    });
  } catch (e) {
    console.error("auth.me error", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

export const bootstrapAdmin = async (req, res) => {
  try {
    if (!req.user?.email) {
      return res.status(400).json({ ok: false, error: "Usuario sin email" });
    }

    const adminEmails = getAdminEmailsFromEnv();
    const email = req.user.email.toLowerCase();

    if (!adminEmails.includes(email)) {
      return res.status(403).json({
        ok: false,
        error:
          "Email no autorizado. Agregue su correo a ADMIN_EMAILS o promuévalo desde Usuarios y Roles.",
      });
    }

    const updated = await promoteUserToAdmin(req.user.uid);

    return res.json({
      ok: true,
      role: updated.role,
      user: updated,
      message:
        "Rol admin asignado. Si la UI no actualiza, cierre sesión y vuelva a entrar.",
    });
  } catch (e) {
    console.error("auth.bootstrapAdmin error", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

export const verifyToken = async (req, res) => {
    try {
        // Este endpoint permite verificar un token enviado en body (útil para testing)
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ ok: false, error: "idToken required in body" });

        const decoded = await req.app.get("firebaseAdmin").auth().verifyIdToken(idToken).catch(async () => {
            // fallback si no guardaste admin en app
            // No necesario si usás import admin directamente:
        });

        // Si usás admin import:
        // import admin from '../firebase/admin.js'
        // const decoded = await admin.auth().verifyIdToken(idToken);

        return res.json({ ok: true, decoded });
    } catch (err) {
        console.error("verifyToken error", err);
        return res.status(401).json({ ok: false, error: "Invalid token" });
    }
};
