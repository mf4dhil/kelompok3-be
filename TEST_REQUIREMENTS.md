# TEST REQUIREMENTS - Kelompok 3 Backend

## Pendahuluan
File ini berisi kasus uji (test cases) untuk fitur-fitur baru yang telah dibuat:
- Customers (Pelanggan)
- Rekenings (Bank Accounts)
- Orders (Pesanan)
- Order Items (item pesanan - dikelola lewat Orders)

**Stack:** Node.js, Express.js, Sequelize, MySQL  
**Prefix Route:** `/api`

---

## 1. Customers (`/customers`)

### GET `/customers`
**Deskripsi:** Mendapatkan list customer dengan pagination dan search.

| Parameter | Tipe | Deskripsi | Contoh |
|-----------|------|-----------|--------|
| page | integer | Nomor halaman (default: 1) | `page=1` |
| limit | integer | Banyak data per halaman (default: 10) | `limit=5` |
| search | string | Filter berdasarkan name atau phone | `search=John` |

**Response Sukses (200):**
```json
{
  "data": [...],
  "currentPage": 1,
  "totalPages": 5,
  "totalItems": 25
}
```

**Response Error:**
- 400: Jika parameter tidak valid
- 500: Server error

---

### GET `/customers/:id`
**Deskripsi:** Mendapatkan detail customer berdasarkan ID.

**Response Sukses (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "phone": "081234567890",
  "email": "john@example.com",
  "address": "Jl. Contoh No. 1"
}
```

**Response Error:**
- 404: Jika customer tidak ditemukan
- 400: Jika ID format tidak valid

---

### POST `/customers`
**Deskripsi:** Membuat customer baru.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "phone": "089876543210",
  "email": "jane@example.com",
  "address": "Jl. Baru No. 5"
}
```

**Response Sukses (201):**
```json
{
  "message": "Customer berhasil ditambahkan",
  "data": { ... }
}
```

**Validasi Error (400):**
- Name atau phone kosong → `"Name dan phone wajib diisi"`
- Duplicate email (jika ada constraint) → appropriate error

---

### PATCH `/customers/:id`
**Deskripsi:** Update data customer.

**Response Sukses (200):**
```json
{
  "message": "Customer berhasil diperbarui",
  "data": { ... }
}
```

**Response Error:**
- 404: Customer tidak ditemukan
- 409: Jika customer masih punya order (tidak bisa dihapus, tapi untuk update cek logika tersendiri)

---

### DELETE `/customers/:id`
**Deskripsi:** Hapus customer.

**Response Sukses (200):**
```json
{
  "message": "Customer berhasil dihapus"
}
```

**Response Error:**
- 404: Customer tidak ditemukan
- **409 Conflict:** Jika customer masih punya order → `"Customer gagal dihapus. Customer masih memiliki order."`

---

## 2. Rekenings (`/rekenings`)

### GET `/rekenings`
**Deskripsi:** Mendapatkan list rekening. Opsional filter `is_active=true`.

**Parameter:**
- `is_active=true` → hanya rekening aktif

**Response Sukses (200):** Array data rekening.

---

### GET `/rekenings/:id`
**Deskripsi:** Detail rekening.

**Response Error:**
- 404: Jika rekening tidak ditemukan

---

### POST `/rekenings`
**Deskripsi:** Buat rekening baru.

**Request Body:**
```json
{
  "bank_name": "BNI",
  "account_number": "1234567890",
  "account_name": "John Doe",
  "is_active": true
}
```

**Response Sukses (201):** Data rekening yang baru dibuat.

**Validasi Error (400):**
- bank_name, account_number, account_name kosong → error message

---

### PATCH `/rekenings/:id`
**Deskripsi:** Update rekening.

**Response Sukses (200):** Data rekening terbaru.

---

### DELETE `/rekenings/:id`
**Deskripsi:** Hapus rekening.

**Response Sukses (200):** Jika berhasil dihapus.

