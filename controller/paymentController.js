import Payment from "../models/payment.js";
import Order from "../models/order.js";
import Rekening from "../models/rekening.js";
import db from "../config/dababase.js";
import { Op } from "sequelize";
import { getPagination, getPaginationMeta } from "../utils/pagination.js";
import { isValidDateOnly } from "../utils/dateValidation.js";

// GET /payments - List semua payments (dengan filter order_id, status)
export const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, order_id, status, payment_method, start_date, end_date } = req.query;
    const pagination = getPagination(page, limit);
    const where = {};

    if (order_id) where.order_id = order_id;
    if (status) where.status = status;
    if (payment_method) where.payment_method = payment_method;
    if (!isValidDateOnly(start_date) || !isValidDateOnly(end_date)) {
      return res.status(400).json({ message: "Tanggal harus menggunakan format YYYY-MM-DD" });
    }
    if (start_date && end_date && start_date > end_date) {
      return res.status(400).json({ message: "Tanggal awal tidak boleh melewati tanggal akhir" });
    }
    if (start_date || end_date) {
      const paidAtRange = {};
      const createdAtRange = {};
      if (start_date) {
        paidAtRange[Op.gte] = `${start_date} 00:00:00`;
        createdAtRange[Op.gte] = `${start_date} 00:00:00`;
      }
      if (end_date) {
        paidAtRange[Op.lte] = `${end_date} 23:59:59.999`;
        createdAtRange[Op.lte] = `${end_date} 23:59:59.999`;
      }
      where[Op.and] = [{
        [Op.or]: [
          { status: "verified", [Op.or]: [{ paid_at: paidAtRange }, { paid_at: null, created_at: createdAtRange }] },
          { status: { [Op.ne]: "verified" }, created_at: createdAtRange },
        ],
      }];
    }

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        { model: Order, attributes: ["id", "order_number", "total_amount", "payment_status"] },
        { model: Rekening, as: "rekening", attributes: ["id", "bank_name", "account_number"] },
      ],
      limit: pagination.pageSize,
      offset: pagination.offset,
      order: [["created_at", "DESC"]],
    });

    res.json({
      data: rows,
      ...getPaginationMeta(count, pagination.currentPage, pagination.pageSize),
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

    // Hitung sisa tagihan dari pembayaran terverifikasi. Opsi "full" pada
    // pembayaran lanjutan berarti melunasi sisa, bukan membayar total order lagi.
    const verifiedPaymentsBefore = await Payment.findAll({
      where: { order_id, status: 'verified' },
      attributes: ['amount'],
      transaction: t,
    });
    const totalPaidBefore = verifiedPaymentsBefore.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const remainingAmount = Math.max(0, Number(order.total_amount) - totalPaidBefore);
    if (remainingAmount <= 0) {
      await t.rollback();
      return res.status(409).json({ message: 'Pesanan ini sudah lunas.' });
    }

    const requestedType = payment_type || (Number(amount) >= Number(order.total_amount) ? 'full' : 'dp');
    const isDownPayment = requestedType === 'dp' || requestedType === 'partial';
    const finalAmount = isDownPayment
      ? Math.min(remainingAmount, Number(amount) > 0 ? Number(amount) : Math.ceil(Number(order.total_amount) * 0.5))
      : remainingAmount;
    const finalPaymentType = isDownPayment ? 'dp' : totalPaidBefore > 0 ? 'repayment' : 'full';
    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Nominal pembayaran tidak valid.' });
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
        payment_type: finalPaymentType,
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
