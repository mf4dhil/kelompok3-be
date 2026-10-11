const createCrudController = ({ model, label }) => {
  const findById = (id) => model.findByPk(id);

  const handleError = (res, error) =>
    res.status(500).json({ message: error.message });

  const getAll = async (_req, res) => {
    try {
      const data = await model.findAll({ order: [["id", "ASC"]] });
      return res.json(data);
    } catch (error) {
      return handleError(res, error);
    }
  };

  const getById = async (req, res) => {
    try {
      const data = await findById(req.params.id);
      if (!data) {
        return res.status(404).json({ message: `${label} tidak ditemukan` });
      }
      return res.json(data);
    } catch (error) {
      return handleError(res, error);
    }
  };

  const create = async (req, res) => {
    try {
      const data = await model.create(req.body);
      return res.status(201).json({
        message: `${label} berhasil ditambahkan`,
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  const update = async (req, res) => {
    try {
      const data = await findById(req.params.id);
      if (!data) {
        return res.status(404).json({ message: `${label} tidak ditemukan` });
      }

      await data.update(req.body);
      return res.json({ message: `${label} berhasil diperbarui`, data });
    } catch (error) {
      return handleError(res, error);
    }
  };

  const remove = async (req, res) => {
    try {
      const data = await findById(req.params.id);
      if (!data) {
        return res.status(404).json({ message: `${label} tidak ditemukan` });
      }

      await data.destroy();
      return res.json({ message: `${label} berhasil dihapus` });
    } catch (error) {
      return handleError(res, error);
    }
  };

  return { getAll, getById, create, update, remove };
};

export default createCrudController;
