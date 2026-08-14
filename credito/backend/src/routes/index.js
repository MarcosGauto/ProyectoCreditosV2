import { Router } from "express";

// Import ES Modules (todas tus rutas reales)
import storageRoutes from "./storage.routes.js";
import balanceRoutes from "./balance.routes.js";
import documentRoutes from "./document.routes.js";
import usdRoutes from "./usd.routes.js";
import usersRoutes from "./users.routes.js";
import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
//import bankRoutes from "./bank.routes.js";
import clientsRoutes from "./clients.routes.js";
import pdfRoutes from "./pdf.routes.js";
import qualificationRoutes from "./qualification.routes.js";
import bcraRoutes from "./bcra.routes.js"; // ← esta es la ruta correcta
import ivaRoutes from "./iva.routes.js";
import iibbRoutes from "./iibb.routes.js";



const router = Router();

// Registrar rutas
router.use("/storage", storageRoutes);
router.use("/balance", balanceRoutes);
router.use("/document", documentRoutes);
router.use("/usd", usdRoutes);
router.use("/users", usersRoutes);
router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
//router.use("/bank", bankRoutes);
router.use("/clients", clientsRoutes);
router.use("/pdf", pdfRoutes);
router.use("/qualification", qualificationRoutes);
router.use("/bcra", bcraRoutes);
router.use("/qualification", qualificationRoutes);
router.use("/iva", ivaRoutes);
router.use("/iibb", iibbRoutes);

export default router;
