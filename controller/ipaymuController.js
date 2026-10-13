import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import db from "../config/dababase.js";
import Customer from "../models/customer.js";
import Order from "../models/order.js";
import OrderItem from "../models/order_item.js";
import Payment from "../models/payment.js";
import Product from "../models/product.js";
import ProductVariant from "../models/productvariants.js";

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

const getIpaymuConfig = () => {
  const va = process.env.IPAYMU_VA;
  const apiKey = process.env.IPAYMU_API_KEY;
  const callbackUrl = process.env.IPAYMU_CALLBACK_URL;
  const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN;
  if (!va || !apiKey || !callbackUrl || !frontendUrl) return null;
  return {
    va,
    apiKey,
    callbackUrl,
    frontendUrl: frontendUrl.replace(/\/$/, ""),
    baseUrl: (process.env.IPAYMU_BASE_URL || "https://sandbox.ipaymu.com/api/v2").replace(/\/$/, ""),
    expiredHours: Math.max(1, Number(process.env.IPAYMU_EXPIRED_HOURS) || 24),
    feeDirection: process.env.IPAYMU_FEE_DIRECTION,
  };
};

const makeSignature = (method, va, body, apiKey) => {
  const bodyHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const stringToSign = `${method}:${va}:${bodyHash}:${apiKey}`;
  return createHmac("sha256", apiKey).update(stringToSign).digest("hex");
};

const addQuery = (base, key, value) => {
  const url = new URL(base);
  url.searchParams.set(key, value);
  return url.toString();
};

