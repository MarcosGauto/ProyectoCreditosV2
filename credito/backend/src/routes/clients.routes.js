import { Router } from "express";
import { getClient, updateClientCtrl, deleteClientCtrl } from "../controllers/client.controller.js";

const router = Router();

router.get("/:cuit", getClient);
router.put("/:cuit", updateClientCtrl);
router.delete("/:cuit", deleteClientCtrl);

export default router;
