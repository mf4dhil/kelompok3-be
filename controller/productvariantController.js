import ProductVariant from "../models/productvariants.js";
import Product from "../models/product.js";
import Shape from "../models/shape.js";
import Size from "../models/size.js";
import Flavor from "../models/flavors.js";

export const getProductVariants = async (req, res) => {
  try {
    const data = await ProductVariant.findAll({
      include: [Product, Shape, Size, Flavor],
      order: [["id", "ASC"]],
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProductVariantById = async (req, res) => {
  try {
    const data = await ProductVariant.findByPk(req.params.id, {
      include: [Product, Shape, Size, Flavor],
    });

    if (!data) {
      return res.status(404).json({
        message: "Product variant tidak ditemukan",
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProductVariant = async (req, res) => {
  try {
    const { product_id, shape_id, size_id, flavor_id } = req.body;

    const product = await Product.findByPk(product_id);
    const shape = await Shape.findByPk(shape_id);
    const size = await Size.findByPk(size_id);
    const flavor = await Flavor.findByPk(flavor_id);

    if (!product) {
      return res.status(404).json({
        message: "Product tidak ditemukan",
      });
    }

    if (!shape) {
      return res.status(404).json({
        message: "Shape tidak ditemukan",
      });
    }

    if (!size) {
      return res.status(404).json({
        message: "Size tidak ditemukan",
      });
    }

    if (!flavor) {
      return res.status(404).json({
        message: "Flavor tidak ditemukan",
      });
    }

    const data = await ProductVariant.create(req.body);

    res.status(201).json({
      message: "Product variant berhasil ditambahkan",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProductVariant = async (req, res) => {
  try {
    const data = await ProductVariant.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Product variant tidak ditemukan",
      });
    }

    await data.update(req.body);

    res.json({
      message: "Product variant berhasil diperbarui",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProductVariant = async (req, res) => {
  try {
    const data = await ProductVariant.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Product variant tidak ditemukan",
      });
    }

    await data.destroy();

    res.json({
      message: "Product variant berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};