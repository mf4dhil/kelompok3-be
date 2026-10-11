import { fn, col, Op, QueryTypes } from "sequelize";
import Order from "../models/order.js";
import Payment from "../models/payment.js";
import Expense from "../models/expense.js";
import ExpenseCategory from "../models/expense_category.js";
import Customer from "../models/customer.js";
import db from "../config/dababase.js";
import { isValidDateOnly } from "../utils/dateValidation.js";

const parseDateRange = (startDate, endDate) => {
  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate)) {
    return { error: "Tanggal harus menggunakan format YYYY-MM-DD yang valid" };
  }
  if (startDate && endDate && startDate > endDate) {
    return { error: "Tanggal awal tidak boleh melewati tanggal akhir" };
  }

  return {
    start: startDate ? `${startDate} 00:00:00` : null,
    end: endDate ? `${endDate} 23:59:59.999` : null,
  };
};

const sum = (rows, key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);

export const getReportSummary = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const range = parseDateRange(start_date, end_date);
    if (range.error) return res.status(400).json({ message: range.error });

    const orderWhere = {};
    if (range.start || range.end) {
      orderWhere.order_date = {};
      if (range.start) orderWhere.order_date[Op.gte] = range.start;
      if (range.end) orderWhere.order_date[Op.lte] = range.end;
    }

    const expenseWhere = {};
    if (start_date || end_date) {
      expenseWhere.expense_date = {};
      if (start_date) expenseWhere.expense_date[Op.gte] = start_date;
      if (end_date) expenseWhere.expense_date[Op.lte] = end_date;
    }

    // Verified payments use paid_at; payments not yet verified use created_at.
    const paymentDateConditions = [];
    if (range.start || range.end) {
      const paidAt = {};
      const createdAt = {};
      if (range.start) {
        paidAt[Op.gte] = range.start;
        createdAt[Op.gte] = range.start;
      }
      if (range.end) {
        paidAt[Op.lte] = range.end;
        createdAt[Op.lte] = range.end;
      }
      paymentDateConditions.push({
        [Op.or]: [
          { status: "verified", [Op.or]: [{ paid_at: paidAt }, { paid_at: null, created_at: createdAt }] },
          { status: { [Op.ne]: "verified" }, created_at: createdAt },
        ],
      });
    }
    const paymentWhere = paymentDateConditions.length ? { [Op.and]: paymentDateConditions } : {};

    const replacements = {};
    let productDateFilter = "o.status <> 'cancelled'";
    if (start_date) {
      productDateFilter += " AND o.order_date >= :productStart";
      replacements.productStart = `${start_date} 00:00:00`;
    }
    if (end_date) {
      productDateFilter += " AND o.order_date <= :productEnd";
      replacements.productEnd = `${end_date} 23:59:59.999`;
    }
    const dailyTrend = Boolean(start_date && end_date && (Date.parse(end_date) - Date.parse(start_date)) / 86400000 <= 62);
    const trendFormat = dailyTrend ? "%Y-%m-%d" : "%Y-%m";
    const orderTrendFilter = [
      "o.status <> 'cancelled'",
      ...(start_date ? ["o.order_date >= :trendStart"] : []),
      ...(end_date ? ["o.order_date <= :trendEnd"] : []),
    ].join(" AND ");
    const paymentTrendFilter = [
      "status = 'verified'",
      ...(start_date ? ["COALESCE(paid_at, created_at) >= :trendStart"] : []),
      ...(end_date ? ["COALESCE(paid_at, created_at) <= :trendEnd"] : []),
    ].join(" AND ");
    const expenseTrendFilter = [
      "1 = 1",
      ...(start_date ? ["expense_date >= :trendStartDate"] : []),
      ...(end_date ? ["expense_date <= :trendEndDate"] : []),
    ].join(" AND ");
    const trendReplacements = {
      ...(start_date ? { trendStart: `${start_date} 00:00:00`, trendStartDate: start_date } : {}),
      ...(end_date ? { trendEnd: `${end_date} 23:59:59.999`, trendEndDate: end_date } : {}),
    };

    const [paymentRows, orderRows, expenseRows, expenseCategoryRows, topProducts, outstandingRows, orderTrends, paymentTrends, expenseTrends] = await Promise.all([
      Payment.findAll({
        where: paymentWhere,
        attributes: ["status", [fn("COUNT", col("id")), "count"], [fn("COALESCE", fn("SUM", col("amount")), 0), "amount"]],
        group: ["status"],
        raw: true,
      }),
      Order.findAll({
        where: orderWhere,
        attributes: ["status", "payment_status", [fn("COUNT", col("id")), "count"], [fn("COALESCE", fn("SUM", col("total_amount")), 0), "amount"]],
        group: ["status", "payment_status"],
        raw: true,
      }),
      Expense.findAll({
        where: expenseWhere,
        attributes: [[fn("COUNT", col("id")), "count"], [fn("COALESCE", fn("SUM", col("amount")), 0), "amount"]],
        raw: true,
      }),
      Expense.findAll({
        where: expenseWhere,
        attributes: ["category_id", [fn("COALESCE", fn("SUM", col("amount")), 0), "amount"]],
        include: [{ model: ExpenseCategory, as: "category", attributes: ["name"] }],
        group: ["category_id", "category.id", "category.name"],
        raw: true,
      }),
      db.query(
        `SELECT p.id AS productId, p.name AS productName,
                SUM(oi.quantity) AS quantity, SUM(oi.subtotal) AS orderValue
         FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         INNER JOIN product_variants pv ON pv.id = oi.product_variant_id
         INNER JOIN products p ON p.id = pv.product_id
         WHERE ${productDateFilter}
         GROUP BY p.id, p.name
         ORDER BY quantity DESC
         LIMIT 5`,
        { replacements, type: QueryTypes.SELECT }
      ),
      db.query(
        `SELECT COALESCE(SUM(GREATEST(o.total_amount - COALESCE(paid.total_paid, 0), 0)), 0) AS outstandingAmount
         FROM orders o
         LEFT JOIN (
           SELECT order_id, SUM(amount) AS total_paid
           FROM payments
           WHERE status = 'verified'
           GROUP BY order_id
         ) paid ON paid.order_id = o.id
         WHERE o.status <> 'cancelled'
           ${start_date ? "AND o.order_date >= :orderStart" : ""}
           ${end_date ? "AND o.order_date <= :orderEnd" : ""}`,
        {
          replacements: {
            ...replacements,
            ...(start_date ? { orderStart: `${start_date} 00:00:00` } : {}),
            ...(end_date ? { orderEnd: `${end_date} 23:59:59.999` } : {}),
          },
          type: QueryTypes.SELECT,
        }
      ),
      db.query(
        `SELECT DATE_FORMAT(o.order_date, '${trendFormat}') AS period,
                COUNT(*) AS orderCount, SUM(o.total_amount) AS orderValue
         FROM orders o
         WHERE ${orderTrendFilter}
         GROUP BY period
         ORDER BY period DESC
         LIMIT 36`,
        { replacements: trendReplacements, type: QueryTypes.SELECT }
      ),
      db.query(
        `SELECT DATE_FORMAT(COALESCE(paid_at, created_at), '${trendFormat}') AS period,
                SUM(amount) AS verifiedIncome
         FROM payments
         WHERE ${paymentTrendFilter}
         GROUP BY period
         ORDER BY period DESC
         LIMIT 36`,
        { replacements: trendReplacements, type: QueryTypes.SELECT }
      ),
      db.query(
        `SELECT DATE_FORMAT(expense_date, '${trendFormat}') AS period,
                SUM(amount) AS expenses
         FROM expenses
         WHERE ${expenseTrendFilter}
         GROUP BY period
         ORDER BY period DESC
         LIMIT 36`,
        { replacements: trendReplacements, type: QueryTypes.SELECT }
      ),
    ]);

    const paymentByStatus = Object.fromEntries(paymentRows.map((row) => [row.status, row]));
    const orderStatusCounts = {};
    const orderPaymentStatusCounts = {};
    for (const row of orderRows) {
      orderStatusCounts[row.status] = (orderStatusCounts[row.status] || 0) + Number(row.count || 0);
      if (row.status !== "cancelled") {
        orderPaymentStatusCounts[row.payment_status] = (orderPaymentStatusCounts[row.payment_status] || 0) + Number(row.count || 0);
      }
    }
    const nonCancelledOrderRows = orderRows.filter((row) => row.status !== "cancelled");
    const expenses = expenseRows[0] || { count: 0, amount: 0 };
    const verifiedIncome = Number(paymentByStatus.verified?.amount || 0);
    const expenseTotal = Number(expenses.amount || 0);
    const trendByPeriod = new Map();
    for (const row of orderTrends) trendByPeriod.set(row.period, { period: row.period, orderCount: Number(row.orderCount || 0), orderValue: Number(row.orderValue || 0), verifiedIncome: 0, expenses: 0 });
    for (const row of paymentTrends) {
      const trend = trendByPeriod.get(row.period) || { period: row.period, orderCount: 0, orderValue: 0, verifiedIncome: 0, expenses: 0 };
      trend.verifiedIncome = Number(row.verifiedIncome || 0);
      trendByPeriod.set(row.period, trend);
    }
    for (const row of expenseTrends) {
      const trend = trendByPeriod.get(row.period) || { period: row.period, orderCount: 0, orderValue: 0, verifiedIncome: 0, expenses: 0 };
      trend.expenses = Number(row.expenses || 0);
      trendByPeriod.set(row.period, trend);
    }
    const trends = [...trendByPeriod.values()]
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((row) => ({ ...row, netRecordedCash: row.verifiedIncome - row.expenses }));

    return res.json({
      period: { start_date: start_date || null, end_date: end_date || null },
      dateBasis: {
        orders: "order_date",
        verifiedPayments: "paid_at (created_at when paid_at is empty)",
        unverifiedPayments: "created_at",
        expenses: "expense_date",
      },
      payments: {
        totalCount: sum(paymentRows, "count"),
        totalAmount: sum(paymentRows, "amount"),
        verifiedCount: Number(paymentByStatus.verified?.count || 0),
        verifiedAmount: verifiedIncome,
        pendingCount: Number(paymentByStatus.pending?.count || 0),
        pendingAmount: Number(paymentByStatus.pending?.amount || 0),
        rejectedCount: Number(paymentByStatus.rejected?.count || 0),
        rejectedAmount: Number(paymentByStatus.rejected?.amount || 0),
      },
      orders: {
        totalCount: sum(orderRows, "count"),
        cancelledCount: Number(orderStatusCounts.cancelled || 0),
        value: sum(nonCancelledOrderRows, "amount"),
        paidCount: Number(orderPaymentStatusCounts.paid || 0),
        unpaidCount: Number(orderPaymentStatusCounts.unpaid || 0),
        partialCount: Number(orderPaymentStatusCounts.partial || 0),
        outstandingAmount: Number(outstandingRows[0]?.outstandingAmount || 0),
        statusCounts: orderStatusCounts,
      },
      expenses: {
        totalCount: Number(expenses.count || 0),
        totalAmount: expenseTotal,
        byCategory: expenseCategoryRows.map((row) => ({
          categoryId: Number(row.category_id),
          categoryName: row["category.name"] || "Tanpa kategori",
          amount: Number(row.amount || 0),
        })).sort((a, b) => b.amount - a.amount),
      },
      topProducts: topProducts.map((row) => ({
        productId: Number(row.productId),
        productName: row.productName,
        quantity: Number(row.quantity || 0),
        orderValue: Number(row.orderValue || 0),
      })),
      trends: { granularity: dailyTrend ? "day" : "month", rows: trends },
      cashSummary: {
        verifiedIncome,
        expenses: expenseTotal,
        netRecordedCash: verifiedIncome - expenseTotal,
      },
      note: "Surplus kas tercatat bukan laba bersih; biaya produksi dan biaya lain yang belum dicatat tidak ikut dihitung.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const csvCell = (value) => {
  if (value === null || value === undefined) return '""';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text) && !Number.isFinite(Number(text))) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export const exportReport = async (req, res) => {
  try {
    const { type, start_date, end_date, status, payment_status, payment_method } = req.query;
    if (!["payments", "orders", "expenses"].includes(type)) {
      return res.status(400).json({ message: "type harus payments, orders, atau expenses" });
    }

    const range = parseDateRange(start_date, end_date);
    if (range.error) return res.status(400).json({ message: range.error });
    const rows = [];
    let headers;

    if (type === "payments") {
      const where = {};
      if (status) where.status = status;
      if (payment_method) where.payment_method = payment_method;
      if (range.start || range.end) {
        const paidAt = {};
        const createdAt = {};
        if (range.start) { paidAt[Op.gte] = range.start; createdAt[Op.gte] = range.start; }
        if (range.end) { paidAt[Op.lte] = range.end; createdAt[Op.lte] = range.end; }
        where[Op.and] = [{
          [Op.or]: [
            { status: "verified", [Op.or]: [{ paid_at: paidAt }, { paid_at: null, created_at: createdAt }] },
            { status: { [Op.ne]: "verified" }, created_at: createdAt },
          ],
        }];
      }
      const payments = await Payment.findAll({
        where,
        include: [{ model: Order, attributes: ["order_number", "total_amount"], include: [{ association: "customer", attributes: ["name"] }] }],
        order: [["created_at", "DESC"]],
      });
      headers = ["ID Pembayaran", "Tanggal", "No. Pesanan", "Pelanggan", "Metode", "Tipe", "Nominal", "Status"];
      rows.push(...payments.map((payment) => [payment.id, payment.paid_at || payment.created_at, payment.order?.order_number, payment.order?.customer?.name, payment.payment_method, payment.payment_type, payment.amount, payment.status]));
    } else if (type === "orders") {
      const where = {};
      if (status) where.status = status;
      if (payment_status) where.payment_status = payment_status;
      if (range.start || range.end) {
        where.order_date = {};
        if (range.start) where.order_date[Op.gte] = range.start;
        if (range.end) where.order_date[Op.lte] = range.end;
      }
      const orders = await Order.findAll({ where, include: [{ model: Customer, attributes: ["name", "phone"] }], order: [["order_date", "DESC"]] });
      headers = ["No. Pesanan", "Tanggal Order", "Tanggal Ambil", "Pelanggan", "Telepon", "Status Pesanan", "Status Pembayaran", "Nilai PO"];
      rows.push(...orders.map((order) => [order.order_number, order.order_date, order.pickup_date, order.customer?.name || order.Customer?.name, order.customer?.phone || order.Customer?.phone, order.status, order.payment_status, order.total_amount]));
    } else {
      const where = {};
      if (range.start || range.end) {
        where.expense_date = {};
        if (start_date) where.expense_date[Op.gte] = start_date;
        if (end_date) where.expense_date[Op.lte] = end_date;
      }
      const expenses = await Expense.findAll({ where, include: [{ model: ExpenseCategory, as: "category", attributes: ["name"] }], order: [["expense_date", "DESC"]] });
      headers = ["No. Pengeluaran", "Tanggal", "Kategori", "Deskripsi", "Metode Pembayaran", "Nominal"];
      rows.push(...expenses.map((expense) => [expense.expense_number, expense.expense_date, expense.category?.name, expense.description, expense.payment_method, expense.amount]));
    }

    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const startPart = start_date || "awal";
    const endPart = end_date || "terkini";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=laporan-${type}-${startPart}-${endPart}.csv`);
    return res.send(`\uFEFF${csv}`);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
