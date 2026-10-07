import db from '../config/dababase.js';
import '../models/index.models.js'; // Load all models and relations first
import Customer from '../models/customer.js';
import Rekening from '../models/rekening.js';
import Order from '../models/order.js';
import OrderItem from '../models/order_item.js';
import Payment from '../models/payment.js';
import ProductVariant from '../models/productvariants.js';

const seedOrders = async () => {
  try {
    await db.authenticate();
    await db.sync();

    console.log('Starting order & payment seed...');

    // 1. Cek atau buat Customer
    let [customer, created] = await Customer.findOrCreate({
      where: { email: 'pelanggan@example.com' },
      defaults: {
        name: 'Pelanggan Contoh',
        phone: '081234567890',
        email: 'pelanggan@example.com',
        address: 'Jl. Contoh No. 1',
      },
    });
    if (created) console.log('Customer seeded:', customer.name);
    else console.log('Customer already exists:', customer.email);

    // 2. Cek atau buat Rekening
    let [rekening, createdRek] = await Rekening.findOrCreate({
      where: { account_number: '1234567890' },
      defaults: {
        bank_name: 'BCA',
        account_number: '1234567890',
        account_name: 'Pelanggan Contoh',
        is_active: true,
      },
    });
    if (createdRek) console.log('Rekening seeded:', rekening.bank_name);
    else console.log('Rekening already exists');

    // 3. Cari product variants yang ada untuk dibuat order items
    const variants = await ProductVariant.findAll({
      limit: 3,
      order: [['id', 'ASC']],
    });

    if (variants.length === 0) {
      console.log('⚠️  Tidak ada ProductVariant di database.');
      console.log('Silakan jalankan seed utama terlebih dahulu (node seed/seed.js)');
      process.exit(1);
    }

    // 4. Hitung total_amount
    const selectedVariants = variants.slice(0, 2);
    const totalAmount = selectedVariants.reduce((sum, v) => {
      return sum + Math.round(parseFloat(v.price));
    }, 0);

    // 5. Buat Order dalam Transaction
    const t = await db.transaction();

    try {
      const orderNumber = `ORD-${new Date().toISOString().slice(0, 10)}-0001`;

      const order = await Order.create(
        {
          customer_id: customer.id,
          order_number: orderNumber,
          pickup_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 hari dari sekarang
          notes: 'Order pertama dari seed',
          status: 'pending',
          payment_status: 'partial', // Kita buat partial karena baru bayar DP
          rekening_id: rekening.id,
          total_amount: totalAmount,
        },
        { transaction: t }
      );

      console.log('Order created ID:', order.id);

      // 6. Buat OrderItems
      const firstVariant = variants[0];
      const item1 = await OrderItem.create(
        {
          order_id: order.id,
          product_variant_id: firstVariant.id,
          quantity: 1,
          price: Math.round(parseFloat(firstVariant.price)),
          subtotal: Math.round(parseFloat(firstVariant.price)),
          notes: 'Catatan item pertama',
        },
        { transaction: t }
      );

      // 7. Buat Payment (DP / Transfer) di tabel payments (Normalisasi)
      const paymentAmount = Math.round(totalAmount / 2); // Bayar 50% DP
      const payment = await Payment.create(
        {
          order_id: order.id,
          rekening_id: rekening.id,
          payment_type: 'dp',
          amount: paymentAmount,
          payment_method: 'transfer',
          payment_proof: '/uploads/payments/sample-proof.jpg',
          status: 'verified',
          paid_at: new Date(),
        },
        { transaction: t }
      );

      await t.commit();

      console.log(`✅ Order & Payment seeded successfully!`);
      console.log(`   - Order ID: ${order.id}`);
      console.log(`   - Order Number: ${order.order_number}`);
      console.log(`   - Total Amount: Rp ${totalAmount.toLocaleString()}`);
      console.log(`   - Payment ID: ${payment.id}`);
      console.log(`   - Paid Amount: Rp ${paymentAmount.toLocaleString()} (${payment.payment_type})`);
      console.log(`   - Payment Proof: ${payment.payment_proof}`);

    } catch (err) {
      await t.rollback();
      console.error('❌ Error creating order/payment:', err.message);
      process.exit(1);
    }

    process.exit(0);

  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
};

seedOrders();