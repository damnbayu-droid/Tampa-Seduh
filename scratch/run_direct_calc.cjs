// scratch/run_direct_calc.cjs
// Kalkulasi profit langsung untuk memverifikasi keabsahan kode.
// Jalankan: node scratch/run_direct_calc.cjs

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("Menghubungkan ke database...");

    // 1. Ambil order yang statusnya 'completed'
    const ordersRes = await client.query("SELECT * FROM orders WHERE status = 'completed'");
    console.log(`Menemukan ${ordersRes.rows.length} order completed.`);

    if (ordersRes.rows.length === 0) {
      console.log("Tidak ada order completed untuk diproses.");
      return;
    }

    // 2. Ambil recipes
    const recipesRes = await client.query("SELECT id, name, selling_price FROM recipes");
    const recipesRaw = recipesRes.rows;

    // 3. Ambil recipe_items dengan join ingredients
    const riRes = await client.query(`
      SELECT ri.recipe_id, ri.quantity_used, i.cost_per_unit
      FROM recipe_items ri
      LEFT JOIN ingredients i ON ri.ingredient_id = i.id
    `);
    const recipeItemsRaw = riRes.rows;

    // 4. Ambil packages dan package_items
    const packagesRes = await client.query("SELECT id, package_name, selling_price FROM package_recipes");
    const packageRecipesRaw = packagesRes.rows;

    const piRes = await client.query("SELECT package_id, recipe_id, quantity FROM package_items");
    const packageItemsRaw = piRes.rows;

    // 5. Build HPP map untuk resep
    const recipeHppMap = new Map();
    for (const recipe of recipesRaw) {
      const items = recipeItemsRaw.filter(ri => ri.recipe_id === recipe.id);
      const totalHpp = items.reduce((sum, ri) => {
        const costPerUnit = Number(ri.cost_per_unit) || 0;
        return sum + (costPerUnit * Number(ri.quantity_used));
      }, 0);
      recipeHppMap.set(recipe.id, totalHpp);
    }

    // 6. Build maps
    const recipeByName = new Map();
    for (const recipe of recipesRaw) {
      const hpp = recipeHppMap.get(recipe.id) || 0;
      recipeByName.set(recipe.name.toLowerCase().trim(), { id: recipe.id, hpp });
    }

    const packageByName = new Map();
    for (const pack of packageRecipesRaw) {
      const packItems = packageItemsRaw.filter(pi => pi.package_id === pack.id);
      const packHpp = packItems.reduce((sum, pi) => {
        const recHpp = recipeHppMap.get(pi.recipe_id) || 0;
        return sum + (recHpp * Number(pi.quantity));
      }, 0);
      packageByName.set(pack.package_name.toLowerCase().trim(), { id: pack.id, hpp: packHpp });
    }

    // 7. Hitung profit untuk setiap order
    for (const ord of ordersRes.rows) {
      console.log(`\nMemproses order: ${ord.id} (${ord.customer_name})`);
      
      let items = [];
      if (typeof ord.items === "string") {
        items = JSON.parse(ord.items);
      } else {
        items = ord.items;
      }

      const breakdown = [];
      let totalRevenue = 0;
      let totalHpp = 0;

      for (const item of items) {
        const unitRevenue = Number(item.price) || 0;
        const totalItemRevenue = unitRevenue * Number(item.quantity);

        const itemNameLower = item.name.toLowerCase().trim();
        let matchedRecipe = null;
        let unitHpp = 0;

        // Direct match
        if (recipeByName.has(itemNameLower)) {
          const rec = recipeByName.get(itemNameLower);
          unitHpp = rec.hpp / 1000;
          matchedRecipe = item.name;
        } else if (packageByName.has(itemNameLower)) {
          const pack = packageByName.get(itemNameLower);
          unitHpp = pack.hpp / 1000;
          matchedRecipe = item.name + " (package)";
        } else {
          // Partial match recipe
          for (const [rName, rData] of recipeByName.entries()) {
            if (rName.includes(itemNameLower) || itemNameLower.includes(rName)) {
              unitHpp = rData.hpp / 1000;
              matchedRecipe = rName;
              break;
            }
          }
          // Partial match package
          if (!matchedRecipe) {
            for (const [pName, pData] of packageByName.entries()) {
              if (pName.includes(itemNameLower) || itemNameLower.includes(pName)) {
                unitHpp = pData.hpp / 1000;
                matchedRecipe = pName + " (package)";
                break;
              }
            }
          }
        }

        const totalItemHpp = unitHpp * Number(item.quantity);

        breakdown.push({
          name: item.name,
          quantity: Number(item.quantity),
          unit_revenue: unitRevenue,
          unit_hpp: Math.round(unitHpp * 100) / 100,
          total_revenue: totalItemRevenue,
          total_hpp: Math.round(totalItemHpp * 100) / 100,
          gross_profit: Math.round((totalItemRevenue - totalItemHpp) * 100) / 100,
          matched_recipe: matchedRecipe
        });

        totalRevenue += totalItemRevenue;
        totalHpp += totalItemHpp;
      }

      const grossProfit = totalRevenue - totalHpp;
      const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      const result = {
        order_id: ord.id,
        revenue: Math.round(totalRevenue * 100) / 100,
        hpp: Math.round(totalHpp * 100) / 100,
        gross_profit: Math.round(grossProfit * 100) / 100,
        margin_percentage: Math.round(margin * 100) / 100,
        item_breakdown: breakdown
      };

      console.log(`Kalkulasi:`, result);

      // Simpan ke order_profit
      await client.query(`
        INSERT INTO order_profit (order_id, revenue, hpp, gross_profit, margin_percentage, item_breakdown, calculated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (order_id) DO UPDATE SET
          revenue = EXCLUDED.revenue,
          hpp = EXCLUDED.hpp,
          gross_profit = EXCLUDED.gross_profit,
          margin_percentage = EXCLUDED.margin_percentage,
          item_breakdown = EXCLUDED.item_breakdown,
          calculated_at = NOW()
      `, [
        result.order_id,
        result.revenue,
        result.hpp,
        result.gross_profit,
        result.margin_percentage,
        JSON.stringify(result.item_breakdown)
      ]);

      console.log(`✅ Berhasil menyimpan profit untuk order ${ord.id}`);
    }

  } catch (err) {
    console.error("❌ Gagal:", err.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();
