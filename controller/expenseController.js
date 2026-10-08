import Expense from "../models/expense.js";
import ExpenseCategory from "../models/expense_category.js";
import db from "../config/dababase.js";

// Generate nomor expense: EXP-YYYYMMDD-XXXXX
const generateExpenseNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `EXP-${datePart}-${randomPart}`;
};

export const getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 20, category_id, start_date, end_date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (category_id) where.category_id = category_id;
    if (start_date) where.expense_date = { ...where.expense_date, [db.Sequelize.Op.gte]: start_date };
    if (end_date) where.expense_date = { ...where.expense_date, [db.Sequelize.Op.lte]: end_date };

    const { count, rows } = await Expense.findAndCountAll({
      where,
      include: [{ model: ExpenseCategory, as: "category", attributes: ["id", "name"] }],
      order: [["expense_date", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      data: rows,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      totalItems: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id, {
      include: [{ model: ExpenseCategory, as: "category" }],
    });
    if (!expense) {
      return res.status(404).json({ message: "Expense tidak ditemukan" });
    }
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    const { categoryId, amount, expenseDate, description, paymentMethod, receipt } = req.body;

    // Validasi
    if (!categoryId || !amount || !expenseDate || !description || !paymentMethod) {
      return res.status(400).json({ message: "categoryId, amount, expenseDate, description, paymentMethod wajib diisi" });
    }
    if (Number(amount) <= 0) {
      return res.status(400).json({ message: "Amount harus lebih dari 0" });
    }
    if (!["TRANSFER", "CASH"].includes(paymentMethod)) {
      return res.status(400).json({ message: "paymentMethod harus TRANSFER atau CASH" });
    }
    if (Number.isNaN(Date.parse(expenseDate))) {
      return res.status(400).json({ message: "expenseDate tidak valid" });
    }

    const category = await ExpenseCategory.findByPk(categoryId);
    if (!category || !category.is_active) {
      return res.status(404).json({ message: "Kategori expense tidak ditemukan atau tidak aktif" });
    }

    const expense = await Expense.create({
      expense_number: generateExpenseNumber(),
      category_id: categoryId,
      amount,
      expense_date: expenseDate,
      description,
      payment_method: paymentMethod,
      receipt: receipt || null,
      created_by: req.user?.id || null,
    });

    res.status(201).json({
      message: "Expense berhasil dibuat",
      data: expense,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense tidak ditemukan" });
    }

    // Whitelist field yang boleh diubah
    const { categoryId, amount, expenseDate, description, paymentMethod, receipt } = req.body;
    const updateData = {};

    if (categoryId !== undefined) {
      const category = await ExpenseCategory.findByPk(categoryId);
      if (!category || !category.is_active) {
        return res.status(404).json({ message: "Kategori expense tidak valid" });
      }
      updateData.category_id = categoryId;
    }
    if (amount !== undefined) {
      if (Number(amount) <= 0) {
        return res.status(400).json({ message: "Amount harus lebih dari 0" });
      }
      updateData.amount = amount;
    }
    if (expenseDate !== undefined) {
      if (Number.isNaN(Date.parse(expenseDate))) {
        return res.status(400).json({ message: "expenseDate tidak valid" });
      }
      updateData.expense_date = expenseDate;
    }
    if (description !== undefined) {
      if (!String(description).trim()) {
        return res.status(400).json({ message: "Description tidak boleh kosong" });
      }
      updateData.description = description;
    }
    if (paymentMethod !== undefined) {
      if (!["TRANSFER", "CASH"].includes(paymentMethod)) {
        return res.status(400).json({ message: "paymentMethod harus TRANSFER atau CASH" });
      }
      updateData.payment_method = paymentMethod;
    }
    if (receipt !== undefined) updateData.receipt = receipt;

    await expense.update(updateData);
    res.json({
      message: "Expense berhasil diperbarui",
      data: expense,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense tidak ditemukan" });
    }
    await expense.destroy();
    res.json({ message: "Expense berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};