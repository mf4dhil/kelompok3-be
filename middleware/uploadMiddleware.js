import multer from "multer";
import path from "path";
import fs from "fs";

// Pastikan folder uploads/payments ada
const uploadDir = "uploads/payments";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi storage untuk bukti pembayaran
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Format: payment-proof-<timestamp>.<ext>
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `payment-proof-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

// Filter: hanya gambar
const fileFilter = (req, file, cb) => {
  const allowedTypes = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Format file tidak didukung. Hanya JPG, JPEG, PNG, WEBP"), false);
  }
};

const uploadPaymentProof = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

export default uploadPaymentProof;