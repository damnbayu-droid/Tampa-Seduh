-- ================================================================
-- Tampa Seduh: Tambah kolom is_paid dan paid_at ke tabel orders
-- Jalankan di Supabase SQL Editor
-- ================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Update RLS policy (jika ada)
-- Kolom ini bisa dilihat oleh admin dan owner order itu sendiri
COMMENT ON COLUMN orders.is_paid IS 'Label PAID manual oleh admin (selain verifikasi AI otomatis)';
COMMENT ON COLUMN orders.paid_at IS 'Waktu admin memberikan label PAID pada order';
