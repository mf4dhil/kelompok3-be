# Ringkasan Normalisasi Pembayaran (Payment Normalization)

## 📋 Perubahan yang Dilakukan

### 1. **Struktur Database - Tabel Payments Baru**

**Sebelum (Payment di Orders):**
```
orders
├── payment_method (ENUM: 'cash', 'transfer')
├── payment_proof (TEXT - path file)
└── payment_status (ENUM: 'unpaid', 'partial', 'paid')
```

**Sesudah (Payment Terpisah):**
```
orders
└── payment_status (computed dari total payment)

payments (NEW)
├── id (INT, PK)
├── order_id (INT, FK → orders)
├── rekening_id (INT, FK → rekenings, nullable)
├── payment_type (VARCHAR - 'dp', 'full', 'repayment', dll)
├── amount (INT - jumlah pembayaran)
├── payment_method (ENUM: 'cash', 'transfer')
├── payment_proof (VARCHAR - path file gambar)
├── status (ENUM: 'pending', 'verified', 'rejected')
├── paid_at (DATETIME - waktu pembayaran verified)
├── created_at / updated_at (timestamps)
```

---

### 2. **File yang Dibuat / Diubah**

| File | Status | Deskripsi |
|------|--------|-----------|
| `models/payment.js` | ✅ BARU | Model Payment dengan relasi Order & Rekening |
| `models/order.js` | ✏️ EDIT | Hapus `payment_method`, `payment_proof` (moved to payments) |
| `models/index.models.js` | ✏️ EDIT | Import & export Payment model |
| `controller/paymentController.js` | ✅ BARU | CRUD operations untuk payments |
| `middleware/uploadMiddleware.js` | ✅ BARU | Multer config untuk upload bukti pembayaran |
| `routes/orderRoutes.js` | ✏️ EDIT | Import payment controller & tambah payment routes |
| `index.js` | ✏️ EDIT | Setup multer middleware & serve static files |
| `seed/seed.js` | ✏️ EDIT | Ubah Product.create → findOrCreate (idempotent) |
| `seed/seed-orders.js` | ✏️ EDIT | Tambah Payment seed data |
| `PAYMENTS_API_DOCUMENTATION.md` | ✅ BARU | Dokumentasi lengkap Payment API |
| `uploads/payments/` | ✅ BARU | Folder untuk menyimpan bukti pembayaran |

---

### 3. **Model Relations**

```
┌─────────────┐
│   orders    │
├─────────────┤
│ id (PK)     │
│ customer_id │
│ ... details │
│ payment_status
└──────────┬──────────────┐
           │ (1 : many)   │
           ▼              │
      ┌──────────┐        │
      │ payments │        │
      ├──────────┤        │
      │ id (PK)  │        │
      │ order_id ├────────┘
      │ amount   │
      │ status   │
      │ ... etc  │
      └──────────┘
           │
           │ (many : 1)
           ▼
      ┌──────────┐
      │rekenings │
      ├──────────┤
      │ id (PK)  │
      │ bank_name│
      └──────────┘
```

---

### 4. **Fitur Upload Bukti Pembayaran**

#### Spesifikasi:
- **Folder:** `uploads/payments/`
- **Format:** JPG, JPEG, PNG, WEBP
- **Max Size:** 5 MB
- **Naming:** `payment-proof-<timestamp>.<ext>`
- **Access URL:** `http://localhost:3000/uploads/payments/payment-proof-xxx.jpg`

#### Middleware Multer:
```javascript
// index.js
app.post('/api/payments', uploadPaymentProof.single('payment_proof'));
app.patch('/api/payments/:id', uploadPaymentProof.single('payment_proof'));
```

---

### 5. **API Endpoints Payments**

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/payments` | List semua payments (dengan filter & pagination) |
| `GET` | `/api/payments/:id` | Detail payment by ID |
| `POST` | `/api/payments` | Buat payment baru (with file upload) |
| `PATCH` | `/api/payments/:id` | Update payment (status, amount, upload bukti baru) |
| `DELETE` | `/api/payments/:id` | Hapus payment |

---

### 6. **Logika Otomatis**

#### Ketika Payment Dibuat / Diupdate:
1. Calculate total dari semua payments untuk order tersebut
2. Update `order.payment_status`:
   - Total paid = 0 → `unpaid`
   - 0 < Total paid < Total amount → `partial`
   - Total paid ≥ Total amount → `paid`

#### Ketika Status Diubah ke "verified":
- Set `paid_at` = current datetime

#### Ketika File Diupload:
- Save ke `uploads/payments/`
- Store path di `payment_proof`

---

### 7. **Data Seed**

**Contoh flow yang di-seed:**
```
Customer (Pelanggan Contoh)
  ↓
Order (ORD-20261007-0001, total Rp 214.000)
  ├── OrderItem 1 (qty 1, price Rp 89.000)
  ├── OrderItem 2 (qty 1, price Rp 125.000)
  └── Payment (DP, Rp 107.000 - 50%, transfer via BCA, status: verified)
      ↓
      order.payment_status = "partial" (karena baru bayar 50%)
