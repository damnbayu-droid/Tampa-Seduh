const url = 'https://yizsanjcyphlbtjcwzxl.supabase.co';
const key = 'sb_publishable_hwpesUwLh612Wxj-gQx-RA_lcSIGuvb';

async function test() {
  const res = await fetch(`${url}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: "test-u-" + Date.now(),
      name: "Test User",
      email: "test@example.com",
      role: "customer"
    })
  });
  const data = await res.json().catch(() => null);
  console.log("Status:", res.status);
  console.log("Data:", data);
}
test();
