import Product from '../models/product.js';
import Shape from '../models/shape.js';
import Size from '../models/size.js';
import Flavor from '../models/flavors.js';
import ProductVariant from '../models/productvariants.js';
import { Op } from 'sequelize';

export const getProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{
        model: ProductVariant,
        as: 'productvariants',
        include: [
          { model: Shape, as: 'shape' },
          { model: Size, as: 'size' },
          { model: Flavor, as: 'flavor' },
        ],
      }],
      order: [['id', 'ASC']],
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const data = await Product.findByPk(req.params.id, {
      include: [{
        model: ProductVariant,
        as: 'productvariants',
        include: [
          { model: Shape, as: 'shape' },
          { model: Size, as: 'size' },
          { model: Flavor, as: 'flavor' },
        ],
      }],
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
  const t = await Product.sequelize.transaction();
  try {
    const { name, description, type_id, is_active, variants } = req.body;

    if (!name || !type_id) {
      return res.status(400).json({ message: 'Name dan type_id wajib diisi' });
    }

    // Validate each variant if provided
    if (variants && Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        if (!v.shape_id || !v.size_id || !v.flavor_id || v.price === undefined) {
          return res.status(400).json({ message: 'Setiap variant harus memiliki shape_id, size_id, flavor_id, dan price' });
        }
        if (typeof v.price !== 'number' || v.price < 0) {
          return res.status(400).json({ message: 'Harga variant harus berupa angka positif' });
        }
      }

      // Check for duplicate combinations
      const comboKeys = variants.map(v => `${v.shape_id}-${v.size_id}-${v.flavor_id}`);
      const uniqueCombos = new Set(comboKeys);
      if (comboKeys.length !== uniqueCombos.size) {
        return res.status(400).json({ message: 'Terdapat kombinasi variant yang duplikat' });
      }
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Create product
    const product = await Product.create({
      name,
      slug,
      description: description || null,
      type_id,
      is_active: is_active !== undefined ? is_active : true,
    }, { transaction: t });

    // Create all variants if provided
    let createdVariants = [];
    if (variants && Array.isArray(variants) && variants.length > 0) {
      createdVariants = await Promise.all(variants.map(v =>
        ProductVariant.create({
          product_id: product.id,
          shape_id: v.shape_id,
          size_id: v.size_id,
          flavor_id: v.flavor_id,
          price: v.price,
          is_active: v.is_active !== undefined ? v.is_active : true,
        }, { transaction: t })
      ));
    }

    await t.commit();

    res.status(201).json({
      message: 'Product berhasil ditambahkan',
      product,
      variants: createdVariants,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

export const addProductVariants = async (req, res) => {
  const t = await Product.sequelize.transaction();
  try {
    const { id } = req.params;
    const { variants } = req.body;

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ message: 'Minimal satu variant harus dipilih' });
    }

    // Check product exists
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Product tidak ditemukan' });
    }

    // Validate each variant
    for (const v of variants) {
      if (!v.shape_id || !v.size_id || !v.flavor_id || v.price === undefined) {
        return res.status(400).json({ message: 'Setiap variant harus memiliki shape_id, size_id, flavor_id, dan price' });
      }
      if (typeof v.price !== 'number' || v.price < 0) {
        return res.status(400).json({ message: 'Harga variant harus berupa angka positif' });
      }
    }

    // Check for duplicate combinations against existing variants
    const existingVariants = await ProductVariant.findAll({
      where: { product_id: id },
      transaction: t,
    });
    const existingMap = new Map(existingVariants.map(ev => [`${ev.shape_id}-${ev.size_id}-${ev.flavor_id}`, ev]));

    const newVariants = [];
    for (const v of variants) {
      const key = `${v.shape_id}-${v.size_id}-${v.flavor_id}`;
      if (existingMap.has(key)) {
        return res.status(400).json({ 
          message: `Kombinasi Shape=${v.shape_id}, Size=${v.size_id}, Flavor=${v.flavor_id} sudah ada untuk produk ini` 
        });
      }
      newVariants.push(v);
    }

    // Create all new variants
    const createdVariants = await Promise.all(newVariants.map(v =>
      ProductVariant.create({
        product_id: id,
        shape_id: v.shape_id,
        size_id: v.size_id,
        flavor_id: v.flavor_id,
        price: v.price,
        is_active: v.is_active !== undefined ? v.is_active : true,
      }, { transaction: t })
    ));

    await t.commit();

    res.status(201).json({
      message: 'Variant berhasil ditambahkan',
      variants: createdVariants,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  const t = await Product.sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, description, type_id, is_active, variants } = req.body;

    const product = await Product.findByPk(id, { transaction: t });
    if (!product) {
      return res.status(404).json({
        message: 'Product tidak ditemukan',
      });
    }

    // Update product basic info
    await product.update({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(type_id && { type_id }),
      ...(is_active !== undefined && { is_active }),
    }, { transaction: t });

    // If variants provided, handle variant updates
    if (variants && Array.isArray(variants)) {
      // Get existing variants
      const existingVariants = await ProductVariant.findAll({
        where: { product_id: id },
        transaction: t,
      });

      const existingMap = new Map(existingVariants.map(ev => [`${ev.shape_id}-${ev.size_id}-${ev.flavor_id}`, ev]));

      for (const v of variants) {
        const key = `${v.shape_id}-${v.size_id}-${v.flavor_id}`;
        const existing = existingMap.get(key);

        if (existing) {
          // Update existing variant price and active status
          await existing.update({
            ...(v.price !== undefined && { price: v.price }),
            ...(v.is_active !== undefined && { is_active: v.is_active }),
          }, { transaction: t });
          existingMap.delete(key);
        } else {
          // Create new variant
          await ProductVariant.create({
            product_id: id,
            shape_id: v.shape_id,
            size_id: v.size_id,
            flavor_id: v.flavor_id,
            price: v.price,
            is_active: v.is_active !== undefined ? v.is_active : true,
          }, { transaction: t });
        }
      }
    }

    await t.commit();

    // Fetch updated product with variants
    const updatedProduct = await Product.findByPk(id, {
      include: [{ model: ProductVariant, as: 'productvariants' }],
    });

    res.json({
      message: 'Product berhasil diperbarui',
      product: updatedProduct,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        message: 'Product tidak ditemukan',
      });
    }

    await product.destroy();
    res.json({
      message: 'Product berhasil dihapus',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === undefined) {
      return res.status(400).json({ message: 'Status wajib diisi (true/false)' });
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Product tidak ditemukan' });
    }

    await product.update({ is_active: status });
    res.json({
      message: 'Product status updated successfully',
      product,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
