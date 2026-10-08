# 📚 Dokumentasi API Fitur Baru: Manajemen Bahan Baku & Pengeluaran (Expense)

> Semua endpoint berada di bawah prefix `/api` dan menggunakan **JSON response format** standar proyek:
> ```json
> {
>   "message": "...",
>   "data": { ... }
> }
> ```
> 
> **Authentication**
> - Semua endpoint **membutuhkan token JWT** (header `Authorization: Bearer <token>` atau cookie `token`).
> - Akses **read‑only** dapat dilakukan oleh user apa pun yang ter‑autentikasi.
> - Akses **write (POST, PATCH, DELETE)** dibatasi pada role `admin` melalui middleware `adminMiddleware`.

---

## 📦 1. Material (Master Bahan Baku)

| Metode | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| `GET` | `/api/materials` | Auth | List semua material aktif beserta stok terkini. |
| `GET` | `/api/materials/:id` | Auth | Detail satu material (termasuk stok). |
| `POST` | `/api/materials` | **Admin** | Tambah material baru. |
| `PATCH` | `/api/materials/:id` | **Admin** | Update data material. |
| `DELETE` | `/api/materials/:id` | **Admin** | **Hard delete** bila belum ada transaksi, atau **soft delete** (set `is_active = false`) bila sudah ada histori. |

### Request Body (POST / PATCH)
```json
{
  "name": "Tepung Terigu",
  "unit": "kg",
  "minimum_stock": 5   // optional, default 0
}
```
*`name` harus unik.*

### Response (contoh POST)
```json
{
  "message": "Material berhasil ditambahkan",
  "data": {
    "id": 1,
    "name": "Tepung Terigu",
    "unit": "kg",
    "minimum_stock": "5.00",
    "is_active": true,
    "created_at": "2026-10-08T07:12:34.000Z",
    "updated_at": "2026-10-08T07:12:34.000Z"
  }
}
```
---

## 📦 2. Stok & Transaksi Material

| Metode | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| `GET` | `/api/materials/:id/stock` | Auth | Lihat stok terkini untuk material tertentu. |
| `GET` | `/api/materials/:id/transactions` | Auth | List semua transaksi (PURCHASE, USAGE, ADJUSTMENT, RETURN) untuk material. |
| `GET` | `/api/materials/low-stock` | Auth | Material yang `quantity <= minimum_stock`. |
| `POST` | `/api/materials/:id/usage` | **Admin** | Catat penggunaan bahan (stok berkurang). |
| `POST` | `/api/materials/:id/adjustment` | **Admin** | Koreksi stok (+/-) secara manual. |

### 2.1. Penggunaan Bahan (Usage)
Request body:
```json
{
  "quantity": 2,
  "notes": "Dipakai untuk produksi 10 bolu"
}
```
Response contoh:
```json
{
  "message": "Penggunaan bahan berhasil",
  "newStock": 8
}
```
---

### 2.2. Penyesuaian Stok (Adjustment)
Request body:
```json
{
  "quantity": -1.5,
  "notes": "Selisih hasil stock opname"
}
```
Jika `quantity` positif → penambahan stok, negatif → pengurangan. Response:
```json
{
  "message": "Adjustment stok berhasil",
  "newStock": 6.5
}
```
---

## 📦 3. Pembelian Bahan (Material Purchase)

| Metode | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| `POST` | `/api/material-purchases` | **Admin** | Buat transaksi pembelian bahan, otomatis menambah stok, mencatat transaksi PURCHASE, dan membuat *expense* kategori **Bahan Baku**. |
| `GET` | `/api/material-purchases` | Auth | List semua purchase (urut tanggal terbaru). |
| `GET` | `/api/material-purchases/:id` | Auth | Detail purchase lengkap beserta items. |

### Request Body (POST)
```json
{
  "purchaseDate": "2026-10-08",
  "supplierId": null,               // optional, nullable
  "paymentMethod": "TRANSFER",
  "notes": "Pembelian bahan mingguan",
  "items": [
    { "materialId": 1, "quantity": 5, "unitPrice": 15000 },
    { "materialId": 2, "quantity": 3, "unitPrice": 16000 }
  ]
}
```
- **Tidak** mempercayai `subtotal` atau `total_amount` yang dikirim; backend menghitungnya.
- `quantity` dan `unitPrice` harus > 0.

### Response (contoh)
```json
{
  "message": "Pembelian bahan berhasil",
  "data": {
    "purchase": {
      "id": 12,
      "purchase_number": "PUR-20261008-45321",
      "purchase_date": "2026-10-08",
      "total_amount": "123000.00",
      "payment_method": "TRANSFER",
      "notes": "Pembelian bahan mingguan",
      "created_at": "2026-10-08T07:30:12.000Z",
      "updated_at": "2026-10-08T07:30:12.000Z"
    },
    "expense_id": 5
  }
}
```
---