```

---

### 8. **Request/Response Examples**

#### Create Payment with Upload:
```bash
curl -X POST http://localhost:3000/api/payments \
  -F "order_id=1" \
  -F "amount=107000" \
  -F "payment_method=transfer" \
  -F "rekening_id=1" \
  -F "payment_type=dp" \
  -F "status=pending" \
  -F "payment_proof=@bukti.jpg"
```

**Response:**
```json
{
  "message": "Payment berhasil dibuat",
  "data": {
    "id": 1,
    "order_id": 1,
    "rekening_id": 1,
    "payment_type": "dp",
    "amount": 107000,
    "payment_method": "transfer",
    "payment_proof": "/uploads/payments/payment-proof-1696673260123.jpg",
    "status": "pending",
    "paid_at": null,
    "order": {
      "id": 1,
      "order_number": "ORD-20261007-0001",
      "total_amount": 214000,
      "payment_status": "partial"
    }
  }
}
```

---

### 9. **Keuntungan Normalisasi**

| Fitur | Sebelum | Sesudah |
|-------|---------|---------|
| Multiple payments per order | ❌ Tidak | ✅ Ya |
| Payment history tracking | ❌ Tidak | ✅ Ya |
| Cicilan / DP support | ❌ Limited | ✅ Full support |
| Bukti pembayaran per payment | ❌ Tidak | ✅ Ya |
| Status verifikasi per payment | ❌ Tidak | ✅ Ya |
| Refund tracking | ❌ Tidak | ✅ Ya (planned) |

---

### 10. **Testing Checklist**

- ✅ Model Payment terdaftar dengan relasi Order & Rekening
- ✅ Tabel payments terbuat di database
- ✅ Endpoint GET /api/payments bekerja
- ✅ Endpoint POST /api/payments dengan upload file bekerja
- ✅ Endpoint PATCH /api/payments/:id bekerja
- ✅ Endpoint DELETE /api/payments/:id bekerja
- ✅ Order.payment_status otomatis update saat payment diubah
- ✅ File upload tersimpan di uploads/payments/
- ✅ File dapat diakses via URL http://localhost:3000/uploads/...
- ✅ Validasi rekening_id untuk payment_method='transfer'
- ✅ Seed data order + payment berhasil

---

### 11. **Migrasi Database**

Jika ada data lama di orders.payment_method / orders.payment_proof:

```sql
-- Backup data lama (optional)
CREATE TABLE orders_payment_backup AS 
SELECT id, payment_method, payment_proof FROM orders 
WHERE payment_method IS NOT NULL OR payment_proof IS NOT NULL;

-- Migrate ke payments table
INSERT INTO payments (order_id, payment_method, payment_proof, amount, status, created_at, updated_at)
SELECT id, payment_method, payment_proof, total_amount, 'verified', NOW(), NOW()
FROM orders 
WHERE payment_method IS NOT NULL;

-- Drop kolom lama dari orders
ALTER TABLE orders DROP COLUMN payment_method, DROP COLUMN payment_proof;
```

---

### 12. **Next Steps (Optional)**

1. **Refund Feature:** Tambah tipe payment 'refund' dengan amount negatif
2. **Payment Verification:** Admin dashboard untuk verify/reject payment uploads
3. **Payment Reminders:** Notification jika payment pending > N hari
4. **Export/Report:** Generate laporan pembayaran
5. **Webhook:** Callback dari payment gateway (midtrans, stripe, dll)

---

## 📊 Database Structure Summary

```sql
SHOW CREATE TABLE payments\G

CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_type` varchar(50) DEFAULT 'full',
  `amount` int NOT NULL,
  `payment_method` enum('cash','transfer') NOT NULL,
  `payment_proof` varchar(255) DEFAULT NULL,
  `status` enum('pending','verified','rejected') DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `order_id` int DEFAULT NULL,
  `rekening_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `rekening_id` (`rekening_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`rekening_id`) REFERENCES `rekenings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```

---

## 🚀 How to Use

1. **Start server:**
   ```bash
   npm start
   ```

2. **Run seed:**
   ```bash
   node seed/seed.js
   node seed/seed-orders.js
   ```

3. **Create payment:**
   ```bash
   POST /api/payments
   FormData: order_id, amount, payment_method, payment_proof (file)
   ```

4. **View payment proof:**
   ```
   http://localhost:3000/uploads/payments/payment-proof-xxx.jpg
   ```

5. **Check order payment_status:**
   ```bash
   GET /api/orders/1
   # payment_status akan otomatis updated berdasarkan total payments
   ```

---

## ✅ Normalisasi Pembayaran - SELESAI

Sistem pembayaran sekarang fully normalized dengan support:
- Multiple payments per order
- Payment tracking & history
- File upload bukti pembayaran
- Status verification per payment
- Automatic order payment_status calculation