# API Documentation - Payments (Normalisasi)

## Konsep Normalisasi Pembayaran

Pembayaran sekarang disimpan dalam tabel terpisah `payments` yang memiliki relasi `one-to-many` dengan `orders`.

**Keuntungan:**
- Support multiple payments per order (DP, pelunasan, cicilan)
- Track history pembayaran dengan detail
- Upload bukti pembayaran (gambar) per payment
- Status verifikasi per pembayaran

---

## Endpoints

### 1. GET /api/payments
List semua payments dengan filter

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 10)
- `order_id` (optional) - Filter by order ID
- `status` (optional) - Filter by status: pending, verified, rejected

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "order_id": 1,
      "rekening_id": 1,
      "payment_type": "dp",
      "amount": 107000,
      "payment_method": "transfer",
      "payment_proof": "/uploads/payments/payment-proof-1234567890.jpg",
      "status": "verified",
      "paid_at": "2026-10-07T08:34:20.000Z",
      "created_at": "2026-10-07T08:34:20.000Z",
      "updated_at": "2026-10-07T08:34:20.000Z",
      "order": {
        "id": 1,
        "order_number": "ORD-20261007-0001",
        "total_amount": 214000,
        "payment_status": "partial"
      },
      "rekening": {
        "id": 1,
        "bank_name": "BCA",
        "account_number": "1234567890"
      }
    }
  ],
  "currentPage": 1,
  "totalPages": 1,
  "totalItems": 1
}
```

---

### 2. GET /api/payments/:id
Detail payment by ID

**Response:**
```json
{
  "id": 1,
  "order_id": 1,
  "rekening_id": 1,
  "payment_type": "dp",
  "amount": 107000,
  "payment_method": "transfer",
  "payment_proof": "/uploads/payments/payment-proof-1234567890.jpg",
  "status": "verified",
  "paid_at": "2026-10-07T08:34:20.000Z",
  "order": {
    "id": 1,
    "order_number": "ORD-20261007-0001",
    "customer": {
      "id": 1,
      "name": "Pelanggan Contoh"
    }
  },
  "rekening": {
    "id": 1,
    "bank_name": "BCA",
    "account_number": "1234567890",
    "account_name": "Pelanggan Contoh"
  }
}
```

---

### 3. POST /api/payments
Buat payment baru dengan/tanpa upload bukti pembayaran

**Content-Type:** `multipart/form-data`

**Body (Form Data):**
- `order_id` (required, integer)
- `amount` (required, integer) - Jumlah pembayaran
- `payment_method` (required, enum: 'cash', 'transfer')
- `rekening_id` (required jika payment_method = 'transfer', integer)
- `payment_type` (optional, string, default: 'full') - cth: 'dp', 'full', 'repayment'
- `status` (optional, enum: 'pending', 'verified', 'rejected', default: 'pending')
- `payment_proof` (optional, file) - Upload gambar bukti pembayaran (JPG, JPEG, PNG, WEBP, max 5MB)

**Example Request (cURL):**
```bash
curl -X POST http://localhost:3000/api/payments \
  -F "order_id=1" \
  -F "amount=107000" \
  -F "payment_method=transfer" \
  -F "rekening_id=1" \
  -F "payment_type=dp" \
  -F "status=pending" \
  -F "payment_proof=@/path/to/bukti.jpg"
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
    "created_at": "2026-10-07T08:34:20.000Z",
    "updated_at": "2026-10-07T08:34:20.000Z",
    "order": {
      "id": 1,
      "order_number": "ORD-20261007-0001",
      "total_amount": 214000,
      "payment_status": "partial"
    }
  }
}
```

**Logika Otomatis:**
- Ketika payment dibuat, `order.payment_status` dihitung ulang:
  - Jika total paid >= total_amount → `paid`
  - Jika total paid > 0 dan < total_amount → `partial`
  - Jika total paid = 0 → `unpaid`
- Jika `status` = 'verified', `paid_at` diset otomatis

---

### 4. PATCH /api/payments/:id
Update payment (status, amount, upload bukti baru)

**Content-Type:** `multipart/form-data`

**Body (Form Data):**
- `status` (optional, enum: 'pending', 'verified', 'rejected')
- `amount` (optional, integer)
- `payment_type` (optional, string)
- `payment_proof` (optional, file) - Upload bukti baru

**Example Request (cURL):**
```bash
curl -X PATCH http://localhost:3000/api/payments/1 \
  -F "status=verified" \
  -F "payment_proof=@/path/to/bukti-baru.jpg"
