import { supabase } from "./supabase";
import { Ingredient, Recipe, RecipeItem, PackageRecipe, PackageItem, OverheadCost } from "../types";

// ----------------------------------------------------
// INGREDIENTS API
// ----------------------------------------------------
export const getIngredients = async (): Promise<Ingredient[]> => {
  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching ingredients:", error);
    throw error;
  }
  return data || [];
};

export const createIngredient = async (ingredient: Omit<Ingredient, "id" | "cost_per_unit" | "created_at" | "updated_at">): Promise<Ingredient> => {
  const { data, error } = await supabase
    .from("ingredients")
    .insert([ingredient])
    .select()
    .single();

  if (error) {
    console.error("Error creating ingredient:", error);
    throw error;
  }
  return data;
};

export const updateIngredient = async (
  id: string,
  ingredient: Partial<Omit<Ingredient, "id" | "cost_per_unit" | "created_at" | "updated_at">>
): Promise<Ingredient> => {
  const { data, error } = await supabase
    .from("ingredients")
    .update(ingredient)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating ingredient:", error);
    throw error;
  }
  return data;
};

export const deleteIngredient = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("ingredients")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting ingredient:", error);
    throw error;
  }
};

// ----------------------------------------------------
// RECIPES API
// ----------------------------------------------------
export const getRecipes = async (): Promise<Recipe[]> => {
  // Fetch recipes
  const { data: recipesData, error: recipesError } = await supabase
    .from("recipes")
    .select("*")
    .order("name", { ascending: true });

  if (recipesError) {
    console.error("Error fetching recipes:", recipesError);
    throw recipesError;
  }

  // Fetch recipe items with their ingredient details
  const { data: itemsData, error: itemsError } = await supabase
    .from("recipe_items")
    .select(`
      *,
      ingredient:ingredients(*)
    `);

  if (itemsError) {
    console.error("Error fetching recipe items:", itemsError);
    throw itemsError;
  }

  // Map items to recipes and compute total HPP
  const recipes: Recipe[] = (recipesData || []).map((recipe) => {
    const items = (itemsData || []).filter((item) => item.recipe_id === recipe.id) as RecipeItem[];
    
    // Calculate total HPP for this recipe
    const totalHpp = items.reduce((sum, item) => {
      const ingredientCost = item.ingredient?.cost_per_unit || 0;
      return sum + (ingredientCost * item.quantity_used);
    }, 0);

    return {
      ...recipe,
      recipe_items: items,
      totalHpp
    };
  });

  return recipes;
};

export const createRecipe = async (
  recipe: Omit<Recipe, "id" | "created_at" | "updated_at" | "recipe_items" | "totalHpp">,
  items: Omit<RecipeItem, "id" | "recipe_id" | "created_at">[]
): Promise<Recipe> => {
  // 1. Insert recipe
  const { data: recipeData, error: recipeError } = await supabase
    .from("recipes")
    .insert([recipe])
    .select()
    .single();

  if (recipeError) {
    console.error("Error creating recipe:", recipeError);
    throw recipeError;
  }

  const recipeId = recipeData.id;

  // 2. Insert recipe items if any
  if (items.length > 0) {
    const itemsToInsert = items.map((item) => ({
      recipe_id: recipeId,
      ingredient_id: item.ingredient_id,
      quantity_used: item.quantity_used,
      unit: item.unit
    }));

    const { error: itemsError } = await supabase
      .from("recipe_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error("Error creating recipe items:", itemsError);
      // Clean up the created recipe to keep DB clean
      await supabase.from("recipes").delete().eq("id", recipeId);
      throw itemsError;
    }
  }

  return getSingleRecipe(recipeId);
};

