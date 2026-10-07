import Flavor from "../models/flavors.js";

export const getFlavors = async (req, res) => {
  try {
    const data = await Flavor.findAll({
      order: [["id", "ASC"]],
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFlavorById = async (req, res) => {
  try {
    const data = await Flavor.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Flavor tidak ditemukan",
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createFlavor = async (req, res) => {
  try {
    const data = await Flavor.create(req.body);

    res.status(201).json({
      message: "Flavor berhasil ditambahkan",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateFlavor = async (req, res) => {
  try {
    const data = await Flavor.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Flavor tidak ditemukan",
      });
    }

    await data.update(req.body);

    res.json({
      message: "Flavor berhasil diperbarui",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteFlavor = async (req, res) => {
  try {
    const data = await Flavor.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Flavor tidak ditemukan",
      });
    }

    await data.destroy();

    res.json({
      message: "Flavor berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};