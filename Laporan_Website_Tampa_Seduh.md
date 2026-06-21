# Laporan Lengkap Fungsi Website Tampa Seduh

Laporan ini menyajikan dokumentasi menyeluruh mengenai seluruh fitur dan fungsi yang telah diimplementasikan dalam Website Tampa Seduh. Sistem dirancang dengan arsitektur modern (React Vite, TailwindCSS) untuk frontend, Vercel Serverless (Node.js/Express) untuk backend, dan Supabase untuk database *real-time*.

---

## 1. Arsitektur & Teknologi Utama
- **Frontend**: Menggunakan React + Vite dengan TypeScript. Desain UI/UX dirancang premium menggunakan TailwindCSS, `lucide-react` untuk ikon, dan `framer-motion` untuk animasi.
- **Backend**: API dibangun menggunakan Node.js (Express.js) dan di-deploy ke Vercel secara *Serverless*. Vercel memastikan website dapat menangani trafik tinggi tanpa biaya server bulanan statis.
- **Database**: Supabase digunakan sebagai database utama (PostgreSQL). Menggunakan konsep hibrida di mana Vercel menyimpan memori sementara (cache) dan menyinkronkannya dengan Supabase secara paralel untuk mencegah *timeout*.
- **Keamanan (Hardening)**: Menggunakan `helmet` untuk proteksi *HTTP Headers*, `express-rate-limit` untuk mencegah *brute force*, dan pengamanan RLS (*Row Level Security*) di Supabase.

---

## 2. Fitur Pengguna (Storefront & User Dashboard)

### A. Sistem Belanja & Keranjang (Checkout Flow)
- **Menu & Paket**: Pengunjung dapat melihat Menu (Kopi Hot/Ice) dan Paket Bundling. 
- **Keranjang (Cart)**: Menggunakan tombol gantung dinamis (Floating Cart). Memiliki animasi memantul saat item ditambahkan.
- **Pemesanan Multi-Platform**: Pengguna dapat memesan via WhatsApp maupun form pesanan website langsung.

### B. Autentikasi Pengguna
- **Login Manual**: Login menggunakan Email dan Password.
- **Login via Google**: Terintegrasi penuh dengan sistem Supabase OAuth 2.0 (Google Sync). Pengguna Google langsung dibuatkan akun secara transparan oleh Vercel.

### C. User Dashboard
- **Identitas**: Pengguna dapat mengelola Profil (Nama, WhatsApp, Alamat Pengantaran Default).
- **Ganti Password**: Memiliki fitur enkripsi untuk mengganti password dari dalam dashboard.
- **Riwayat Pesanan (Order History)**: Melacak semua pesanan dengan status *(Menunggu, Disiapkan, Diantar, Selesai)*.
- **Cetak Invoice**: Tombol bagi pengguna untuk mengunduh/mencetak bukti tagihan pesanan mereka.
- **Membership**: Tombol aktivasi *Member* gratis untuk mendapatkan keuntungan diskon ongkos kirim.
- **Bantuan WhatsApp**: Tombol CTA bantuan yang langsung terhubung ke nomor admin Tampa Seduh.

---

## 3. Fitur Admin (Admin Dashboard)

Admin Dashboard dilindungi melalui sistem kredensial ketat, dengan dua pintu masuk utama (`tampaseduh@gmail.com` atau `kopi@tampaseduh.com`).

### A. Manajemen Pesanan (Order Management)
- **Daftar Pesanan Live**: Menampilkan semua pesanan pelanggan (dari user biasa maupun anonim).
- **Update Status**: Admin bisa mengubah status pesanan yang otomatis akan ter-update juga di User Dashboard pelanggan.
- **Upload Bukti Pembayaran**: Admin dapat memeriksa dan melihat foto bukti bayar yang tersimpan di bucket Supabase.

### B. Manajemen Produk (Menu & Paket)
- **Editor Menu**: Menambah, mengedit, atau menghapus menu kopi reguler/large, dengan opsi mengubah gambar dan status "Sedang Kosong" (Available).
- **Editor Paket**: Mengatur menu promo bundling beserta harga diskon.

### C. Sistem Blog & Berita
- Fitur *Content Management System* mini bagi admin untuk mempublikasikan berita promo atau cerita seputar kopi. Memiliki slug otomatis.

### D. Pengaturan AI & Resend Email
- **AI Settings**: Admin dapat memodifikasi secara langsung "System Prompt" dari Emat si AI Barista agar perilakunya sesuai tren.
- **Email Logs**: Admin dapat melihat laporan email notifikasi yang terkirim menggunakan sistem Resend API.

---

## 4. Integrasi Pihak Ketiga & Fitur Canggih

### A. AI Chat Assistant ("Tanya Emat")
- Robot percakapan pintar berteknologi **OpenAI (GPT-4o-mini)**.
- Terintegrasi dengan produk. AI tahu isi keranjang pengguna, menu apa saja yang tersedia, promo paket terkini, serta gaya berbicara seorang Barista ramah.
- Memiliki fitur "Early Return" dan pengecekan WebSocket agar kompatibel sepenuhnya di Vercel Serverless tanpa resiko *crash*.

### B. Resend (Email Automation)
- Saat checkout pesanan berhasil, sistem dapat otomatis mengirimkan struk digital ke email pelanggan.

### C. Performa & Maksimalisasi (Fast Open Page)
- Semua halaman, termasuk beranda utama (*Storefront*), dioptimasi. Komponen berat (*Dashboard*, *Chatbot*, *Checkout*) menggunakan `React.lazy()` (*code splitting*), membuat ukuran *loading* awal website sangat ringan.
- Gambar telah menerapkan `loading="lazy"`.
- DNS terhubung secara asinkron (Preconnect) ke Supabase dan Google Auth untuk mempercepat proses *login* dan *fetch* data.

---
**Status Keseluruhan**: SIAP UNTUK PRODUKSI MASAL (BETA).
