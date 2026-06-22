-- ============================================================
-- SQL untuk membuat bucket Gallery dan Pamflet di Supabase
-- Paste di Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. Buat bucket gallery-photos (foto kolase kedai)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery-photos',
  'gallery-photos',
  true,
  5242880,  -- 5MB max per foto
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Buat bucket pamflets (brosur/pamflet/event)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pamflets',
  'pamflets',
  true,
  10485760,  -- 10MB max per pamflet
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS Policy: Public bisa baca gallery-photos
CREATE POLICY "Public read gallery-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery-photos');

-- 4. RLS Policy: Admin bisa upload ke gallery-photos
CREATE POLICY "Admin upload gallery-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gallery-photos');

-- 5. RLS Policy: Admin bisa delete dari gallery-photos
CREATE POLICY "Admin delete gallery-photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'gallery-photos');

-- 6. RLS Policy: Public bisa baca pamflets
CREATE POLICY "Public read pamflets"
ON storage.objects FOR SELECT
USING (bucket_id = 'pamflets');

-- 7. RLS Policy: Admin bisa upload ke pamflets
CREATE POLICY "Admin upload pamflets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pamflets');

-- 8. RLS Policy: Admin bisa delete dari pamflets
CREATE POLICY "Admin delete pamflets"
ON storage.objects FOR DELETE
USING (bucket_id = 'pamflets');
