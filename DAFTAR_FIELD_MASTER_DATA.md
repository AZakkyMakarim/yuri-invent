# Rincian Field Data Menu Master - Yuri Invent

Dokumen ini berisi daftar lengkap kolom tabel, field formulir (pop-up), dan informasi detail page untuk setiap sub-menu Master Data.

## 1. Category & UOM (Kategori & Satuan)

### 1a. Tab Master Kategori
1. **Tabel Daftar Kategori:**
    - No
    - Kode
    - Nama
    - Dibuat (Tanggal)
    - Pembuat
    - Status (Active/Inactive)
    - Aksi (Edit, Hapus)
2. **Pop Up Tambah/Edit Kategori:**
    - Kode (Cth: RAW, FG)
    - Nama (Cth: Bahan Baku, Barang Jadi)
    - Toggle Status (Active/Inactive)

### 1b. Tab Master Satuan (UOM)
1. **Tabel Daftar Satuan:**
    - No
    - Simbol (Cth: KG, PCS)
    - Nama (Cth: Kilogram, Pieces)
    - Dibuat (Tanggal)
    - Pembuat
    - Status (Active/Inactive)
    - Aksi (Edit, Hapus)
2. **Pop Up Tambah/Edit Satuan:**
    - Simbol
    - Nama
    - Toggle Status

---

## 2. Item Master (Data Barang)

### 2a. Halaman Daftar Barang
1. **Tabel Daftar Barang:**
    - No
    - Gambar
    - **Identity:** SKU, Barcode, Nama
    - **Specifications:** Brand, Type, Color
    - **Dimensions:** Weight (g), Dim (LxWxH)
    - **Classification:** Category, Movement Type (Fast/Medium/Slow)
    - **Inventory Control:** Min. Stock, Max. Stock, UOM
    - Status
    - Aksi (Edit, Hapus)
2. **Pop Up Tambah/Edit Barang:**
    - Kategori (Dropdown)
    - Tipe Pergerakan (Fast/Medium/Slow)
    - SKU
    - Nama Barang
    - Merk (Brand)
    - Tipe/Model
    - Warna
    - Satuan/UOM (Dropdown)
    - Barcode (Scan)
    - **Dimensi & Berat:** Berat (gram), Panjang, Lebar, Tinggi (cm)
    - **Inventory:** Minimum Stock Level, Maximum Stock Level
    - Deskripsi
    - Gambar Produk (Upload)
    - Toggle Status

---

## 3. Warehouses (Data Gudang)

### 3a. Halaman Daftar Gudang
1. **Tabel Daftar Gudang:**
    - Kode
    - Nama
    - Tipe (Main/Branch)
    - Alamat
    - Status
    - Aksi (Edit, Manage Items, Hapus)
2. **Pop Up Tambah/Edit Gudang:**
    - Kode (Otomatis/Manual)
    - Nama
    - Tipe (Branch/Main)
    - Status (Active/Inactive)
    - Alamat
3. **Pop Up Manage Items (Assign Barang ke Gudang):**
    - **Assigned Items:** Daftar barang yang sudah didaftarkan di gudang ini (Nama, SKU, Stok saat ini).
    - **Add Items:** Daftar pencarian barang untuk ditambahkan ke gudang ini.

---

## 4. Vendors (Pemasok)

### 4a. Halaman Daftar Vendor
1. **Tabel Daftar Vendor:**
    - No
    - Vendor (Nama)
    - Tipe (SPK / Non-SPK)
    - Telepon
    - Alamat
    - Bank
    - Cabang
    - No. Rekening
    - Link (Website/Maps)
    - Status
    - Tanggal Dibuat
    - Pembuat
    - Aksi (View, Edit)
2. **Pop Up Tambah/Edit Vendor:**
    - **Basic Info:** Nama, Link, Tipe (SPK/Non-SPK), Status.
    - **SPK Document (Khusus Tipe SPK):** Upload File PDF SPK.
    - **Contact:** Telepon, Alamat.

### 4b. Halaman Detail Vendor
1. **Informasi Vendor:**
    - Kode
    - Nama Kontak
    - Telepon
    - Email
    - Alamat
    - Info Bank (Nama, Cabang, No. Rek)
    - Dokumen SPK (Tombol View/Download)
2. **Tab Supplied Items (Barang):**
    - **Tabel:** No, SKU, Gambar, Nama Barang, Kategori, UOM, COGS (Harga Pokok), Link, Tanggal Ditambahkan.
    - **Aksi:** Edit Harga/Link, Hapus Item.
3. **Tab Purchase History:** (Coming Soon)
4. **Tab Price History:** (Coming Soon)

---

## 5. Partners (Mitra Bisnis)

### 5a. Halaman Daftar Mitra
1. **Tabel Daftar Mitra:**
    - Kode
    - Nama
    - Contact Person
    - Phone / Email
    - Status
    - Aksi (Edit, Hapus)
2. **Pop Up Tambah/Edit Mitra:**
    - Kode (Auto)
    - Nama
    - Contact Person
    - Phone
    - Email
    - Status
    - Alamat
    - **Bank Info:** Nama Bank, No. Rekening

### 5b. Halaman Detail Partner (Pricing)
1. **Header:** Nama Partner, Kode, Kontak, Tombol Save Prices.
2. **Tabel Item Pricing:**
    - SKU
    - Nama Item
    - UOM
    - **Selling Price:** (Input Harga Jual Khusus Mitra)

---

## 6. Users & Roles (Pengguna & Hak Akses)

### 6a. Tab Users (Pengguna)
1. **Tabel Daftar Pengguna:**
    - No
    - Nama
    - Email
    - Role (Peran)
    - Status (Active/Pending)
    - Dibuat (Tanggal)
    - Aksi (Edit Role/Status)
2. **Pop Up Edit Pengguna:**
    - Email (Read-only)
    - Nama (Read-only)
    - Role (Dropdown)
    - Status (Toggle Active/Inactive)

### 6b. Tab Roles (Peran & Izin)
1. **Panel Kiri (Daftar Role):**
    - List Nama Role (Cth: Admin, Staff Gudang)
    - Tombol Tambah Role Baru
2. **Panel Kanan (Permission/Izin):**
    - Tabel Modul (Daftar menu sistem)
    - Toggle View (Hak akses untuk melihat menu tersebut)
3. **Pop Up Tambah Role:**
    - Nama Role
    - Deskripsi
