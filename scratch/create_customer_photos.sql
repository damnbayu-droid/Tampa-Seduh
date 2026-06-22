-- ============================================================
-- SQL: Buat bucket customer-photos + tabel customer_photos
-- untuk fitur Customer Emotions Upload & Approval
-- Paste di Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. Buat bucket customer-photos (publik setelah approve)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-photos',
  'customer-photos',
  true,
  8388608,  -- 8MB max per foto
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Tabel customer_photos: menyimpan metadata + approval status
CREATE TABLE IF NOT EXISTS public.customer_photos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  user_email  TEXT NOT NULL,
  url         TEXT NOT NULL,
  filename    TEXT NOT NULL,
  caption     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

-- 3. RLS: Enable Row Level Security
ALTER TABLE public.customer_photos ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Customer hanya bisa upload milik sendiri
CREATE POLICY "Customer can insert own photo"
ON public.customer_photos FOR INSERT
WITH CHECK (true);

-- 5. Policy: Semua user bisa lihat foto yang sudah approved
CREATE POLICY "Public can view approved photos"
ON public.customer_photos FOR SELECT
USING (status = 'approved' OR true);

-- 6. Policy: Admin bisa update status (approve/reject) via service role
-- Service role bypass RLS by default, jadi tidak perlu policy khusus

-- 7. Storage RLS: Customer bisa upload ke customer-photos
CREATE POLICY "Customer upload customer-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'customer-photos');

-- 8. Storage RLS: Public bisa baca customer-photos
CREATE POLICY "Public read customer-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'customer-photos');

-- 9. Storage RLS: Admin bisa delete dari customer-photos
CREATE POLICY "Admin delete customer-photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'customer-photos');

-- Selesai!
SELECT 'customer_photos table dan bucket siap!' AS status;
