// scratch/fetch_recipes_list.cjs
// Ambil nama-nama resep & paket dari database.
// Jalankan: node scratch/fetch_recipes_list.cjs

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("--- RECIPES IN DATABASE ---");
    const recs = await client.query("SELECT id, name, category FROM recipes");
    recs.rows.forEach(r => console.log(`- Recipe: "${r.name}" (${r.category})`));

    console.log("\n--- PACKAGES IN DATABASE ---");
    const packs = await client.query("SELECT id, package_name FROM package_recipes");
    packs.rows.forEach(p => console.log(`- Package: "${p.package_name}"`));
    
  } catch (err) {
    console.error(err.message);
  } finally {
    client.release();
    pool.end();
  }
}
run();
