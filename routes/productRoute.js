import express from "express";
import { 
    createDraftProduct, 
    createProduct,
     createVariantErrorCheck, 
     deleteProduct, 
     deleteProductErrorCheck, 
     getProductById, 
     getProducts, 
     updateProduct, 
     updateProductVariant, 
     uploadProductImage } from "../controller/productController.js";

const router = express.Router();

router.get("/products", getProducts);
router.get("/products/:id", getProductById);
router.post("/products", createProduct);
router.post("/products", createDraftProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);
router.patch("/products/:id/image", uploadProductImage);
router.put("/products/variants/:variantId", updateProductVariant);
router.delete("/products/:id/error-check", deleteProductErrorCheck);
router.post("/products/variants/error-check", createVariantErrorCheck );

export default router;