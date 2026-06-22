const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.yizsanjcyphlbtjcwzxl:Kotabunan*98@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres';
console.log('Connecting to PostgreSQL Pooler at:', connectionString.split('@')[1]);

const sqlPath = path.join(__dirname, '..', 'security_hardening_rls.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const client = new Client({ connectionString });

client.connect()
  .then(() => {
    console.log("Successfully connected to Supabase PostgreSQL.");
    return client.query(sql);
  })
  .then((res) => {
    console.log("Security Hardening SQL migration executed successfully.");
    client.end();
  })
  .catch(err => {
    console.error("Migration failed:", err.message);
    client.end();
    process.exit(1);
  });
