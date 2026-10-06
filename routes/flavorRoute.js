import express from "express";

import {
  getFlavors,
  getFlavorById,
  createFlavor,
  updateFlavor,
  deleteFlavor,
} from "../controller/flavorController.js";

const router = express.Router();

router.get("/flavors", getFlavors);
router.get("/flavors/:id", getFlavorById);
router.post("/flavors", createFlavor);
router.patch("/flavors/:id", updateFlavor);
router.delete("/flavors/:id", deleteFlavor);

export default router;