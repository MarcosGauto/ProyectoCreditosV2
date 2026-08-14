import express from "express";
import {
  getQualification,
  calculateQualification
} from "../controllers/qualification.controller.js";

const router = express.Router();

router.get("/:cuit", getQualification);
router.delete("/:cuit", calculateQualification);

export default router;
