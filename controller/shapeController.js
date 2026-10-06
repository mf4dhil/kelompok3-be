import Shape from "../models/shape.js";

export const getShapes = async (req, res) => {
  try {
    const data = await Shape.findAll({
      order: [["id", "ASC"]],
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getShapeById = async (req, res) => {
  try {
    const data = await Shape.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Shape tidak ditemukan",
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createShape = async (req, res) => {
  try {
    const data = await Shape.create(req.body);

    res.status(201).json({
      message: "Shape berhasil ditambahkan",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateShape = async (req, res) => {
  try {
    const data = await Shape.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Shape tidak ditemukan",
      });
    }

    await data.update(req.body);

    res.json({
      message: "Shape berhasil diperbarui",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteShape = async (req, res) => {
  try {
    const data = await Shape.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Shape tidak ditemukan",
      });
    }

    await data.destroy();

    res.json({
      message: "Shape berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};