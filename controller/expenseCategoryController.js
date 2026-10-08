import ExpenseCategory from "../models/expense_category.js";

export const getExpenseCategories = async (req, res) => {
  try {
    const data = await ExpenseCategory.findAll({ order: [["name", "ASC"]] });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExpenseCategoryById = async (req, res) => {
  try {
    const data = await ExpenseCategory.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Kategori expense tidak ditemukan" });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createExpenseCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Nama kategori wajib diisi" });
    }
    const existing = await ExpenseCategory.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ message: "Nama kategori sudah ada" });
    }
    const data = await ExpenseCategory.create({ name });
    res.status(201).json({ message: "Kategori expense berhasil ditambahkan", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateExpenseCategory = async (req, res) => {
  try {
    const data = await ExpenseCategory.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Kategori expense tidak ditemukan" });
    }
    await data.update(req.body);
    res.json({ message: "Kategori expense berhasil diperbarui", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteExpenseCategory = async (req, res) => {
  try {
    const data = await ExpenseCategory.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Kategori expense tidak ditemukan" });
    }
    await data.destroy();
    res.json({ message: "Kategori expense berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};