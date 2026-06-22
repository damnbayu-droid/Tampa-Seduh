// scratch/run_profit_migration.cjs
// Jalankan: node scratch/run_profit_migration.cjs

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const statements = [
  // 1. Buat tabel
  `CREATE TABLE IF NOT EXISTS order_profit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL UNIQUE,
    revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
    hpp NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gross_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    margin_percentage NUMERIC(6, 2) NOT NULL DEFAULT 0,
    item_breakdown JSONB,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // 2. Index performa
  `CREATE INDEX IF NOT EXISTS idx_order_profit_order_id ON order_profit(order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_order_profit_calculated_at ON order_profit(calculated_at)`,

  // 3. RLS
  `ALTER TABLE order_profit ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_profit' AND policyname = 'Admin can read order_profit') THEN
      CREATE POLICY "Admin can read order_profit" ON order_profit FOR SELECT USING (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_profit' AND policyname = 'Service role can insert order_profit') THEN
      CREATE POLICY "Service role can insert order_profit" ON order_profit FOR INSERT WITH CHECK (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_profit' AND policyname = 'Service role can update order_profit') THEN
      CREATE POLICY "Service role can update order_profit" ON order_profit FOR UPDATE USING (true);
    END IF;
  END $$`,
];

async function run() {
  const client = await pool.connect();
  try {
    console.log("Menghubungkan ke Supabase PostgreSQL...");
    
    for (const stmt of statements) {
      const preview = stmt.trim().substring(0, 60).replace(/\n/g, " ");
      try {
        await client.query(stmt);
        console.log(`✅ ${preview}...`);
      } catch (err) {
        if (err.message.includes("already exists")) {
          console.log(`⚠️  Sudah ada: ${preview}...`);
        } else {
          console.error(`❌ Error: ${err.message}`);
          console.error(`   Statement: ${preview}`);
          throw err;
        }
      }
    }

    // Verify
    const check = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'order_profit' 
      ORDER BY ordinal_position
    `);
    console.log("\n✅ Tabel order_profit berhasil dibuat!");
    console.log("Kolom:");
    check.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));
    
    // Test insert and delete
    await client.query(`
      INSERT INTO order_profit (order_id, revenue, hpp, gross_profit, margin_percentage)
      VALUES ('test-migration-001', 55.0, 20.0, 35.0, 63.64)
      ON CONFLICT (order_id) DO UPDATE SET calculated_at = NOW()
    `);
    await client.query(`DELETE FROM order_profit WHERE order_id = 'test-migration-001'`);
    console.log("✅ UPSERT test: berhasil");

  } catch (err) {
    console.error("❌ Migration gagal:", err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

run();
