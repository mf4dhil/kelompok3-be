import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve('uploads/products');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const fileFilter = (_req, file, callback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  callback(allowed.includes(file.mimetype) ? null : new Error('Gunakan gambar JPG, PNG, atau WEBP.'), allowed.includes(file.mimetype));
};

export default multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
