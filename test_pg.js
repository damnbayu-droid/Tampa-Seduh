import pg from 'pg';
const connString = "postgresql://postgres.yizsanjcyphlbtjcwzxl:Kotabunan*98@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const pool = new pg.Pool({ connectionString: connString });
async function check() {
  try {
    const res = await pool.query('SELECT COUNT(*) FROM menu;');
    console.log('Menu count:', res.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}
check();