## 📦 4. Kategori Pengeluaran (Expense Category)

| Metode | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| `GET` | `/api/expense-categories` | Auth | List semua kategori expense. |
| `GET` | `/api/expense-categories/:id` | Auth | Detail satu kategori. |
| `POST` | `/api/expense-categories` | **Admin** | Tambah kategori baru. |
| `PATCH` | `/api/expense-categories/:id` | **Admin** | Update nama / status. |
| `DELETE` | `/api/expense-categories/:id` | **Admin** | Hapus kategori (hard delete). |

### Request Body (POST / PATCH)
```json
{
  "name": "Listrik"
}
```
---

## 📦 5. Pengeluaran (Expense)

| Metode | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| `GET` | `/api/expenses` | Auth | List expense dengan pagination & filter. |
| `GET` | `/api/expenses/:id` | Auth | Detail expense.
| `POST` | `/api/expenses` | **Admin** | Buat expense manual (misal pembelian peralatan). |
| `PATCH` | `/api/expenses/:id` | **Admin** | Update fields expense. |
| `DELETE` | `/api/expenses/:id` | **Admin** | Hapus expense. |

### Query Params (GET /expenses)
- `page` (default 1)
- `limit` (default 20)
- `category_id` – filter by kategori
- `start_date`, `end_date` – rentang tanggal `expense_date`

### Request Body (POST)
```json
{
  "categoryId": 1,
  "amount": 50000,
  "expenseDate": "2026-10-08",
  "description": "Membeli box kue",
  "paymentMethod": "CASH",
  "receipt": "http://localhost:3000/uploads/receipts/box-20261008.jpg" // optional
}
```

### Response (contoh POST)
```json
{
  "message": "Expense berhasil dibuat",
  "data": {
    "id": 9,
    "expense_number": "EXP-20261008-27463",
    "category_id": 1,
    "amount": "50000.00",
    "expense_date": "2026-10-08",
    "description": "Membeli box kue",
    "payment_method": "CASH",
    "receipt": "http://localhost:3000/uploads/receipts/box-20261008.jpg",
    "created_at": "2026-10-08T08:00:45.000Z",
    "updated_at": "2026-10-08T08:00:45.000Z"
  }
}
```
---

## 📌 Catatan Penting

1. **Decimal handling** – semua nilai `DECIMAL` disimpan sebagai string di DB, namun API meng‑returnnya dalam format string yang masih dapat diparsing ke number di client.
2. **Transactional safety** – semua operasi yang memodifikasi stok atau membuat purchase/expense dibungkus dalam **Sequelize transaction**; bila terjadi error, semua perubahan di‑rollback.
3. **Stok tidak boleh negatif** – endpoint `usage` & `adjustment` secara otomatis memvalidasi sehingga stok tidak dapat menjadi nilai negatif.
4. **Kategori "Bahan Baku"** harus ada sebelum melakukan purchase; biasanya di‑seed lewat `seed/seed.js` atau dibuat manual via `POST /api/expense-categories`.
5. **Nomor dokumen** (`purchase_number`, `expense_number`) otomatis di‑generate dengan format `PREFIX-YYYYMMDD-XXXXX` (random 5 digit). Pastikan nomor unik dengan menambahkan constraint `UNIQUE` di DB (sudah ada di model).
6. **Authorization** – endpoint write memerlukan token admin; token dapat diperoleh lewat login (endpoint `/api/auth/login` yang ada pada proyek).

---

## 🚀 Cara Menggunakan (contoh dengan `curl`)
```bash
# 1. Tambah material
curl -X POST http://localhost:3000/api/materials \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Tepung Terigu","unit":"kg","minimum_stock":5}'

# 2. Buat purchase bahan
curl -X POST http://localhost:3000/api/material-purchases \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"purchaseDate":"2026-10-08","paymentMethod":"TRANSFER","items":[{"materialId":1,"quantity":5,"unitPrice":15000},{"materialId":2,"quantity":3,"unitPrice":16000}]}'

# 3. Lihat stok material
curl -X GET http://localhost:3000/api/materials/1/stock -H "Authorization: Bearer <token>"

# 4. Tambah expense manual
curl -X POST http://localhost:3000/api/expenses \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"categoryId":2,"amount":75000,"expenseDate":"2026-10-08","description":"Tagihan listrik","paymentMethod":"TRANSFER"}'
```

---

*Dokumentasi ini mencakup semua endpoint yang ditambahkan untuk fitur Manajemen Bahan Baku dan Pengeluaran. Silakan menyesuaikan contoh request/response dengan kebutuhan frontend Anda.*