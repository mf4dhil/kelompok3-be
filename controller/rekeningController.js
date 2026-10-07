import Rekening from "../models/rekening.js";
import Order from "../models/order.js";

export const getRekenings = async (req, res) => {
  try {
    const { is_active } = req.query;
    const where = {};

    if (is_active !== undefined) {
      where.is_active = is_active === "true";
    }

    const data = await Rekening.findAll({
      where,
      order: [["created_at", "DESC"]],
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRekeningById = async (req, res) => {
  try {
    const data = await Rekening.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Rekening tidak ditemukan" });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createRekening = async (req, res) => {
  try {
    const { bank_name, account_number, account_name, is_active } = req.body;
    if (!bank_name || !account_number || !account_name) {
      return res.status(400).json({
        message: "bank_name, account_number, dan account_name wajib diisi",
      });
    }
    const data = await Rekening.create({
      bank_name,
      account_number,
      account_name,
      is_active: is_active !== undefined ? is_active : true,
    });
    res.status(201).json({ message: "Rekening berhasil ditambahkan", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRekening = async (req, res) => {
  try {
    const data = await Rekening.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Rekening tidak ditemukan" });
    }
    await data.update(req.body);
    res.json({ message: "Rekening berhasil diperbarui", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteRekening = async (req, res) => {
  try {
    const data = await Rekening.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Rekening tidak ditemukan" });
    }

    // Check if rekening is used in orders
    const hasOrders = await Order.count({ where: { rekening_id: data.id } });
    if (hasOrders > 0) {
      return res.status(409).json({
        message:
          "Rekening gagal dihapus karena sudah dipakai di order. Sebagai gantinya, nonaktifkan rekening dengan mengubah is_active menjadi false.",
      });
    }

    await data.destroy();
    res.json({ message: "Rekening berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
