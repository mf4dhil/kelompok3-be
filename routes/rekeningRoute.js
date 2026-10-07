import express from "express";

import {
  getRekenings,
  getRekeningById,
  createRekening,
  updateRekening,
  deleteRekening,
} from "../controller/rekeningController.js";

const router = express.Router();

router.get("/rekenings", getRekenings);
router.get("/rekenings/:id", getRekeningById);
router.post("/rekenings", createRekening);
router.patch("/rekenings/:id", updateRekening);
router.delete("/rekenings/:id", deleteRekening);

export default router;