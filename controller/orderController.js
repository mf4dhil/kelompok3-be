import Order from "../models/order.js";
import OrderItem from "../models/order_item.js";
import Customer from "../models/customer.js";
import ProductVariant from "../models/productvariants.js";
import Rekening from "../models/rekening.js";
import db from "../config/dababase.js";
import { Op } from "sequelize";

// Helper: Generate unique order number (format ORD-YYYYMMDD-XXXX)
const generateOrderNumber = async () => {
  let orderNumber;
  let exists = true;
  while (exists) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const randomStr = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    orderNumber = `ORD-${dateStr}-${randomStr}`;
    const count = await Order.count({ where: { order_number: orderNumber } });
    exists = count > 0;
  }
  return orderNumber;
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
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (payment_status) where.payment_status = payment_status;
    if (customer_id) where.customer_id = customer_id;
    if (pickup_date) where.pickup_date = pickup_date;
    if (order_date_start || order_date_end) {
      where.order_date = {};
      if (order_date_start) where.order_date[Op.gte] = new Date(order_date_start);
      if (order_date_end) where.order_date[Op.lte] = new Date(order_date_end);
    }

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { model: Customer, attributes: ["id", "name", "phone", "email"] },
        { model: OrderItem, include: [{ model: ProductVariant }] },
        { model: Rekening, as: "rekening" },
      ],
      limit: parseInt(limit),
      offset,
      order: [["order_date", "DESC"]],
    });

    res.json({
      data: rows,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      totalItems: count,
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
        { model: OrderItem, include: [{ model: ProductVariant }] },
        { model: Rekening, as: "rekening" },
      ],
    });

    if (!data) {
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createOrder = async (req, res) => {
  const t = await db.transaction();
  try {
    const { customer_id, pickup_date, notes, items, payment_method, rekening_id } = req.body;

    // Validasi input
    if (!customer_id || !pickup_date || !items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        message: "customer_id, pickup_date, dan items (array minimal 1) wajib diisi",
      });
    }

    // Cek customer ada
    const customer = await Customer.findByPk(customer_id, { transaction: t });
    if (!customer) {
      await t.rollback();
      return res.status(404).json({ message: "Customer tidak ditemukan" });
    }

    // Cek pickup_date tidak boleh sebelum hari ini
    const pickupDate = new Date(pickup_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (pickupDate < today) {
      await t.rollback();
      return res.status(400).json({ message: "Pickup date tidak boleh sebelum hari ini" });
    }

    // Validasi payment_method dan rekening_id
    if (payment_method === "transfer") {
      if (!rekening_id) {
        await t.rollback();
        return res.status(400).json({
          message: "rekening_id wajib diisi jika payment_method adalah transfer",
        });
      }
      const rekening = await Rekening.findByPk(rekening_id, { transaction: t });
      if (!rekening || !rekening.is_active) {
        await t.rollback();
        return res.status(400).json({
          message: "Rekening tidak ditemukan atau tidak aktif",
        });
      }
    }

    // Proses items: ambil harga dari DB, jangan percaya harga dari client
    let totalAmount = 0;
    const createdItems = [];

    for (const item of items) {
      if (!item.product_variant_id || !item.quantity) {
        await t.rollback();
        return res.status(400).json({
          message: "Setiap item harus memiliki product_variant_id dan quantity",
        });
      }

      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        await t.rollback();
        return res.status(400).json({
          message: "Quantity harus bilangan bulat >= 1",
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
        status: "pending",
        payment_status: "unpaid",
      },
      { transaction: t }
    );

    // Buat order items
    await Promise.all(
      createdItems.map((item) =>
        OrderItem.create(
          {
            order_id: order.id,
            ...item,
          },
          { transaction: t }
        )
      )
    );

    await t.commit();

    // Fetch lengkap dengan include
    const orderFull = await Order.findByPk(order.id, {
      include: [
        { model: Customer },
        { model: OrderItem, include: [{ model: ProductVariant }] },
        { model: Rekening, as: "rekening" },
      ],
    });

    res.status(201).json({
      message: "Order berhasil dibuat",
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
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    const { notes, pickup_date } = req.body;

    // Jangan izinkan ubah total_amount langsung
    if (req.body.total_amount !== undefined) {
      return res.status(400).json({
        message: "total_amount tidak boleh diubah langsung",
      });
    }

    if (pickup_date) {
      const pickupDate = new Date(pickup_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (pickupDate < today) {
        return res.status(400).json({
          message: "Pickup date tidak boleh sebelum hari ini",
        });
      }
    }

    await order.update({
      ...(notes !== undefined && { notes }),
      ...(pickup_date && { pickup_date }),
    });

    const updatedOrder = await Order.findByPk(id, {
      include: [
        { model: Customer },
        { model: OrderItem, include: [{ model: ProductVariant }] },
        { model: Rekening, as: "rekening" },
      ],
    });

    res.json({
      message: "Order berhasil diperbarui",
      data: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "status wajib diisi" });
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    await order.update({ status });

    res.json({
      message: "Order status berhasil diperbarui",
      data: order,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_method, rekening_id, payment_proof } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    // Validasi jika payment_method adalah transfer
    const method = payment_method || order.payment_method;
    if (method === "transfer") {
      const rekeningId = rekening_id || order.rekening_id;
      if (!rekeningId) {
        return res.status(400).json({
          message: "rekening_id wajib diisi jika payment_method adalah transfer",
        });
      }
      const rekening = await Rekening.findByPk(rekeningId);
      if (!rekening || !rekening.is_active) {
        return res.status(400).json({
          message: "Rekening tidak ditemukan atau tidak aktif",
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
      include: [
        { model: Customer },
        { model: OrderItem },
        { model: Rekening, as: "rekening" },
      ],
    });

    res.json({
      message: "Order payment berhasil diperbarui",
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
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    // Hapus order items terlebih dahulu, lalu order, dalam satu transaction
    await OrderItem.destroy({ where: { order_id: id }, transaction: t });
    await order.destroy({ transaction: t });

    await t.commit();

    res.json({
      message: "Order dan semua items berhasil dihapus",
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};
