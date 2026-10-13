import express from "express";
import uploadMiddleware from "../middleware/uploadMiddleware.js";
import { authMiddleware, adminMiddleware } from "../middleware/index.middleware.js";
import {
  getOrders,
  getOrderById,
  trackOrder,
  createOrder,
  updateOrder,
  updateOrderStatus,
  updateOrderPayment,
  deleteOrder,
} from "../controller/orderController.js";
import {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
} from "../controller/paymentController.js";

const router = express.Router();

router.get("/orders", getOrders);
router.get("/orders/track/:orderNumber", trackOrder);
router.get("/orders/:id", getOrderById);
router.post("/orders", createOrder);
router.patch("/orders/:id", authMiddleware, adminMiddleware, updateOrder);
router.patch("/orders/:id/status", authMiddleware, adminMiddleware, updateOrderStatus);
router.patch("/orders/:id/payment", authMiddleware, adminMiddleware, updateOrderPayment);
router.delete("/orders/:id", authMiddleware, adminMiddleware, deleteOrder);

// Routes Pembayaran (Normalisasi)
router.get("/payments", getPayments);
router.get("/payments/:id", getPaymentById);
router.post("/payments", authMiddleware, adminMiddleware, uploadMiddleware.single('payment_proof'), createPayment);
router.patch("/payments/:id", authMiddleware, adminMiddleware, uploadMiddleware.single('payment_proof'), updatePayment);
router.delete("/payments/:id", authMiddleware, adminMiddleware, deletePayment);

export default router;
