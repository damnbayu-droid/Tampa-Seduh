-- Mengaktifkan RLS untuk tabel-tabel utama (jika belum aktif)
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Menghapus policy lama jika ada (untuk menghindari error)
DROP POLICY IF EXISTS "Public can view menu" ON menu;
DROP POLICY IF EXISTS "Public can view packages" ON packages;
DROP POLICY IF EXISTS "Public can view blog_news" ON blog_news;
DROP POLICY IF EXISTS "Public can view ai_settings" ON ai_settings;

-- Membuat policy baru agar siapapun (public/anon) bisa membaca data (SELECT)
CREATE POLICY "Public can view menu" ON menu FOR SELECT USING (true);
CREATE POLICY "Public can view packages" ON packages FOR SELECT USING (true);
CREATE POLICY "Public can view blog_news" ON blog_news FOR SELECT USING (true);
CREATE POLICY "Public can view ai_settings" ON ai_settings FOR SELECT USING (true);

-- Untuk orders, kita bisa izinkan insert oleh public (anon)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert orders" ON orders;
CREATE POLICY "Public can insert orders" ON orders FOR INSERT WITH CHECK (true);
