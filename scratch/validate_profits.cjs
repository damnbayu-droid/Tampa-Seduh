// scratch/validate_profits.cjs
// Menjalankan query langsung ke database untuk memvalidasi data order_profit.
// Jalankan: node scratch/validate_profits.cjs

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function validate() {
  const client = await pool.connect();
  try {
    console.log("Menghubungkan ke database...");

    // 1. Cek total order completed
    const completedOrdersRes = await client.query(
      "SELECT COUNT(*) as count FROM orders WHERE status = 'completed'"
    );
    const completedCount = completedOrdersRes.rows[0].count;
    console.log(`- Jumlah order berstatus 'completed' di tabel orders: ${completedCount}`);

    // 2. Cek total order_profit
    const profitRes = await client.query("SELECT COUNT(*) as count FROM order_profit");
    const profitCount = profitRes.rows[0].count;
    console.log(`- Jumlah catatan profit di tabel order_profit: ${profitCount}`);

    // 3. Ambil data order_profit untuk audit
    if (Number(profitCount) > 0) {
      console.log("\n--- CONTOH CATATAN PROFIT ---");
      const sampleProfit = await client.query("SELECT * FROM order_profit LIMIT 2");
      sampleProfit.rows.forEach(p => {
        console.log(`Order ID: ${p.order_id}`);
        console.log(`  Revenue      : Rp ${p.revenue}.000`);
        console.log(`  HPP          : Rp ${p.hpp}.000`);
        console.log(`  Gross Profit : Rp ${p.gross_profit}.000`);
        console.log(`  Margin       : ${p.margin_percentage}%`);
        console.log(`  Breakdown    :`, JSON.stringify(p.item_breakdown, null, 2));
        console.log("-----------------------------------------");
      });
    } else {
      console.log("\n⚠️  Tabel order_profit kosong. Saat server Express dijalankan, sinkronisasi otomatis akan menghitung profit untuk order historis yang completed.");
    }

  } catch (err) {
    console.error("❌ Validasi gagal:", err.message);
  } finally {
    client.release();
    pool.end();
  }
}

validate();
