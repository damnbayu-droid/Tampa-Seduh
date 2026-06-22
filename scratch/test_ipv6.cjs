const { Client } = require('pg');

async function testIPv6() {
  const client = new Client({
    host: '2406:da18:e5c:b702:c1cc:86c0:7a5:4df8', // IPv6 direct IP
    port: 5432,
    user: 'postgres',
    password: 'Kotabunan*98',
    database: 'postgres',
    connectionTimeoutMillis: 5000
  });

  try {
    console.log("Connecting directly to IPv6 address...");
    await client.connect();
    console.log("SUCCESS direct connection over IPv6!");
    const res = await client.query('SELECT now();');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error("FAILED direct connection over IPv6:", err.message);
  }
}

testIPv6();
