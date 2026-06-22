-- ============================================================
-- Tampa Seduh - Real Profit Engine V1
-- Tabel: order_profit
-- Dibuat: 2026-06-22
-- ============================================================

-- Buat tabel order_profit
CREATE TABLE IF NOT EXISTS order_profit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,        -- UNIQUE: satu order = satu record
  revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,         -- Revenue aktual dari order (ribuan IDR)
  hpp NUMERIC(12, 2) NOT NULL DEFAULT 0,             -- HPP aktual dari recipe
  gross_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,   -- Revenue - HPP
  margin_percentage NUMERIC(6, 2) NOT NULL DEFAULT 0, -- (gross_profit / revenue) * 100
  item_breakdown JSONB,                  -- Detail HPP per item untuk audit trail
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk performa query dashboard
CREATE INDEX IF NOT EXISTS idx_order_profit_order_id ON order_profit(order_id);
CREATE INDEX IF NOT EXISTS idx_order_profit_calculated_at ON order_profit(calculated_at);

-- RLS: Hanya service role yang bisa write; read dibatasi ke backend
ALTER TABLE order_profit ENABLE ROW LEVEL SECURITY;

-- Admin bisa membaca semua
CREATE POLICY "Admin can read order_profit"
  ON order_profit FOR SELECT
  USING (true);

-- Hanya service role yang bisa insert/update (backend saja)
CREATE POLICY "Service role can insert order_profit"
  ON order_profit FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update order_profit"
  ON order_profit FOR UPDATE
  USING (true);

-- Tampilkan struktur
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_profit'
ORDER BY ordinal_position;
