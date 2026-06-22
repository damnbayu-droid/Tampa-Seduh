# LAPORAN AUDIT PENGASAHAN KEAMANAN (SECURITY HARDENING AUDIT REPORT)
## PROYEK: TAMPA SEDUH — PHASE 1 SCAN
*Status Proyek: Production Beta*  
*Tanggal Audit: 22 Juni 2026*  

---

## SECTION 1: EXECUTIVE SUMMARY

Website **Tampa Seduh** saat ini beroperasi dalam status *Production Beta* dengan fungsionalitas yang sangat kaya, meliputi storefront, manajemen order, asisten chatbot bertenaga AI (GPT-4o-mini & Gemini Vision), integrasi email Resend, serta modul analisa HPP & Costing yang kompleks. Namun, hasil pemindaian mendalam (*deep scan*) terhadap codebase, skema PostgreSQL, konfigurasi API server, dan kebijakan akses Supabase mengungkapkan beberapa **kerentanan keamanan tingkat kritis (Critical)** dan **tinggi (High)**.

Kerentanan terbesar bersumber dari disamakannya hak akses publik/anonim dengan hak akses backend akibat tidak adanya konfigurasi *Service Role Key* pada server Express. Hal ini memaksa developer untuk mengaktifkan kebijakan *Row Level Security (RLS)* di Supabase yang mengizinkan publik menulis, memodifikasi, dan menghapus data penting secara langsung. Di samping itu, penyimpanan kata sandi pelanggan dalam format *plain-text* (tanpa enkripsi hash) serta ketiadaan verifikasi token JWT pada REST API serverless Express memperbesar potensi eksploitasi data secara eksternal.

Laporan ini menyajikan analisis detail atas 10 aspek keamanan wajib, mengurutkan temuan berdasarkan tingkat risiko, serta merumuskan rencana aksi mitigasi (*Recommended Fix Plan*) dan peta jalan implementasi (*Implementation Roadmap*) yang aman tanpa mengganggu fungsionalitas kedai kopi Tampa Seduh yang sedang aktif.

---

## SECTION 2: CRITICAL FINDINGS (TEMUAN KRITIS)

### 1. Row Level Security (RLS) Supabase Terbuka Lebar (Public Write Enabled)
* **Deskripsi**: Semua tabel database di Supabase telah mengaktifkan RLS, namun kebijakan (*policies*) yang diterapkan memberikan hak akses penuh kepada publik (`anon` role). Contoh kebijakan dari `fix_supabase_security.sql` dan `fix_menu_rls.sql`:
  * `CREATE POLICY "Public can update users" ON users FOR UPDATE USING (true) WITH CHECK (true);`
  * `CREATE POLICY "Public can delete menu" ON menu FOR DELETE USING (true);`
  * `CREATE POLICY "Public can update orders" ON orders FOR UPDATE USING (true) WITH CHECK (true);`
  * Modul Costing (`recipe_lab_migration.sql`): `CREATE POLICY "Admin full access to ingredients" ON ingredients FOR ALL USING (true);` yang secara de facto mengizinkan anonim publik melakukan insert/update/delete karena tidak ada filter role admin.
* **Dampak**: Siapa pun yang menginspeksi kode sumber frontend dan menyalin URL Supabase beserta Anon Key dapat menghubungkan client SDK eksternal untuk melakukan `DELETE FROM menu`, menghapus seluruh pesanan (`orders`), memodifikasi harga beli bahan baku (`ingredients`), atau mengubah password pengguna lain langsung di database.
* **Kemungkinan Terjadi**: Sangat Tinggi (kunci anon terekspos di browser).
* **Tingkat Risiko**: **CRITICAL**

### 2. Privilege & Role Escalation pada Tabel Users
* **Deskripsi**: Kebijakan RLS pada tabel `users` mengizinkan operasi UPDATE secara bebas oleh siapa pun: `CREATE POLICY "Public can update users" ON users FOR UPDATE USING (true) WITH CHECK (true);`.
* **Dampak**: Seorang pengguna terdaftar dengan peran `'customer'` dapat mengirimkan query Supabase langsung dari konsol browser untuk mengubah kolom `role` miliknya menjadi `'admin'`:
  ```javascript
  supabase.from('users').update({ role: 'admin' }).eq('id', 'my-user-uuid')
  ```
  Sesaat setelah data tersebut diubah di database, pengguna tersebut akan mendapatkan akses penuh ke seluruh modul administrator di Admin Dashboard.