**Response Error:**
- 404: Rekening tidak ditemukan
- **409 Conflict:** Jika rekening sudah pernah dipakai di order →
  `"Rekening gagal dihapus karena sudah dipakai di order. Sebagai gantinya, nonaktifkan rekening dengan mengubah is_active menjadi false."`

**Catatan:** Sistem menolak delete total, sarankan `is_active=false` sebagai gantinya.

---

## 3. Orders (`/orders`)

### GET `/orders`
**Deskripsi:** List order dengan pagination dan filter ber berbagai jenis.

**Parameter Pagination:**
- `page` (default: 1)
- `limit` (default: 10)

**Parameter Filter:**
- `status` → ENUM: pending, processing, ready, completed, cancelled
- `payment_status` → ENUM: unpaid, partial, paid
- `customer_id` → UUID format (integer di project ini)
- `pickup_date` → Format YYYY-MM-DD
- `order_date_start` → Rentang mulai
- `order_date_end` → Rentang akhir

**Urutkan:** Terbaru dulu (`order_date DESC`)

**Response Sukses (200):** Object pagination seperti customers.

---

### GET `/orders/:id`
**Deskripsi:** Detail order lengkap beserta relasi.

**Include:**
- Data customer
- Semua order_items dengan product variant
- Data rekening (jika ada)

**Response Sukses (200):** Object order lengkap.

**Response Error:**
- 404: Order tidak ditemukan
- 400: Jika ID format salah

---

### POST `/orders`
**Deskripsi:** Buat order beserta order items. **Wajib menggunakan Transaction Sequelize.**

**Request Body Penting:**
```json
{
  "customer_id": 1,
  "pickup_date": "2026-10-15",
  "notes": "Catatan pelanggan",
  "payment_method": "transfer", // atau "cash"
  "rekening_id": 1, // WAJIB jika payment_method = transfer
  "items": [
    {
      "product_variant_id": 1,
      "quantity": 2,
      "notes": "Tanpa gula"
    },
    {
      "product_variant_id": 3,
      "quantity": 1
    }
  ]
}
```

**Validasi Bisnis (wajib dipenuhi semua):**

1. **Customer harus ada** di database → 404 jika tidak ditemukan
2. **Setiap product_variant_id harus ada** di database → 404 varian tidak ditemukan
3. **Quantity harus integer >= 1** → 400 jika invalid
4. **Items minimal 1** → 400 jika array kosong
5. **Jika payment_method = transfer:**
   - rekening_id **wajib** diisi
   - rekening harus `is_active = true`
   - Jika tidak → 400 dengan message sesuai code
6. **pickup_date tidak boleh sebelum hari ini** → 400
7. **Harga (price) AMBIL DARI DATABASE** dari ProductVariant, BUKAN dari request body
8. **order_number** dibuat otomatis server-side: format `ORD-YYYYMMDD-XXXX`
9. **total_amount** dihitung: `∑(quantity × price per item)`
10. **Jika duplikat order_number** → generate ulang hingga unik

**Response Sukses (201):**
```json
{
  "message": "Order berhasil dibuat",
  "data": { ... order lengkap beserta items & relasi ... }
}
```

**Response Error (contoh):**
- 400: Validasi gagal (lihat poin di atas)
- 500: Jika transaction gagal (harus rollback)

---

### PATCH `/orders/:id`
**Deskripsi:** Update data order (notes, pickup_date, dll).

**Validasi Penting:**
- **TIDAK BOLEH** mengubah `total_amount` langsung → 400 dengan message `"total_amount tidak boleh diubah langsung"`
- pickup_date harus >= hari ini
- Field lain: notes, pickup_date boleh diupdate

**Response Sukses (200):** Data order terbaru.

---

### PATCH `/orders/:id/status`
**Deskripsi:** Update status order.

**Request Body:**
```json
{
  "status": "processing"
}
```

**Validasi:**
- status wajib salah satu dari: pending, processing, ready, completed, cancelled

**Response Sukses (200):** Data order dengan status baru.

---

