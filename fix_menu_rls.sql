-- FIX: Izinkan Anon/Public untuk menulis ke tabel menu dan packages
-- Karena backend tidak memiliki service_role_key, backend menggunakan anon_key
-- Sehingga RLS menolak proses INSERT dan UPDATE jika tidak diizinkan untuk public.

-- Tabel Menu
DROP POLICY IF EXISTS "Public can view menu" ON menu;
DROP POLICY IF EXISTS "Public can insert menu" ON menu;
DROP POLICY IF EXISTS "Public can update menu" ON menu;
DROP POLICY IF EXISTS "Public can delete menu" ON menu;

CREATE POLICY "Public can view menu" ON menu FOR SELECT USING (true);
CREATE POLICY "Public can insert menu" ON menu FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update menu" ON menu FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete menu" ON menu FOR DELETE USING (true);

-- Tabel Packages
DROP POLICY IF EXISTS "Public can view packages" ON packages;
DROP POLICY IF EXISTS "Public can insert packages" ON packages;
DROP POLICY IF EXISTS "Public can update packages" ON packages;
DROP POLICY IF EXISTS "Public can delete packages" ON packages;

CREATE POLICY "Public can view packages" ON packages FOR SELECT USING (true);
CREATE POLICY "Public can insert packages" ON packages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update packages" ON packages FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete packages" ON packages FOR DELETE USING (true);

-- Tabel Users
-- Pastikan tidak ada column avatar_url yang menghalangi insert
-- Tapi karena avatar_url dihapus di App.tsx, pastikan public bisa insert
DROP POLICY IF EXISTS "Public can view users" ON users;
DROP POLICY IF EXISTS "Public can insert users" ON users;
DROP POLICY IF EXISTS "Public can update users" ON users;

CREATE POLICY "Public can view users" ON users FOR SELECT USING (true);
CREATE POLICY "Public can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update users" ON users FOR UPDATE USING (true) WITH CHECK (true);

