import bcrypt from 'bcrypt';
import db from '../config/dababase.js';
import User from '../models/user.model.js';

const seed = async () => {
  try {
    await db.authenticate();
    await db.sync(); // ensure tables exist
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    const [user, created] = await User.findOrCreate({
      where: { email: 'admin@example.com' },
      defaults: {
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '081234567890',
        password: hashedPassword,
        address: 'Jakarta, Indonesia',
        role: 'admin',
      },
    });
    if (created) {
      console.log('Seed user created:', user.toJSON());
    } else {
      console.log('Seed user already exists:', user.toJSON());
    }
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seed();
