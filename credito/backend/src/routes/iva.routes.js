import { Router } from "express";
import {
  handleCreateIVA,
  handleGetIVA,
  handleDeleteIVA
} from "../controllers/iva.controller.js";

const router = Router();

router.post("/", handleCreateIVA);
router.get("/:cuit", handleGetIVA);
router.delete("/:id", handleDeleteIVA);

export default router;
