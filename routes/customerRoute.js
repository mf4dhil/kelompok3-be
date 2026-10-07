import express from "express";
import {  
  createCustomer, 
  deleteCustomer,  
  getCustomerById, 
  getCustomers, 
  updateCustomer
} from "../controller/customerController.js";

const router = express.Router();

router.get("/customers", getCustomers);
router.get("/customers/:id", getCustomerById);
router.post("/customers", createCustomer);
router.patch("/customers/:id", updateCustomer);
router.delete("/customers/:id", deleteCustomer);

export default router;