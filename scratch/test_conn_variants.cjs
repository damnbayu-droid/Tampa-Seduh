const { Client } = require('pg');

const prefixes = ['aws-0', 'aws-1', 'aws-2', 'aws-3'];
const regions = ['ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'us-east-1'];

async function testAll() {
  for (const prefix of prefixes) {
    for (const region of regions) {
      const host = `${prefix}-${region}.pooler.supabase.com`;
      console.log(`Testing host [${host}]...`);
      const connectionString = `postgresql://postgres.yizsanjcyphlbtjcwzxl:Kotabunan*98@${host}:6543/postgres`;
      const client = new Client({ connectionString, connectionTimeoutMillis: 2000 });
      try {
        await client.connect();
        console.log(`\n🎉 SUCCESS for host: ${host}!`);
        const res = await client.query('SELECT now();');
        console.log('Result:', res.rows[0]);
        await client.end();
        return;
      } catch (err) {
        console.log(`FAILED for ${host}:`, err.message);
      }
    }
  }
}

testAll();