* **Kemungkinan Terjadi**: Tinggi.
* **Tingkat Risiko**: **CRITICAL**

### 3. Kebocoran Seluruh Kredensial Pengguna via RLS Select
* **Deskripsi**: Kebijakan RLS tabel `users` untuk operasi SELECT adalah `USING (true)`:
  * `CREATE POLICY "Public can view users" ON users FOR SELECT USING (true);`
* **Dampak**: Publik dapat melakukan query select tanpa filter untuk mengunduh seluruh isi tabel `users` yang mencakup nama, email, nomor WhatsApp, alamat lengkap, dan password *plain-text* milik seluruh pengguna kedai Tampa Seduh.
* **Kemungkinan Terjadi**: Sangat Tinggi.
* **Tingkat Risiko**: **CRITICAL**

---

## SECTION 3: HIGH FINDINGS (TEMUAN TINGGI)

### 4. Penyimpanan Password dalam Format Plain-Text (Tanpa Hashing)
* **Deskripsi**: Di dalam skrip registrasi manual (`server.ts` line 1571 s.d 1600), password pengguna baru langsung disimpan secara mentah ke kolom `password` tabel `users`. Tidak ada penggunaan algoritma hashing seperti `bcrypt` maupun penambahan `salt`.
* **Dampak**: Jika database mengalami kebocoran data, seluruh kata sandi pengguna akan terekspos secara transparan. Pengguna yang menggunakan password yang sama di situs lain akan terancam bahaya pembobolan akun ganda (*credential stuffing*).
* **Kemungkinan Terjadi**: Sedang (bergantung pada kebocoran database).
* **Tingkat Risiko**: **HIGH**

### 5. REST API Express di Backend Tanpa Autentikasi JWT
* **Deskripsi**: Semua endpoint REST API di backend Express (`server.ts`) seperti `POST /api/menu`, `GET /api/users`, `PUT /api/users/:id/block`, dan `POST /api/ai-config` tidak menggunakan middleware verifikasi token JWT. Kredensial admin di server hanya diperiksa secara sederhana di endpoint login.
* **Dampak**: Penyerang dapat langsung mengirimkan HTTP POST / PUT / DELETE menggunakan cURL atau Postman ke domain Vercel API untuk memblokir pengguna, merubah prompt AI, melihat logs rahasia, atau mengubah status keuangan tanpa perlu login sama sekali.
* **Kemungkinan Terjadi**: Tinggi.
* **Tingkat Risiko**: **HIGH**

### 6. Kerentanan Manipulasi & Penghapusan File di Supabase Storage
* **Deskripsi**: Kebijakan bucket `Bukti Bayar` di Supabase Storage mengizinkan operasi DELETE dan INSERT secara publik:
  * `CREATE POLICY "Izinkan publik delete Bukti Bayar" ON storage.objects FOR DELETE TO public USING (bucket_id = 'Bukti Bayar');`
* **Dampak**: Seseorang dapat menghapus foto bukti bayar yang diunggah oleh pelanggan lain, mengganggu proses verifikasi transfer otomatis AI Gemini, atau mengunggah ribuan file sampah (*spam files*) untuk menghabiskan kuota penyimpanan Supabase.
* **Kemungkinan Terjadi**: Sedang.
* **Tingkat Risiko**: **HIGH**

### 7. Google Client Secret Terekspos di Workspace
* **Deskripsi**: File `[REDACTED_OAUTH_FILE]` ditaruh langsung di direktori utama proyek, berisi teks rahasia Google Client Secret `[REDACTED_OAUTH_SECRET]`.
* **Dampak**: Meskipun file ini telah masuk dalam `.gitignore` sehingga aman dari pelacakan Git, keberadaannya secara mentah di workspace lokal meningkatkan risiko kebocoran jika folder proyek didistribusikan secara tidak sengaja.
* **Kemungkinan Terjadi**: Rendah.
* **Tingkat Risiko**: **HIGH**

---

## SECTION 4: MEDIUM FINDINGS (TEMUAN MEDIUM)

