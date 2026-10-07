import User from '../models/user.model.js';

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const editUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address } = req.body;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    await user.update({ name, email, phone, address });
    res.json({ msg: 'User updated successfully', user: { id: user.id, name: user.name, email: user.email, phone: user.phone, address: user.address, role: user.role } });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const editProfileSelf = async (req, res) => {
  try {
    // req.user id is from auth middleware, can edit own profile only
    const { id } = req.user;
    const { name, email, phone, address } = req.body;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    await user.update({ name, email, phone, address });
    res.json({ msg: 'Profile updated successfully', user: { id: user.id, name: user.name, email: user.email, phone: user.phone, address: user.address } });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};