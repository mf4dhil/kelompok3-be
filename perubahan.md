# Laporan Perubahan

## Ringkasan Utama
- **Normalisasi pembayaran**: dibuat tabel terpisah `payments` dan dipindahkan semua field terkait pembayaran dari `orders`.
- **Upload bukti pembayaran**: integrasi Multer, penyimpanan di `uploads/payments/`, endpoint API mendukung multipart/form‑data.
- **Endpoint Payments**: CRUD lengkap (`GET /api/payments`, `GET /api/payments/:id`, `POST /api/payments`, `PATCH /api/payments/:id`, `DELETE /api/payments/:id`).
- **Helper Reset DB**: script `seed/reset-db.js` untuk drop‑all‑tables, sync ulang, dan optional seed (`--seed`, `--seed-all`) serta **menghapus seluruh file foto di `uploads/payments/`**.
- **Dokumentasi**: `PAYMENTS_API_DOCUMENTATION.md` dan `NORMALISASI_PEMBAYARAN.md`.
- **Pembaruan Index**: meng‑import `uploadMiddleware`, menambahkan static folder `/uploads`, dan middleware khusus untuk routes payments.
- **Perbaikan Seed**: `seed/seed.js` diubah menjadi idempotent (`findOrCreate`), memastikan seed dapat dijalankan berulang tanpa error.
- **Perbaikan Routes**: import file `rekeningRoutes.js` yang benar, menambahkan middleware upload pada routes payment.
- **Auto-verifikasi admin**: pembayaran oleh admin otomatis `status: "verified"` dan `paid_at: now`; customer → `pending`.
- **Opsi DP/Full**: pembayaran mendukung tipe `dp` (50% total order) dan `full` (total penuh) — dihitung otomatis di backend.
- **Hanya payment verified dihitung**: `order.payment_status` dihitung ulang hanya dari payment dengan `status = "verified"`.
- **Perbaikan Multer route-level**: middleware upload dipindahkan ke route-level (`orderRoutes.js`) agar tidak mengganggu DELETE request non-multipart.

## Detail Perubahan
| File | Perubahan |
|------|-----------|
| `models/payment.js` | Model baru dengan relasi ke `orders` & `rekenings` serta semua kolom pembayaran. |
| `models/order.js` | Hapus kolom `payment_method`, `payment_proof`; tetap `payment_status` yang dihitung otomatis. |
| `models/index.models.js` | Ekspor model `Payment`. |
| `controller/paymentController.js` | CRUD lengkap, hitung kembali `order.payment_status`. |
| `middleware/uploadMiddleware.js` | Konfigurasi Multer (max 5 MB, tipe jpg/jpeg/png/webp, folder `uploads/payments/`). |
| `routes/orderRoutes.js` | Tambah route payment, import `paymentController`, gunakan `uploadMiddleware.single('payment_proof')`. |
| `index.js` | Import `uploadMiddleware`, serve static folder `/uploads`, middleware upload untuk POST/PATCH `/api/payments`. |
| `seed/seed.js` | Diubah menjadi idempotent (`findOrCreate`). |
| `seed/seed-orders.js` | Tambah seed pembayaran (DP 50 %). |
| `seed/reset-db.js` | Script reset DB lengkap, opsi `--seed` & `--seed-all` (menggunakan `child_process.execSync`). |
| `PAYMENTS_API_DOCUMENTATION.md` | Dokumentasi API pembayaran. |
| `NORMALISASI_PEMBAYARAN.md` | Penjelasan lengkap normalisasi, flow, struktur tabel, dll. |
| `perubahan.md` | Laporan perubahan (dokumen ini). |

## Cara Menggunakan
1. **Reset & Seed**
   ```bash
   node seed/reset-db.js --seed-all   # drop semua tabel, sync, seed master + orders/payments
   ```
2. **Jalankan server**
   ```bash
   npm start   # atau nodemon
   ```
3. **Akses API**
   - Payment endpoints berada di bawah `/api/payments`.
   - Bukti pembayaran dapat diakses via `http://localhost:3000/uploads/payments/<filename>`.

## Catatan Tambahan
- Semua ID menggunakan `INTEGER AUTO_INCREMENT`.
- `order.payment_status` otomatis ter‑update saat payment dibuat/diupdate/hapus.
- Pastikan folder `uploads/payments/` memiliki permission tulis.
- Script `reset-db.js` bersifat destruktif: semua data akan hilang.

---

*Dibuat pada 2026‑10‑07 oleh AI assistant.*