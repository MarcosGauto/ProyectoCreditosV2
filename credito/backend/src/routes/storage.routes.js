import { Router } from "express";
import * as storageController from "../controllers/storage.controller.js";

const router = Router();

router.post("/upload", storageController.uploadFile);
router.delete("/:path", storageController.deleteFile);

export default router;
