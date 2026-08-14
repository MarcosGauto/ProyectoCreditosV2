import express from "express";
import admin from "../admin.js";
import { authenticateToken } from "../middlewares/firebaseAuth.js";
import { requireFirestoreAdmin } from "../middlewares/requireFirestoreAdmin.js";
import { isValidUserRole, normalizeUserRole } from "../lib/userRoles.js";
import {
  ensureCurrentUserProfile,
  listUsers,
  promoteUserToAdmin,
  updateUserRole,
} from "../services/users.service.js";

const router = express.Router();

async function resolveRole(decoded) {
  const profile = await ensureCurrentUserProfile(decoded);
  return normalizeUserRole(profile.role || decoded.role);
}

/**
 * GET /api/users/me
 */
router.get("/me", async (req, res) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const token = header.replace("Bearer ", "");
    const decoded = await admin.auth().verifyIdToken(token);
    const profile = await ensureCurrentUserProfile(decoded);

    return res.json({
      uid: profile.uid,
      email: profile.email,
      displayName: profile.displayName,
      name: profile.displayName,
      picture: decoded.picture || null,
      role: profile.role,
      createdAt: profile.createdAt,
    });
  } catch (error) {
    console.error("❌ Error verificando token:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
});

/**
 * GET /api/users — solo admin
 */
router.get("/", authenticateToken, requireFirestoreAdmin, async (_req, res) => {
  try {
    const users = await listUsers();
    return res.json(users);
  } catch (err) {
    console.error("GET /api/users", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/users/:uid — actualizar rol (solo admin)
 */
router.patch(
  "/:uid",
  authenticateToken,
  requireFirestoreAdmin,
  async (req, res) => {
    try {
      const { uid } = req.params;
      const { role } = req.body ?? {};

      if (!isValidUserRole(role)) {
        return res.status(400).json({ error: "Rol inválido" });
      }

      const updated = await updateUserRole(uid, role);
      return res.json(updated);
    } catch (err) {
      console.error("PATCH /api/users/:uid", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /api/users/:uid/promote-admin — atajo para promover a admin
 */
router.post(
  "/:uid/promote-admin",
  authenticateToken,
  requireFirestoreAdmin,
  async (req, res) => {
    try {
      const { uid } = req.params;
      const updated = await promoteUserToAdmin(uid);
      return res.json(updated);
    } catch (err) {
      console.error("POST promote-admin", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

export default router;
