import Product from "../models/product.js";
import Type from "../models/type.js";
import Shape from "../models/shape.js";
import Size from "../models/shape.js";
import Flavor from "../models/flavors.js";
import Categories from "../models/categories.js";
import ProductVariant from "../models/productvariants.js";

export const getProducts = async (req, res) => {
  try {
    const data = await Product.findAll({
      include: [
        {
          model: Type,
          include: [Categories],
        },
        {
          model: ProductVariant,
          include: [Shape, Size, Flavor],
        },
      ],
      order: [["id", "ASC"]],
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const data = await Product.findByPk(req.params.id, {
      include: [
        {
          model: Type,
          include: [Categories],
        },
        {
          model: ProductVariant,
          include: [Shape, Size, Flavor],
        },
      ],
    });

    if (!data) {
      return res.status(404).json({
        message: "Product tidak ditemukan",
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const type = await Type.findByPk(req.body.type_id);

    if (!type) {
      return res.status(404).json({
        message: "Type tidak ditemukan",
      });
    }

    const data = await Product.create(req.body);

    res.status(201).json({
      message: "Product berhasil ditambahkan",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const data = await Product.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Product tidak ditemukan",
      });
    }

    await data.update(req.body);

    res.json({
      message: "Updated Product",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const data = await Product.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Product tidak ditemukan",
      });
    }

    await data.destroy();

    res.json({
      message: "Deleted Product",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};