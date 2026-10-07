import express from "express";

import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
} from "../controller/orderController.js";

const router = express.Router();

router.get("/orders", getOrders);
router.get("/orders/:id", getOrderById);

router.post("/orders", createOrder);

router.patch("/orders/:id/status", updateOrderStatus);

router.delete("/orders/:id", deleteOrder);

export default router;