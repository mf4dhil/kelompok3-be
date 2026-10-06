import Product from "../models/product.js";
import Type from "../models/type.js";
import Shape from "../models/shape.js";
import Size from "../models/size.js";
import Flavor from "../models/flavors.js";
import Categories from "../models/categories.js";
import ProductVariant from "../models/productvariants.js";

// Helper slug generator
const createSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

// 1. GET /api/products - Daftar Produk
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

// 2. GET /api/products/:id - Detail Produk
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
      return res.status(404).json({ message: "Product tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. POST /api/products - Tambah Produk (+ Varian PO)
export const createProduct = async (req, res) => {
  try {
    const { type_id, name, description, image, is_active, variants } = req.body;

    const type = await Type.findByPk(type_id);
    if (!type) {
      return res.status(404).json({ message: "Type tidak ditemukan" });
    }

    const slug = createSlug(name);
    const existingProduct = await Product.findOne({ where: { slug } });
    if (existingProduct) {
      return res.status(400).json({ message: "Nama/slug produk sudah digunakan" });
    }

    const newProduct = await Product.create({
      type_id,
      name,
      slug,
      description,
      image: image || null,
      is_active: is_active ?? true,
    });

    if (variants && Array.isArray(variants) && variants.length > 0) {
      const variantData = variants.map((v) => ({
        ...v,
        product_id: newProduct.id,
      }));
      await ProductVariant.bulkCreate(variantData);
    }

    res.status(201).json({
      message: "Product PO kue berhasil ditambahkan",
      data: newProduct,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. POST /api/products/draft - Tambah Produk Sementara
export const createDraftProduct = async (req, res) => {
  try {
    const { name, type_id } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Nama produk sementara wajib diisi" });
    }

    const slug = createSlug(`${name}-draft-${Date.now()}`);

    const draftProduct = await Product.create({
      name: `${name} (Draft)`,
      slug,
      type_id: type_id || 1,
      is_active: false,
    });

    res.status(201).json({
      message: "Produk sementara (draft) berhasil dibuat",
      data: draftProduct,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. PUT /api/products/:id - Ubah Produk
export const updateProduct = async (req, res) => {
  try {
    const { name } = req.body;
    const data = await Product.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Product tidak ditemukan" });
    }

    let payload = { ...req.body };
    if (name && name !== data.name) {
      payload.slug = createSlug(name);
    }

    await data.update(payload);

    res.json({
      message: "Updated Product",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 6. DELETE /api/products/:id - Hapus Produk
export const deleteProduct = async (req, res) => {
  try {
    const data = await Product.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Product tidak ditemukan" });
    }

    await ProductVariant.destroy({ where: { product_id: data.id } });
    await data.destroy();

    res.json({ message: "Deleted Product" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 7. DELETE /api/products/:id/error-check - Contoh Error Hapus Produk
export const deleteProductErrorCheck = async (req, res) => {
  try {
    const data = await Product.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Product tidak ditemukan" });
    }

    // Simulasi penolakan penghapusan jika terikat transaksi PO
    return res.status(400).json({
      message: "Gagal menghapus! Produk terikat dengan data transaksi PO aktif.",
      error: "FK_CONSTRAINT_TRANSACTION_EXISTS",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 8. PUT /api/products/variants/:variantId - Ubah Satuan & Harga
export const updateProductVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    const variant = await ProductVariant.findByPk(variantId);

    if (!variant) {
      return res.status(404).json({ message: "Varian produk tidak ditemukan" });
    }

    await variant.update(req.body);

    res.json({
      message: "Satuan & harga varian berhasil diubah",
      data: variant,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 9. POST /api/products/variants/error-check - Contoh Error Satuan Tidak Valid
export const createVariantErrorCheck = async (req, res) => {
  try {
    const { price, shape_id, size_id } = req.body;

    if (!price || price <= 0 || !shape_id || !size_id) {
      return res.status(422).json({
        message: "Validasi Gagal: Satuan, ukuran, atau harga tidak valid",
        errors: {
          price: !price || price <= 0 ? "Harga harus lebih dari 0" : null,
          shape_id: !shape_id ? "Bentuk kue wajib dipilih" : null,
          size_id: !size_id ? "Ukuran kue wajib dipilih" : null,
        },
      });
    }

    res.json({ message: "Validasi berhasil" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 10. PATCH /api/products/:id/image - Upload Gambar Produk
export const uploadProductImage = async (req, res) => {
  try {
    const data = await Product.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Product tidak ditemukan" });
    }

    // Mengambil path/URL dari req.file (multer) atau req.body.image
    const imageUrl = req.file ? req.file.path : req.body.image;

    if (!imageUrl) {
      return res.status(400).json({ message: "Gambar tidak boleh kosong" });
    }

    await data.update({ image: imageUrl });

    res.json({
      message: "Gambar produk berhasil diperbarui",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};