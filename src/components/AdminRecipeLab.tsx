import React, { useState, useEffect } from "react";
import {
  Calculator, Plus, Trash2, Edit2, CheckCircle, RefreshCw, X, AlertCircle, TrendingUp, DollarSign, PieChart, Info, HelpCircle
} from "lucide-react";
import { Ingredient, Recipe, RecipeItem, PackageRecipe, PackageItem, OverheadCost } from "../types";
import * as api from "../lib/recipeLabApi";

interface AdminRecipeLabProps {
  showNotif: (message: string, type: "success" | "error" | "info" | "loading", ms?: number) => void;
}

type TabType = "ingredients" | "recipes" | "packages" | "analytics";

export default function AdminRecipeLab({ showNotif }: AdminRecipeLabProps) {
  const [activeTab, setActiveTab] = useState<TabType>("ingredients");
  const [loading, setLoading] = useState(true);

  // Data states
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [packages, setPackages] = useState<PackageRecipe[]>([]);
  const [overheads, setOverheads] = useState<OverheadCost[]>([]);

  // ---------------------------------------------------------------------------
  // Forms States & Modal states
  // ---------------------------------------------------------------------------
  const [isIngModalOpen, setIsIngModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [ingForm, setIngForm] = useState({
    name: "",
    category: "Coffee Beans",
    purchase_quantity: 1000,
    purchase_unit: "gr",
    purchase_price: 150000,
    supplier: ""
  });

  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeForm, setRecipeForm] = useState({
    name: "",
    category: "Coffee",
    description: "",
    selling_price: 25000,
    status: true
  });
  const [recipeItemsForm, setRecipeItemsForm] = useState<{
    ingredient_id: string;
    quantity_used: number;
    unit: string;
  }[]>([]);

  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<PackageRecipe | null>(null);
  const [packForm, setPackForm] = useState({
    package_name: "",
    selling_price: 45000,
    status: true
  });
  const [packItemsForm, setPackItemsForm] = useState<{
    recipe_id: string;
    quantity: number;
  }[]>([]);

  const [isOverheadModalOpen, setIsOverheadModalOpen] = useState(false);
  const [editingOverhead, setEditingOverhead] = useState<OverheadCost | null>(null);
  const [overheadForm, setOverheadForm] = useState({
    name: "",
    monthly_cost: 1000000
  });

  // Fetch all module data
  const loadModuleData = async () => {
    setLoading(true);
    try {
      const [ings, recs, packs, ovs] = await Promise.all([
        api.getIngredients(),
        api.getRecipes(),
        api.getPackages(),
        api.getOverheads()
      ]);
      setIngredients(ings);
      setRecipes(recs);
      setPackages(packs);
      setOverheads(ovs);
    } catch (err) {
      console.error("Gagal menjemput data Recipe Lab:", err);
      showNotif("Gagal sinkronisasi data Recipe Lab", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModuleData();
  }, []);

  // ---------------------------------------------------------------------------
  // INGREDIENTS CRUD ACTIONS
  // ---------------------------------------------------------------------------
  const handleOpenIngModal = (ing: Ingredient | null = null) => {
    if (ing) {
      setEditingIng(ing);
      setIngForm({
        name: ing.name,
        category: ing.category,
        purchase_quantity: ing.purchase_quantity,
        purchase_unit: ing.purchase_unit,
        purchase_price: ing.purchase_price,
        supplier: ing.supplier || ""
      });
    } else {
      setEditingIng(null);
      setIngForm({
        name: "",
        category: "Coffee Beans",
        purchase_quantity: 1000,
        purchase_unit: "gr",
        purchase_price: 150000,
        supplier: ""
      });
    }
    setIsIngModalOpen(true);
  };

  const handleSaveIng = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingForm.name.trim() || ingForm.purchase_quantity <= 0 || ingForm.purchase_price < 0) {
      showNotif("Nama harus diisi dan kuantitas/harga harus valid", "error");
      return;
    }

    try {
      showNotif("Menyimpan bahan baku...", "loading");
      if (editingIng) {
        await api.updateIngredient(editingIng.id, ingForm);
        showNotif("Bahan baku berhasil diperbarui", "success");
      } else {
        await api.createIngredient(ingForm);
        showNotif("Bahan baku berhasil ditambahkan", "success");
      }
      setIsIngModalOpen(false);
      loadModuleData();
    } catch (err) {
      showNotif("Gagal menyimpan bahan baku", "error");
    }
  };

  const handleDeleteIng = async (id: string) => {
    // Check if ingredient is used in any active recipe
    const usedIn = recipes.filter(r => r.recipe_items?.some(ri => ri.ingredient_id === id));
    if (usedIn.length > 0) {
      showNotif(`Tidak dapat menghapus! Bahan ini digunakan pada resep: ${usedIn.map(r => r.name).join(", ")}`, "error", 5000);
      return;
    }

    if (!confirm("Apakah Anda yakin ingin menghapus bahan baku ini?")) return;

    try {
      showNotif("Menghapus bahan baku...", "loading");
      await api.deleteIngredient(id);
      showNotif("Bahan baku berhasil dihapus", "success");
      loadModuleData();
    } catch (err) {
      showNotif("Gagal menghapus bahan baku", "error");
    }
  };

  // ---------------------------------------------------------------------------
  // RECIPE CRUD ACTIONS
  // ---------------------------------------------------------------------------
  const handleOpenRecipeModal = (recipe: Recipe | null = null) => {
    if (recipe) {
      setEditingRecipe(recipe);
      setRecipeForm({
        name: recipe.name,
        category: recipe.category,
        description: recipe.description || "",
        selling_price: recipe.selling_price,
        status: recipe.status
      });
      setRecipeItemsForm(
        (recipe.recipe_items || []).map((item) => ({
          ingredient_id: item.ingredient_id,
          quantity_used: item.quantity_used,
          unit: item.unit
        }))
      );
    } else {
      setEditingRecipe(null);
      setRecipeForm({
        name: "",
        category: "Coffee",
        description: "",
        selling_price: 25000,
        status: true
      });
      setRecipeItemsForm([]);
    }
    setIsRecipeModalOpen(true);
  };

  const handleAddRecipeItem = () => {
    if (ingredients.length === 0) {
      showNotif("Harap buat bahan baku terlebih dahulu", "error");
      return;
    }
    setRecipeItemsForm([
      ...recipeItemsForm,
      { ingredient_id: ingredients[0].id, quantity_used: 10, unit: ingredients[0].purchase_unit }
    ]);
  };

  const handleRemoveRecipeItem = (index: number) => {
    setRecipeItemsForm(recipeItemsForm.filter((_, i) => i !== index));
  };

  const handleRecipeItemChange = (index: number, field: string, value: any) => {
    const updated = [...recipeItemsForm];
    if (field === "ingredient_id") {
      const ing = ingredients.find((i) => i.id === value);
      updated[index] = {
        ...updated[index],
        ingredient_id: value,
        unit: ing ? ing.purchase_unit : updated[index].unit
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
    }
    setRecipeItemsForm(updated);
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeForm.name.trim() || recipeForm.selling_price < 0) {
      showNotif("Nama resep harus diisi dan harga jual harus valid", "error");
      return;
    }

    try {
      showNotif("Menyimpan resep...", "loading");
      if (editingRecipe) {
        await api.updateRecipe(editingRecipe.id, recipeForm, recipeItemsForm);
        showNotif("Resep berhasil diperbarui", "success");
      } else {
        await api.createRecipe(recipeForm, recipeItemsForm);
        showNotif("Resep berhasil dibuat", "success");
      }
      setIsRecipeModalOpen(false);
      loadModuleData();
    } catch (err) {
      showNotif("Gagal menyimpan resep", "error");
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    // Check if recipe is used in any package
    const usedIn = packages.filter(p => p.package_items?.some(pi => pi.recipe_id === id));
    if (usedIn.length > 0) {
      showNotif(`Tidak dapat menghapus! Resep ini digunakan pada paket: ${usedIn.map(p => p.package_name).join(", ")}`, "error", 5000);
      return;
    }

    if (!confirm("Apakah Anda yakin ingin menghapus resep ini?")) return;

    try {
      showNotif("Menghapus resep...", "loading");
      await api.deleteRecipe(id);
      showNotif("Resep berhasil dihapus", "success");
      loadModuleData();
    } catch (err) {
      showNotif("Gagal menghapus resep", "error");
    }
  };

  // Calculate live HPP of the recipe form
  const calculateLiveRecipeHpp = () => {
    return recipeItemsForm.reduce((sum, item) => {
      const ing = ingredients.find((i) => i.id === item.ingredient_id);
      const costPerUnit = ing?.cost_per_unit || 0;
      return sum + (costPerUnit * item.quantity_used);
    }, 0);
  };

  // ---------------------------------------------------------------------------
  // PACKAGE CRUD ACTIONS
  // ---------------------------------------------------------------------------
  const handleOpenPackModal = (pack: PackageRecipe | null = null) => {
    if (pack) {
      setEditingPack(pack);
      setPackForm({
        package_name: pack.package_name,
        selling_price: pack.selling_price,
        status: pack.status
      });
      setPackItemsForm(
        (pack.package_items || []).map((item) => ({
          recipe_id: item.recipe_id,
          quantity: item.quantity
        }))
      );
    } else {
      setEditingPack(null);
      setPackForm({
        package_name: "",
        selling_price: 45000,
        status: true
      });
      setPackItemsForm([]);
    }
    setIsPackModalOpen(true);
  };

  const handleAddPackItem = () => {
    if (recipes.length === 0) {
      showNotif("Harap buat resep terlebih dahulu", "error");
      return;
    }
    setPackItemsForm([
      ...packItemsForm,
      { recipe_id: recipes[0].id, quantity: 1 }
    ]);
  };

  const handleRemovePackItem = (index: number) => {
    setPackItemsForm(packItemsForm.filter((_, i) => i !== index));
  };

  const handlePackItemChange = (index: number, field: string, value: any) => {
    const updated = [...packItemsForm];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setPackItemsForm(updated);
  };

  const handleSavePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packForm.package_name.trim() || packForm.selling_price < 0) {
      showNotif("Nama paket harus diisi dan harga jual harus valid", "error");
      return;
    }

    try {
      showNotif("Menyimpan paket...", "loading");
      if (editingPack) {
        await api.updatePackage(editingPack.id, packForm, packItemsForm);
        showNotif("Paket resep berhasil diperbarui", "success");
      } else {
        await api.createPackage(packForm, packItemsForm);
        showNotif("Paket resep berhasil dibuat", "success");
      }
      setIsPackModalOpen(false);
      loadModuleData();
    } catch (err) {
      showNotif("Gagal menyimpan paket resep", "error");
    }
  };

  const handleDeletePack = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus paket resep ini?")) return;

    try {
      showNotif("Menghapus paket resep...", "loading");
      await api.deletePackage(id);
      showNotif("Paket resep berhasil dihapus", "success");
      loadModuleData();
    } catch (err) {
      showNotif("Gagal menghapus paket resep", "error");
    }
  };

  // Calculate live HPP of the package form
  const calculateLivePackHpp = () => {
    return packItemsForm.reduce((sum, item) => {
      const rec = recipes.find((r) => r.id === item.recipe_id);
      const hpp = rec?.totalHpp || 0;
      return sum + (hpp * item.quantity);
    }, 0);
  };

  // ---------------------------------------------------------------------------
  // OVERHEAD COSTS CRUD ACTIONS
  // ---------------------------------------------------------------------------
  const handleOpenOverheadModal = (oh: OverheadCost | null = null) => {
    if (oh) {
      setEditingOverhead(oh);
      setOverheadForm({
        name: oh.name,
        monthly_cost: oh.monthly_cost
      });
    } else {
      setEditingOverhead(null);
      setOverheadForm({
        name: "",
        monthly_cost: 1000000
      });
    }
    setIsOverheadModalOpen(true);
  };

  const handleSaveOverhead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overheadForm.name.trim() || overheadForm.monthly_cost < 0) {
      showNotif("Nama pengeluaran harus diisi dan nominal harus valid", "error");
      return;
    }

    try {
      showNotif("Menyimpan biaya operasional...", "loading");
      if (editingOverhead) {
        await api.updateOverhead(editingOverhead.id, overheadForm);
        showNotif("Biaya operasional berhasil diperbarui", "success");
      } else {
        await api.createOverhead(overheadForm);
        showNotif("Biaya operasional berhasil ditambahkan", "success");
      }
      setIsOverheadModalOpen(false);
      loadModuleData();
    } catch (err) {
      showNotif("Gagal menyimpan biaya operasional", "error");
    }
  };

  const handleDeleteOverhead = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus biaya operasional ini?")) return;

    try {
      showNotif("Menghapus biaya operasional...", "loading");
      await api.deleteOverhead(id);
      showNotif("Biaya operasional berhasil dihapus", "success");
      loadModuleData();
    } catch (err) {
      showNotif("Gagal menghapus biaya operasional", "error");
    }
  };

  // ---------------------------------------------------------------------------
  // ANALYTICS COMPUTATIONS
  // ---------------------------------------------------------------------------
  const totalOverhead = overheads.reduce((sum, item) => sum + Number(item.monthly_cost), 0);

  // Average Food Cost % across all recipes
  const activeRecipes = recipes.filter(r => r.status && r.selling_price > 0);
  const averageFoodCostPercent = activeRecipes.length > 0
    ? activeRecipes.reduce((sum, r) => sum + ((r.totalHpp || 0) / r.selling_price) * 100, 0) / activeRecipes.length
    : 0;

  // Most Profitable Menu based on gross profit margin %: (price - hpp) / price
  const sortedByMargin = [...activeRecipes].sort((a, b) => {
    const marginA = ((a.selling_price - (a.totalHpp || 0)) / a.selling_price);
    const marginB = ((b.selling_price - (b.totalHpp || 0)) / b.selling_price);
    return marginB - marginA;
  });

  const mostProfitable = sortedByMargin[0] || null;
  const lowestMargin = sortedByMargin[sortedByMargin.length - 1] || null;

  // Average gross profit per item sold (using recipes as proxy)
  const averagePrice = activeRecipes.length > 0
    ? activeRecipes.reduce((sum, r) => sum + Number(r.selling_price), 0) / activeRecipes.length
    : 0;
  const averageHpp = activeRecipes.length > 0
    ? activeRecipes.reduce((sum, r) => sum + (r.totalHpp || 0), 0) / activeRecipes.length
    : 0;
  const averageProfit = averagePrice - averageHpp;
  
  // Break-even point in terms of cups/items sold per month
  const breakEvenCups = averageProfit > 0 ? Math.ceil(totalOverhead / averageProfit) : 0;

  // Formatter helpers
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatHppPerUnit = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header and navigation tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-amber-900/20 pb-5">
        <div>
          <h2 className="text-2xl font-bold font-serif text-amber-100 flex items-center gap-2">
            <Calculator className="w-7 h-7 text-amber-500 animate-pulse" />
            Costing & Recipe Lab
          </h2>
          <p className="text-sm text-amber-200/60 mt-1">
            Ukur HPP, simulasi margin profit, dan analisis kelayakan resep & menu Anda secara realtime.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-amber-950/45 p-1 rounded-xl border border-amber-900/30 self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("ingredients")}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition duration-200 ${
              activeTab === "ingredients"
                ? "bg-amber-600 text-white shadow-md"
                : "text-amber-200/70 hover:text-amber-100 hover:bg-amber-900/20"
            }`}
          >
            Bahan Baku
          </button>
          <button
            onClick={() => setActiveTab("recipes")}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition duration-200 ${
              activeTab === "recipes"
                ? "bg-amber-600 text-white shadow-md"
                : "text-amber-200/70 hover:text-amber-100 hover:bg-amber-900/20"
            }`}
          >
            Pembuat Resep
          </button>
          <button
            onClick={() => setActiveTab("packages")}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition duration-200 ${
              activeTab === "packages"
                ? "bg-amber-600 text-white shadow-md"
                : "text-amber-200/70 hover:text-amber-100 hover:bg-amber-900/20"
            }`}
          >
            Pembuat Paket
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition duration-200 ${
              activeTab === "analytics"
                ? "bg-amber-600 text-white shadow-md"
                : "text-amber-200/70 hover:text-amber-100 hover:bg-amber-900/20"
            }`}
          >
            Analitik HPP
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="text-amber-200/70 text-sm">Menyinkronkan data laboratorium resep...</p>
        </div>
      ) : (
        <div>
          {/* TAB 1: INGREDIENTS MASTER */}
          {activeTab === "ingredients" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-amber-50">Daftar Bahan Baku (Ingredients Master)</h3>
                <button
                  onClick={() => handleOpenIngModal()}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition duration-200"
                >
                  <Plus className="w-4 h-4" /> Tambah Bahan
                </button>
              </div>

              {ingredients.length === 0 ? (
                <div className="bg-amber-950/10 border border-amber-900/20 rounded-2xl p-10 text-center text-amber-200/50">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-600/60" />
                  Belum ada bahan baku. Tambahkan bahan baku untuk menyusun resep HPP.
                </div>
              ) : (
                <div className="bg-amber-950/20 backdrop-blur-md border border-amber-900/30 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-amber-950/50 text-amber-200/80 text-xs font-semibold uppercase tracking-wider">
                        <th className="px-6 py-4">Nama Bahan</th>
                        <th className="px-6 py-4">Kategori</th>
                        <th className="px-6 py-4">Kuantitas Pembelian</th>
                        <th className="px-6 py-4">Harga Beli</th>
                        <th className="px-6 py-4">Biaya Per Unit</th>
                        <th className="px-6 py-4">Supplier</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-900/20 text-sm text-amber-100">
                      {ingredients.map((ing) => (
                        <tr key={ing.id} className="hover:bg-amber-900/10 transition">
                          <td className="px-6 py-4 font-medium text-amber-50">{ing.name}</td>
                          <td className="px-6 py-4">
                            <span className="bg-amber-950/80 border border-amber-900/60 text-amber-300 text-xs px-2 py-0.5 rounded-full">
                              {ing.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">{ing.purchase_quantity} {ing.purchase_unit}</td>
                          <td className="px-6 py-4">{formatIDR(ing.purchase_price)}</td>
                          <td className="px-6 py-4 font-mono text-amber-400">
                            {formatHppPerUnit(ing.cost_per_unit || 0)}/{ing.purchase_unit}
                          </td>
                          <td className="px-6 py-4 text-amber-200/60">{ing.supplier || "-"}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleOpenIngModal(ing)}
                                className="p-2 hover:bg-amber-900/30 text-amber-300 rounded-lg transition"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteIng(ing.id)}
                                className="p-2 hover:bg-rose-900/30 text-rose-300 rounded-lg transition"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RECIPE BUILDER */}
          {activeTab === "recipes" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-amber-50">Daftar Resep & HPP Menu</h3>
                <button
                  onClick={() => handleOpenRecipeModal()}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition duration-200"
                >
                  <Plus className="w-4 h-4" /> Buat Resep Baru
                </button>
              </div>

              {recipes.length === 0 ? (
                <div className="bg-amber-950/10 border border-amber-900/20 rounded-2xl p-10 text-center text-amber-200/50">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-600/60" />
                  Belum ada resep yang terdaftar. Hubungkan bahan baku Anda menjadi menu HPP.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {recipes.map((rec) => {
                    const price = rec.selling_price;
                    const hpp = rec.totalHpp || 0;
                    const profit = price - hpp;
                    const marginPercent = price > 0 ? (profit / price) * 100 : 0;
                    const foodCostPercent = price > 0 ? (hpp / price) * 100 : 0;

                    return (
                      <div
                        key={rec.id}
                        className="bg-amber-950/20 backdrop-blur-md border border-amber-900/30 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-amber-500/30 transition duration-300"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500">
                                {rec.category}
                              </span>
                              <h4 className="text-lg font-semibold text-amber-50">{rec.name}</h4>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenRecipeModal(rec)}
                                className="p-1.5 hover:bg-amber-900/30 text-amber-300 rounded-lg transition"
                                title="Edit Resep"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecipe(rec.id)}
                                className="p-1.5 hover:bg-rose-900/30 text-rose-300 rounded-lg transition"
                                title="Hapus Resep"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-amber-200/50 line-clamp-2">
                            {rec.description || "Tidak ada deskripsi."}
                          </p>

                          {/* Ingredient Badges */}
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {rec.recipe_items?.map((ri) => (
                              <span
                                key={ri.id}
                                className="text-[10px] bg-amber-950/60 border border-amber-900/30 text-amber-200 px-2 py-0.5 rounded"
                              >
                                {ri.ingredient?.name} ({ri.quantity_used} {ri.unit})
                              </span>
                            ))}
                            {(!rec.recipe_items || rec.recipe_items.length === 0) && (
                              <span className="text-[10px] text-rose-300 bg-rose-950/20 px-2 py-0.5 rounded border border-rose-900/30">
                                Tanpa Bahan Baku!
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Cost & Profit calculations */}
                        <div className="border-t border-amber-900/10 pt-4 mt-auto space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] text-amber-200/50 block">Harga Pokok (HPP)</span>
                              <span className="text-base font-bold font-mono text-amber-400">
                                {formatIDR(hpp)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-amber-200/50 block">Harga Jual</span>
                              <span className="text-base font-bold font-mono text-amber-50">
                                {formatIDR(price)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/20 text-center">
                            <div>
                              <span className="text-[9px] text-amber-200/50 block">Profit</span>
                              <span className={`text-xs font-bold ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {formatIDR(profit)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-amber-200/50 block">Margin</span>
                              <span className={`text-xs font-bold ${marginPercent >= 50 ? "text-emerald-400" : marginPercent >= 20 ? "text-amber-400" : "text-rose-400"}`}>
                                {marginPercent.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-amber-200/50 block">Food Cost</span>
                              <span className={`text-xs font-bold ${foodCostPercent <= 35 ? "text-emerald-400" : foodCostPercent <= 60 ? "text-amber-400" : "text-rose-400"}`}>
                                {foodCostPercent.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PACKAGE BUILDER */}
          {activeTab === "packages" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-amber-50">Daftar Paket Bundling HPP</h3>
                <button
                  onClick={() => handleOpenPackModal()}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition duration-200"
                >
                  <Plus className="w-4 h-4" /> Buat Paket Baru
                </button>
              </div>

              {packages.length === 0 ? (
                <div className="bg-amber-950/10 border border-amber-900/20 rounded-2xl p-10 text-center text-amber-200/50">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-600/60" />
                  Belum ada paket bundling yang terdaftar. Gabungkan resep kopi untuk membuat paket promo.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {packages.map((pack) => {
                    const price = pack.selling_price;
                    const hpp = pack.totalHpp || 0;
                    const profit = price - hpp;
                    const marginPercent = price > 0 ? (profit / price) * 100 : 0;
                    const foodCostPercent = price > 0 ? (hpp / price) * 100 : 0;

                    return (
                      <div
                        key={pack.id}
                        className="bg-amber-950/20 backdrop-blur-md border border-amber-900/30 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-amber-500/30 transition duration-300"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500">
                                Bundling Promo
                              </span>
                              <h4 className="text-lg font-semibold text-amber-50">{pack.package_name}</h4>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenPackModal(pack)}
                                className="p-1.5 hover:bg-amber-900/30 text-amber-300 rounded-lg transition"
                                title="Edit Paket"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePack(pack.id)}
                                className="p-1.5 hover:bg-rose-900/30 text-rose-300 rounded-lg transition"
                                title="Hapus Paket"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Package items */}
                          <div className="space-y-1 pt-2">
                            <span className="text-[10px] text-amber-200/50 block font-semibold">Resep Terkandung:</span>
                            {pack.package_items?.map((pi) => (
                              <div
                                key={pi.id}
                                className="flex justify-between text-xs bg-amber-950/40 border border-amber-900/10 px-3 py-1.5 rounded-lg text-amber-200"
                              >
                                <span>{pi.recipe?.name}</span>
                                <span className="font-semibold text-amber-50">x {pi.quantity}</span>
                              </div>
                            ))}
                            {(!pack.package_items || pack.package_items.length === 0) && (
                              <span className="text-[10px] text-rose-300 bg-rose-950/20 px-2 py-0.5 rounded border border-rose-900/30">
                                Kosong! Hubungkan minimal 1 resep.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Financial calculations */}
                        <div className="border-t border-amber-900/10 pt-4 mt-auto space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] text-amber-200/50 block">HPP Paket Kumulatif</span>
                              <span className="text-base font-bold font-mono text-amber-400">
                                {formatIDR(hpp)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-amber-200/50 block">Harga Jual Paket</span>
                              <span className="text-base font-bold font-mono text-amber-50">
                                {formatIDR(price)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/20 text-center">
                            <div>
                              <span className="text-[9px] text-amber-200/50 block">Profit Paket</span>
                              <span className={`text-xs font-bold ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {formatIDR(profit)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-amber-200/50 block">Margin Paket</span>
                              <span className={`text-xs font-bold ${marginPercent >= 55 ? "text-emerald-400" : marginPercent >= 25 ? "text-amber-400" : "text-rose-400"}`}>
                                {marginPercent.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-amber-200/50 block">Food Cost Paket</span>
                              <span className={`text-xs font-bold ${foodCostPercent <= 30 ? "text-emerald-400" : foodCostPercent <= 55 ? "text-amber-400" : "text-rose-400"}`}>
                                {foodCostPercent.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              {/* Analytics widgets */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Average Food Cost Card */}
                <div className="bg-amber-950/20 border border-amber-900/30 rounded-2xl p-5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-amber-200/50">Avg Food Cost %</span>
                    <PieChart className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-amber-50">
                    {averageFoodCostPercent.toFixed(1)}%
                  </div>
                  <p className="text-[10px] text-amber-200/40">
                    Persentase ideal: 25% - 35% untuk menjaga margin profit tetap tebal.
                  </p>
                </div>

                {/* Overhead Costs Card */}
                <div className="bg-amber-950/20 border border-amber-900/30 rounded-2xl p-5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-amber-200/50">Total Biaya Operasional</span>
                    <DollarSign className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-amber-50">
                    {formatIDR(totalOverhead)}
                  </div>
                  <p className="text-[10px] text-amber-200/40">
                    Biaya tetap bulanan (sewa, gaji, listrik, dll).
                  </p>
                </div>

                {/* Most Profitable Menu Card */}
                <div className="bg-amber-950/20 border border-amber-900/30 rounded-2xl p-5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-amber-200/50">Menu Paling Menguntungkan</span>
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-lg font-bold text-amber-50 truncate">
                    {mostProfitable ? mostProfitable.name : "N/A"}
                  </div>
                  <p className="text-xs font-mono text-emerald-400">
                    {mostProfitable ? `${(((mostProfitable.selling_price - (mostProfitable.totalHpp || 0)) / mostProfitable.selling_price) * 100).toFixed(1)}% Margin` : "N/A"}
                  </p>
                </div>

                {/* Break-Even Point Card */}
                <div className="bg-amber-950/20 border border-amber-900/30 rounded-2xl p-5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-amber-200/50">Titik Impas (BEP Bulanan)</span>
                    <Calculator className="w-5 h-5 text-amber-500 animate-pulse" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-amber-50">
                    {breakEvenCups} <span className="text-xs text-amber-200/60 font-sans">Produk/Bulan</span>
                  </div>
                  <p className="text-[10px] text-amber-200/40">
                    Target minimum penjualan agar operasional tidak merugi.
                  </p>
                </div>
              </div>

              {/* Overhead Expenses Management */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Fixed Costs Management List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-amber-50">Daftar Biaya Operasional Tetap (Fixed Costs)</h4>
                    <button
                      onClick={() => handleOpenOverheadModal()}
                      className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition duration-200"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Biaya
                    </button>
                  </div>

                  {overheads.length === 0 ? (
                    <div className="bg-amber-950/10 border border-amber-900/20 rounded-2xl p-8 text-center text-amber-200/50">
                      Belum ada biaya operasional terdaftar.
                    </div>
                  ) : (
                    <div className="bg-amber-950/20 border border-amber-900/30 rounded-2xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-amber-950/50 text-amber-200/80 text-xs font-semibold uppercase">
                            <th className="px-6 py-3">Deskripsi Biaya</th>
                            <th className="px-6 py-3">Biaya Bulanan</th>
                            <th className="px-6 py-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-900/20 text-sm text-amber-100">
                          {overheads.map((oh) => (
                            <tr key={oh.id} className="hover:bg-amber-900/10 transition">
                              <td className="px-6 py-3.5 font-medium">{oh.name}</td>
                              <td className="px-6 py-3.5 font-mono text-rose-400">{formatIDR(oh.monthly_cost)}</td>
                              <td className="px-6 py-3.5 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenOverheadModal(oh)}
                                    className="p-1 hover:bg-amber-900/30 text-amber-300 rounded"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOverhead(oh.id)}
                                    className="p-1 hover:bg-rose-900/30 text-rose-300 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Simulating Profitability */}
                <div className="bg-amber-950/20 border border-amber-900/30 rounded-2xl p-5 space-y-4">
                  <h4 className="text-md font-semibold text-amber-50 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-500" />
                    Kalkulator Titik Impas (BEP)
                  </h4>
                  <p className="text-xs text-amber-200/60 leading-relaxed">
                    Kalkulasi didasarkan pada biaya tetap bulanan sebesar <strong>{formatIDR(totalOverhead)}</strong>, rata-rata harga jual per unit <strong>{formatIDR(averagePrice)}</strong>, dan rata-rata biaya HPP sebesar <strong>{formatIDR(averageHpp)}</strong>.
                  </p>

                  <div className="bg-amber-950/50 border border-amber-900/20 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-200/50">Total Biaya Operasional:</span>
                      <span className="font-mono font-bold text-rose-400">{formatIDR(totalOverhead)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-200/50">Rata-rata Margin Margin ($):</span>
                      <span className="font-mono font-bold text-emerald-400">{formatIDR(averageProfit)}</span>
                    </div>
                    <div className="border-t border-amber-900/20 pt-2.5 flex justify-between items-center text-sm font-semibold">
                      <span>Titik BEP Kopi:</span>
                      <span className="text-amber-100 font-mono">{breakEvenCups} cups / bulan</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-amber-200/40 flex gap-1.5 items-start">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                    <span>
                      Semakin tipis biaya HPP bahan baku, semakin rendah kuantitas produk yang harus dijual untuk mencapai titik impas setiap bulannya.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -----------------------------------------------------------------------
          INGREDIENT MODAL
      ----------------------------------------------------------------------- */}
      {isIngModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1c0f0a] border border-amber-900/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/20 bg-amber-950/20">
              <h4 className="text-lg font-serif font-semibold text-amber-50">
                {editingIng ? "Edit Bahan Baku" : "Tambah Bahan Baku"}
              </h4>
              <button
                onClick={() => setIsIngModalOpen(false)}
                className="text-amber-200/60 hover:text-amber-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIng} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-amber-200/60 block mb-1">Nama Bahan Baku</label>
                <input
                  type="text"
                  required
                  value={ingForm.name}
                  onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })}
                  placeholder="Contoh: Kopi Arabica Toraja"
                  className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-amber-200/60 block mb-1">Kategori</label>
                  <select
                    value={ingForm.category}
                    onChange={(e) => setIngForm({ ...ingForm, category: e.target.value })}
                    className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Coffee Beans">Coffee Beans</option>
                    <option value="Milk">Milk</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Sugar">Sugar</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Bread">Bread</option>
                    <option value="Food">Food</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-amber-200/60 block mb-1">Supplier</label>
                  <input
                    type="text"
                    value={ingForm.supplier}
                    onChange={(e) => setIngForm({ ...ingForm, supplier: e.target.value })}
                    placeholder="Contoh: CV. Kopi Makmur"
                    className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-amber-200/60 block mb-1">Kuantitas Pembelian</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={ingForm.purchase_quantity}
                    onChange={(e) => setIngForm({ ...ingForm, purchase_quantity: Number(e.target.value) })}
                    className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-amber-200/60 block mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    placeholder="gr / ml / pcs"
                    value={ingForm.purchase_unit}
                    onChange={(e) => setIngForm({ ...ingForm, purchase_unit: e.target.value })}
                    className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-amber-200/60 block mb-1">Harga Pembelian (IDR)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={ingForm.purchase_price}
                  onChange={(e) => setIngForm({ ...ingForm, purchase_price: Number(e.target.value) })}
                  className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              {/* Show live calculated Cost Per Unit */}
              <div className="bg-amber-950/30 border border-amber-900/20 p-3 rounded-xl">
                <span className="text-[10px] text-amber-200/50 block uppercase font-bold tracking-wider">
                  Kalkulasi Biaya Satuan:
                </span>
                <span className="text-sm font-semibold font-mono text-amber-300">
                  {formatHppPerUnit(ingForm.purchase_price / (ingForm.purchase_quantity || 1))} / {ingForm.purchase_unit || "unit"}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsIngModalOpen(false)}
                  className="bg-transparent hover:bg-amber-950/30 border border-amber-900/30 text-amber-200 rounded-xl px-4 py-2 text-sm font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          RECIPE BUILDER MODAL
      ----------------------------------------------------------------------- */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#1c0f0a] border border-amber-900/40 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/20 bg-amber-950/20">
              <h4 className="text-lg font-serif font-semibold text-amber-50">
                {editingRecipe ? "Edit Resep Menu" : "Buat Resep Menu Baru"}
              </h4>
              <button
                onClick={() => setIsRecipeModalOpen(false)}
                className="text-amber-200/60 hover:text-amber-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipe} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-amber-200/60 block mb-1">Nama Menu Resep</label>
                  <input
                    type="text"
                    required
                    value={recipeForm.name}
                    onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })}
                    placeholder="Contoh: Es Kopi Susu Aren"
                    className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-amber-200/60 block mb-1">Kategori Menu</label>
                  <select
                    value={recipeForm.category}
                    onChange={(e) => setRecipeForm({ ...recipeForm, category: e.target.value })}
                    className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Coffee">Coffee</option>
                    <option value="Non-Coffee">Non-Coffee</option>
                    <option value="Food & Bread">Food & Bread</option>
                    <option value="Mocktail & Soda">Mocktail & Soda</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-amber-200/60 block mb-1">Deskripsi / Cara Pembuatan Singkat</label>
                <textarea
                  value={recipeForm.description}
                  onChange={(e) => setRecipeForm({ ...recipeForm, description: e.target.value })}
                  placeholder="Tuliskan racikan resep..."
                  rows={2}
                  className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-amber-200/60 block mb-1">Harga Jual (IDR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={recipeForm.selling_price}
                    onChange={(e) => setRecipeForm({ ...recipeForm, selling_price: Number(e.target.value) })}
                    className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-amber-200/60 block mb-1">Status Resep</label>
                  <select
                    value={recipeForm.status ? "true" : "false"}
                    onChange={(e) => setRecipeForm({ ...recipeForm, status: e.target.value === "true" })}
                    className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="true">Aktif (Dijual)</option>
                    <option value="false">Tidak Aktif (Arsip)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Recipe Items */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="text-sm font-semibold text-amber-200">Bahan yang digunakan dalam resep:</h5>
                  <button
                    type="button"
                    onClick={handleAddRecipeItem}
                    className="flex items-center gap-1 text-xs bg-amber-900/30 hover:bg-amber-900/50 border border-amber-900/40 text-amber-200 px-3 py-1.5 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Bahan
                  </button>
                </div>

                {recipeItemsForm.length === 0 ? (
                  <div className="border border-dashed border-amber-900/30 rounded-xl p-6 text-center text-amber-200/40 text-xs">
                    Belum ada bahan terpilih. Klik 'Tambah Bahan' di atas untuk menyusun racikan.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recipeItemsForm.map((item, index) => {
                      const selectedIng = ingredients.find((i) => i.id === item.ingredient_id);
                      const costPerGram = selectedIng?.cost_per_unit || 0;
                      const subtotalCost = costPerGram * item.quantity_used;

                      return (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-amber-950/20 border border-amber-900/20 p-3 rounded-xl"
                        >
                          <div className="flex-1">
                            <select
                              value={item.ingredient_id}
                              onChange={(e) => handleRecipeItemChange(index, "ingredient_id", e.target.value)}
                              className="w-full bg-amber-950/40 border border-amber-900/50 rounded-lg px-2.5 py-1.5 text-xs text-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              {ingredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>
                                  {ing.name} ({formatHppPerUnit(ing.cost_per_unit || 0)}/{ing.purchase_unit})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-24 shrink-0">
                            <input
                              type="number"
                              required
                              min="0.01"
                              step="any"
                              value={item.quantity_used}
                              onChange={(e) => handleRecipeItemChange(index, "quantity_used", Number(e.target.value))}
                              placeholder="Kuantitas"
                              className="w-full bg-amber-950/40 border border-amber-900/50 rounded-lg px-2.5 py-1.5 text-xs text-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-500 text-center font-mono"
                            />
                          </div>

                          <span className="text-xs text-amber-200/50 shrink-0 self-center">
                            {item.unit}
                          </span>

                          <div className="w-28 shrink-0 text-right font-mono text-xs text-amber-400 self-center">
                            {formatIDR(subtotalCost)}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveRecipeItem(index)}
                            className="p-1.5 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/20 text-rose-300 rounded transition self-end sm:self-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* LIVE REPORT SECTION */}
              {recipeItemsForm.length > 0 && (
                <div className="bg-amber-950/45 p-4 rounded-xl border border-amber-900/35 space-y-3">
                  <div className="flex justify-between items-center border-b border-amber-900/20 pb-2">
                    <span className="text-xs text-amber-200/60 uppercase font-bold tracking-wider">
                      Simulasi HPP & Profitabilitas Resep:
                    </span>
                    <span className="text-xs font-semibold text-amber-400 font-mono">
                      Live Calculator
                    </span>
                  </div>

                  {(() => {
                    const totalHpp = calculateLiveRecipeHpp();
                    const price = recipeForm.selling_price;
                    const profit = price - totalHpp;
                    const margin = price > 0 ? (profit / price) * 100 : 0;
                    const foodCost = price > 0 ? (totalHpp / price) * 100 : 0;

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <span className="text-[10px] text-amber-200/40 block">HPP Kumulatif</span>
                          <span className="text-sm font-bold text-amber-300 font-mono">{formatIDR(totalHpp)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-200/40 block">Gross Profit</span>
                          <span className={`text-sm font-bold font-mono ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {formatIDR(profit)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-200/40 block">Gross Margin %</span>
                          <span className={`text-sm font-bold font-mono ${margin >= 45 ? "text-emerald-400" : margin >= 20 ? "text-amber-400" : "text-rose-400"}`}>
                            {margin.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-200/40 block">Food Cost %</span>
                          <span className={`text-sm font-bold font-mono ${foodCost <= 35 ? "text-emerald-400" : foodCost <= 55 ? "text-amber-400" : "text-rose-400"}`}>
                            {foodCost.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-amber-900/10">
                <button
                  type="button"
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="bg-transparent hover:bg-amber-950/30 border border-amber-900/30 text-amber-200 rounded-xl px-5 py-2.5 text-sm font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition"
                >
                  Simpan Resep
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          PACKAGE RECIPE MODAL
      ----------------------------------------------------------------------- */}
      {isPackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#1c0f0a] border border-amber-900/40 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/20 bg-amber-950/20">
              <h4 className="text-lg font-serif font-semibold text-amber-50">
                {editingPack ? "Edit Paket Bundling" : "Buat Paket Bundling Baru"}
              </h4>
              <button
                onClick={() => setIsPackModalOpen(false)}
                className="text-amber-200/60 hover:text-amber-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePack} className="p-6 space-y-5">
              <div>
                <label className="text-xs text-amber-200/60 block mb-1">Nama Paket Bundling</label>
                <input
                  type="text"
                  required
                  value={packForm.package_name}
                  onChange={(e) => setPackForm({ ...packForm, package_name: e.target.value })}
                  placeholder="Contoh: Paket Double Espresso + Bread"
                  className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-amber-200/60 block mb-1">Harga Jual Paket (IDR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={packForm.selling_price}
                    onChange={(e) => setPackForm({ ...packForm, selling_price: Number(e.target.value) })}
                    className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-amber-200/60 block mb-1">Status Penjualan</label>
                  <select
                    value={packForm.status ? "true" : "false"}
                    onChange={(e) => setPackForm({ ...packForm, status: e.target.value === "true" })}
                    className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="true">Aktif (Dijual)</option>
                    <option value="false">Tidak Aktif (Arsip)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Package Recipes */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="text-sm font-semibold text-amber-200">Resep Menu Terkandung:</h5>
                  <button
                    type="button"
                    onClick={handleAddPackItem}
                    className="flex items-center gap-1 text-xs bg-amber-900/30 hover:bg-amber-900/50 border border-amber-900/40 text-amber-200 px-3 py-1.5 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Menu
                  </button>
                </div>

                {packItemsForm.length === 0 ? (
                  <div className="border border-dashed border-amber-900/30 rounded-xl p-5 text-center text-amber-200/40 text-xs">
                    Belum ada menu resep terpilih. Klik 'Tambah Menu' untuk menghubungkan.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                    {packItemsForm.map((item, index) => {
                      const selectedRec = recipes.find((r) => r.id === item.recipe_id);
                      const recHpp = selectedRec?.totalHpp || 0;
                      const subtotalCost = recHpp * item.quantity;

                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 bg-amber-950/20 border border-amber-900/20 p-2.5 rounded-xl"
                        >
                          <div className="flex-1">
                            <select
                              value={item.recipe_id}
                              onChange={(e) => handlePackItemChange(index, "recipe_id", e.target.value)}
                              className="w-full bg-amber-950/40 border border-amber-900/50 rounded-lg px-2.5 py-1.5 text-xs text-amber-100 focus:outline-none"
                            >
                              {recipes.map((rec) => (
                                <option key={rec.id} value={rec.id}>
                                  {rec.name} (HPP: {formatIDR(rec.totalHpp || 0)})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-20 shrink-0">
                            <input
                              type="number"
                              required
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handlePackItemChange(index, "quantity", Number(e.target.value))}
                              placeholder="Qty"
                              className="w-full bg-amber-950/40 border border-amber-900/50 rounded-lg px-2.5 py-1.5 text-xs text-amber-100 text-center font-mono focus:outline-none"
                            />
                          </div>

                          <div className="w-24 shrink-0 text-right font-mono text-xs text-amber-400">
                            {formatIDR(subtotalCost)}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemovePackItem(index)}
                            className="p-1 hover:bg-rose-950/40 text-rose-300 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* LIVE REPORT SECTION */}
              {packItemsForm.length > 0 && (
                <div className="bg-amber-950/45 p-4 rounded-xl border border-amber-900/35 space-y-2">
                  <div className="flex justify-between items-center border-b border-amber-900/20 pb-2">
                    <span className="text-xs text-amber-200/60 uppercase font-bold tracking-wider">
                      Simulasi Margin Paket:
                    </span>
                    <span className="text-xs font-semibold text-amber-400 font-mono">
                      Live Calculator
                    </span>
                  </div>

                  {(() => {
                    const totalHpp = calculateLivePackHpp();
                    const price = packForm.selling_price;
                    const profit = price - totalHpp;
                    const margin = price > 0 ? (profit / price) * 100 : 0;
                    const foodCost = price > 0 ? (totalHpp / price) * 100 : 0;

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <span className="text-[10px] text-amber-200/40 block">HPP Paket</span>
                          <span className="text-sm font-bold text-amber-300 font-mono">{formatIDR(totalHpp)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-200/40 block">Profit Paket</span>
                          <span className={`text-sm font-bold font-mono ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {formatIDR(profit)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-200/40 block">Margin Paket %</span>
                          <span className={`text-sm font-bold font-mono ${margin >= 45 ? "text-emerald-400" : margin >= 20 ? "text-amber-400" : "text-rose-400"}`}>
                            {margin.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-200/40 block">Food Cost Paket %</span>
                          <span className={`text-sm font-bold font-mono ${foodCost <= 35 ? "text-emerald-400" : foodCost <= 55 ? "text-amber-400" : "text-rose-400"}`}>
                            {foodCost.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-amber-900/10">
                <button
                  type="button"
                  onClick={() => setIsPackModalOpen(false)}
                  className="bg-transparent hover:bg-amber-950/30 border border-amber-900/30 text-amber-200 rounded-xl px-5 py-2.5 text-sm font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition"
                >
                  Simpan Paket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          OVERHEAD MODAL
      ----------------------------------------------------------------------- */}
      {isOverheadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1c0f0a] border border-amber-900/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/20 bg-amber-950/20">
              <h4 className="text-lg font-serif font-semibold text-amber-50">
                {editingOverhead ? "Edit Pengeluaran Tetap" : "Tambah Pengeluaran Tetap"}
              </h4>
              <button
                onClick={() => setIsOverheadModalOpen(false)}
                className="text-amber-200/60 hover:text-amber-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOverhead} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-amber-200/60 block mb-1">Nama / Jenis Biaya Tetap</label>
                <input
                  type="text"
                  required
                  value={overheadForm.name}
                  onChange={(e) => setOverheadForm({ ...overheadForm, name: e.target.value })}
                  placeholder="Contoh: Sewa Ruko / Gaji Karyawan"
                  className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-amber-200/60 block mb-1">Nominal Biaya Bulanan (IDR)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={overheadForm.monthly_cost}
                  onChange={(e) => setOverheadForm({ ...overheadForm, monthly_cost: Number(e.target.value) })}
                  className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl px-4 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOverheadModalOpen(false)}
                  className="bg-transparent hover:bg-amber-950/30 border border-amber-900/30 text-amber-200 rounded-xl px-4 py-2 text-sm font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition"
                >
                  Simpan Biaya
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
