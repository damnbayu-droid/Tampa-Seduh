require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://yizsanjcyphlbtjcwzxl.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_hwpesUwLh612Wxj-gQx-RA_lcSIGuvb";

async function test() {
  const headers = {
    "apikey": supabaseAnonKey,
    "Authorization": `Bearer ${supabaseAnonKey}`
  };

  try {
    console.log("Fetching ingredients...");
    const res1 = await fetch(`${supabaseUrl}/rest/v1/ingredients?select=*`, { headers });
    const ings = await res1.json();
    console.log("Ingredients:", { count: ings.length, status: res1.status, error: ings.message || "none" });

    console.log("Fetching recipes...");
    const res2 = await fetch(`${supabaseUrl}/rest/v1/recipes?select=*`, { headers });
    const recs = await res2.json();
    console.log("Recipes:", { count: recs.length, status: res2.status, error: recs.message || "none" });

    console.log("Fetching recipe_items with join...");
    const res3 = await fetch(`${supabaseUrl}/rest/v1/recipe_items?select=*,ingredient:ingredients(*)`, { headers });
    const items = await res3.json();
    console.log("Recipe Items:", { count: items.length, status: res3.status, error: items.message || "none" });
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

test();
