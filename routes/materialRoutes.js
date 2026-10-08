import express from "express";
import { authMiddleware, adminMiddleware } from "../middleware/index.middleware.js";
import {
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialStock,
  getMaterialTransactions,
  addMaterialUsage,
  addMaterialAdjustment,
  getLowStockMaterials,
  createMaterialPurchase,
  getMaterialPurchases,
  getMaterialPurchaseById,
} from "../controller/materialController.js";

const router = express.Router();

// Material Master (CRUD)
router.get("/materials", getMaterials);
router.get("/materials/low-stock", getLowStockMaterials);
router.get("/materials/:id", getMaterialById);
router.post("/materials", authMiddleware, adminMiddleware, createMaterial);
router.patch("/materials/:id", authMiddleware, adminMiddleware, updateMaterial);
router.delete("/materials/:id", authMiddleware, adminMiddleware, deleteMaterial);

// Material Stock & Transactions
router.get("/materials/:id/stock", getMaterialStock);
router.get("/materials/:id/transactions", getMaterialTransactions);

// Material Usage & Adjustment (stok keluar / koreksi)
router.post("/materials/:id/usage", authMiddleware, adminMiddleware, addMaterialUsage);
router.post("/materials/:id/adjustment", authMiddleware, adminMiddleware, addMaterialAdjustment);

// Material Purchases (Pembelian Bahan)
router.post("/material-purchases", authMiddleware, adminMiddleware, createMaterialPurchase);
router.get("/material-purchases", getMaterialPurchases);
router.get("/material-purchases/:id", getMaterialPurchaseById);

export default router;