import Material from "../models/material.js";
import MaterialStock from "../models/material_stock.js";
import MaterialTransaction from "../models/material_transaction.js";
import MaterialPurchase from "../models/material_purchase.js";
import MaterialPurchaseItem from "../models/material_purchase_item.js";
import ExpenseCategory from "../models/expense_category.js";
import Expense from "../models/expense.js";
import db from "../config/dababase.js";

// Generate nomor dokumen: PREFIX-YYYYMMDD-XXXXX
const generateNumber = (prefix) => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${datePart}-${randomPart}`;
};

// DECIMAL dari MySQL dikembalikan sebagai string oleh Sequelize, konversi ke number
const toNumber = (value) => Number(value || 0);

const findMaterialWithStock = (id, options = {}) =>
  Material.findByPk(id, {
    include: [{ model: MaterialStock, as: "stock" }],
    ...options,
  });

// ---------------- MATERIAL (master) ----------------

export const getMaterials = async (req, res) => {
  try {
    const data = await Material.findAll({
      include: [{ model: MaterialStock, as: "stock", attributes: ["quantity"] }],
      order: [["name", "ASC"]],
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMaterialById = async (req, res) => {
  try {
    const data = await findMaterialWithStock(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Material tidak ditemukan" });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createMaterial = async (req, res) => {
  const t = await db.transaction();
  try {
    const { name, unit, minimum_stock = 0 } = req.body;

    if (!name || !String(name).trim()) {
      await t.rollback();
      return res.status(400).json({ message: "Nama material wajib diisi" });
    }
    if (!unit || !String(unit).trim()) {
      await t.rollback();
      return res.status(400).json({ message: "Unit material wajib diisi" });
    }
    if (Number(minimum_stock) < 0) {
      await t.rollback();
      return res.status(400).json({ message: "minimum_stock tidak boleh negatif" });
    }

    const existing = await Material.findOne({ where: { name: name.trim() }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(400).json({ message: "Nama material sudah ada" });
    }

    const data = await Material.create(
      { name: name.trim(), unit: unit.trim(), minimum_stock },
      { transaction: t }
    );
    // Setiap material memiliki tepat satu record stok (1:1)
    await MaterialStock.create({ material_id: data.id, quantity: 0 }, { transaction: t });

    await t.commit();
    res.status(201).json({ message: "Material berhasil ditambahkan", data });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

export const updateMaterial = async (req, res) => {
  try {
    const data = await Material.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Material tidak ditemukan" });
    }

    // Whitelist field agar stok tidak bisa diubah lewat endpoint master
    const { name, unit, minimum_stock, is_active } = req.body;
    const updateData = {};
    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ message: "Nama material tidak boleh kosong" });
      }
      const duplicate = await Material.findOne({ where: { name: name.trim() } });
      if (duplicate && duplicate.id !== data.id) {
        return res.status(400).json({ message: "Nama material sudah ada" });
      }
      updateData.name = name.trim();
    }
    if (unit !== undefined) {
      if (!String(unit).trim()) {
        return res.status(400).json({ message: "Unit material tidak boleh kosong" });
      }
      updateData.unit = unit.trim();
    }
    if (minimum_stock !== undefined) {
      if (Number(minimum_stock) < 0) {
        return res.status(400).json({ message: "minimum_stock tidak boleh negatif" });
      }
      updateData.minimum_stock = minimum_stock;
    }
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    await data.update(updateData);
    res.json({ message: "Material berhasil diperbarui", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMaterial = async (req, res) => {
  try {
    const data = await Material.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Material tidak ditemukan" });
    }

    // Material yang sudah punya histori tidak boleh di-hard delete
    const usedInHistory =
      (await MaterialTransaction.count({ where: { material_id: data.id } })) > 0 ||
      (await MaterialPurchaseItem.count({ where: { material_id: data.id } })) > 0;

    if (usedInHistory) {
      await data.update({ is_active: false });
      return res.json({ message: "Material dinonaktifkan karena sudah memiliki histori transaksi" });
    }

    await data.destroy(); // material_stocks ikut terhapus (CASCADE)
    res.json({ message: "Material berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------- STOK ----------------

export const getMaterialStock = async (req, res) => {
  try {
    const material = await findMaterialWithStock(req.params.id);
    if (!material) {
      return res.status(404).json({ message: "Material tidak ditemukan" });
    }
    res.json({
      material_id: material.id,
      name: material.name,
      unit: material.unit,
      quantity: toNumber(material.stock?.quantity),
      minimum_stock: toNumber(material.minimum_stock),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMaterialTransactions = async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ message: "Material tidak ditemukan" });
    }
    const transactions = await MaterialTransaction.findAll({
      where: { material_id: material.id },
      order: [["created_at", "DESC"]],
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /materials/:id/usage  → stok berkurang (type USAGE)
export const addMaterialUsage = async (req, res) => {
  const t = await db.transaction();
  try {
    const quantity = Number(req.body.quantity);
    const { notes } = req.body;

    if (!quantity || quantity <= 0) {
      await t.rollback();
      return res.status(400).json({ message: "Quantity harus lebih dari 0" });
    }

    const material = await findMaterialWithStock(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!material) {
      await t.rollback();
      return res.status(404).json({ message: "Material tidak ditemukan" });
    }

    const currentStock = toNumber(material.stock?.quantity);
    if (currentStock < quantity) {
      await t.rollback();
      return res.status(400).json({ message: "Stok tidak cukup" });
    }

    const newStock = currentStock - quantity;
    await material.stock.update({ quantity: newStock }, { transaction: t });

    await MaterialTransaction.create(
      {
        material_id: material.id,
        type: "USAGE",
        quantity: -quantity,
        notes: notes || "Penggunaan bahan",
        created_by: req.user?.id || null,
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ message: "Penggunaan bahan berhasil", newStock });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

// POST /materials/:id/adjustment  → koreksi stok (type ADJUSTMENT, bisa + / -)
export const addMaterialAdjustment = async (req, res) => {
  const t = await db.transaction();
  try {
    const quantity = Number(req.body.quantity);
    const { notes } = req.body;

    if (!req.body.quantity || Number.isNaN(quantity) || quantity === 0) {
      await t.rollback();
      return res.status(400).json({ message: "Quantity adjustment harus angka dan tidak boleh 0" });
    }

    const material = await findMaterialWithStock(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!material) {
      await t.rollback();
      return res.status(404).json({ message: "Material tidak ditemukan" });
    }

    const newStock = toNumber(material.stock?.quantity) + quantity;
    if (newStock < 0) {
      await t.rollback();
      return res.status(400).json({ message: "Stok tidak boleh negatif setelah adjustment" });
    }

    await material.stock.update({ quantity: newStock }, { transaction: t });

    await MaterialTransaction.create(
      {
        material_id: material.id,
        type: "ADJUSTMENT",
        quantity,
        notes: notes || "Koreksi stok",
        created_by: req.user?.id || null,
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ message: "Adjustment stok berhasil", newStock });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

// GET /materials/low-stock
export const getLowStockMaterials = async (req, res) => {
  try {
    const materials = await Material.findAll({
      where: { is_active: true },
      include: [{ model: MaterialStock, as: "stock", attributes: ["quantity"] }],
    });
    const lowStock = materials.filter(
      (m) => toNumber(m.stock?.quantity) <= toNumber(m.minimum_stock)
    );
    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------- PEMBELIAN BAHAN ----------------

// POST /material-purchases
export const createMaterialPurchase = async (req, res) => {
  const { purchaseDate, supplierId, paymentMethod, notes, items } = req.body;

  // Validasi input sebelum membuka transaction
  if (!purchaseDate || Number.isNaN(Date.parse(purchaseDate))) {
    return res.status(400).json({ message: "purchaseDate tidak valid" });
  }
  if (!["TRANSFER", "CASH"].includes(paymentMethod)) {
    return res.status(400).json({ message: "paymentMethod harus TRANSFER atau CASH" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "items wajib diisi minimal 1" });
  }
  for (const item of items) {
    if (!item.materialId) {
      return res.status(400).json({ message: "materialId wajib diisi" });
    }
    if (!(Number(item.quantity) > 0)) {
      return res.status(400).json({ message: "Quantity harus lebih dari 0" });
    }
    if (!(Number(item.unitPrice) > 0)) {
      return res.status(400).json({ message: "Unit price harus lebih dari 0" });
    }
  }

  const t = await db.transaction();
  try {
    // Ambil seluruh material sekaligus; harga & subtotal dihitung backend
    const materialIds = [...new Set(items.map((i) => i.materialId))];
    const materials = await Material.findAll({
      where: { id: materialIds },
      include: [{ model: MaterialStock, as: "stock" }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const materialMap = new Map(materials.map((m) => [m.id, m]));

    for (const id of materialIds) {
      if (!materialMap.has(Number(id))) {
        await t.rollback();
        return res.status(404).json({ message: `Material id ${id} tidak ditemukan` });
      }
    }

    const processedItems = items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      return {
        material: materialMap.get(Number(item.materialId)),
        quantity,
        unitPrice,
        subtotal: Math.round(quantity * unitPrice * 100) / 100,
      };
    });

    const totalAmount = processedItems.reduce((sum, i) => sum + i.subtotal, 0);

    const purchase = await MaterialPurchase.create(
      {
        purchase_number: generateNumber("PUR"),
        supplier_id: supplierId || null,
        purchase_date: purchaseDate,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        notes: notes || null,
        created_by: req.user?.id || null,
      },
      { transaction: t }
    );

    for (const pi of processedItems) {
      await MaterialPurchaseItem.create(
        {
          purchase_id: purchase.id,
          material_id: pi.material.id,
          quantity: pi.quantity,
          unit_price: pi.unitPrice,
          subtotal: pi.subtotal,
        },
        { transaction: t }
      );

      // Tambah stok
      const newStock = toNumber(pi.material.stock?.quantity) + pi.quantity;
      await pi.material.stock.update({ quantity: newStock }, { transaction: t });

      await MaterialTransaction.create(
        {
          material_id: pi.material.id,
          type: "PURCHASE",
          quantity: pi.quantity,
          reference_type: "material_purchase",
          reference_id: purchase.id,
          notes: notes || "Pembelian bahan",
          created_by: req.user?.id || null,
        },
        { transaction: t }
      );
    }

    // Uang keluar: pembelian bahan dicatat sebagai expense kategori "Bahan Baku"
    const bahanBaku = await ExpenseCategory.findOne({
      where: { name: "Bahan Baku" },
      transaction: t,
    });
    if (!bahanBaku) {
      await t.rollback();
      return res.status(400).json({
        message: 'Kategori expense "Bahan Baku" belum ada. Jalankan seed expense categories terlebih dahulu.',
      });
    }

    const expense = await Expense.create(
      {
        expense_number: generateNumber("EXP"),
        category_id: bahanBaku.id,
        amount: totalAmount,
        expense_date: purchaseDate,
        description: `Pembelian bahan ${purchase.purchase_number}`,
        payment_method: paymentMethod,
        created_by: req.user?.id || null,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({
      message: "Pembelian bahan berhasil",
      data: {
        purchase,
        expense_id: expense.id,
      },
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

export const getMaterialPurchases = async (req, res) => {
  try {
    const purchases = await MaterialPurchase.findAll({
      include: [
        {
          model: MaterialPurchaseItem,
          as: "items",
          include: [{ model: Material, as: "material", attributes: ["id", "name", "unit"] }],
        },
      ],
      order: [["purchase_date", "DESC"]],
    });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMaterialPurchaseById = async (req, res) => {
  try {
    const purchase = await MaterialPurchase.findByPk(req.params.id, {
      include: [
        {
          model: MaterialPurchaseItem,
          as: "items",
          include: [{ model: Material, as: "material", attributes: ["id", "name", "unit"] }],
        },
      ],
    });
    if (!purchase) {
      return res.status(404).json({ message: "Pembelian bahan tidak ditemukan" });
    }
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
