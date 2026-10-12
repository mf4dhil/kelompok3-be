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
  const priorUsage = await MaterialTransaction.findOne({
    where: { reference_type: 'order', reference_id: order.id, type: 'USAGE' },
    transaction,
  });
  if (priorUsage) return; // Prevent duplicate deduction for legacy orders or repeated requests.

  const items = await OrderItem.findAll({ where: { order_id: order.id }, transaction });
  const variantIds = [...new Set(items.map((item) => Number(item.product_variant_id)))];
  const recipes = variantIds.length ? await ProductVariantMaterial.findAll({
    where: { product_variant_id: { [Op.in]: variantIds } }, transaction,
  }) : [];
  const quantitiesByVariant = new Map();
  for (const item of items) {
    const id = Number(item.product_variant_id);
    quantitiesByVariant.set(id, (quantitiesByVariant.get(id) || 0) + Number(item.quantity));
  }
  const materialUsage = new Map();
  for (const recipe of recipes) {
    const amount = Number(recipe.quantity) * (quantitiesByVariant.get(Number(recipe.product_variant_id)) || 0);
    materialUsage.set(Number(recipe.material_id), (materialUsage.get(Number(recipe.material_id)) || 0) + amount);
  }
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

    // Pembayaran cash pada saat order dibuat langsung tercatat sebagai terverifikasi.
    if (payment_method === 'cash') {
      const isFullPayment = payment_option === 'full';
      const paymentAmount = isFullPayment ? totalAmount : Math.ceil(totalAmount * 0.5);

      await Payment.create(
        {
          order_id: order.id,
          amount: paymentAmount,
          payment_method: 'cash',
          payment_type: isFullPayment ? 'full' : 'partial',
          status: 'verified',
          paid_at: new Date(),
        },
        { transaction: t },
      );

      await order.update({ payment_status: isFullPayment ? 'paid' : 'partial' }, { transaction: t });
    }

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
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    const { notes, pickup_date } = req.body;

    // Jangan izinkan ubah total_amount langsung
    if (req.body.total_amount !== undefined) {
      return res.status(400).json({
        message: 'total_amount tidak boleh diubah langsung',
      });
    }

    if (pickup_date) {
      const pickupDate = new Date(pickup_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (pickupDate < today) {
        return res.status(400).json({
          message: 'Pickup date tidak boleh sebelum hari ini',
        });
      }
    }

    await order.update({
      ...(notes !== undefined && { notes }),
      ...(pickup_date && { pickup_date }),
    });

    const updatedOrder = await Order.findByPk(id, {
      include: [{ model: Customer }, { model: OrderItem, include: [{ model: ProductVariant }] }, { model: Rekening, as: 'rekening' }],
    });

    res.json({
      message: 'Order berhasil diperbarui',
      data: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'processing', 'ready', 'completed', 'cancelled'].includes(status)) {
      await t.rollback();
      return res.status(400).json({ message: 'status wajib diisi' });
    }

    const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    if (order.status === 'cancelled' && status !== 'cancelled') {
      await t.rollback();
      return res.status(409).json({ message: 'Pesanan yang sudah dibatalkan tidak dapat diproses kembali.' });
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
    res.status(error.message.startsWith('Stok ') ? 409 : 500).json({ message: error.message });
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