export const createIpaymuSession = async (req, res) => {
  const config = getIpaymuConfig();
  if (!config) {
    return res.status(503).json({ message: "Pembayaran online belum dikonfigurasi. Silakan pilih tunai atau hubungi toko." });
  }

  const { order_number, phone, payment_option = "full" } = req.body || {};
  if (!order_number || !phone || !["full", "dp"].includes(payment_option)) {
    return res.status(400).json({ message: "order_number, nomor telepon, dan payment_option (full/dp) wajib diisi" });
  }

  const transaction = await db.transaction();
  let payment;
  let order;
  try {
    order = await Order.findOne({
      where: { order_number: String(order_number).trim().toUpperCase() },
      include: [{ model: Customer, attributes: ["id", "name", "phone", "email"] }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: "Pesanan tidak ditemukan" });
    }
    const customer = order.Customer || order.customer;
    if (normalizePhone(customer?.phone) !== normalizePhone(phone)) {
      await transaction.rollback();
      return res.status(404).json({ message: "Pesanan tidak ditemukan. Periksa nomor order dan nomor telepon." });
    }
    if (order.payment_method !== "ipaymu") {
      await transaction.rollback();
      return res.status(409).json({ message: "Pesanan ini tidak menggunakan metode pembayaran iPaymu." });
    }
    if (order.status === "cancelled") {
      await transaction.rollback();
      return res.status(409).json({ message: "Pesanan sudah dibatalkan dan tidak dapat dibayar." });
    }
    if (order.payment_status === "paid") {
      await transaction.rollback();
      return res.status(409).json({ message: "Pesanan ini sudah lunas." });
    }

    const verifiedPayments = await Payment.findAll({
      where: { order_id: order.id, status: "verified" },
      attributes: ["amount"],
      transaction,
    });
    const paidAmount = verifiedPayments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const remaining = Math.max(0, Number(order.total_amount) - paidAmount);
    const amount = payment_option === "dp"
      ? Math.min(remaining, Math.ceil(Number(order.total_amount) * 0.5))
      : remaining;
    if (amount <= 0) {
      await transaction.rollback();
      return res.status(409).json({ message: "Tidak ada sisa tagihan untuk dibayar." });
    }

    const now = new Date();
    const pendingSession = await Payment.findOne({
      where: {
        order_id: order.id,
        payment_provider: "ipaymu",
        status: "pending",
      },
      order: [["created_at", "DESC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (pendingSession) {
      const sessionStillValid = pendingSession.expires_at && new Date(pendingSession.expires_at) > now;
      if (sessionStillValid && Number(pendingSession.amount) === amount && pendingSession.gateway_url) {
        await transaction.commit();
        return res.json({
          message: "Sesi pembayaran yang masih aktif digunakan kembali.",
          data: { payment_id: pendingSession.id, url: pendingSession.gateway_url, expires_at: pendingSession.expires_at },
        });
      }
      await transaction.rollback();
      return res.status(409).json({ message: "Sesi iPaymu sebelumnya masih menunggu konfirmasi. Tunggu pembaruan status sebelum membuat pembayaran baru." });
    }

    const referenceId = `NIFA-${randomUUID()}`;
    const paymentType = payment_option === "dp" && amount < remaining ? "dp" : paidAmount > 0 ? "repayment" : "full";
    payment = await Payment.create({
      order_id: order.id,
      amount,
      payment_method: "ipaymu",
      payment_provider: "ipaymu",
      payment_type: paymentType,
      status: "pending",
      gateway_reference_id: referenceId,
      expires_at: new Date(now.getTime() + config.expiredHours * 60 * 60 * 1000),
    }, { transaction });
    await transaction.commit();
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("Gagal menyiapkan sesi pembayaran iPaymu:", error.message);
    return res.status(500).json({ message: "Sesi pembayaran belum dapat dibuat. Coba lagi." });
  }

  const paymentLabel = payment.payment_type === "dp" ? "Uang muka" : payment.payment_type === "repayment" ? "Pelunasan" : "Pembayaran pesanan";
  const requestBody = {
    product: [`${paymentLabel} ${order.order_number}`],
    qty: ["1"],
    price: [String(payment.amount)],
    description: [`Pembayaran ${paymentLabel.toLowerCase()} NIFACake`],
    returnUrl: addQuery(`${config.frontendUrl}/lacak-pesanan`, "nomor", order.order_number),
    notifyUrl: config.callbackUrl,
    cancelUrl: addQuery(`${config.frontendUrl}/lacak-pesanan`, "nomor", order.order_number),
    referenceId: payment.gateway_reference_id,
    buyerName: order.Customer?.name || order.customer?.name || "Pelanggan NIFACake",
    buyerPhone: order.Customer?.phone || order.customer?.phone,
    buyerEmail: order.Customer?.email || order.customer?.email || undefined,
    expired: config.expiredHours,
    ...(config.feeDirection ? { feeDirection: config.feeDirection } : {}),
  };

  try {
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const response = await fetch(`${config.baseUrl}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        va: config.va,
        signature: makeSignature("POST", config.va, requestBody, config.apiKey),
        timestamp,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    const data = result?.Data || result?.data;
    const checkoutUrl = data?.Url || data?.url;
    if (!response.ok || result?.Success === false || Number(result?.Status) >= 400 || !checkoutUrl) {
      throw new Error(result?.Message || result?.message || "Respons iPaymu tidak valid");
    }

    const sessionId = data?.SessionID || data?.sessionID || data?.TransactionId || null;
    const expiresAt = data?.Expired ? new Date(data.Expired) : payment.expires_at;
    await payment.update({ gateway_session_id: sessionId, gateway_url: checkoutUrl, expires_at: expiresAt });

    return res.status(201).json({
      message: "Sesi pembayaran berhasil dibuat.",
      data: { payment_id: payment.id, url: checkoutUrl, expires_at: expiresAt },
    });
  } catch (error) {
    await payment.update({ status: "rejected" });
    console.error("Permintaan pembayaran iPaymu gagal:", error.message);
    return res.status(502).json({ message: "iPaymu belum dapat menyiapkan pembayaran. Pesanan tetap tersimpan; silakan coba lagi." });
  }
};

const normalizeCallback = (rawData) => {
  const normalized = {};
  for (const [key, rawValue] of Object.entries(rawData || {})) {
    if (["trx_id", "status_code", "transaction_status_code", "paid_off"].includes(key)) {
      const parsed = Number.parseInt(rawValue, 10);
      normalized[key] = Number.isNaN(parsed) ? rawValue : parsed;
    } else if (key === "is_escrow") {
      normalized[key] = rawValue === true || rawValue === "true" || rawValue === "1" || rawValue === 1;
    } else if (key === "additional_info" && (rawValue === "[]" || (Array.isArray(rawValue) && rawValue.length === 0))) {
      normalized[key] = [];
    } else if (key === "additional_info" && Array.isArray(rawValue)) {
      normalized[key] = rawValue;
    } else {
      normalized[key] = String(rawValue);
    }
  }
  delete normalized.signature;
  if (!Object.hasOwn(normalized, "additional_info")) normalized.additional_info = [];
  return Object.fromEntries(Object.keys(normalized).sort((a, b) => a.localeCompare(b)).map((key) => [key, normalized[key]]));
};

const isValidCallbackSignature = (body, receivedSignature, va) => {
  if (!receivedSignature || !/^[a-f0-9]{64}$/i.test(receivedSignature) || !va) return false;
  const payload = JSON.stringify(normalizeCallback(body)).replace(/\//g, "\\/");
  const expected = createHmac("sha256", va).update(payload).digest();
  const received = Buffer.from(receivedSignature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
};

export const handleIpaymuCallback = async (req, res) => {
  const va = process.env.IPAYMU_VA;
  const body = req.body || {};
  if (!isValidCallbackSignature(body, req.get("X-Signature"), va)) {
    return res.status(401).json({ message: "Signature callback iPaymu tidak valid." });
  }
  if (body.merchant && String(body.merchant) !== String(va)) {
    return res.status(200).json({ message: "Callback diabaikan." });
  }

  const referenceId = body.reference_id || body.referenceId;
  if (!referenceId) return res.status(200).json({ message: "Callback tanpa referensi diabaikan." });

  const transaction = await db.transaction();
  try {
    const payment = await Payment.findOne({
      where: { gateway_reference_id: String(referenceId), payment_provider: "ipaymu" },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!payment) {
      await transaction.commit();
      return res.status(200).json({ message: "Transaksi tidak dikenal; callback diabaikan." });
    }
    if (payment.status === "verified") {
      await transaction.commit();
      return res.status(200).json({ message: "Callback sudah diproses." });
    }

    const callbackAmount = Number(body.sub_total ?? body.amount);
    if (!Number.isFinite(callbackAmount) || callbackAmount !== Number(payment.amount)) {
      console.error(`Nominal callback iPaymu tidak cocok untuk payment ${payment.id}`);
      await transaction.commit();
      return res.status(200).json({ message: "Nominal callback tidak cocok; tidak ada perubahan pembayaran." });
    }

    const statusCode = Number(body.status_code);
    const transactionStatusCode = Number(body.transaction_status_code);
    const isPaid = statusCode === 1
      && String(body.status).toLowerCase() === "berhasil"
      && (!Number.isFinite(transactionStatusCode) || [1, 6].includes(transactionStatusCode));
    const isExpired = statusCode === -2 || String(body.status).toLowerCase() === "expired";

    if (isPaid) {
      await payment.update({
        status: "verified",
        paid_at: body.paid_at && !Number.isNaN(new Date(body.paid_at).getTime()) ? new Date(body.paid_at) : new Date(),
        gateway_transaction_id: body.trx_id ? String(body.trx_id) : payment.gateway_transaction_id,
        gateway_session_id: body.sid || payment.gateway_session_id,
        gateway_channel: body.channel || body.via || payment.gateway_channel,
        gateway_payment_no: body.payment_no || body.va || payment.gateway_payment_no,
      }, { transaction });

      const order = await Order.findByPk(payment.order_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (order) {
        const verifiedPayments = await Payment.findAll({
          where: { order_id: order.id, status: "verified" },
          attributes: ["amount"],
          transaction,
        });
        const totalPaid = verifiedPayments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const paymentStatus = totalPaid >= Number(order.total_amount) ? "paid" : totalPaid > 0 ? "partial" : "unpaid";
        await order.update({ payment_status: paymentStatus }, { transaction });
      }
    } else if (isExpired) {
      await payment.update({ status: "rejected" }, { transaction });
    }

    await transaction.commit();
    return res.status(200).json({ message: "Callback iPaymu diterima." });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("Callback iPaymu gagal diproses:", error.message);
    return res.status(500).json({ message: "Callback belum dapat diproses." });
  }
};