### 8. Ketiadaan Validasi Password Lama pada Update Password
* **Deskripsi**: Fitur pemutakhiran password di User Dashboard (`PUT /api/users/:id/password`) langsung menimpa kolom password lama dengan nilai password baru tanpa memverifikasi kebenaran kata sandi lama terlebih dahulu.
* **Dampak**: Jika perangkat pelanggan ditinggalkan dalam keadaan login, orang lain dapat dengan mudah mengganti kata sandi secara permanen tanpa rintangan.
* **Kemungkinan Terjadi**: Sedang.
* **Tingkat Risiko**: **MEDIUM**

### 9. API Rate Limiting Terlalu Longgar pada Rute Non-Auth
* **Deskripsi**: Rute umum dilindungi oleh limit 200 request per 15 menit.
* **Dampak**: Untuk operasi pembacaan menu tidak masalah, namun untuk pemicuan Gemini Vision API (`POST /api/orders/:id/verify-payment`) dan pengiriman email Resend (`POST /api/orders`), pembatasan ini terlalu longgar dan dapat dieksploitasi untuk membombardir tagihan kuota API berbayar (*Denial of Service* secara finansial).
* **Kemungkinan Terjadi**: Sedang.
* **Tingkat Risiko**: **MEDIUM**

---

## SECTION 5: LOW FINDINGS (TEMUAN RENDAH)

### 10. Ekspos Kredensial Default di File `.env.example`
* **Deskripsi**: File contoh `.env.example` menyertakan kredensial database default yang sangat mirip dengan kredensial produksi (seperti password database Supabase).
* **Dampak**: Potensi kebingungan pengembang baru yang tidak sengaja memakai kredensial default tersebut di server lokal.
* **Kemungkinan Terjadi**: Rendah.
* **Tingkat Risiko**: **LOW**

### 11. Absensi Robots.txt dan Sitemap.xml
* **Deskripsi**: Tidak adanya file robots.txt di folder `/public` membiarkan seluruh bot mesin pencari merayapi direktori mana saja, termasuk rute sensitif.
* **Dampak**: Bot perayap dapat mengindeks folder antarmuka admin yang tidak sengaja terekspos.
* **Kemungkinan Terjadi**: Rendah.
* **Tingkat Risiko**: **LOW**

---

## SECTION 6: RECOMMENDED FIX PLAN (RENCANA PERBAIKAN)

Berikut adalah tabel matriks audit Supabase Security dan rekomendasi pengerasan akses database Tampa Seduh:

### 1. Matriks Pengerasan Supabase Database

| Nama Tabel | Current Access (RLS Policy) | Risk Level | Recommended Access (RLS Policy) |
| :--- | :--- | :--- | :--- |
| **`menu`** | Select/Insert/Update/Delete = Public (`true`) | **CRITICAL** | Select = Public (`true`), Insert/Update/Delete = Authed Admin Only (`role = 'admin'`) |
| **`packages`** | Select/Insert/Update/Delete = Public (`true`) | **CRITICAL** | Select = Public (`true`), Insert/Update/Delete = Authed Admin Only (`role = 'admin'`) |
| **`orders`** | Select/Insert/Update = Public (`true`) | **HIGH** | Select = Owner or Admin (`auth.uid() = customer_id` OR `role = 'admin'`), Insert = Public (`true`), Update = Authed Admin Only (`role = 'admin'`) |
| **`users`** | Select/Insert/Update = Public (`true`) | **CRITICAL** | Select/Update = Self or Admin (`auth.uid() = id` OR `role = 'admin'`), Insert = Public (`true`) |
| **`audit_logs`**| Select/Insert = Public (`true`) | **HIGH** | Select/Insert = Backend Server/Service Role Only |
| **`blog_news`** | Select = Public (`true`), Write = No Policy | **MEDIUM** | Select = Public (`true`), Insert/Update/Delete = Authed Admin Only |
| **`email_logs`**| Select/Insert = Public (`true`) | **HIGH** | Select/Insert = Backend Server/Service Role Only |
| **`ai_settings`**| Select = Public (`true`), Upsert = No Policy | **MEDIUM** | Select = Public (`true`), Upsert = Authed Admin Only |
| **`ingredients`**| Select = Public (`true`), Write = Public (`true`) | **CRITICAL** | Select = Public (`true`), Write = Authed Admin Only |
| **`recipes`** | Select = Public (`true`), Write = Public (`true`) | **CRITICAL** | Select = Public (`true`), Write = Authed Admin Only |
| **`recipe_items`**| Select = Public (`true`), Write = Public (`true`) | **CRITICAL** | Select = Public (`true`), Write = Authed Admin Only |
| **`package_recipes`**| Select = Public (`true`), Write = Public (`true`) | **CRITICAL** | Select = Public (`true`), Write = Authed Admin Only |
| **`package_items`**| Select = Public (`true`), Write = Public (`true`) | **CRITICAL** | Select = Public (`true`), Write = Authed Admin Only |
| **`overhead_costs`**| Select = Public (`true`), Write = Public (`true`) | **CRITICAL** | Select = Public (`true`), Write = Authed Admin Only |
| **`chat_sessions`**| Select/Insert/Update = Public (`true`) | **HIGH** | Select/Insert/Update = Owner, Admin, or Backend |
| **`chat_messages`**| Select/Insert/Update = Public (`true`) | **HIGH** | Select/Insert = Sender or Admin, Update = Restricted |

