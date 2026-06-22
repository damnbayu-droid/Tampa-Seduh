-- =====================================================================
-- Migration: Tambah kolom menu_category ke tabel menu
-- Sifat Penyajian: 'hot' | 'cold' | 'snack'
-- Jalankan di Supabase SQL Editor
-- =====================================================================

-- 1. Tambah kolom menu_category
ALTER TABLE menu
ADD COLUMN IF NOT EXISTS menu_category TEXT DEFAULT 'cold'
  CHECK (menu_category IN ('hot', 'cold', 'snack'));

-- 2. Backfill existing data berdasarkan is_hot
UPDATE menu
SET menu_category = CASE
  WHEN is_hot = true THEN 'hot'
  ELSE 'cold'
END
WHERE menu_category = 'cold' OR menu_category IS NULL;

-- 3. Buat index untuk query performa
CREATE INDEX IF NOT EXISTS idx_menu_category ON menu(menu_category);

-- 4. Fix RLS policy untuk blog_news agar INSERT via service role bisa berhasil
-- (Ini diperlukan jika RLS sudah aktif di tabel blog_news)

-- Hapus policy insert yang mungkin terlalu ketat
DROP POLICY IF EXISTS "Allow authenticated insert blog_news" ON blog_news;

-- Tambah policy yang membolehkan service role insert
CREATE POLICY "Allow service role all blog_news"
  ON blog_news
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public read (untuk CoffeeNews page)
CREATE POLICY "Allow public read blog_news"
  ON blog_news
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- =====================================================================
-- SELESAI: Jalankan query di atas di Supabase SQL Editor
-- Tidak perlu restart server
-- =====================================================================
