import express from "express";

import {
  getShapes,
  getShapeById,
  createShape,
  updateShape,
  deleteShape,
} from "../controller/shapeController.js";

const router = express.Router();

router.get("/shapes", getShapes);
router.get("/shapes/:id", getShapeById);
router.post("/shapes", createShape);
router.patch("/shapes/:id", updateShape);
router.delete("/shapes/:id", deleteShape);

export default router;