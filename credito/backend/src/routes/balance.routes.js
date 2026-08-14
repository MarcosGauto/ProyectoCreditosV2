import express from "express";
import { createBalance, getBalanceByCuit } from "../controllers/balance.controller.js";

const router = express.Router();

router.post("/", createBalance);
router.get("/:cuit", getBalanceByCuit);

export default router;
