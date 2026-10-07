# DOCUMENTASI API SELEPUNGNYA - Kelompok 3 Backend

**Base URL:** `http://localhost:3000/api`  
**Stack:** Node.js, Express.js, Sequelize, MySQL  
**Tanggal:** Oktober 2026

---

## DAFTAR ISI
1. [Authentication & User Management](#1-authentication--user-management)
2. [Product & Variants](#2-product--variants)
3. [Master Data](#3-master-data-lookup-tables)
4. [Customers](#4-customers)
5. [Rekeningings](#5-rekenings)
6. [Orders](#6-orders)
7. [Response Format & Error Handling](#7-response-format--error-handling)

---

## 1. AUTHENTICATION & USER MANAGEMENT
*Prefix: `/api`*

### POST `/api/register`
- **Deskripsi:** Register user baru
- **Access:** Public
- **Body:**
  ```json
  {
    "name": "Nama User",
    "email": "user@example.com",
    "password": "password123",
    "phone": "081234567890", // optional
    "address": "Alamat", // optional
    "role": "admin" // otomatis, tidak boleh diubah client
  }
  ```
- **Response (201):** `{ id, name, email, role }`

### POST `/api/login`
- **Deskripsi:** Login & dapatkan JWT token
- **Access:** Public
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response (200):** `{ msg: "Login successful", token }`
- **Catatan:** Token disimpan di cookie HTTP-Only dan di-return body

### POST `/api/logout`
- **Deskripsi:** Logout (clear cookie)
- **Access:** Public
- **Response (200):** `{ msg: "Logged out" }`

### GET `/api/me`
- **Deskripsi:** Ambil profile user yang login
- **Access:** Protected (Header: `Authorization: Bearer <token>` atau Cookie `token`)
- **Response (200):** User data tanpa field password

### POST `/api/resetPassword`
- **Deskripsi:** Reset password berdasarkan email
- **Access:** Public
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "newPassword": "newpassword123"
  }
  ```
- **Response (200):** `{ msg: "Password reset successful" }`

### PUT `/api/user/edit/:id`
- **Deskripsi:** Admin mengedit user manapun
- **Access:** Protected + Role admin
- **Body:** name, email, phone, address, role
- **Response (200):** `{ msg: "User updated successfully", user: { ... } }`

### PUT `/api/profile/edit`
- **Deskripsi:** User mengedit profil sendiri
- **Access:** Protected (semua role)
- **Body:** name, email, phone, address (opsional)
- **Response (200):** `{ msg: "Profile updated successfully", user: { ... } }`

---

## 2. PRODUCT & VARIANTS
*Prefix: `/api`*

### GET `/api/products`
- **Deskripsi:** List semua produk dengan include variant & relasi
- **Response (200):** Array produk lengkap

### GET `/api/products/:id`
- **Deskripsi:** Detail produk beserta varian
- **Response (200):** Object produk dengan productvariants

### POST `/api/products`
- **Deskripsi:** Buat produk beserta varian
- **Access:** Admin only
- **Body:** name, description, type_id, is_active, variants [shape_id, size_id, flavor_id, price, ...]
- **Response (201):** Produk dan varian yang dibuat

### PUT `/api/products/:id`
- **Deskripsi:** Update produk dan varian
- **Access:** Admin only
- **Body:** name, description, type_id, is_active, variants

### PATCH `/api/products/:id/status`
- **Deskripsi:** Update status aktif produk
- **Body:** `{ "status": true/false }`

### DELETE `/api/products/:id`
- **Deskripsi:** Hapus produk

### PUT `/api/products/:id/variants`
- **Deskripsi:** Tambah variant ke produk yang sudah ada
- **Access:** Admin only
- **Body:** Array variant dengan shape_id, size_id, flavor_id, price

---

## 3. MASTER DATA (Lookup Tables)
*Prefix: `/api`*

### Shape `/api/shapes`
- GET: List shapes
- POST: Create shape
- PATCH: Update shape
- DELETE: Delete shape

### Size `/api/sizes`
- GET: List sizes
- POST: Create size
- PATCH: Update size
- DELETE: Delete size

### Flavor `/api/flavors`
- GET: List flavors
- POST: Create flavor
- PATCH: Update flavor
- DELETE: Delete flavor

### Type `/api/types`
- GET: List types
- POST: Create type
- Relasi: belongsTo Categories

### Categories `/api/categories`
- GET: List categories
- POST: Create category
- Relasi: hasMany Types

---

## 4. CUSTOMERS
*Prefix: `/api`*

### GET `/api/customers`
- **Deskripsi:** List customer dengan pagination & search
- **Parameter:**
  - `page` (default: 1)
  - `limit` (default: 10)
  - `search` (filter name/phone)
- **Response:** Object pagination + data

### GET `/api/customers/:id`
- **Deskripsi:** Detail customer
- **Response (200):** Data customer
- **Response (404):** Jika tidak ditemukan

### POST `/api/customers`
- **Deskripsi:** Buat customer baru
- **Body:** `{ name, phone, email?, address? }`
- **Response (201):** Data customer baru

### PATCH `/api/customers/:id`
- **Deskripsi:** Update customer
- **Response (200):** Data terupdate
- **Response (409):** Jika customer masih punya order

### DELETE `/api/customers/:id`
- **Deskripsi:** Hapus customer
- **Response (200):** Jika berhasil
- **Response (409):** Jika customer masih puny order → `"Customer gagal dihapus. Customer masih memiliki order."`

---

## 5. REKENINGS
*Prefix: `/api`*

### GET `/api/rekenings`
- **Deskripsi:** List rekening
- **Parameter opsional:** `is_active=true`
- **Response:** Array data rekening

### GET `/api/rekenings/:id`
- **Deskripsi:** Detail rekening

### POST `/api/rekenings`
- **Deskripsi:** Buat rekening baru
- **Body:** `{ bank_name, account_number, account_name, is_active? }`
- **Response (201):** Data rekening

### PATCH `/api/rekenings/:id`
- **Deskripsi:** Update rekening

### DELETE `/api/rekenings/:id`
- **Deskripsi:** Hapus rekening
- **Response (409):** Jika sudah dipakai order →
  `"Rekening gagal dihapus karena sudah dipakai di order. Sebagai gantinya, nonaktifkan rekening dengan mengubah is_active menjadi false."`

---

## 6. ORDERS
*Prefix: `/api`*

### GET `/api/orders`
- **Deskripsi:** List order dengan pagination & filter
- **Parameter filter:**
  - `status` (ENUM: pending, processing, ready, completed, cancelled)
  - `payment_status` (ENUM: unpaid, partial, paid)
  - `customer_id` (integer)
  - `pickup_date` (YYYY-MM-DD)
  - `order_date_start`, `order_date_end` (rentang)
- **Urutkan:** Terbaru dulu
- **Include:** customer, items dengan product variant, rekening
- **Response:** Object pagination

### GET `/api/orders/:id`
- **Deskripsi:** Detail order lengkap
- **Include:** customer, order_items + product variant, rekening
- **Response (200):** Object order lengkap
- **Response (404):** Jika tidak ditemukan

### POST `/api/orders`
- **Deskripsi:** Buat order beserta order items
- **⚠️ Wajib pakai Sequelize Transaction**
- **Body Penting:**
  ```json
  {
    "customer_id": 1,
    "pickup_date": "2026-10-15",
    "notes": "Catatan",
    "payment_method": "cash", // atau "transfer"
    "rekening_id": 1, // WAJIB jika transfer
    "items": [
      {
        "product_variant_id": 1,
        "quantity": 2,
        "notes": "Tanpa gula"
      }
    ]
  }
  ```
- **Validasi Bisnis Penting:**
  1. Customer harus ada
  2. Setiap product_variant_id harus ada di DB
  3. Quantity harus integer >= 1
  4. Items minimal 1
  5. Jika payment_method = transfer: rekening_id wajib & must be active
  6. pickup_date >= hari ini
  7. Harga diambil dari ProductVariant DB (BUKA dari client)
  8. order_number otomatis: format `ORD-YYYYMMDD-XXXX`
  9. total_amount = ∑(quantity × price per item)
  10. Jika duplikat order_number → generate ulang
- **Response (201):** `{ msg: "Order berhasil dibuat", data: order lengkap }`

### PATCH `/api/orders/:id`
- **Deskripsi:** Update data order (notes, pickup_date)
- **⚠️ TIDAK BOLEH ubah total_amount langsung**
- **Validasi:** pickup_date >= hari ini
- **Response (200):** Data order terbaru

### PATCH `/api/orders/:id/status`
- **Deskripsi:** Update status order
- **Body:** `{ "status": "processing" }`
- **Validasi:** status salah satu dari enum

### PATCH `/api/orders/:id/payment`
- **Deskripsi:** Update payment_status, payment_method, rekening_id, payment_proof
- **Body:**
  ```json
  {
    "payment_status": "paid",
    "payment_method": "transfer",
    "rekening_id": 1,
    "payment_proof": "https://..."
  }
  ```
- **Validasi:** Jika transfer → rekening_id wajib & active

### DELETE `/api/orders/:id`
- **Deskripsi:** Hapus order + items dalam 1 transaction
- **Response (200):** `"Order dan semua items berhasil dihapus"`

---

## 7. RESPONSE FORMAT & ERROR HANDLING

### Standar Success Response
```json
{
  "msg": "Success message",
  "data": { ... }
}
```
*Atau untuk list:* `{ data: [...], currentPage: 1, totalPages: 5, totalItems: 25 }`

### Standar Error Response
```json
{
  "msg": "Error message singkat dan jelas"
}
```

### Kode Status HTTP
- **200:** OK (get, patch sukses)
- **201:** Created (post sukses)
- **400:** Bad Request (validasi gagal)
- **404:** Not Found (ID tidak ditemukan)
- **409:** Conflict (data sudah ada / tidak bisa dihapus karena ada relasi)
- **401:** Unauthorized (tidak ada token)
- **403:** Forbidden (bukan admin)

### Contoh Error Responses
- Validasi gagal: `{ "msg": "Name dan phone wajib diisi" }`
- Bukan admin: `{ "msg": "Access denied: admin only" }`
- Customer masih punya order: `{ "msg": "Customer gagal dihapus. Customer masih memiliki order." }`
- Rekening dipakai order: `{ "msg": "Rekening gagal dihapus karena sudah dipakai di order..." }`
- Total amount tidak boleh diubah: `{ "msg": "total_amount tidak boleh diubah langsung" }`

### Auth Middleware
- `authMiddleware`: Cek JWT dari Header `Authorization: Bearer <token>` atau Cookie `token`
- `adminMiddleware`: Cek `req.user.role === 'admin'`

### Relasi Database Ringkas
| Relasi | Deskripsi |
|--------|-----------|
| Customer hasMany Order | Satu customer bisa punya banyak order |
| Order hasMany OrderItem | Satu order punya banyak items |
| OrderItem belongsTo ProductVariant | Setiap item merujuk ke produk varian |
| Order belongsTo Rekening | Order bisa punya rekening (opsional) |
| Order belongsTo Customer | Setiap order miliki customer |

### ENUM Values
- **orders.status:** pending, processing, ready, completed, cancelled
- **orders.payment_status:** unpaid, partial, paid
- **orders.payment_method:** cash, transfer
- **orders.role:** admin (default di register)

---

*Dokumentasi ini mencakup seluruh endpoint yang dibuat dari awal hingga fitur terbaru (customers, rekenings, orders).*