```

**Response:**
```json
{
  "message": "Payment berhasil diperbarui",
  "data": {
    "id": 1,
    "status": "verified",
    "payment_proof": "/uploads/payments/payment-proof-1696673280456.jpg",
    "paid_at": "2026-10-07T09:00:00.000Z",
    "order": {
      "id": 1,
      "payment_status": "partial"
    }
  }
}
```

**Logika Otomatis:**
- Ketika payment diupdate, `order.payment_status` dihitung ulang
- Jika status diubah ke 'verified', `paid_at` diset otomatis

---

### 5. DELETE /api/payments/:id
Hapus payment

**Response:**
```json
{
  "message": "Payment berhasil dihapus"
}
```

**Logika Otomatis:**
- Ketika payment dihapus, `order.payment_status` dihitung ulang

---

## Upload Bukti Pembayaran

### Spesifikasi Upload:
- **Field name:** `payment_proof`
- **Format:** JPG, JPEG, PNG, WEBP
- **Max size:** 5 MB
- **Storage:** `uploads/payments/`
- **Naming:** `payment-proof-<timestamp>.<ext>`

### Cara Akses File:
File yang diupload dapat diakses via URL:
```
http://localhost:3000/uploads/payments/payment-proof-1696673260123.jpg
```

### Contoh Upload di Frontend (JavaScript):
```javascript
const formData = new FormData();
formData.append('order_id', 1);
formData.append('amount', 107000);
formData.append('payment_method', 'transfer');
formData.append('rekening_id', 1);
formData.append('payment_type', 'dp');
formData.append('payment_proof', fileInput.files[0]); // <input type="file">

fetch('http://localhost:3000/api/payments', {
  method: 'POST',
  body: formData,
})
  .then(res => res.json())
  .then(data => console.log('Payment created:', data));
```

---

## Relasi Tabel

```
orders (1) ────< (many) payments
orders (many) ────> (1) customers
payments (many) ────> (1) rekenings (optional)
```

### Struktur Tabel Payments:
```sql
payments
────────────────────
id                  INT PRIMARY KEY AUTO_INCREMENT
order_id            INT (FK -> orders.id)
rekening_id         INT (FK -> rekenings.id, nullable)
payment_type        VARCHAR(50) DEFAULT 'full'
amount              INT NOT NULL
payment_method      ENUM('cash', 'transfer') NOT NULL
payment_proof       VARCHAR(255) (path file gambar)
status              ENUM('pending', 'verified', 'rejected') DEFAULT 'pending'
paid_at             DATETIME (nullable)
created_at          DATETIME NOT NULL
updated_at          DATETIME NOT NULL
```

---

## Contoh Flow Pembayaran

### Scenario: Customer bayar DP 50%, lalu pelunasan

1. **Buat Order (total Rp 214.000)**
```bash
POST /api/orders
{
  "customer_id": 1,
  "pickup_date": "2026-10-10",
  "items": [...]
}
# Response: order_id = 1, payment_status = "unpaid"
```

2. **Bayar DP 50% (Rp 107.000)**
```bash
POST /api/payments
FormData:
  order_id = 1
  amount = 107000
  payment_method = transfer
  rekening_id = 1
  payment_type = dp
  payment_proof = [file bukti.jpg]
# Response: payment_id = 1, order.payment_status = "partial"
```

3. **Pelunasan (Rp 107.000)**
```bash
POST /api/payments
FormData:
  order_id = 1
  amount = 107000
  payment_method = transfer
  rekening_id = 1
  payment_type = repayment
  payment_proof = [file bukti2.jpg]
# Response: payment_id = 2, order.payment_status = "paid"
```

---

## Error Handling

### 400 Bad Request:
- Missing required fields (order_id, amount, payment_method)
- Rekening_id wajib jika payment_method = transfer
- File format tidak didukung
- File size > 5 MB

### 404 Not Found:
- Order tidak ditemukan
- Rekening tidak ditemukan atau tidak aktif
- Payment tidak ditemukan

### 500 Internal Server Error:
- Database error
- File upload error

---

## Testing dengan REST Client (VS Code)

```http
### Create Payment with file upload
POST http://localhost:3000/api/payments
Content-Type: multipart/form-data; boundary=----Boundary

------Boundary
Content-Disposition: form-data; name="order_id"

1
------Boundary
Content-Disposition: form-data; name="amount"

107000
------Boundary
Content-Disposition: form-data; name="payment_method"

transfer
------Boundary
Content-Disposition: form-data; name="rekening_id"

1
------Boundary
Content-Disposition: form-data; name="payment_type"

dp
------Boundary
Content-Disposition: form-data; name="payment_proof"; filename="bukti.jpg"
Content-Type: image/jpeg

< ./test-files/bukti.jpg
------Boundary--

### Get all payments
GET http://localhost:3000/api/payments

### Get payment by ID
GET http://localhost:3000/api/payments/1

### Update payment status
PATCH http://localhost:3000/api/payments/1
Content-Type: application/json

{
  "status": "verified"
}

### Delete payment
DELETE http://localhost:3000/api/payments/1
```

---

## Migrasi dari Order.payment_* ke Payment Table

### Sebelum (payment di tabel orders):
```
orders
├── payment_method
├── payment_proof
└── payment_status
```

### Sesudah (payment di tabel payments):
```
orders
└── payment_status (computed dari sum payments)

payments
├── order_id
├── payment_method
├── payment_proof
├── amount
├── status
└── paid_at
```

**Keuntungan:**
- Multiple payments per order
- History tracking
- Individual verification per payment
- Flexible payment scenarios (DP, cicilan, refund)