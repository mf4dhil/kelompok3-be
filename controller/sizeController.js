import Size from "../models/size.js";

export const getSizes = async (req, res) => {
  try {
    const data = await Size.findAll({
      order: [["id", "ASC"]],
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSizeById = async (req, res) => {
  try {
    const data = await Size.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Size tidak ditemukan",
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createSize = async (req, res) => {
  try {
    const data = await Size.create(req.body);

    res.status(201).json({
      message: "Size berhasil ditambahkan",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSize = async (req, res) => {
  try {
    const data = await Size.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Size tidak ditemukan",
      });
    }

    await data.update(req.body);

    res.json({
      message: "Size berhasil diperbarui",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSize = async (req, res) => {
  try {
    const data = await Size.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Size tidak ditemukan",
      });
    }

    await data.destroy();

    res.json({
      message: "Size berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};