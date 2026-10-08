import db from '../config/dababase.js';
import '../models/index.models.js'; // Load all models and relations first

import Material from '../models/material.js';
import MaterialStock from '../models/material_stock.js';
import MaterialTransaction from '../models/material_transaction.js';
import MaterialPurchase from '../models/material_purchase.js';
import MaterialPurchaseItem from '../models/material_purchase_item.js';
import ExpenseCategory from '../models/expense_category.js';
import Expense from '../models/expense.js';

// Helper: generate nomor dokumen PREFIX-YYYYMMDD-XXXXX
const generateNumber = (prefix) => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${datePart}-${randomPart}`;
};

const seedBU = async () => {
  try {
    await db.authenticate();
    await db.sync();

    console.log('🌱 Starting Bahan Baku & Expense seed...');

    // ──────────────────────────────────────────
    // 1. Seed Expense Categories
    // ──────────────────────────────────────────
    const categoryNames = [
      'Bahan Baku',
      'Packaging',
      'Operasional',
      'Transportasi',
      'Listrik',
      'Air',
      'Peralatan',
      'Lainnya',
    ];

    for (const name of categoryNames) {
      const [cat, created] = await ExpenseCategory.findOrCreate({
        where: { name },
        defaults: { name, is_active: true },
      });
      if (created) console.log(`  ✅ ExpenseCategory: ${cat.name}`);
    }

    // ──────────────────────────────────────────
    // 2. Seed Materials (Master Bahan Baku)
    // ──────────────────────────────────────────
    const materialsData = [
      { name: 'Tepung Terigu', unit: 'kg', minimum_stock: 5 },
      { name: 'Gula Pasir', unit: 'kg', minimum_stock: 3 },
      { name: 'Telur Ayam', unit: 'pcs', minimum_stock: 20 },
      { name: 'Mentega', unit: 'kg', minimum_stock: 2 },
      { name: 'Susu Cair', unit: 'liter', minimum_stock: 2 },
      { name: 'Baking Powder', unit: 'gram', minimum_stock: 100 },
      { name: 'Coklat Bubuk', unit: 'gram', minimum_stock: 200 },
      { name: 'Vanila Essence', unit: 'ml', minimum_stock: 50 },
    ];

    const materialMap = {}; // simpan instance material
    for (const md of materialsData) {
      const [mat, created] = await Material.findOrCreate({
        where: { name: md.name },
        defaults: { ...md, is_active: true },
      });
      materialMap[md.name] = mat;

      if (created) {
        // Setiap material baru otomatis punya stok 0
        await MaterialStock.findOrCreate({
          where: { material_id: mat.id },
          defaults: { material_id: mat.id, quantity: 0 },
        });
        console.log(`  ✅ Material: ${mat.name} (${mat.unit})`);
      }
    }

    // ──────────────────────────────────────────
    // 3. Seed Material Purchase (Pembelian Bahan)
    // ──────────────────────────────────────────
    const t = await db.transaction();
    try {
      const purchaseNumber = generateNumber('PUR');
      const purchaseDate = new Date().toISOString().slice(0, 10);

      // Data pembelian
      const itemsData = [
        { material: materialMap['Tepung Terigu'], qty: 10, unitPrice: 15000 },
        { material: materialMap['Gula Pasir'], qty: 5, unitPrice: 16000 },
        { material: materialMap['Telur Ayam'], qty: 50, unitPrice: 2500 },
        { material: materialMap['Mentega'], qty: 3, unitPrice: 45000 },
        { material: materialMap['Susu Cair'], qty: 5, unitPrice: 18000 },
      ];

      const totalAmount = itemsData.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

      // Buat header purchase
      const purchase = await MaterialPurchase.create(
        {
          purchase_number: purchaseNumber,
          purchase_date: purchaseDate,
          supplier_id: null,
          payment_method: 'TRANSFER',
          total_amount: totalAmount,
          notes: 'Pembelian bahan baku awal (seed)',
          created_by: null,
        },
        { transaction: t }
      );

      // Proses setiap item
      for (const item of itemsData) {
        const subtotal = item.qty * item.unitPrice;

        // a. Purchase Item
        await MaterialPurchaseItem.create(
          {
            purchase_id: purchase.id,
            material_id: item.material.id,
            quantity: item.qty,
            unit_price: item.unitPrice,
            subtotal,
          },
          { transaction: t }
        );

        // b. Update stok
        const stock = await MaterialStock.findOne({
          where: { material_id: item.material.id },
          transaction: t,
        });
        const currentQty = Number(stock.quantity || 0);
        await stock.update({ quantity: currentQty + item.qty }, { transaction: t });

        // c. Transaction history
        await MaterialTransaction.create(
          {
            material_id: item.material.id,
            type: 'PURCHASE',
            quantity: item.qty,
            reference_type: 'material_purchase',
            reference_id: purchase.id,
            notes: 'Pembelian bahan baku awal',
            created_by: null,
          },
          { transaction: t }
        );
      }

      // d. Catat sebagai Expense kategori "Bahan Baku"
      const bahanBakuCat = await ExpenseCategory.findOne({
        where: { name: 'Bahan Baku' },
        transaction: t,
      });

      const expense = await Expense.create(
        {
          expense_number: generateNumber('EXP'),
          category_id: bahanBakuCat.id,
          amount: totalAmount,
          expense_date: purchaseDate,
          description: `Pembelian bahan baku ${purchaseNumber}`,
          payment_method: 'TRANSFER',
          receipt: null,
          created_by: null,
        },
        { transaction: t }
      );

      await t.commit();

      console.log(`  ✅ Purchase: ${purchase.purchase_number} (Rp ${totalAmount.toLocaleString()})`);
      console.log(`  ✅ Expense: ${expense.expense_number} (Bahan Baku)`);
    } catch (err) {
      await t.rollback();
      console.error('❌ Error creating purchase:', err.message);
      process.exit(1);
    }

    // ──────────────────────────────────────────
    // 4. Seed Expense Manual (contoh: Listrik & Packaging)
    // ──────────────────────────────────────────
    const manualExpenses = [
      { categoryName: 'Listrik', amount: 450000, desc: 'Tagihan listrik Oktober 2026', method: 'TRANSFER' },
      { categoryName: 'Packaging', amount: 125000, desc: 'Pembelian box kue dan plastik', method: 'CASH' },
      { categoryName: 'Transportasi', amount: 75000, desc: 'Ongkir pengiriman bahan baku', method: 'CASH' },
    ];

    for (const me of manualExpenses) {
      const cat = await ExpenseCategory.findOne({ where: { name: me.categoryName } });
      if (cat) {
        await Expense.create({
          expense_number: generateNumber('EXP'),
          category_id: cat.id,
          amount: me.amount,
          expense_date: new Date().toISOString().slice(0, 10),
          description: me.desc,
          payment_method: me.method,
          receipt: null,
          created_by: null,
        });
        console.log(`  ✅ Expense: ${me.desc} (Rp ${me.amount.toLocaleString()})`);
      }
    }

    // ──────────────────────────────────────────
    // 5. Seed Usage (Pemakaian Bahan)
    // ──────────────────────────────────────────
    const usageData = [
      { materialName: 'Tepung Terigu', qty: 3, notes: 'Produksi kue bolu' },
      { materialName: 'Gula Pasir', qty: 2, notes: 'Produksi kue bolu' },
      { materialName: 'Telur Ayam', qty: 12, notes: 'Produksi kue bolu' },
      { materialName: 'Mentega', qty: 1, notes: 'Produksi kue bolu' },
    ];

    for (const u of usageData) {
      const mat = materialMap[u.materialName];
      const stock = await MaterialStock.findOne({ where: { material_id: mat.id } });
      const currentQty = Number(stock.quantity || 0);

      if (currentQty >= u.qty) {
        await stock.update({ quantity: currentQty - u.qty });
        await MaterialTransaction.create({
          material_id: mat.id,
          type: 'USAGE',
          quantity: -u.qty,
          notes: u.notes,
          created_by: null,
        });
        console.log(`  ✅ Usage: ${mat.name} -${u.qty} ${mat.unit} (${u.notes})`);
      } else {
        console.log(`  ⚠️  Skip usage ${mat.name}: stok tidak cukup (${currentQty} < ${u.qty})`);
      }
    }

    // ──────────────────────────────────────────
    // 6. Seed Adjustment (Koreksi Stok)
    // ──────────────────────────────────────────
    const adjData = [
      { materialName: 'Tepung Terigu', qty: 0.5, notes: 'Selisih timbangan' },
      { materialName: 'Telur Ayam', qty: -2, notes: 'Telur pecah saat penerimaan' },
    ];

    for (const a of adjData) {
      const mat = materialMap[a.materialName];
      const stock = await MaterialStock.findOne({ where: { material_id: mat.id } });
      const currentQty = Number(stock.quantity || 0);
      const newQty = currentQty + a.qty;

      if (newQty >= 0) {
        await stock.update({ quantity: newQty });
        await MaterialTransaction.create({
          material_id: mat.id,
          type: 'ADJUSTMENT',
          quantity: a.qty,
          notes: a.notes,
          created_by: null,
        });
        console.log(`  ✅ Adjustment: ${mat.name} ${a.qty > 0 ? '+' : ''}${a.qty} ${mat.unit} (${a.notes})`);
      } else {
        console.log(`  ⚠️  Skip adjustment ${mat.name}: stok tidak boleh negatif`);
      }
    }

    // ──────────────────────────────────────────
    // Ringkasan
    // ──────────────────────────────────────────
    console.log('\n🎉 Seed Bahan Baku & Expense selesai!');

    // Tampilkan ringkasan stok akhir
    console.log('\n📦 Stok Akhir Bahan Baku:');
    const allMaterials = await Material.findAll({
      include: [{ model: MaterialStock, as: 'stock' }],
      order: [['name', 'ASC']],
    });
    for (const m of allMaterials) {
      const qty = Number(m.stock?.quantity || 0);
      const min = Number(m.minimum_stock || 0);
      const status = qty <= min ? '⚠️ LOW' : '✅ OK';
      console.log(`   ${m.name}: ${qty} ${m.unit} (min: ${min}) ${status}`);
    }

    // Tampilkan ringkasan expense
    console.log('\n💰 Total Expense:');
    const totalExpense = await Expense.sum('amount');
    console.log(`   Rp ${Number(totalExpense || 0).toLocaleString()}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
};

seedBU();