### PATCH `/orders/:id/payment`
**Deskripsi:** Update payment_status, payment_method, rekening_id, payment_proof.

**Request Body:**
```json
{
  "payment_status": "paid",
  "payment_method": "transfer",
  "rekening_id": 1,
  "payment_proof": "https://..."
}
```

**Validasi:**
- Jika `payment_method` = transfer → rekening_id wajib dan rekening harus active
- Jika validasi gagal → 400

**Response Sukses (200):** Data order pembayaran terupdate.

---

### DELETE `/orders/:id`
**Deskripsi:** Hapus order dan semua order_items-nya dalam 1 transaction.

**Response Sukses (200):**
```json
{
  "message": "Order dan semua items berhasil dihapus"
}
```

**Response Error:**
- 404: Order tidak ditemukan
- 500: Jika transaction error (harus rollback)

---

## 4. Order Items (Tidak ada endpoint terpisah)

Order Items hanya dikelola melalui Orders:
- **Dibuat** saat POST `/orders`
- **Diupdate** saat PATCH `/orders/:id` (hanya notes dan relasi)
- **Dihapus** saat DELETE `/orders/:id`

**Field Order Items:**
- id, quantity, price, subtotal, notes, created_at, updated_at
- order_id (FK)
- product_variant_id (FK)

**Validasi:**
- Setiap item minimal punya product_variant_id dan quantity >= 1
- Price diambil dari ProductVariant di DB
- Subtotal = quantity × price

---

## 5. Relasi Database Test

| Relasi | Test Case |
|--------|-----------|
| Customer hasMany Order | Create order dengan customer_id yang valid, cek order muncul di listing customer |
| Order hasMany OrderItem | Create order dengan 2+ items, cek order_items terkait |
| Order belongsTo Rekening | Create order dengan payment_method=transfer + rekening_id, cek relasi |
| OrderItem belongsTo ProductVariant | Post order dengan product_variant_id yang sudah ada di DB |

---

## 6. Edge Cases & Error Handling

| Scenario | Expected Response |
|----------|-------------------|
| POST order dengan customer_id tidak valid | 404 `"Customer tidak ditemukan"` |
| POST order dengan quantity = 0 | 400 `"Quantity harus bilangan bulat >= 1"` |
| POST order dengan payment_method transfer tapi rekening_id kosong | 400 `"rekening_id wajib diisi jika payment_method adalah transfer"` |
| DELETE customer yang masih punya order | 409 `"Customer gagal dihapus. Customer masih memiliki order."` |
| DELETE rekening yang pernah dipakai order | 409 `"Rekening gagal dihapus..."` |
| GET orders dengan filter yang tidak ada data | 200 dengan `data: []` dan totalPages 0 |
| Update order total_amount langsung | 400 `"total_amount tidak boleh diubah langsung"` |

---

## 7. Checklist Testing

- [ ] Semua endpoint GET/POST/PATCH/DELETE diuji dengan curl/Postman
- [ ] Pagination bekerja dengan benar (limit dan page)
- [ ] Search/filter pada customers dan orders bekerja
- [ ] Validasi input error menampilkan pesan yang jelas
- [ ] Transaction rollback terjadi jika ada error di tengah create order
- [ ] order_number generate unik setiap kali
- [ ] Harga diambil dari DB, BUKAN dari body request
- [ ] Payment validation transfer + rekening active
- [ ] Delete customer/rekening tolak jika masih digunakan
- [ ] Response code sesuai standar (200, 201, 400, 404, 409)
- [ ] N+1 query hindari dengan include yang tepat

---

## 8. Tools Saran

- **Postman** atau **Insomnia** untuk testing API manual
- **npm test** atau framework seperti Jest + Supertest untuk otomated test
- **MySQL Workbench** untuk cek direktly di database
- **PostgreSQL/SQLite** development environment untuk test tanpa mempengaruhi production data

---
*File ini dibuat untuk memastikan semua fitur baru (customers, rekenings, orders) bekerja sesuai spesifikasi sebelum deploy ke produksi.*