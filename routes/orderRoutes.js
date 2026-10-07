import express from "express";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  updateOrderPayment,
  deleteOrder,
} from "../controller/orderController.js";

const router = express.Router();

router.get("/orders", getOrders);
router.get("/orders/:id", getOrderById);
router.post("/orders", createOrder);
router.patch("/orders/:id", updateOrder);
router.patch("/orders/:id/status", updateOrderStatus);
router.patch("/orders/:id/payment", updateOrderPayment);
router.delete("/orders/:id", deleteOrder);

export default router;