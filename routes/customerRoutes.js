import express from "express";
import {
  getCustomers,
  getCustomerById,
  findCustomerByPhone,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controller/customerController.js";

const router = express.Router();

router.get("/customers", getCustomers);
router.get("/customers/lookup", findCustomerByPhone);
router.get("/customers/:id", getCustomerById);
router.post("/customers", createCustomer);
router.patch("/customers/:id", updateCustomer);
router.delete("/customers/:id", deleteCustomer);

export default router;
