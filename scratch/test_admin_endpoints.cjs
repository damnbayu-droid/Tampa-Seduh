require('dotenv').config();

const port = process.env.PORT || 3000;
const url = `http://localhost:${port}`;

async function testEndpoints() {
  console.log("=== STARTING INTEGRATION TESTS FOR ADMIN ENDPOINTS ===");

  // 1. Test Admin Login
  console.log("\n1. Testing POST /api/auth/login...");
  const loginRes = await fetch(`${url}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || "tampaseduh@gmail.com",
      password: process.env.ADMIN_PASSWORD || "Kotabunan*98"
    })
  });

  const loginData = await loginRes.json();
  console.log("Response Status:", loginRes.status);
  console.log("Response Body:", loginData);

  if (loginRes.status !== 200 || !loginData.success || !loginData.token) {
    console.error("❌ Admin login test failed!");
    process.exit(1);
  }
  console.log("🎉 Login success! Token acquired.");

  const token = loginData.token;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  const endpoints = [
    { name: "Finance Panel (/api/finances)", path: "/api/finances" },
    { name: "Real Profit Panel (/api/profit/dashboard)", path: "/api/profit/dashboard" },
    { name: "Users Panel (/api/users)", path: "/api/users" },
    { name: "Chat Admin Panel (/api/chat-admin/sessions)", path: "/api/chat-admin/sessions" },
    { name: "AI Master Panel (/api/ai-config)", path: "/api/ai-config" },
    { name: "Email Master Panel (/api/emails)", path: "/api/emails" }
  ];

  for (const ep of endpoints) {
    console.log(`\nTesting GET ${ep.path}...`);
    try {
      const res = await fetch(`${url}${ep.path}`, { headers });
      const data = await res.json().catch(() => null);
      console.log("Response Status:", res.status);
      if (res.status === 200) {
        console.log(`✅ ${ep.name} passed! Received data count/keys:`, 
          Array.isArray(data) ? `${data.length} items` : Object.keys(data || {})
        );
      } else {
        console.error(`❌ ${ep.name} failed with status:`, res.status, data);
      }
    } catch (err) {
      console.error(`❌ Error querying ${ep.name}:`, err.message);
    }
  }

  console.log("\n=== INTEGRATION TESTS COMPLETE ===");
}

testEndpoints();
