import express from "express";

import {
  getSizes,
  getSizeById,
  createSize,
  updateSize,
  deleteSize,
} from "../controller/sizeController.js";

const router = express.Router();

router.get("/size", getSizes);
router.get("/size/:id", getSizeById);
router.post("/size", createSize);
router.patch("/size/:id", updateSize);
router.delete("/size/:id", deleteSize);

export default router;