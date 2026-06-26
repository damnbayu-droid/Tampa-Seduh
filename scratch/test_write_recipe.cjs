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
    console.log("Testing INSERT into recipes...");
    const res1 = await fetch(`${supabaseUrl}/rest/v1/recipes`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Test Espresso",
        category: "Coffee",
        description: "Espresso murni",
        selling_price: 15000,
        status: true
      })
    });

    const data1 = await res1.json();
    console.log("Recipes Insert:", { status: res1.status, data1 });

    if (res1.status === 201 && data1.length > 0) {
      const recipeId = data1[0].id;
      
      // Let's fetch the first ingredient to get an id
      const resIng = await fetch(`${supabaseUrl}/rest/v1/ingredients?limit=1`, { headers });
      const ings = await resIng.json();
      if (ings.length > 0) {
        const ingId = ings[0].id;
        console.log(`Using ingredient ID: ${ingId} to insert recipe item...`);
        
        const res2 = await fetch(`${supabaseUrl}/rest/v1/recipe_items`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            recipe_id: recipeId,
            ingredient_id: ingId,
            quantity_used: 10,
            unit: "gr"
          })
        });
        const data2 = await res2.json();
        console.log("Recipe Items Insert:", { status: res2.status, data2 });
      }
    }
  } catch (err) {
    console.error("Write error:", err.message);
  }
}

testWrite();