export const updateRecipe = async (
  id: string,
  recipe: Partial<Omit<Recipe, "id" | "created_at" | "updated_at" | "recipe_items" | "totalHpp">>,
  items: Omit<RecipeItem, "id" | "recipe_id" | "created_at">[]
): Promise<Recipe> => {
  // 1. Update recipe info
  const { error: recipeError } = await supabase
    .from("recipes")
    .update(recipe)
    .eq("id", id);

  if (recipeError) {
    console.error("Error updating recipe details:", recipeError);
    throw recipeError;
  }

  // 2. Delete all existing items for this recipe
  const { error: deleteError } = await supabase
    .from("recipe_items")
    .delete()
    .eq("recipe_id", id);

  if (deleteError) {
    console.error("Error clearing old recipe items:", deleteError);
    throw deleteError;
  }

  // 3. Insert new recipe items
  if (items.length > 0) {
    const itemsToInsert = items.map((item) => ({
      recipe_id: id,
      ingredient_id: item.ingredient_id,
      quantity_used: item.quantity_used,
      unit: item.unit
    }));

    const { error: insertError } = await supabase
      .from("recipe_items")
      .insert(itemsToInsert);

    if (insertError) {
      console.error("Error inserting new recipe items:", insertError);
      throw insertError;
    }
  }

  return getSingleRecipe(id);
};

export const deleteRecipe = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting recipe:", error);
    throw error;
  }
};

// Helper: Fetch a single recipe with items and ingredients
const getSingleRecipe = async (id: string): Promise<Recipe> => {
  const { data: recipeData, error: recipeError } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (recipeError) throw recipeError;

  const { data: itemsData, error: itemsError } = await supabase
    .from("recipe_items")
    .select(`
      *,
      ingredient:ingredients(*)
    `)
    .eq("recipe_id", id);

  if (itemsError) throw itemsError;

  const items = (itemsData || []) as RecipeItem[];
  const totalHpp = items.reduce((sum, item) => {
    const ingredientCost = item.ingredient?.cost_per_unit || 0;
    return sum + (ingredientCost * item.quantity_used);
  }, 0);

  return {
    ...recipeData,
    recipe_items: items,
    totalHpp
  };
};

// ----------------------------------------------------
// PACKAGE RECIPES API
// ----------------------------------------------------
export const getPackages = async (): Promise<PackageRecipe[]> => {
  // Fetch package recipes
  const { data: packagesData, error: packagesError } = await supabase
    .from("package_recipes")
    .select("*")
    .order("package_name", { ascending: true });

  if (packagesError) {
    console.error("Error fetching packages:", packagesError);
    throw packagesError;
  }

  // Fetch package items and join with their recipes (including recipe items & ingredients to count cost)
  const { data: itemsData, error: itemsError } = await supabase
    .from("package_items")
    .select(`
      *,
      recipe:recipes(*)
    `);

  if (itemsError) {
    console.error("Error fetching package items:", itemsError);
    throw itemsError;
  }

  // We need recipe items details to compute HPP
  const recipesWithHpp = await getRecipes();
  const recipesMap = new Map(recipesWithHpp.map(r => [r.id, r]));

  // Map items to packages and compute total HPP
  const packages: PackageRecipe[] = (packagesData || []).map((pack) => {
    const items = (itemsData || [])
      .filter((item) => item.package_id === pack.id)
      .map((item) => ({
        ...item,
        recipe: recipesMap.get(item.recipe_id) // attach recipe with calculated HPP
      })) as PackageItem[];
    
    // Calculate total HPP for this package
    const totalHpp = items.reduce((sum, item) => {
      const recipeHpp = item.recipe?.totalHpp || 0;
      return sum + (recipeHpp * item.quantity);
    }, 0);

    return {
      ...pack,
      package_items: items,
      totalHpp
    };
  });

  return packages;
};

