import express from "express";

import { createcategories, deletecategories, getCategories, getcategoriesById, updatecategories } from "../controller/categoriesController.js";

const router = express.Router();

router.get("/categories", getCategories);
router.get("/categories/:id", getcategoriesById);
router.post("/categories", createcategories);
router.patch("/categories/:id", updatecategories);
router.delete("/categories/:id", deletecategories);

export default router;