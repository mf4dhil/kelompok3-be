import Order from "../models/order.js";
import Customer from "../models/customer.js";
import OrderItem from "../models/orderitems.js";
import ProductVariant from "../models/productvariants.js";

// GET semua order
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: Customer,
        },
        {
          model: OrderItem,
          include: [
            {
              model: ProductVariant,
            },
          ],
        },
      ],
      order: [["id", "DESC"]],
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data order",
      error: error.message,
    });
  }
};

// GET order berdasarkan ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: Customer,
        },
        {
          model: OrderItem,
          include: [
            {
              model: ProductVariant,
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil detail order",
      error: error.message,
    });
  }
};

// CREATE order
export const createOrder = async (req, res) => {
  try {
    const {
      customer_id,
      order_number,
      order_date,
      pickup_date,
      notes,
      items,
    } = req.body;

    if (
      !customer_id ||
      !order_number ||
      !order_date ||
      !pickup_date ||
      !items ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Data order belum lengkap",
      });
    }

    // Cek customer
    const customer = await Customer.findByPk(customer_id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer tidak ditemukan",
      });
    }

    // Hitung subtotal setiap item
    const orderItems = items.map((item) => {
      const subtotal = item.quantity * item.price;

      return {
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
        price: item.price,
        subtotal,
      };
    });

    // Hitung total
    const totalAmount = orderItems.reduce(
      (total, item) => total + Number(item.subtotal),
      0
    );

    // Buat order
    const order = await Order.create({
      customer_id,
      order_number,
      order_date,
      pickup_date,
      notes,
      total_amount: totalAmount,
    });

    // Tambahkan order_id ke setiap item
    const itemsWithOrderId = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    // Simpan order items
    await OrderItem.bulkCreate(itemsWithOrderId);

    // Ambil data lengkap
    const result = await Order.findByPk(order.id, {
      include: [
        {
          model: Customer,
        },
        {
          model: OrderItem,
          include: [
            {
              model: ProductVariant,
            },
          ],
        },
      ],
    });

    res.status(201).json({
      message: "Order berhasil dibuat",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal membuat order",
      error: error.message,
    });
  }
};

//status order
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    await order.update({
      status,
    });

    res.json({
      message: "Status order berhasil diubah",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengubah status order",
      error: error.message,
    });
  }
};

//hapus order
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    // Hapus item terlebih dahulu
    await OrderItem.destroy({
      where: {
        order_id: order.id,
      },
    });

    await order.destroy();

    res.json({
      message: "Order berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal menghapus order",
      error: error.message,
    });
  }
};

