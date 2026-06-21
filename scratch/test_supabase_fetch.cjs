const url = 'https://yizsanjcyphlbtjcwzxl.supabase.co';
const key = 'sb_publishable_hwpesUwLh612Wxj-gQx-RA_lcSIGuvb';

async function test() {
  const res = await fetch(`${url}/rest/v1/menu`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: "test-m-" + Date.now(),
      name: "Test Menu",
      price_reg: 10,
      is_hot: true,
      is_available: true
    })
  });
  const data = await res.json().catch(() => null);
  console.log("Status:", res.status);
  console.log("Data:", data);
}
test();
