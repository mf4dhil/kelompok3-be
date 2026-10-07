import Type from "../models/type.js";
import Categories from "../models/categories.js"; // Menggunakan PascalCase agar jelas bedanya dengan variabel instance

export const getTypes = async (req, res) => {
  try {
    const data = await Type.findAll({
      include: [
        {
          model: Categories,
          attributes: ["id", "name", "slug"],
        },
      ],
      order: [["id", "ASC"]],
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTypeById = async (req, res) => {
  try {
    const data = await Type.findByPk(req.params.id, {
      include: [Categories],
    });

    if (!data) {
      return res.status(404).json({
        message: "Type tidak ditemukan",
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createType = async (req, res) => {
  try {
    // Sesuaikan dengan nama properti foreign key (category_id)
    const categoryId = req.body.category_id || req.body.category_id;
    const categoryExists = await Categories.findByPk(categoryId);

    if (!categoryExists) {
      return res.status(404).json({
        message: "Category tidak ditemukan",
      });
    }

    const data = await Type.create(req.body);

    res.status(201).json({
      message: "Type berhasil ditambahkan",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateType = async (req, res) => {
  try {
    const data = await Type.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Type tidak ditemukan",
      });
    }

    await data.update(req.body);

    res.json({
      message: "Type berhasil diperbarui",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteType = async (req, res) => {
  try {
    const data = await Type.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Type tidak ditemukan",
      });
    }

    await data.destroy();

    res.json({
      message: "Type berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};