export const createPackage = async (
  pack: Omit<PackageRecipe, "id" | "created_at" | "package_items" | "totalHpp">,
  items: Omit<PackageItem, "id" | "package_id">[]
): Promise<PackageRecipe> => {
  // 1. Insert package
  const { data: packData, error: packError } = await supabase
    .from("package_recipes")
    .insert([pack])
    .select()
    .single();

  if (packError) {
    console.error("Error creating package:", packError);
    throw packError;
  }

  const packageId = packData.id;

  // 2. Insert items
  if (items.length > 0) {
    const itemsToInsert = items.map((item) => ({
      package_id: packageId,
      recipe_id: item.recipe_id,
      quantity: item.quantity
    }));

    const { error: itemsError } = await supabase
      .from("package_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error("Error creating package items:", itemsError);
      // Clean up package
      await supabase.from("package_recipes").delete().eq("id", packageId);
      throw itemsError;
    }
  }

  return getSinglePackage(packageId);
};

export const updatePackage = async (
  id: string,
  pack: Partial<Omit<PackageRecipe, "id" | "created_at" | "package_items" | "totalHpp">>,
  items: Omit<PackageItem, "id" | "package_id">[]
): Promise<PackageRecipe> => {
  // 1. Update package details
  const { error: packError } = await supabase
    .from("package_recipes")
    .update(pack)
    .eq("id", id);

  if (packError) {
    console.error("Error updating package details:", packError);
    throw packError;
  }

  // 2. Delete existing items
  const { error: deleteError } = await supabase
    .from("package_items")
    .delete()
    .eq("package_id", id);

  if (deleteError) {
    console.error("Error deleting old package items:", deleteError);
    throw deleteError;
  }

  // 3. Insert new items
  if (items.length > 0) {
    const itemsToInsert = items.map((item) => ({
      package_id: id,
      recipe_id: item.recipe_id,
      quantity: item.quantity
    }));

    const { error: insertError } = await supabase
      .from("package_items")
      .insert(itemsToInsert);

    if (insertError) {
      console.error("Error inserting new package items:", insertError);
      throw insertError;
    }
  }

  return getSinglePackage(id);
};

export const deletePackage = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("package_recipes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting package:", error);
    throw error;
  }
};

// Helper: Fetch a single package
const getSinglePackage = async (id: string): Promise<PackageRecipe> => {
  const { data: packData, error: packError } = await supabase
    .from("package_recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (packError) throw packError;

  const { data: itemsData, error: itemsError } = await supabase
    .from("package_items")
    .select(`
      *,
      recipe:recipes(*)
    `)
    .eq("package_id", id);

  if (itemsError) throw itemsError;

  const recipesWithHpp = await getRecipes();
  const recipesMap = new Map(recipesWithHpp.map(r => [r.id, r]));

  const items = (itemsData || []).map(item => ({
    ...item,
    recipe: recipesMap.get(item.recipe_id)
  })) as PackageItem[];

  const totalHpp = items.reduce((sum, item) => {
    const recipeHpp = item.recipe?.totalHpp || 0;
    return sum + (recipeHpp * item.quantity);
  }, 0);

  return {
    ...packData,
    package_items: items,
    totalHpp
  };
};

// ----------------------------------------------------
// OVERHEAD COSTS API
// ----------------------------------------------------
export const getOverheads = async (): Promise<OverheadCost[]> => {
  const { data, error } = await supabase
    .from("overhead_costs")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching overhead costs:", error);
    throw error;
  }
  return data || [];
};

export const createOverhead = async (overhead: Omit<OverheadCost, "id" | "created_at">): Promise<OverheadCost> => {
  const { data, error } = await supabase
    .from("overhead_costs")
    .insert([overhead])
    .select()
    .single();

  if (error) {
    console.error("Error creating overhead cost:", error);
    throw error;
  }
  return data;
};

export const updateOverhead = async (id: string, overhead: Partial<Omit<OverheadCost, "id" | "created_at">>): Promise<OverheadCost> => {
  const { data, error } = await supabase
    .from("overhead_costs")
    .update(overhead)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating overhead cost:", error);
    throw error;
  }
  return data;
};

export const deleteOverhead = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("overhead_costs")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting overhead cost:", error);
    throw error;
  }
};
