import Order from "../models/order.js";
import OrderItem from "../models/order_item.js";
import Customer from "../models/customer.js";
import ProductVariant from "../models/productvariants.js";
import Rekening from "../models/rekening.js";
import Payment from "../models/payment.js";
import db from "../config/dababase.js";
import { Op } from "sequelize";
import Product from "../models/product.js";
import ProductVariantMaterial from "../models/product_variant_material.js";
import MaterialStock from "../models/material_stock.js";
import MaterialTransaction from "../models/material_transaction.js";
import Material from "../models/material.js";
import { getPagination, getPaginationMeta } from "../utils/pagination.js";

// Helper: Generate unique order number (format ORD-YYYYMMDD-XXXX)
const generateOrderNumber = async () => {
  let orderNumber;
  let exists = true;
  while (exists) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    orderNumber = `ORD-${dateStr}-${randomStr}`;
    const count = await Order.count({ where: { order_number: orderNumber } });
    exists = count > 0;
  }
  return orderNumber;
};

const consumeOrderMaterials = async (order, transaction, userId) => {
  const items = await OrderItem.findAll({ where: { order_id: order.id }, transaction });
  const variantIds = [...new Set(items.map((item) => Number(item.product_variant_id)))];
  const recipes = variantIds.length ? await ProductVariantMaterial.findAll({
    where: { product_variant_id: { [Op.in]: variantIds } }, transaction,
  }) : [];
  const variantsWithRecipes = new Set(recipes.map((recipe) => Number(recipe.product_variant_id)));
  const variantsWithoutRecipes = variantIds.filter((variantId) => !variantsWithRecipes.has(variantId));
  if (variantsWithoutRecipes.length) {
    throw new Error(`Resep bahan baku belum diatur untuk varian #${variantsWithoutRecipes.join(', #')}. Lengkapi resep di menu Bahan > Resep sebelum memulai produksi.`);
  }

  const quantitiesByVariant = new Map();
  for (const item of items) {
    const id = Number(item.product_variant_id);
    quantitiesByVariant.set(id, (quantitiesByVariant.get(id) || 0) + Number(item.quantity));
  }
  const requiredUsageByMaterial = new Map();
  for (const recipe of recipes) {
    const amount = Number(recipe.quantity) * (quantitiesByVariant.get(Number(recipe.product_variant_id)) || 0);
    requiredUsageByMaterial.set(Number(recipe.material_id), (requiredUsageByMaterial.get(Number(recipe.material_id)) || 0) + amount);
  }
  const priorUsageRows = await MaterialTransaction.findAll({
    where: { reference_type: 'order', reference_id: order.id, type: 'USAGE' },
    attributes: ['material_id', 'quantity'], transaction,
  });
  const alreadyUsedByMaterial = new Map();
  for (const usage of priorUsageRows) {
    const materialId = Number(usage.material_id);
    alreadyUsedByMaterial.set(materialId, (alreadyUsedByMaterial.get(materialId) || 0) + Math.abs(Number(usage.quantity || 0)));
  }
  const materialUsage = new Map([...requiredUsageByMaterial].map(([materialId, required]) => [
    materialId,
    Math.max(0, required - (alreadyUsedByMaterial.get(materialId) || 0)),
  ]).filter(([, remaining]) => remaining > 0.000001));
  const materialIds = [...materialUsage.keys()].sort((a, b) => a - b);
  const stocks = materialIds.length ? await MaterialStock.findAll({
    where: { material_id: { [Op.in]: materialIds } },
    order: [['material_id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE,
  }) : [];
  const stockByMaterial = new Map(stocks.map((stock) => [Number(stock.material_id), stock]));
  for (const [materialId, quantity] of materialUsage) {
    const stock = stockByMaterial.get(materialId);
    const available = Number(stock?.quantity || 0);
    if (!stock || available < quantity) {
      const material = await Material.findByPk(materialId, { attributes: ['name', 'unit'], transaction });
      throw new Error(`Stok ${material?.name || `bahan #${materialId}`} tidak cukup. Tersedia ${available} ${material?.unit || 'unit'}, dibutuhkan ${quantity}.`);
    }
  }
  for (const [materialId, quantity] of materialUsage) {
    const stock = stockByMaterial.get(materialId);
    await stock.update({ quantity: Number(stock.quantity) - quantity }, { transaction });
    await MaterialTransaction.create({
      material_id: materialId, type: 'USAGE', quantity: -quantity,
      reference_type: 'order', reference_id: order.id,
      notes: `Pemakaian otomatis saat pesanan ${order.order_number} diproses`,
      created_by: userId || null,
    }, { transaction });
  }
};

export const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      payment_status,
      customer_id,
      pickup_date,
      order_date_start,
      order_date_end,
      sort_by,
      sort_order,
      search,
    } = req.query;
    const pagination = getPagination(page, limit);
    const where = {};

    if (status) where.status = status;
    if (payment_status) where.payment_status = payment_status;
    if (customer_id) where.customer_id = customer_id;
    if (pickup_date) where.pickup_date = pickup_date;
    if (search) {
      const matchingCustomers = await Customer.findAll({
        attributes: ['id'],
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { phone: { [Op.like]: `%${search}%` } },
          ],
        },
        raw: true,
      });
      where[Op.or] = [
        { order_number: { [Op.like]: `%${search}%` } },
        { customer_id: { [Op.in]: matchingCustomers.map((customer) => customer.id) } },
      ];
    }
    if (order_date_start || order_date_end) {
      where.order_date = {};
      if (order_date_start) where.order_date[Op.gte] = new Date(`${order_date_start}T00:00:00.000`);
      if (order_date_end) where.order_date[Op.lte] = new Date(`${order_date_end}T23:59:59.999`);
    }

    const sortableColumns = ["created_at", "order_date", "pickup_date"];
    const sortColumn = sortableColumns.includes(sort_by) ? sort_by : "order_date";
    const sortDirection = String(sort_order).toUpperCase() === "ASC" ? "ASC" : "DESC";

    const { count, rows } = await Order.findAndCountAll({
      where,
      // OrderItem is a hasMany include; count unique orders so item joins do not
      // inflate totalPages and expose empty pages in the admin list.
      distinct: true,
      col: "id",
      include: [
        { model: Customer, attributes: ["id", "name", "phone", "email", "address" ]},
        { model: OrderItem, include: [{ model: ProductVariant }] },
        { model: Rekening, as: 'rekening' },
      ],
      limit: pagination.pageSize,
      offset: pagination.offset,
      order: [[sortColumn, sortDirection], ["id", "DESC"]],
    });

    res.json({
      data: rows,
      ...getPaginationMeta(count, pagination.currentPage, pagination.pageSize),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await Order.findByPk(id, {
      include: [
        { model: Customer, attributes: ["id", "name", "phone", "email", "address"] },
        { model: OrderItem, include: [{ model: ProductVariant, include: [{model:Product}] }] },
        { model: Rekening, as: "rekening" },
        { model: Payment, as: "payments", include: [{ model: Rekening, as: "rekening" }], separate: true, order: [["created_at", "DESC"]] },
      ],
    });

    if (!data) {
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Public, minimal order lookup for customers tracking a cake order by receipt number.
export const trackOrder = async (req, res) => {
  try {
    const orderNumber = String(req.params.orderNumber || '').trim().toUpperCase();
    if (!/^ORD-\d{8}-\d{4}$/.test(orderNumber)) {
      return res.status(400).json({ message: 'Format nomor order tidak valid.' });
    }

    const order = await Order.findOne({
      where: { order_number: orderNumber },
      attributes: ['order_number', 'order_date', 'pickup_date', 'status', 'payment_status', 'total_amount', 'rekening_id'],
      include: [{
        model: OrderItem,
        attributes: ['quantity'],
        include: [{
          model: ProductVariant,
          attributes: ['id'],
          include: [{ model: Product, attributes: ['name'] }],
        }],
      }],
    });

    if (!order) return res.status(404).json({ message: 'Pesanan dengan nomor tersebut tidak ditemukan.' });

    const data = order.toJSON();
    return res.json({
      data: {
        order_number: data.order_number,
        order_date: data.order_date,
        pickup_date: data.pickup_date,
        status: data.status,
        payment_status: data.payment_status,
        total_amount: data.total_amount,
        payment_method: data.rekening_id ? 'transfer' : 'cash',
        items: (data.order_items || data.orderItems || data.OrderItems || []).map((item) => {
          const variant = item.ProductVariant || item.productvariant || item.product_variant || {};
          const product = variant.Product || variant.product || {};
          return { name: product.name || 'Kue', quantity: item.quantity };
        }),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Pesanan belum dapat dilacak.' });
  }
};

export const createOrder = async (req, res) => {
  const t = await db.transaction();
  try {
    const { customer_id, pickup_date, notes, payment_method, payment_option = 'full', rekening_id, items } = req.body;

    // Validasi input
    if (!customer_id || !pickup_date || !items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        message: 'customer_id, pickup_date, dan items (array minimal 1) wajib diisi',
      });
    }

    // Cek customer ada
    const customer = await Customer.findByPk(customer_id, { transaction: t });
    if (!customer) {
      await t.rollback();
      return res.status(404).json({ message: 'Customer tidak ditemukan' });
    }

    // Cek pickup_date tidak boleh sebelum hari ini
    const pickupDate = new Date(pickup_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (pickupDate < today) {
      await t.rollback();
      return res.status(400).json({ message: 'Pickup date tidak boleh sebelum hari ini' });
    }

    // Validasi payment_method dan rekening_id
    if (payment_method === 'transfer') {
      if (!rekening_id) {
        await t.rollback();
        return res.status(400).json({
          message: 'rekening_id wajib diisi jika payment_method adalah transfer',
        });
      }
      const rekening = await Rekening.findByPk(rekening_id, { transaction: t });
      if (!rekening || !rekening.is_active) {
        await t.rollback();
        return res.status(400).json({
          message: 'Rekening tidak ditemukan atau tidak aktif',
        });
      }
    }

    if (!['full', 'partial'].includes(payment_option)) {
      await t.rollback();
      return res.status(400).json({ message: 'payment_option harus full atau partial' });
    }

    // Proses items: ambil harga dari DB, jangan percaya harga dari client
    let totalAmount = 0;
    const createdItems = [];

    for (const item of items) {
      if (!item.product_variant_id || !item.quantity) {
        await t.rollback();
        return res.status(400).json({
          message: 'Setiap item harus memiliki product_variant_id dan quantity',
        });
      }

      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        await t.rollback();
        return res.status(400).json({
          message: 'Quantity harus bilangan bulat >= 1',
        });
      }

      // Ambil product variant dan harganya dari database
      const variant = await ProductVariant.findByPk(item.product_variant_id, {
        transaction: t,
      });
      if (!variant) {
        await t.rollback();
        return res.status(404).json({
          message: `Product variant ${item.product_variant_id} tidak ditemukan`,
        });
      }

      const price = variant.price;
      const subtotal = price * item.quantity;
      totalAmount += subtotal;

      createdItems.push({
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
        price,
        subtotal,
        notes: item.notes || null,
      });
    }

    // Buat order
    const orderNumber = await generateOrderNumber();
    const order = await Order.create(
      {
        customer_id,
        order_number: orderNumber,
        pickup_date,
        notes: notes || null,
        total_amount: totalAmount,
        payment_method: payment_method || null,
        rekening_id: rekening_id || null,
        status: 'pending',
        payment_status: 'unpaid',
      },
      { transaction: t },
    );

    // Buat order items
    await Promise.all(
      createdItems.map((item) =>
        OrderItem.create(
          {
            order_id: order.id,
            ...item,
          },
          { transaction: t },
        ),
      ),
    );

    // Pesanan dari checkout customer belum membuktikan pembayaran. Semua metode
    // menunggu admin mencatat pembayaran setelah dana diterima/diperiksa.

    await t.commit();

    // Fetch lengkap dengan include
    const orderFull = await Order.findByPk(order.id, {
      include: [{ model: Customer }, { model: OrderItem, include: [{ model: ProductVariant }] }, { model: Rekening, as: 'rekening' }],
    });

    res.status(201).json({
      message: 'Order berhasil dibuat',
      data: orderFull,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

export const updateOrder = async (req, res) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      await t.rollback();
      return res.status(409).json({ message: 'Order hanya dapat diedit sebelum produksi dimulai.' });
    }

    const { notes, pickup_date, items, customer } = req.body;
    if (pickup_date) {
      const pickupDate = new Date(pickup_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (pickupDate < today) {
        await t.rollback();
        return res.status(400).json({
          message: 'Pickup date tidak boleh sebelum hari ini',
        });
      }
    }

    let updatedTotal = Number(order.total_amount);
    let replacementItems = null;
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        await t.rollback();
        return res.status(400).json({ message: 'Order harus memiliki minimal satu item.' });
      }

      replacementItems = [];
      updatedTotal = 0;
      for (const item of items) {
        const variantId = Number(item.product_variant_id);
        const quantity = Number(item.quantity);
        if (!Number.isInteger(variantId) || variantId < 1 || !Number.isInteger(quantity) || quantity < 1) {
          await t.rollback();
          return res.status(400).json({ message: 'Setiap item harus memiliki varian dan jumlah bulat minimal 1.' });
        }
        const variant = await ProductVariant.findByPk(variantId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!variant) {
          await t.rollback();
          return res.status(404).json({ message: `Varian produk #${variantId} tidak ditemukan.` });
        }
        const price = Number(variant.price);
        const subtotal = price * quantity;
        updatedTotal += subtotal;
        replacementItems.push({
          product_variant_id: variantId,
          quantity,
          price,
          subtotal,
          notes: item.notes || null,
        });
      }

      const verifiedPayments = await Payment.findAll({ where: { order_id: order.id, status: 'verified' }, transaction: t });
      const totalPaid = verifiedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      if (totalPaid > updatedTotal) {
        await t.rollback();
        return res.status(409).json({ message: 'Total baru lebih kecil dari pembayaran terverifikasi. Sesuaikan pembayaran terlebih dahulu.' });
      }
      const paymentStatus = totalPaid >= updatedTotal ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
      await order.update({ total_amount: updatedTotal, payment_status: paymentStatus }, { transaction: t });
      await OrderItem.destroy({ where: { order_id: order.id }, transaction: t });
      for (const item of replacementItems) {
        await OrderItem.create({ order_id: order.id, ...item }, { transaction: t });
      }
    }

    const customerFields = customer && typeof customer === 'object' ? customer : {};
    if (Object.keys(customerFields).length) {
      const customerRecord = await Customer.findByPk(order.customer_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!customerRecord) {
        await t.rollback();
        return res.status(404).json({ message: 'Data customer pada order tidak ditemukan.' });
      }
      const nextCustomer = {
        ...(customerFields.name !== undefined && { name: String(customerFields.name).trim() }),
        ...(customerFields.phone !== undefined && { phone: String(customerFields.phone).trim() }),
        ...(customerFields.email !== undefined && { email: String(customerFields.email).trim() || null }),
        ...(customerFields.address !== undefined && { address: String(customerFields.address).trim() || null }),
      };
      if (nextCustomer.name !== undefined && (!nextCustomer.name || nextCustomer.name.length > 100)) {
        await t.rollback();
        return res.status(400).json({ message: 'Nama customer wajib diisi dan maksimal 100 karakter.' });
      }
      if (nextCustomer.phone !== undefined && (!nextCustomer.phone || nextCustomer.phone.length > 20)) {
        await t.rollback();
        return res.status(400).json({ message: 'Nomor telepon customer wajib diisi dan maksimal 20 karakter.' });
      }
      if (nextCustomer.email && nextCustomer.email.length > 30) {
        await t.rollback();
        return res.status(400).json({ message: 'Email customer maksimal 30 karakter.' });
      }
      if (nextCustomer.address && nextCustomer.address.length > 100) {
        await t.rollback();
        return res.status(400).json({ message: 'Alamat customer maksimal 100 karakter.' });
      }
      await customerRecord.update(nextCustomer, { transaction: t });
    }

    await order.update({
      ...(notes !== undefined && { notes }),
      ...(pickup_date && { pickup_date }),
    }, { transaction: t });

    await t.commit();

    const updatedOrder = await Order.findByPk(id, {
      include: [
        { model: Customer },
        { model: OrderItem, include: [{ model: ProductVariant, include: [{ model: Product }] }] },
        { model: Rekening, as: 'rekening' },
        { model: Payment, as: 'payments', include: [{ model: Rekening, as: 'rekening' }], separate: true, order: [['created_at', 'DESC']] },
      ],
    });

    res.json({
      message: 'Order berhasil diperbarui',
      data: updatedOrder,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'processing', 'ready', 'completed', 'cancelled'].includes(status)) {
      await t.rollback();
      return res.status(400).json({ message: 'status wajib diisi' });
    }

    const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    if (status === order.status) {
      if (status === 'processing') {
        await consumeOrderMaterials(order, t, req.user?.id);
        await t.commit();
        return res.json({ message: 'Sinkronisasi stok order berhasil.', data: order });
      }
      await t.commit();
      return res.json({ message: 'Status order tidak berubah', data: order });
    }

    const allowedTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['ready'],
      ready: ['completed'],
      completed: [],
      cancelled: [],
    };
    if (!allowedTransitions[order.status]?.includes(status)) {
      await t.rollback();
      return res.status(409).json({ message: `Perubahan status dari ${order.status} ke ${status} tidak diizinkan.` });
    }

    if (status === 'confirmed' && order.status !== 'pending') {
      await t.rollback();
      return res.status(409).json({ message: 'Hanya order yang menunggu konfirmasi yang dapat dikonfirmasi.' });
    }

    if (status === 'processing' && order.status === 'pending') {
      await t.rollback();
      return res.status(409).json({ message: 'Konfirmasi order terlebih dahulu sebelum memulai produksi.' });
    }

    if (status === 'processing' && order.payment_status === 'unpaid' && order.rekening_id) {
      await t.rollback();
      return res.status(409).json({ message: 'Pembayaran belum diverifikasi. Catat pembayaran yang sudah diterima sebelum memproses pesanan.' });
    }

    if (status === 'processing' && order.payment_status === 'unpaid' && order.status !== 'confirmed') {
      await t.rollback();
      return res.status(409).json({ message: 'Konfirmasi customer untuk order tunai terlebih dahulu sebelum memulai produksi.' });
    }

    if (status === 'completed' && order.payment_status !== 'paid') {
      await t.rollback();
      return res.status(409).json({ message: 'Pesanan hanya dapat diselesaikan setelah pembayaran lunas dicatat.' });
    }

    if (status === 'cancelled' && ['processing', 'ready', 'completed'].includes(order.status)) {
      await t.rollback();
      return res.status(409).json({ message: 'Pesanan yang sudah diproses tidak dapat dibatalkan atau dikembalikan stoknya.' });
    }
    if (status === 'cancelled' && order.status !== 'cancelled') {
      const existingUsage = await MaterialTransaction.findOne({
        where: { reference_type: 'order', reference_id: order.id, type: 'USAGE' }, transaction: t,
      });
      if (existingUsage) {
        await t.rollback();
        return res.status(409).json({ message: 'Bahan baku pesanan ini sudah digunakan; status tidak dapat diubah menjadi cancel.' });
      }
    }
    if (status === 'processing' && order.status !== 'processing') {
      await consumeOrderMaterials(order, t, req.user?.id);
    }

    await order.update({ status }, { transaction: t });
    await t.commit();

    res.json({
      message: 'Order status berhasil diperbarui',
      data: order,
    });
  } catch (error) {
    await t.rollback();
    const isInventoryConflict = error.message.startsWith('Stok ') || error.message.startsWith('Resep ');
    res.status(isInventoryConflict ? 409 : 500).json({ message: error.message });
  }
};

export const updateOrderPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_method, rekening_id, payment_proof } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    // Validasi jika payment_method adalah transfer
    const method = payment_method || order.payment_method;
    if (method === 'transfer') {
      const rekeningId = rekening_id || order.rekening_id;
      if (!rekeningId) {
        return res.status(400).json({
          message: 'rekening_id wajib diisi jika payment_method adalah transfer',
        });
      }
      const rekening = await Rekening.findByPk(rekeningId);
      if (!rekening || !rekening.is_active) {
        return res.status(400).json({
          message: 'Rekening tidak ditemukan atau tidak aktif',
        });
      }
    }

    await order.update({
      ...(payment_status && { payment_status }),
      ...(payment_method && { payment_method }),
      ...(rekening_id && { rekening_id }),
      ...(payment_proof && { payment_proof }),
    });

    const updatedOrder = await Order.findByPk(id, {
      include: [{ model: Customer }, { model: OrderItem }, { model: Rekening, as: 'rekening' }],
    });

    res.json({
      message: 'Order payment berhasil diperbarui',
      data: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    // Hapus menjadi pembatalan tercatat hanya sebelum bahan baku digunakan.
    if (order.status !== 'cancelled') {
      if (['processing', 'ready', 'completed'].includes(order.status)) {
        await t.rollback();
        return res.status(409).json({ message: 'Pesanan yang sudah diproses tidak dapat dibatalkan.' });
      }
      const existingUsage = await MaterialTransaction.findOne({
        where: { reference_type: 'order', reference_id: order.id, type: 'USAGE' }, transaction: t,
      });
      if (existingUsage) {
        await t.rollback();
        return res.status(409).json({ message: 'Bahan baku pesanan ini sudah digunakan; pesanan tidak dapat dibatalkan.' });
      }
      await order.update({ status: 'cancelled' }, { transaction: t });
    }

    await t.commit();

    res.json({
      message: 'Order dibatalkan dan tetap tersimpan di laporan',
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};
