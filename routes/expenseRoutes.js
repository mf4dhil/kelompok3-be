import express from "express";
import { authMiddleware, adminMiddleware } from "../middleware/index.middleware.js";
import {
  getExpenseCategories,
  getExpenseCategoryById,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from "../controller/expenseCategoryController.js";
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../controller/expenseController.js";

const router = express.Router();

// Expense Categories
router.get("/expense-categories", getExpenseCategories);
router.get("/expense-categories/:id", getExpenseCategoryById);
router.post("/expense-categories", authMiddleware, adminMiddleware, createExpenseCategory);
router.patch("/expense-categories/:id", authMiddleware, adminMiddleware, updateExpenseCategory);
router.delete("/expense-categories/:id", authMiddleware, adminMiddleware, deleteExpenseCategory);

// Expenses
router.get("/expenses", getExpenses);
router.get("/expenses/:id", getExpenseById);
router.post("/expenses", authMiddleware, adminMiddleware, createExpense);
router.patch("/expenses/:id", authMiddleware, adminMiddleware, updateExpense);
router.delete("/expenses/:id", authMiddleware, adminMiddleware, deleteExpense);

export default router;