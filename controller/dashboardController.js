import { col, fn, Op } from 'sequelize';
import Material from '../models/material.js';
import MaterialStock from '../models/material_stock.js';
import Order from '../models/order.js';
import Payment from '../models/payment.js';

const toNumber = (value) => Number(value || 0);

export const getDashboardSummary = async (_req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const startOfNextWeek = new Date(startOfToday);
    startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

    const todayRange = { [Op.gte]: startOfToday, [Op.lt]: startOfTomorrow };
    const [orderGroups, totalOrders, ordersToday, paymentsPending, verifiedIncomeToday, pickupsToday, pickupsNext7Days, materials] = await Promise.all([
      Order.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      Order.count(),
      Order.count({ where: { created_at: todayRange } }),
      Payment.count({ where: { status: 'pending' } }),
      Payment.sum('amount', {
        where: {
          status: 'verified',
          [Op.or]: [
            { paid_at: todayRange },
            { paid_at: null, created_at: todayRange },
          ],
        },
      }),
      Order.count({
        where: {
          pickup_date: todayRange,
          status: { [Op.notIn]: ['completed', 'cancelled'] },
        },
      }),
      Order.count({
        where: {
          pickup_date: { [Op.gte]: startOfToday, [Op.lt]: startOfNextWeek },
          status: { [Op.notIn]: ['completed', 'cancelled'] },
        },
      }),
      Material.findAll({
        where: { is_active: true },
        attributes: ['id', 'minimum_stock'],
        include: [{ model: MaterialStock, as: 'stock', attributes: ['quantity'] }],
      }),
    ]);

    const statusCounts = Object.fromEntries(orderGroups.map((row) => [row.status, toNumber(row.count)]));
    const lowStockCount = materials.filter(
      (material) => toNumber(material.stock?.quantity) <= toNumber(material.minimum_stock)
    ).length;

    res.json({
      generatedAt: new Date().toISOString(),
      orders: {
        totalCount: totalOrders,
        todayCount: ordersToday,
        statusCounts,
      },
      payments: {
        pendingVerificationCount: paymentsPending,
        verifiedIncomeToday: toNumber(verifiedIncomeToday),
      },
      pickups: {
        todayCount: pickupsToday,
        next7DaysCount: pickupsNext7Days,
      },
      inventory: { lowStockCount },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
