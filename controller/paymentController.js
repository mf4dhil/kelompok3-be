import Payment from "../models/payment.js";
import Order from "../models/order.js";
import Rekening from "../models/rekening.js";
import db from "../config/dababase.js";

// GET /payments - List semua payments (dengan filter order_id, status)
export const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, order_id, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (order_id) where.order_id = order_id;
    if (status) where.status = status;

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        { model: Order, attributes: ["id", "order_number", "total_amount", "payment_status"] },
        { model: Rekening, as: "rekening", attributes: ["id", "bank_name", "account_number"] },
      ],
      limit: parseInt(limit),
      offset,
      order: [["created_at", "DESC"]],
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

// GET /payments/:id - Detail payment
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, {
      include: [
        { model: Order, include: [{ association: "customer" }] },
        { model: Rekening, as: "rekening" },
      ],
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment tidak ditemukan" });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /payments - Buat payment baru (dengan/ tanpa file)
export const createPayment = async (req, res) => {
  const t = await db.transaction();
  try {
    const { order_id, amount, payment_method, payment_type, status, rekening_id } = req.body;
    const userRole = req.user?.role || 'admin';

    // Validasi input wajib
    if (!order_id || !payment_method) {
      await t.rollback();
      return res.status(400).json({
        message: "order_id, dan payment_method wajib diisi",
      });
    }

    // Cek order ada
    const order = await Order.findByPk(order_id, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    // Validasi rekening jika transfer
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

    // Tentukan status dan paid_at berdasarkan role user
    let paymentStatus = status;
    let paidAt = null;

    if (userRole === 'admin') {
      // Admin otomatis diverifikasi
      paymentStatus = paymentStatus || 'verified';
      if (paymentStatus === 'verified') {
        paidAt = new Date();
      }
    } else {
      // Customer menunggu verifikasi admin
      paymentStatus = paymentStatus || 'pending';
      paidAt = null;
    }

    // Default amount jika tidak diberikan
    // Jika payment_type = 'partial', gunakan 50% dari total order
    let finalAmount = amount !== undefined && amount > 0 ? amount : order.total_amount;
    if ((payment_type === 'dp' || payment_type === 'partial') && (!amount || amount <= 0)) {
      finalAmount = Math.ceil(order.total_amount * 0.5);
    }

    // Cek apakah file diupload
    let paymentProofPath = null;
    if (req.file) {
      paymentProofPath = `/uploads/payments/${req.file.filename}`;
    }

    const payment = await Payment.create(
      {
        order_id,
        rekening_id: payment_method === 'transfer' ? rekening_id : null,
        amount: finalAmount,
        payment_method,
        payment_type: payment_type || (finalAmount >= order.total_amount ? "full" : "dp"),
        payment_proof: paymentProofPath,
        status: paymentStatus,
        paid_at: paidAt,
      },
      { transaction: t }
    );

    // Update payment_status pada order berdasarkan total pembayaran (Hanya yang verified)
    const allVerifiedPayments = await Payment.findAll({
      where: { order_id, status: "verified" },
      transaction: t,
    });

    const totalPaid = allVerifiedPayments.reduce((sum, p) => sum + p.amount, 0);
    let newPaymentStatus = "unpaid";
    if (totalPaid >= order.total_amount) {
      newPaymentStatus = "paid";
    } else if (totalPaid > 0) {
      newPaymentStatus = "partial";
    }

    await order.update({ payment_status: newPaymentStatus }, { transaction: t });

    await t.commit();

    // Fetch lengkap dengan include
    const fullPayment = await Payment.findByPk(payment.id, {
      include: [
        { model: Order, attributes: ["id", "order_number", "total_amount", "payment_status"] },
        { model: Rekening, as: "rekening", attributes: ["id", "bank_name", "account_number"] },
      ],
    });

    res.status(201).json({
      message: "Payment berhasil dibuat",
      data: fullPayment,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

// PATCH /payments/:id - Update payment (status, dll)
export const updatePayment = async (req, res) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    const { status, amount, payment_type } = req.body;

    const payment = await Payment.findByPk(id, { transaction: t });
    if (!payment) {
      await t.rollback();
      return res.status(404).json({ message: "Payment tidak ditemukan" });
    }

    // Jika ada file baru untuk bukti pembayaran
    const updateData = {};
    if (status) updateData.status = status;
    if (amount !== undefined) updateData.amount = amount;
    if (payment_type) updateData.payment_type = payment_type;

    // Jika status diubah ke verified, set paid_at
    if (status === "verified") {
      updateData.paid_at = new Date();
    }

    // Jika ada file baru upload
    if (req.file) {
      updateData.payment_proof = `/uploads/payments/${req.file.filename}`;
    }

    await payment.update(updateData, { transaction: t });

    // Recalculate order payment_status (hanya verified payments yang dihitung)
    const allPayments = await Payment.findAll({
      where: { order_id: payment.order_id, status: "verified" },
      transaction: t,
    });

    const order = await Order.findByPk(payment.order_id, { transaction: t });
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    let newPaymentStatus = "unpaid";
    if (totalPaid >= order.total_amount) {
      newPaymentStatus = "paid";
    } else if (totalPaid > 0) {
      newPaymentStatus = "partial";
    }
    await order.update({ payment_status: newPaymentStatus }, { transaction: t });

    await t.commit();

    const updatedPayment = await Payment.findByPk(id, {
      include: [
        { model: Order, attributes: ["id", "order_number", "total_amount", "payment_status"] },
        { model: Rekening, as: "rekening" },
      ],
    });

    res.json({
      message: "Payment berhasil diperbarui",
      data: updatedPayment,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

// DELETE /payments/:id - Hapus payment
export const deletePayment = async (req, res) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, { transaction: t });
    if (!payment) {
      await t.rollback();
      return res.status(404).json({ message: "Payment tidak ditemukan" });
    }

    const orderId = payment.order_id;
    await payment.destroy({ transaction: t });

    // Recalculate order payment_status (hanya verified payments yang dihitung)
    const allPayments = await Payment.findAll({
      where: { order_id: orderId, status: "verified" },
      transaction: t,
    });

    const order = await Order.findByPk(orderId, { transaction: t });
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    let newPaymentStatus = "unpaid";
    if (allPayments.length === 0) {
      newPaymentStatus = "unpaid";
    } else if (totalPaid >= order.total_amount) {
      newPaymentStatus = "paid";
    } else {
      newPaymentStatus = "partial";
    }
    await order.update({ payment_status: newPaymentStatus }, { transaction: t });

    await t.commit();

    res.json({ message: "Payment berhasil dihapus" });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};