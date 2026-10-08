import express from "express";
import uploadMiddleware from "../middleware/uploadMiddleware.js";
import { authMiddleware, adminMiddleware } from "../middleware/index.middleware.js";
import {
  getOrders,
  getOrderById,
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
router.get("/orders/:id", getOrderById);
router.post("/orders", createOrder);
router.patch("/orders/:id", updateOrder);
router.patch("/orders/:id/status", updateOrderStatus);
router.patch("/orders/:id/payment", updateOrderPayment);
router.delete("/orders/:id", deleteOrder);

// Routes Pembayaran (Normalisasi)
router.get("/payments", getPayments);
router.get("/payments/:id", getPaymentById);
router.post("/payments", authMiddleware, uploadMiddleware.single('payment_proof'), createPayment);
router.patch("/payments/:id", authMiddleware, uploadMiddleware.single('payment_proof'), updatePayment);
router.delete("/payments/:id", deletePayment);

export default router;