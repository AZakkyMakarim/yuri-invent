# Penjelasan Fitur Menu Master Data - Yuri Invent

Menu **Master Data** berfungsi sebagai fondasi utama dalam sistem Yuri Invent, tempat di mana seluruh data acuan (reference data) dikelola secara terpusat. Dengan adanya data master yang rapi dan terstandarisasi, proses operasional sehari-hari mulai dari pembelian, penerimaan barang, hingga manajemen stok dapat berjalan dengan konsisten dan minim kesalahan. Modul ini memastikan bahwa setiap departemen menggunakan "bahasa" yang sama—seperti nama barang, satuan ukur, dan kategori yang seragam—sehingga laporan yang dihasilkan menjadi akurat dan dapat diandalkan untuk pengambilan keputusan.

Rincian lengkap mengenai field data dapat dilihat pada dokumen: **DAFTAR_FIELD_MASTER_DATA.md**.

## 1. Category & UOM (Kategori & Satuan)
Sub-menu ini digunakan untuk mengelompokkan barang dan menentukan satuan ukurannya. Hal ini penting agar laporan stok dapat difilter dengan mudah dan kuantitas barang tercatat dengan satuan yang baku. Sistem mendukung pembuatan kategori hierarkis dan satuan ukur standar (pcs, kg, ltr, dll) yang akan digunakan di seluruh modul lain.

## 2. Item Master (Data Barang)
Ini adalah database pusat untuk seluruh produk. Setiap barang yang masuk atau keluar dari gudang harus terdaftar di sini terlebih dahulu untuk menjamin tidak ada duplikasi data dan spesifikasi barang tercatat dengan lengkap. Data barang mencakup identitas produk (SKU, Barcode), spesifikasi fisik, dimensi, pengelompokan kategori, serta kontrol inventaris seperti stok minimum dan maksimum.

## 3. Warehouses (Data Gudang)
Digunakan untuk mendaftarkan lokasi fisik penyimpanan. Fitur ini memungkinkan pelacakan stok secara spesifik per lokasi, misalnya membedakan stok di gudang utama dengan stok di cabang atau toko. Pengguna dapat mengelola item apa saja yang aktif di setiap gudang, memungkinkan fleksibilitas dalam distribusi stok.

## 4. Vendors (Pemasok)
Modul ini menyimpan data lengkap supplier. Membedakan antara vendor kontrak (SPK) dan non-kontrak membantu bagian pembelian dalam memprioritaskan supplier yang sudah memiliki perjanjian kerjasama resmi. Informasi vendor mencakup detail kontak, rekening bank, serta dokumen legal seperti SPK. Selain itu, sistem juga mencatat daftar barang apa saja yang disuplai oleh vendor tersebut beserta harga pokoknya.

## 5. Partners (Mitra Bisnis)
Berbeda dengan vendor, mitra adalah rekanan bisnis seperti distributor atau klien B2B. Data ini dipisahkan untuk memudahkan manajemen relasi bisnis yang bersifat output (penjualan/kerjasama) dibanding input (pembelian). Di sini juga dapat diatur harga khusus (special pricing) untuk setiap produk yang berlaku bagi mitra tertentu.

## 6. Users & Roles (Pengguna & Hak Akses)
Pusat kontrol keamanan sistem. Di sini admin dapat mengatur siapa saja yang bisa mengakses sistem dan menu apa saja yang boleh mereka buka atau modifikasi. Sistem menggunakan Role-Based Access Control (RBAC) dimana izin akses diberikan berdasarkan peran (Role), bukan per individu user, sehingga pengelolaan akses menjadi lebih efisien dan aman.
