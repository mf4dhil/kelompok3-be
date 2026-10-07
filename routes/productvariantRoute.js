import express from "express";

import {
  getProductVariants,
  getProductVariantById,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
} from "../controller/productvariantController.js";

const router = express.Router();

router.get("/productvariants", getProductVariants);
router.get("/productvariants/:id", getProductVariantById);
router.post("/productvariants", createProductVariant);
router.patch("/productvariants/:id", updateProductVariant);
router.delete("/productvariants/:id", deleteProductVariant);

export default router;