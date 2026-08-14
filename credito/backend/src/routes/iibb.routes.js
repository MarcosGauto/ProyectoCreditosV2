import { Router } from "express";
import {
  handleCreateIIBB,
  handleGetIIBB,
  handleDeleteIIBB
} from "../controllers/iibb.controller.js";

const router = Router();

router.post("/", handleCreateIIBB);
router.get("/:cuit", handleGetIIBB);
router.delete("/:id", handleDeleteIIBB);

export default router;