---

### 2. Matriks Pengerasan API Security (Backend server.ts)

| Endpoint | Current Auth & Authz | Risk Level | Recommended Mitigation |
| :--- | :--- | :--- | :--- |
| **`GET /api/users`** | Tidak Ada Auth | **HIGH** | Tambahkan Middleware verifikasi JWT Supabase, batasi hanya untuk role `'admin'`. |
| **`POST /api/menu`** | Tidak Ada Auth | **HIGH** | Batasi hanya untuk role `'admin'` via validasi token JWT. |
| **`PUT /api/menu/:id`** | Tidak Ada Auth | **HIGH** | Batasi hanya untuk role `'admin'` via validasi token JWT. |
| **`DELETE /api/menu/:id`**| Tidak Ada Auth | **HIGH** | Batasi hanya untuk role `'admin'` via validasi token JWT. |
| **`PUT /api/users/:id/block`**| Tidak Ada Auth | **HIGH** | Batasi hanya untuk role `'admin'` via validasi token JWT. |
| **`PUT /api/users/:id/approve-membership`**| Tidak Ada Auth | **HIGH** | Batasi hanya untuk role `'admin'` via validasi token JWT. |
| **`GET /api/logs`** | Tidak Ada Auth | **HIGH** | Batasi hanya untuk role `'admin'` via validasi token JWT. |
| **`POST /api/ai-config`**| Tidak Ada Auth | **HIGH** | Batasi hanya untuk role `'admin'` via validasi token JWT. |
| **`GET /api/finances`** | Tidak Ada Auth | **HIGH** | Batasi hanya untuk role `'admin'` via validasi token JWT. |
| **`POST /api/orders/:id/verify-payment`**| Tidak Ada Auth | **HIGH** | Batasi hanya untuk role `'admin'` via validasi token JWT. |

---

## SECTION 7: IMPLEMENTATION ROADMAP (PETA JALAN PENGASAHAN)

Proses pengerasan keamanan akan dibagi menjadi 3 fase utama untuk memastikan stabilitas transaksi toko tetap berjalan normal tanpa mengganggu pengguna aktif:

```
[FASE 1: PROTEKSI PASSWORD & API]  ──►  [FASE 2: PENGETATAN RLS DATABASE]  ──►  [FASE 3: PENGASAHAN STORAGE & CLEANUP]
- Enkripsi Hash Bcrypt (Plain-text)    - Konfigurasi Service Role Key           - Pengetatan Bucket "Bukti Bayar"
- Middleware JWT token di Express      - Terapkan SQL Row Level Security        - Pembersihan Kunci Statis Google
- Validasi password lama               - Batasi Akses Role Admin                - Tambahkan robots.txt & sitemap
```

### Fase A: Proteksi Kredensial & Middleware API (Durasi: Hari 1-2)
1. Integrasikan library `bcryptjs` di Express backend. Buat migrasi data satu kali (*One-time data migration*) untuk mengenkripsi seluruh password plain-text yang sudah ada di tabel `users`.
2. Pasang middleware verifikasi token JWT Supabase (`authMiddleware`) di Express. Seluruh REST API Express admin di server wajib membaca header `Authorization: Bearer <JWT_TOKEN>` dan memvalidasi keaslian tanda tangan token via kunci rahasia JWT Supabase.
3. Tambahkan verifikasi password lama pada form perubahan kata sandi di User Dashboard.

