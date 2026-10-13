# Menyiapkan iPaymu

Integrasi menggunakan halaman checkout hosted iPaymu. Pelanggan memilih iPaymu saat checkout, lalu server membuat sesi dan mengarahkan pelanggan ke URL yang diberikan iPaymu. Status pembayaran hanya berubah setelah callback yang valid diterima.

## Sandbox lokal

1. Salin konfigurasi di `.env.example` ke `.env` backend.
2. Ambil `IPAYMU_VA` dan `IPAYMU_API_KEY` dari akun **Sandbox** iPaymu. Kredensial sandbox dan production berbeda.
3. Pastikan `FRONTEND_URL` menunjuk ke URL frontend, biasanya `http://localhost:5173`.
4. Jalankan backend melalui domain/tunnel HTTPS publik, lalu set `IPAYMU_CALLBACK_URL` ke `<URL-PUBLIK-BACKEND>/api/payments/ipaymu/callback`.
5. Daftarkan URL callback di pengaturan integrasi Sandbox iPaymu. Callback dapat dikirim sebagai JSON atau `application/x-www-form-urlencoded`.
6. Jalankan migrasi `migrations/20261013_add_ipaymu_payments.sql` **sekali** terhadap database aplikasi sebelum menjalankan kode ini.
7. Restart backend dan lakukan transaksi uji melalui checkout.

Tanpa callback publik, URL checkout masih dapat dibuat tetapi server lokal tidak menerima konfirmasi pembayaran. Redirect kembali ke frontend juga tidak menandakan pembayaran berhasil; callback tervalidasi yang menjadi sumber status pembayaran.

## Production

Ganti base URL ke endpoint production iPaymu, gunakan VA dan API Key production, daftarkan domain serta callback production, dan pastikan server memenuhi persyaratan IP statis/domain pada akun iPaymu. Jangan commit `.env` atau kredensial gateway.

## Status transaksi yang tertahan

Satu pesanan hanya boleh memiliki satu sesi iPaymu pending. Jika sesi sudah kedaluwarsa tetapi callback belum diterima, endpoint akan menolak pembuatan sesi baru untuk mencegah transaksi ganda. Periksa transaksi pada dashboard iPaymu dan selesaikan status pembayaran tersebut sebelum mencoba ulang.
