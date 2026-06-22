const { Client } = require('pg');

const sql = `
-- Create Enum for ingredient categories
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingredient_category') THEN 
    CREATE TYPE ingredient_category AS ENUM (
      'Coffee Beans', 'Milk', 'Syrup', 'Sugar', 'Packaging', 'Bread', 'Food', 'Other'
    );
  END IF; 
END $$;

-- Table 1: ingredients
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  purchase_quantity NUMERIC NOT NULL,
  purchase_unit TEXT NOT NULL,
  purchase_price NUMERIC NOT NULL,
  cost_per_unit NUMERIC GENERATED ALWAYS AS (purchase_price / NULLIF(purchase_quantity, 0)) STORED,
  supplier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: recipes
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  status BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: recipe_items
CREATE TABLE IF NOT EXISTS recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_used NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 4: package_recipes
CREATE TABLE IF NOT EXISTS package_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name TEXT NOT NULL,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  status BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 5: package_items
CREATE TABLE IF NOT EXISTS package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES package_recipes(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1
);

-- Table 6: overhead_costs
CREATE TABLE IF NOT EXISTS overhead_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  monthly_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE overhead_costs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid errors on multiple runs
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE tablename IN ('ingredients', 'recipes', 'recipe_items', 'package_recipes', 'package_items', 'overhead_costs')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Create Policies (Admin access everywhere)
CREATE POLICY "Public read access for ingredients" ON ingredients FOR SELECT USING (true);
CREATE POLICY "Admin full access to ingredients" ON ingredients FOR ALL USING (true);

CREATE POLICY "Public read access for recipes" ON recipes FOR SELECT USING (true);
CREATE POLICY "Admin full access to recipes" ON recipes FOR ALL USING (true);

CREATE POLICY "Public read access for recipe_items" ON recipe_items FOR SELECT USING (true);
CREATE POLICY "Admin full access to recipe_items" ON recipe_items FOR ALL USING (true);

CREATE POLICY "Public read access for package_recipes" ON package_recipes FOR SELECT USING (true);
CREATE POLICY "Admin full access to package_recipes" ON package_recipes FOR ALL USING (true);

CREATE POLICY "Public read access for package_items" ON package_items FOR SELECT USING (true);
CREATE POLICY "Admin full access to package_items" ON package_items FOR ALL USING (true);

CREATE POLICY "Public read access for overhead_costs" ON overhead_costs FOR SELECT USING (true);
CREATE POLICY "Admin full access to overhead_costs" ON overhead_costs FOR ALL USING (true);
`;

const client = new Client({
  connectionString: 'postgresql://postgres.yizsanjcyphlbtjcwzxl:Kotabunan*98@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

client.connect()
  .then(() => client.query(sql))
  .then(() => {
    console.log("Migration successful");
    client.end();
  })
  .catch(err => {
    console.error("Migration failed:", err);
    client.end();
  });
