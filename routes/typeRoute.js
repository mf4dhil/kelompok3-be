import express from "express";

import {
  getTypes,
  getTypeById,
  createType,
  updateType,
  deleteType,
} from "../controller/typeController.js";

const router = express.Router();

router.get("/types", getTypes);
router.get("/types/:id", getTypeById);
router.post("/types", createType);
router.patch("/types/:id", updateType);
router.delete("/types/:id", deleteType);

export default router;