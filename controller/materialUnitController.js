import Material from "../models/material.js";
import MaterialUnit from "../models/material_unit.js";

const ensureBaseUnit = async (material) => {
  const [unit] = await MaterialUnit.findOrCreate({
    where: { material_id: material.id, is_base: true },
    defaults: {
      material_id: material.id,
      name: material.unit,
      conversion_factor: 1,
      is_base: true,
      is_active: true,
    },
  });

  return unit;
};

export const getMaterialUnits = async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ message: "Material tidak ditemukan" });
    }

    await ensureBaseUnit(material);
    const units = await MaterialUnit.findAll({
      where: { material_id: material.id },
      order: [["is_base", "DESC"], ["name", "ASC"]],
    });

    return res.json(units);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createMaterialUnit = async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ message: "Material tidak ditemukan" });
    }

    const name = String(req.body.name || "").trim();
    const conversionFactor = Number(req.body.conversion_factor);
    if (!name) {
      return res.status(400).json({ message: "Nama satuan wajib diisi" });
    }
    if (!Number.isFinite(conversionFactor) || conversionFactor <= 0) {
      return res.status(400).json({ message: "Faktor konversi harus lebih dari 0" });
    }

    await ensureBaseUnit(material);
    const existingUnit = await MaterialUnit.findOne({
      where: { material_id: material.id, name },
    });
    if (existingUnit) {
      return res.status(409).json({ message: "Nama satuan sudah digunakan untuk material ini" });
    }

    const unit = await MaterialUnit.create({
      material_id: material.id,
      name,
      conversion_factor: conversionFactor,
      is_base: false,
      is_active: true,
    });

    return res.status(201).json({ message: "Satuan berhasil ditambahkan", data: unit });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateMaterialUnit = async (req, res) => {
  try {
    const unit = await MaterialUnit.findOne({
      where: { id: req.params.unitId, material_id: req.params.id },
    });
    if (!unit) {
      return res.status(404).json({ message: "Satuan material tidak ditemukan" });
    }
    if (unit.is_base) {
      return res.status(400).json({ message: "Satuan dasar tidak dapat diubah" });
    }

    const updates = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) {
        return res.status(400).json({ message: "Nama satuan wajib diisi" });
      }
      const duplicate = await MaterialUnit.findOne({
        where: { material_id: unit.material_id, name },
      });
      if (duplicate && duplicate.id !== unit.id) {
        return res.status(409).json({ message: "Nama satuan sudah digunakan untuk material ini" });
      }
      updates.name = name;
    }

    if (req.body.conversion_factor !== undefined) {
      const conversionFactor = Number(req.body.conversion_factor);
      if (!Number.isFinite(conversionFactor) || conversionFactor <= 0) {
        return res.status(400).json({ message: "Faktor konversi harus lebih dari 0" });
      }
      updates.conversion_factor = conversionFactor;
    }
    if (req.body.is_active !== undefined) {
      updates.is_active = Boolean(req.body.is_active);
    }

    await unit.update(updates);
    return res.json({ message: "Satuan berhasil diperbarui", data: unit });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteMaterialUnit = async (req, res) => {
  try {
    const unit = await MaterialUnit.findOne({
      where: { id: req.params.unitId, material_id: req.params.id },
    });
    if (!unit) {
      return res.status(404).json({ message: "Satuan material tidak ditemukan" });
    }
    if (unit.is_base) {
      return res.status(400).json({ message: "Satuan dasar tidak dapat dihapus" });
    }

    await unit.update({ is_active: false });
    return res.json({ message: "Satuan berhasil dinonaktifkan" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