### Fase B: Pengetatan Kebijakan RLS Supabase (Durasi: Hari 3-4)
1. Konfigurasikan variabel `SUPABASE_SERVICE_ROLE_KEY` pada Vercel Production Environment.
2. Ubah inisialisasi Supabase client di server Express agar menggunakan `SUPABASE_SERVICE_ROLE_KEY` (sehingga Express backend dapat memotong aturan RLS secara aman tanpa hambatan).
3. Jalankan file SQL migrasi untuk mereformasi kebijakan RLS. Cabut semua kebijakan `FOR INSERT/UPDATE/DELETE USING (true)` untuk publik anonim pada seluruh tabel.
4. Terapkan aturan seleksi mandiri bagi pengguna: `auth.uid()::text = id` agar customer hanya dapat melihat profil mereka sendiri.

### Fase C: Storage Hardening & Clean Up Aset (Durasi: Hari 5)
1. Hapus kebijakan publik delete pada storage bucket `Bukti Bayar`.
2. Batasi unggahan file storage hanya untuk file gambar terkompresi.
3. Pindahkan kredensial Google OAuth dari file JSON di root ke dalam variabel lingkungan Vercel. Hapus file JSON secara permanen dari direktori proyek.
4. Publikasikan file `robots.txt` dan `sitemap.xml`.

---

## SECTION 8: MIGRATION IMPACT (DAMPAK MIGRASI)

* **Potensi Down-Time**: Sangat Rendah ($<5$ menit). Seluruh migrasi skema tabel dapat dilakukan langsung secara *online* di Supabase console tanpa mematikan server Express Vercel.
* **Dampak Hashing Password**: Pengguna aktif yang password-nya berhasil dimigrasikan ke bentuk hash tidak akan merasakan perubahan apa pun saat login. Namun, skrip sinkronisasi backend wajib disiapkan dengan toleransi fallback sementara untuk menangani transisi password lama sebelum enkripsi selesai sepenuhnya.
* **Dampak Autentikasi Frontend**: Frontend React wajib diubah agar menyertakan token JWT Supabase (didapat dari `supabase.auth.getSession()`) pada setiap panggilan API Express di `Authorization` header. Jika token tidak disertakan, request ke dashboard admin akan ditolak dengan kode status HTTP `401 Unauthorized`.

---

## SECTION 9: ROLLBACK STRATEGY (STRATEGI KEMBALI)

Untuk memitigasi jika terjadi kendala kegagalan fungsionalitas sistem kasir atau checkout selama fase rilis keamanan:

1. **Rollback RLS Database**:
   * Simpan cadangan konfigurasi RLS lama (`revert_rls.sql`) yang berisi perintah reset kebijakan akses publik. Jika API Express mengalami penolakan akses PostgreSQL secara massal pasca rilis, jalankan `revert_rls.sql` di SQL Editor Supabase untuk memulihkan akses publik sementara.
2. **Rollback Hashing Password**:
   * Buat cadangan data tabel `users` (ekspor CSV/JSON) sebelum memicu enkripsi massal Bcrypt. Jika skrip enkripsi merusak string kata sandi, impor kembali data cadangan tersebut untuk menormalkan proses masuk pelanggan.
3. **Rollback Express API**:
   * Lakukan *deployment git commit* dengan tag cadangan (`stable-beta-before-hardening`). Jika middleware JWT Express memicu kegagalan login massal, lakukan *revert deployment* satu klik di dasboard Vercel ke commit tag tersebut.

---

## SECTION 10: ESTIMATED DEVELOPMENT TIME (ESTIMASI WAKTU PENGERJAAN)

Berikut adalah perkiraan waktu pengerjaan pengerasan keamanan Tampa Seduh (Phase 2):

1. **Fase A (Hashing Password & JWT Express Middleware)**: 8 Jam Kerja.
2. **Fase B (Pembuatan SQL RLS & Integrasi Service Role Backend)**: 12 Jam Kerja.
3. **Fase C (Storage Security, Google Secret Cleanup, SEO Metadata)**: 6 Jam Kerja.
4. **Fase Pengujian & Audit Penetrasi Akhir (*UAT & Penetration Testing*)**: 6 Jam Kerja.

* **Total Estimasi Waktu Pengerjaan: 32 Jam Kerja (± 4 Hari Pengoperasian Efektif)**

---
*Laporan Security Hardening Phase 1 ini diajukan untuk mendapatkan persetujuan peninjauan dari Pemilik Proyek, Emat Ambarak (CEO) dan Bayu Damopolii Manoppo (Co-Founder) sebelum melangkah ke pembuatan Security Hardening Phase 2 Plan.*
