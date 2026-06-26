require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://yizsanjcyphlbtjcwzxl.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_hwpesUwLh612Wxj-gQx-RA_lcSIGuvb";

async function testWrite() {
  const headers = {
    "apikey": supabaseAnonKey,
    "Authorization": `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };

  try {
    console.log("Testing INSERT into ingredients...");
    const res = await fetch(`${supabaseUrl}/rest/v1/ingredients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Test Biji Kopi",
        category: "Coffee Beans",
        purchase_quantity: 1000,
        purchase_unit: "gr",
        purchase_price: 120000,
        supplier: "Test Supplier"
      })
    });

    const data = await res.json();
    console.log("Response:", { status: res.status, data });
  } catch (err) {
    console.error("Write error:", err.message);
  }
}

testWrite();
