import Rekening from "../models/rekening.js";

// GET semua rekening
export const getRekenings = async (req, res) => {
  try {
    const data = await Rekening.findAll({
      order: [["id", "DESC"]],
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data rekening",
      error: error.message,
    });
  }
};

// GET rekening berdasarkan ID
export const getRekeningById = async (req, res) => {
  try {
    const data = await Rekening.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Rekening tidak ditemukan",
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data rekening",
      error: error.message,
    });
  }
};

// POST rekening
export const createRekening = async (req, res) => {
  try {
    const { bank_name, account_number, account_name, status } = req.body;

    if (!bank_name || !account_number || !account_name) {
      return res.status(400).json({
        message: "Nama bank, nomor rekening, dan nama pemilik wajib diisi",
      });
    }

    const rekening = await Rekening.create({
      bank_name,
      account_number,
      account_name,
      status,
    });

    res.status(201).json({
      message: "Rekening berhasil ditambahkan",
      data: rekening,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal menambahkan rekening",
      error: error.message,
    });
  }
};

// PATCH rekening
export const updateRekening = async (req, res) => {
  try {
    const rekening = await Rekening.findByPk(req.params.id);

    if (!rekening) {
      return res.status(404).json({
        message: "Rekening tidak ditemukan",
      });
    }

    const { bank_name, account_number, account_name, is_active } = req.body;

    await rekening.update({
      bank_name,
      account_number,
      account_name,
      is_active,
    });

    res.json({
      message: "Rekening berhasil diubah",
      data: rekening,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengubah rekening",
      error: error.message,
    });
  }
};

// DELETE rekening
export const deleteRekening = async (req, res) => {
  try {
    const rekening = await Rekening.findByPk(req.params.id);

    if (!rekening) {
      return res.status(404).json({
        message: "Rekening tidak ditemukan",
      });
    }

    await rekening.destroy();

    res.json({
      message: "Rekening berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal menghapus rekening",
      error: error.message,
    });
  }
};