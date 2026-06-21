const url = 'https://yizsanjcyphlbtjcwzxl.supabase.co';
const key = 'sb_publishable_hwpesUwLh612Wxj-gQx-RA_lcSIGuvb';

async function test() {
  const res = await fetch(`${url}/rest/v1/users`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data = await res.json().catch(() => null);
  console.log("Total users:", data.length);
  console.log("Users:", data);
}
test();
