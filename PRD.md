# Product Requirements Document (PRD) - Yuri Invent
**Versi Dokumen:** 1.0
**Tanggal:** 31 Januari 2026

## 1. Deskripsi Umum
**Yuri Invent** adalah solusi Sistem Manajemen Gudang (Warehouse Management System - WMS) yang dirancang untuk mentransformasi operasional rantai pasok dari proses manual menjadi ekosistem digital yang terintegrasi penuh. Sistem ini mencakup pengelolaan siklus barang dari hulu ke hilir, mulai dari perencanaan anggaran, pengadaan barang, penerimaan di gudang, pengelolaan stok, hingga pengeluaran barang untuk kebutuhan internal maupun eksternal.

Fokus utama dari proyek ini adalah menciptakan platform yang user-friendly namun bertenaga, yang mampu memberikan visibilitas real-time terhadap status persediaan dan pergerakan aset. Dengan alur kerja yang terstruktur, sistem ini memastikan setiap transaksi tercatat dengan akurat, meminimalisir kesalahan manusia, mencegah kebocoran anggaran, dan mempercepat pengambilan keputusan manajerial. Sistem ini dirancang untuk dapat diakses kapan saja dan di mana saja, mendukung kolaborasi antar departemen (Gudang, Pembelian, Keuangan, dan Manajemen) secara seamless.

## 2. Tujuan Proyek
Berikut adalah poin-poin utama tujuan pengembangan Yuri Invent:

*   **Digitalisasi Operasional**: Menggantikan seluruh pencatatan manual (kertas/spreadsheet) dengan sistem database terpusat untuk kemudahan akses dan integritas data.
*   **Efisiensi Waktu**: Mempercepat proses administrasi, mulai dari persetujuan pembelian, pencarian barang, hingga pelaporan stok.
*   **Kontrol Anggaran Ketat**: Mencegah pembengkakan biaya (over-budget) dengan menghubungkan setiap permintaan pembelian (PR) secara langsung dengan Rencana Anggaran Biaya (RAB) yang telah disetujui.
*   **Akurasi Inventaris**: Meningkatkan ketepatan data stok fisik vs sistem melalui fitur verifikasi penerimaan (Inbound) dan alat bantu audit stok (Stock Opname) yang sistematis.
*   **Transparansi & Akuntabilitas**: Menyediakan rekam jejak (audit trail) yang jelas untuk setiap mutasi barang, menunjukkan siapa yang melakukan apa dan kapan.
*   **Optimalisasi Stok**: Membantu menjaga level stok yang ideal, mencegah penumpukan barang (overstock) atau kekosongan barang (stockout).
*   **Pengambilan Keputusan Berbasis Data**: Menyediakan laporan real-time yang akurat bagi manajemen untuk analisa biaya, performa vendor, dan tren pergerakan barang.
*   **Skalabilitas Sistem**: Membangun fondasi sistem yang siap mendukung pertumbuhan bisnis, termasuk penambahan cabang gudang atau volume transaksi yang lebih besar di masa depan.
*   **Minimalisasi Human Error**: Mengurangi risiko kesalahan manusia dalam input data dan perhitungan melalui otomatisasi dan validasi sistem yang ketat.
*   **Aksesibilitas Tinggi**: Memungkinkan akses sistem yang aman dari berbagai lokasi dan perangkat, mendukung mobilitas tim lapangan maupun manajemen.

## 3. Peran Pengguna (User Roles)
Sistem mendukung Role-Based Access Control (RBAC) dengan peran sebagai berikut:
1.  **ADMIN**: Akses penuh ke seluruh sistem, termasuk konfigurasi peran dan pengguna.
2.  **MANAGER**: Melakukan persetujuan (approval) untuk Purchase Request (PR), Outbound, dan RAB.
3.  **PURCHASING STAFF**: Mengelola vendor, memproses PR menjadi PO, dan negosiasi harga.
4.  **WAREHOUSE STAFF**: Mengelola penerimaan barang (Inbound), pengeluaran (Outbound), dan melakukan Stock Opname.

## 4. Fitur Utama

### 4.1. Otentikasi & Keamanan
*   Integrasi dengan **Supabase Auth**.
*   Manajemen Pengguna dan Peran (RBAC) yang terpusat.
*   Hak akses granular berbasis modul dan aksi (create, read, update, delete).

### 4.2. Manajemen Master Data
Pengelolaan data referensi utama sistem:
*   **Item & Kategori**: Manajemen produk, SKU, kategori, unit pengukuran (UOM), dan atribut fisik (berat, dimensi).
*   **Vendor/Partner**: Database pemasok, informasi bank, dan riwayat harga.
*   **Gudang (Warehouse)**: Manajemen lokasi gudang (Pusat & Cabang).
*   **Mata Uang (Currency)**: Dukungan multi-currency dengan nilai tukar.

### 4.3. Perencanaan Anggaran (RAB - Rencana Anggaran Biaya)
*   Pembuatan anggaran bulanan/tahunan.
*   Perhitungan otomatis kebutuhan stok berdasarkan snapshot stok terakhir.
*   Estimasi biaya berdasarkan harga vendor tertinggi.
*   Persetujuan (Approval) RAB sebelum dapat digunakan.
*   Pelacakan penggunaan anggaran secara real-time.

