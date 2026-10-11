import express from "express";
import { authMiddleware, adminMiddleware } from "../middleware/index.middleware.js";
import { exportReport, getReportSummary } from "../controller/reportController.js";

const router = express.Router();

router.get("/reports/summary", authMiddleware, adminMiddleware, getReportSummary);
router.get("/reports/export", authMiddleware, adminMiddleware, exportReport);

export default router;
