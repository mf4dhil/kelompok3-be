import Customer from "../models/customer.js";

// GET semua customer
export const getCustomers = async (req, res) => {
  try {
    const data = await Customer.findAll({
      order: [["id", "DESC"]],
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data customer",
      error: error.message,
    });
  }
};

// GET customer berdasarkan ID
export const getCustomerById = async (req, res) => {
  try {
    const data = await Customer.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Customer tidak ditemukan",
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data customer",
      error: error.message,
    });
  }
};

// POST customer
export const createCustomer = async (req, res) => {
  try {
    const { name, phone,email, address } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        message: "email dan nomor HP wajib diisi",
      });
    }

    const customer = await Customer.create({
      name,
      phone,
      email,
      address,
    });

    res.status(201).json({
      message: "Customer berhasil ditambahkan",
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal menambahkan customer",
      error: error.message,
    });
  }
};

// PATCH customer
export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer tidak ditemukan",
      });
    }

    const { name, phone, address } = req.body;

    await customer.update({
      name,
      phone,
      address,
    });

    res.json({
      message: "Customer berhasil diubah",
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengubah customer",
      error: error.message,
    });
  }
};

// DELETE customer
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Customer tidak ditemukan",
      });
    }

    await customer.destroy();

    res.json({
      message: "Customer berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal menghapus customer",
      error: error.message,
    });
  }
};