import Customer from "../models/customer.js";
import Order from "../models/order.js";
import { Op } from "sequelize";

export const getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Customer.findAndCountAll({
      where,
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

export const getCustomerById = async (req, res) => {
  try {
    const data = await Customer.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Customer tidak ditemukan" });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: "Name dan phone wajib diisi" });
    }
    const data = await Customer.create({
      name,
      phone,
      email,
      address,
    });
    res.status(201).json({ message: "Customer berhasil ditambahkan", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const data = await Customer.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Customer tidak ditemukan" });
    }
    await data.update(req.body);
    res.json({ message: "Customer berhasil diperbarui", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const data = await Customer.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Customer tidak ditemukan" });
    }

    // Check if customer has orders
    const hasOrders = await Order.count({ where: { customer_id: data.id } });
    if (hasOrders > 0) {
      return res.status(409).json({
        message: "Customer gagal dihapus. Customer masih memiliki order.",
      });
    }

    await data.destroy();
    res.json({ message: "Customer berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};