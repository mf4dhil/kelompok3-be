import Categories from "../models/categories.js";

export const getCategories = async (req, res) => {
  try {
    const data = await Categories.findAll({
      order: [["id", "ASC"]],
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getcategoriesById = async (req, res) => {
  try {
    const data = await Categories.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "categories tidak ditemukan",
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createcategories = async (req, res) => {
  try {
    const data = await Categories.create(req.body);

    res.status(201).json({
      message: "categories berhasil ditambahkan",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatecategories = async (req, res) => {
  try {
    const data = await Categories.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "categories tidak ditemukan",
      });
    }

    await data.update(req.body);

    res.json({
      message: "categories berhasil diperbarui",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deletecategories = async (req, res) => {
  try {
    const data = await Categories.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "categories tidak ditemukan",
      });
    }

    await data.destroy();

    res.json({
      message: "categories berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};