// backend/routes/admin.routes.js
import express from "express";
import admin from "firebase-admin";
import { authenticateToken, requireRole } from "../middlewares/firebaseAuth.js";

const router = express.Router();

/**
 * 📌 Listar usuarios (solo admins)
 */
router.get("/users", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
        // Trae hasta 1000 usuarios (se puede paginar con pageToken)
        const listUsersResult = await admin.auth().listUsers(1000);
        const users = listUsersResult.users.map(user => ({
            uid: user.uid,
            email: user.email,
            role: user.customClaims?.role || "usuario", // default usuario
        }));

        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * 📌 Asignar rol (solo admins)
 */
router.post("/set-role", authenticateToken, requireRole("admin"), async (req, res) => {
    const { uid, role } = req.body;

    if (!["admin", "usuario"].includes(role)) {
        return res.status(400).json({ message: "Rol inválido" });
    }

    try {
        await admin.auth().setCustomUserClaims(uid, { role });
        res.status(200).json({ message: `Rol "${role}" asignado a usuario ${uid}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
