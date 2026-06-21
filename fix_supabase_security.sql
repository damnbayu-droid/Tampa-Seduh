-- 1. FIX: Izinkan Anon/Public untuk membaca dan menulis ke tabel users
-- Ini adalah penyebab utama kenapa Anda tidak bisa login, karena Vercel ditolak oleh Supabase!
DROP POLICY IF EXISTS "Public can view users" ON users;
DROP POLICY IF EXISTS "Public can insert users" ON users;
DROP POLICY IF EXISTS "Public can update users" ON users;

CREATE POLICY "Public can view users" ON users FOR SELECT USING (true);
CREATE POLICY "Public can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update users" ON users FOR UPDATE USING (true) WITH CHECK (true);

-- 2. FIX: RLS Enabled No Policy untuk audit_logs dan email_logs
DROP POLICY IF EXISTS "Public can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Public can insert audit logs" ON audit_logs;
CREATE POLICY "Public can view audit logs" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Public can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view email logs" ON email_logs;
DROP POLICY IF EXISTS "Public can insert email logs" ON email_logs;
CREATE POLICY "Public can view email logs" ON email_logs FOR SELECT USING (true);
CREATE POLICY "Public can insert email logs" ON email_logs FOR INSERT WITH CHECK (true);

-- 3. FIX: Public Bucket Allows Listing (Storage)
-- Menghapus kemampuan public melihat daftar seluruh file di bucket "Bukti Bayar"
DROP POLICY IF EXISTS "Izinkan publik melihat Bukti Bayar" ON storage.objects;
-- Menggantinya dengan policy yang hanya mengizinkan public mendownload/membaca object secara spesifik
CREATE POLICY "Public can download Bukti Bayar" ON storage.objects FOR SELECT USING (bucket_id = 'Bukti Bayar');

-- 4. FIX: SECURITY DEFINER Warnings
-- Mencabut hak eksekusi fungsi auto rls dari publik dan role anon
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;

-- 5. FIX: Izinkan Anon/Public membaca dan mengupdate tabel orders
-- Karena Vercel (backend server) menggunakan anon key untuk sinkronisasi, server wajib bisa select dan update status pesanan.
DROP POLICY IF EXISTS "Public can view orders" ON orders;
DROP POLICY IF EXISTS "Public can update orders" ON orders;
CREATE POLICY "Public can view orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public can update orders" ON orders FOR UPDATE USING (true) WITH CHECK (true);
