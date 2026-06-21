const url = 'https://yizsanjcyphlbtjcwzxl.supabase.co';
const key = 'sb_publishable_hwpesUwLh612Wxj-gQx-RA_lcSIGuvb';

async function test() {
  const res = await fetch(`${url}/rest/v1/users?select=*&limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data = await res.json().catch(() => null);
  console.log("Users Columns:", Object.keys(data[0] || {}));
}
test();
