// scratch/fetch_recipes_aws0.cjs
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.yizsanjcyphlbtjcwzxl:Kotabunan*98@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log("--- RECIPES IN AWS-0 ---");
    const recs = await client.query("SELECT id, name FROM recipes LIMIT 5");
    console.log("Count:", recs.rows.length);
    recs.rows.forEach(r => console.log(`- Recipe: "${r.name}"`));
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}
run();
