import express from "express";
import * as documentController from "../controllers/document.controller.js";

const router = express.Router();

router.post("/upload", documentController.uploadDocument);
router.get("/", documentController.getAllDocuments);
router.delete("/:id", documentController.deleteDocument);

export default router;
