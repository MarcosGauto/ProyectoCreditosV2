// backend/routes/auth.routes.js
import { Router } from "express";
import firebaseAuth from "../middlewares/firebaseAuth.js";
import { bootstrapAdmin, me, verifyToken } from "../controllers/auth.controller.js";

const router = Router();

router.get("/me", firebaseAuth, me);
router.post("/bootstrap-admin", firebaseAuth, bootstrapAdmin);
router.post("/verify", verifyToken);

export default router;
