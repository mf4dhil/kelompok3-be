import { Op } from 'sequelize';
import db from '../config/dababase.js';
import '../models/index.models.js'; // Load all models and relations first
import Customer from '../models/customer.js';
import Rekening from '../models/rekening.js';
import Order from '../models/order.js';
import OrderItem from '../models/order_item.js';
import Payment from '../models/payment.js';
import ProductVariant from '../models/productvariants.js';

const ORDER_COUNT = 15;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const orderScenarios = [
  { status: 'pending', paymentStatus: 'partial', paymentState: 'verified', daysAgo: 1, pickupInDays: 3 },
  { status: 'processing', paymentStatus: 'paid', paymentState: 'verified', daysAgo: 3, pickupInDays: 2 },
  { status: 'ready', paymentStatus: 'partial', paymentState: 'pending', daysAgo: 2, pickupInDays: 0 },
  { status: 'completed', paymentStatus: 'paid', paymentState: 'verified', daysAgo: 12, pickupInDays: -9 },
  { status: 'pending', paymentStatus: 'unpaid', daysAgo: 0, pickupInDays: 5 },
  { status: 'processing', paymentStatus: 'partial', paymentState: 'verified', daysAgo: 4, pickupInDays: 3 },
  { status: 'completed', paymentStatus: 'paid', paymentState: 'verified', daysAgo: 18, pickupInDays: -15 },
  { status: 'cancelled', paymentStatus: 'unpaid', daysAgo: 8, pickupInDays: -2 },
  { status: 'ready', paymentStatus: 'paid', paymentState: 'verified', daysAgo: 2, pickupInDays: 0 },
  { status: 'pending', paymentStatus: 'partial', paymentState: 'pending', daysAgo: 1, pickupInDays: 7 },
  { status: 'completed', paymentStatus: 'paid', paymentState: 'verified', daysAgo: 25, pickupInDays: -22 },
  { status: 'processing', paymentStatus: 'unpaid', daysAgo: 2, pickupInDays: 4 },
  { status: 'ready', paymentStatus: 'partial', paymentState: 'verified', daysAgo: 1, pickupInDays: 0 },
  { status: 'pending', paymentStatus: 'paid', paymentState: 'verified', daysAgo: 0, pickupInDays: 6 },
  { status: 'cancelled', paymentStatus: 'unpaid', daysAgo: 10, pickupInDays: -4 },
];

const atDayOffset = (date, dayOffset) => new Date(date.getTime() + dayOffset * DAY_IN_MS);

const seedOrders = async () => {
  try {
    await db.authenticate();
    await db.sync();
    console.log(`Starting seed for ${ORDER_COUNT} orders...`);

    const [customer] = await Customer.findOrCreate({
      where: { email: 'pelanggan@example.com' },
      defaults: {
        name: 'Pelanggan Contoh',
        phone: '081234567890',
        email: 'pelanggan@example.com',
        address: 'Jl. Contoh No. 1',
      },
    });

    const [rekening] = await Rekening.findOrCreate({
      where: { account_number: '1234567890' },
      defaults: {
        bank_name: 'BCA',
        account_number: '1234567890',
        account_name: 'Pelanggan Contoh',
        is_active: true,
      },
    });

    const variants = await ProductVariant.findAll({
      where: { is_active: true },
      order: [['id', 'ASC']],
    });

    if (variants.length === 0) {
      throw new Error('Tidak ada ProductVariant aktif. Jalankan seed utama terlebih dahulu.');
    }

    const today = new Date();
    const datePrefix = `ORD-${today.toISOString().slice(0, 10)}-`;
    const existingOrders = await Order.findAll({
      attributes: ['order_number'],
      where: { order_number: { [Op.like]: `${datePrefix}%` } },
      raw: true,
    });
    const highestSequence = existingOrders.reduce((highest, order) => {
      const sequence = Number(order.order_number.slice(datePrefix.length));
      return Number.isInteger(sequence) ? Math.max(highest, sequence) : highest;
    }, 0);

    const transaction = await db.transaction();
    try {
      for (let index = 0; index < ORDER_COUNT; index += 1) {
        const scenario = orderScenarios[index];
        const orderDate = atDayOffset(today, -scenario.daysAgo);
        const pickupDate = atDayOffset(today, scenario.pickupInDays);
        const itemCount = Math.min(variants.length, 1 + (index % 3));
        const items = Array.from({ length: itemCount }, (_, itemIndex) => {
          const variant = variants[(index + itemIndex) % variants.length];
          const quantity = ((index + itemIndex) % 3) + 1;
          const price = Math.round(Number(variant.price));

          return {
            product_variant_id: variant.id,
            quantity,
            price,
            subtotal: price * quantity,
            notes: `Item ${itemIndex + 1} untuk pesanan seed ${index + 1}`,
          };
        });
        const totalAmount = items.reduce((total, item) => total + item.subtotal, 0);
        const orderNumber = `${datePrefix}${String(highestSequence + index + 1).padStart(4, '0')}`;

        const order = await Order.create(
          {
            customer_id: customer.id,
            order_number: orderNumber,
            order_date: orderDate,
            pickup_date: pickupDate,
            notes: `Pesanan contoh ${index + 1} dari seed`,
            status: scenario.status,
            payment_status: scenario.paymentStatus,
            rekening_id: rekening.id,
            total_amount: totalAmount,
          },
          { transaction }
        );

        await OrderItem.bulkCreate(
          items.map((item) => ({ ...item, order_id: order.id })),
          { transaction }
        );

        if (scenario.paymentState) {
          const amount = scenario.paymentStatus === 'paid' ? totalAmount : Math.max(1, Math.round(totalAmount / 2));
          const isCash = index % 2 === 1;

          await Payment.create(
            {
              order_id: order.id,
              rekening_id: isCash ? null : rekening.id,
              payment_type: scenario.paymentStatus === 'paid' ? 'full' : 'dp',
              amount,
              payment_method: isCash ? 'cash' : 'transfer',
              payment_proof: isCash ? null : '/uploads/payments/sample-proof.jpg',
              status: scenario.paymentState,
              paid_at: scenario.paymentState === 'verified' ? orderDate : null,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();
      console.log(`✅ Berhasil menambahkan ${ORDER_COUNT} order beserta item dan pembayaran terkait.`);
      console.log(`   - Nomor order: ${datePrefix}${String(highestSequence + 1).padStart(4, '0')}–${String(highestSequence + ORDER_COUNT).padStart(4, '0')}`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('❌ Seed order gagal:', error.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
};

seedOrders();
