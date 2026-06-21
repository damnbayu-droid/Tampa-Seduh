# Panduan Deploy Tampa Seduh ke Cloudflare Pages

Dokumen ini berisi panduan langkah-demi-langkah untuk mendeploy aplikasi web **Tampa Seduh** ke **Cloudflare Pages**.

---

## 1. Persiapan Environment Variables
Cloudflare Pages memerlukan beberapa variabel lingkungan (environment variables) agar frontend dan integrasi database Supabase berjalan lancar. 

Atur variabel-variabel ini di **Dashboard Cloudflare Pages** under **Settings > Environment Variables**:

| Variabel | Deskripsi | Contoh Nilai |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | URL Supabase Project Anda | `https://yizsanjcyphlbtjcwzxl.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Anon Key Supabase Anda | *(Salin Anon/Public Key dari Supabase Dashboard)* |
| `VITE_API_URL` | URL Backend API (kosongkan jika local/same-origin) | *(Biarkan kosong jika dideploy satu paket)* |

---

## 2. Pilihan Cara Deploy

Ada dua cara utama untuk melakukan deployment ke Cloudflare Pages:

### Pilihan A: Menggunakan GitHub/GitLab Integration (Sangat Direkomendasikan)
Metode ini adalah yang paling mudah karena setiap kali Anda melakukan `git push` ke repositori, Cloudflare akan otomatis membangun dan merilis versi terbaru.

1. Masuk ke **Dashboard Cloudflare** > **Pages** > **Create a project** > **Connect to Git**.
2. Pilih repositori Git proyek **Tampa-Seduh**.
3. Di bagian **Build Settings**, sesuaikan konfigurasi berikut:
   - **Framework Preset**: `Vite` (atau `None`)
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
   - **Root Directory**: `/`
4. Di bagian **Environment Variables**, tambahkan variabel di atas (`VITE_SUPABASE_URL`, dll).
5. Klik **Save and Deploy**. Cloudflare akan mengunduh kode, menginstalnya, membangun bundle web, dan merilisnya ke internet secara gratis!

---

### Pilihan B: Menggunakan Wrangler CLI (Manual Upload)
Jika Anda tidak menghubungkan repository Git ke Cloudflare, Anda dapat mengunggah folder hasil build langsung melalui terminal Anda.

1. Jalankan build lokal untuk menghasilkan folder `dist`:
   ```bash
   npm run build
   ```
2. Jalankan deployment ke Cloudflare Pages menggunakan Wrangler:
   ```bash
   npx wrangler pages deploy dist
   ```
3. Terminal akan meminta Anda login ke akun Cloudflare. Ikuti langkah di layar browser untuk memberikan izin akses.
4. Pilih nama proyek (atau buat proyek baru bernama `tampa-seduh`) dan tentukan environment `production`.
5. Tunggu proses upload selesai. Anda akan langsung mendapatkan link domain produksi dari Cloudflare.

---

## 3. Konfigurasi Google OAuth Redirect
Setelah mendeploy, pastikan untuk mendaftarkan URL domain Cloudflare baru Anda (misalnya `https://tampa-seduh.pages.dev`) ke Google Cloud Console credentials Anda agar login via Google bekerja dengan baik:

1. Buka **Google Cloud Console** > **APIs & Services** > **Credentials**.
2. Edit Kredensial OAuth 2.0 Web Client Anda.
3. Tambahkan domain baru Anda ke:
   - **Authorized JavaScript origins**: `https://tampa-seduh.pages.dev`
   - **Authorized redirect URIs**: `https://tampa-seduh.pages.dev/auth/callback`
4. Simpan perubahan. (Perubahan ini membutuhkan waktu beberapa menit untuk disebarkan oleh server Google).

---

## 4. Tips Tambahan
* **Versi Node.js**: Cloudflare Pages menggunakan Node.js versi 18 ke atas sebagai default. Jika build gagal, pastikan untuk menyetel versi Node.js di Cloudflare settings menjadi `20` atau setara.
* **Optimasi Gambar**: Semua gambar produk dan paket baru yang diunggah dari dashboard admin akan secara otomatis dikompresi ke format WebP di sisi klien (browser) sebelum diunggah ke Supabase, sehingga menghemat bandwidth pengunjung dan kuota hosting Anda.
