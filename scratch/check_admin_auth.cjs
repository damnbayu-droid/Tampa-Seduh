require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://yizsanjcyphlbtjcwzxl.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_hwpesUwLh612Wxj-gQx-RA_lcSIGuvb";

async function checkAuth() {
  const email = process.env.ADMIN_EMAIL || "tampaseduh@gmail.com";
  const password = process.env.ADMIN_PASSWORD || "Kotabunan*98";

  console.log(`Directly calling Supabase Auth API for email: ${email}...`);
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "apikey": supabaseAnonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("❌ Sign in failed:", data.error_description || data.error || JSON.stringify(data));
    } else {
      console.log("🎉 Sign in success!");
      console.log("Access Token:", data.access_token);
      console.log("User:", data.user);
    }
  } catch (err) {
    console.error("Error calling Supabase Auth:", err.message);
  }
}

checkAuth();