### 4.4. Pengadaan (Procurement)
*   **Purchase Request (PR)**:
    *   Pembuatan PR berdasarkan RAB atau kebutuhan mendesak.
    *   Mekanisme justifikasi jika pembelian melebihi anggaran.
    *   Workflow persetujuan berjenjang (Manager -> Purchasing).
*   **Purchase Order (PO)**:
    *   Konversi PR yang disetujui menjadi PO.
    *   Dukungan untuk Vendor SPK (Surat Perintah Kerja) dan Non-SPK.
    *   Unggah dokumen pendukung (SPK, PO resmi).

### 4.5. Inventaris Masuk (Inbound)
*   Penerimaan barang berdasarkan PR/PO.
*   Verifikasi penerimaan (Inbound Verification):
    *   Pencatatan kuantitas diterima vs dipesan.
    *   Penanganan selisih (Discrepancy Resolution): Kurang (Shortage), Lebih (Overage), Rusak, atau Salah Barang.
    *   Unggah bukti pengiriman (Surat Jalan).

### 4.6. Inventaris Keluar (Outbound)
*   Permintaan pengeluaran barang untuk internal atau penjualan.
*   Workflow persetujuan pengeluaran.
*   Pencatatan realisasi pengeluaran barang dari gudang tertentu.

### 4.7. Manajemen Stok (Inventory Control)
*   **Kartu Stok (Stock Card)**: Riwayat mutasi lengkap (Masuk, Keluar, Koreksi) untuk setiap item.
*   **Stock Opname (Audit Stok)**:
    *   Penjadwalan perhitungan fisik stok.
    *   Dukungan "Blind Count" (Perhitungan tanpa melihat stok sistem).
    *   Mekanisme Double Counter (Penghitung A dan B) untuk validasi.
    *   Rekonsiliasi varian stok.
*   **Stock Adjustment**: Penyesuaian stok manual (Write-off, Damaged, Expired).

### 4.8. Retur Barang (Returns)
*   Proses pengembalian barang ke vendor akibat kerusakan atau ketidaksesuaian.
*   Pemantauan status retur hingga selesai.

### 4.9. Keuangan (Basic)
*   Validasi tagihan (Bill) dari vendor.
*   Pencatatan status pembayaran.

## 5. Alur Kerja Utama (Workflow)

1.  **Perencanaan**: User membuat **RAB** -> Approval Manager.
2.  **Permintaan**: Staff membuat **Purchase Request (PR)** (mengacu ke RAB) -> Approval Manager -> Verifikasi Purchasing.
3.  **Pembelian**: Purchasing memproses PR menjadi **PO** -> Kirim ke Vendor.
4.  **Penerimaan**: Vendor mengirim barang -> Warehouse membuat **Inbound** -> Verifikasi & Resolusi Selisih.
5.  **Penyimpanan**: Stok bertambah di sistem -> Tercatat di **Stock Card**.
6.  **Penggunaan**: User merequest **Outbound** -> Approval -> Barang dikeluarkan.
7.  **Audit**: Berkala dilakukan **Stock Opname** untuk memastikan akurasi data sistem vs fisik.

## 6. Spesifikasi Teknis
*   **Framework**: Next.js 15+ (App Router).
*   **Bahasa**: TypeScript.
*   **Database**: PostgreSQL.
*   **ORM**: Prisma.
*   **Auth**: Supabase Auth.
*   **Styling**: Tailwind CSS (Utility-first).
*   **UI Components**: Radix UI / Shadcn.

## 7. Status Saat Ini
*   Struktur database (Schema) telah didefinisikan secara komprehensif.
*   Modul dasar (Master Data, Auth) telah diimplementasikan.
*   Modul transaksi (PR, Inbound, Opname) sedang dalam tahap pengembangan dan penyempurnaan aktif.

## 8. Syarat & Ketentuan Operasional (Prasyarat Sistem)
Agar fitur-fitur dalam Yuri Invent dapat berjalan dengan lancar dan optimal, berikut adalah prasyarat operasional yang perlu dipenuhi:

1.  **Koneksi Internet Stabil**: Karena sistem berbasis web (cloud), koneksi internet yang stabil sangat mutlak diperlukan di lokasi gudang maupun kantor untuk memastikan data selalu real-time.
2.  **Master Data yang Valid**: Sebelum transaksi dimulai, data master (Item, Kategori, Vendor, UOM, Saldo Awal Stok) harus sudah diinput dengan lengkap dan akurat. Kesalahan pada data master akan berdampak pada seluruh transaksi turunan.
3.  **Kedisiplinan User**: Seluruh pergerakan barang (fisik) wajib dicatat ke dalam sistem pada saat kejadian (real-time). Penundaan input akan menyebabkan selisih antara stok fisik dan sistem.
4.  **Perangkat yang Memadai**: User di gudang disarankan menggunakan perangkat tablet atau laptop dengan layar yang cukup untuk mengakses fitur Inbound/Outbound dengan nyaman.
5.  **Alur Persetujuan (Approval)**: Para pejabat berwenang (Manager/Supervisor) diharapkan merespon notifikasi persetujuan (PR/RAB) tepat waktu agar tidak menghambat operasional pengadaan di bawahnya.
6.  **Kebijakan Password**: Setiap user wajib menjaga kerahasiaan akun masing-masing untuk memastikan validitas jejak audit (audit trail) sistem.
7.  **Standarisasi Satuan**: Penggunaan konversi satuan (misal: Box ke Pcs) harus dibakukan sejak awal untuk menghindari kebingungan saat penerimaan atau audit stok.
