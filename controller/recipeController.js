import { Op } from "sequelize";
import db from "../config/dababase.js";
import Product from "../models/product.js";
import ProductVariant from "../models/productvariants.js";
import ProductVariantMaterial from "../models/product_variant_material.js";
import Material from "../models/material.js";
import Shape from "../models/shape.js";
import Size from "../models/size.js";
import Flavor from "../models/flavors.js";

export const getRecipes = async (_req, res) => {
  try {
    const variants = await ProductVariant.findAll({
      include: [
        { model: Product, attributes: ["id", "name"] },
        { model: Shape, attributes: ["id", "name"] },
        { model: Size, attributes: ["id", "name"] },
        { model: Flavor, attributes: ["id", "name"] },
        {
          model: ProductVariantMaterial,
          as: "recipe_items",
          include: [{ model: Material, as: "material", attributes: ["id", "name", "unit", "is_active"] }],
        },
      ],
      order: [["id", "ASC"]],
    });

    res.json({ data: variants });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRecipe = async (req, res) => {
  const transaction = await db.transaction();
  try {
    const variant = await ProductVariant.findByPk(req.params.variantId, { transaction });
    if (!variant) {
      await transaction.rollback();
      return res.status(404).json({ message: "Varian produk tidak ditemukan" });
    }

    const { items } = req.body || {};
    if (!Array.isArray(items)) {
      await transaction.rollback();
      return res.status(400).json({ message: "items harus berupa array resep" });
    }
    if (items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "Resep wajib memiliki minimal satu bahan baku" });
    }

    const normalized = new Map();
    for (const item of items) {
      const materialId = Number(item.material_id);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(materialId) || materialId < 1 || !Number.isFinite(quantity) || quantity <= 0) {
        await transaction.rollback();
        return res.status(400).json({ message: "Setiap bahan harus memiliki material_id dan takaran lebih dari 0" });
      }
      normalized.set(materialId, (normalized.get(materialId) || 0) + quantity);
    }

    const materialIds = [...normalized.keys()];
    if (materialIds.length) {
      const materials = await Material.findAll({
        where: { id: { [Op.in]: materialIds }, is_active: true },
        attributes: ["id"],
        transaction,
      });
      if (materials.length !== materialIds.length) {
        await transaction.rollback();
        return res.status(400).json({ message: "Resep berisi bahan yang tidak ditemukan atau tidak aktif" });
      }
    }

    await ProductVariantMaterial.destroy({ where: { product_variant_id: variant.id }, transaction });
    if (normalized.size) {
      await ProductVariantMaterial.bulkCreate(
        [...normalized].map(([material_id, quantity]) => ({
          product_variant_id: variant.id,
          material_id,
          quantity,
        })),
        { transaction },
      );
    }

    await transaction.commit();
    res.json({ message: "Resep varian berhasil disimpan" });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};
