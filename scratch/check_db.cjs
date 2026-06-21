const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.yizsanjcyphlbtjcwzxl:Kotabunan*98@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    await client.connect();
    
    console.log("--- USERS ---");
    const users = await client.query('SELECT id, name, email FROM users LIMIT 5');
    console.log(users.rows);

    console.log("\n--- MENU ---");
    const menu = await client.query('SELECT id, name FROM menu LIMIT 5');
    console.log(menu.rows);
    
    console.log("\n--- PACKAGES ---");
    const packages = await client.query('SELECT id, name FROM packages LIMIT 5');
    console.log(packages.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
