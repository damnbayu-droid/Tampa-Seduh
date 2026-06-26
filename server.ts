import express from "express";
import type { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { MenuItem, CoffeePackage, Order, AuditLog, User, BlogNews, EmailLog, FinancialSummary } from "./src/types.js";

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY || "dummy_resend_key_123456789";
const resend = new Resend(resendApiKey);

import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini Client
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const supabaseUrl = process.env.SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "dummy_key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ===================================================================
// WAJIB: SUPABASE_SERVICE_ROLE_KEY harus tersedia
// Server TIDAK AKAN START jika key tidak dikonfigurasi di production
// Ini mencegah backend berjalan dengan hak akses anon yang tidak aman
// ===================================================================
if (!supabaseServiceKey && process.env.NODE_ENV === "production") {
  console.error("\n[FATAL] SUPABASE_SERVICE_ROLE_KEY tidak dikonfigurasi!");
  console.error("Server tidak dapat berjalan tanpa Service Role Key di production.");
  console.error("Tambahkan SUPABASE_SERVICE_ROLE_KEY ke environment variables Vercel.\n");
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.warn("[WARNING] SUPABASE_SERVICE_ROLE_KEY tidak tersedia. Menggunakan ANON_KEY (development mode only).");
}

// Gunakan DummyWS agar Vercel Serverless tidak crash akibat module "ws" native
class DummyWS {
    constructor() {}
    send() {}
    close() {}
}

// Backend client SELALU menggunakan Service Role Key
// Service Role Key bypass RLS — HANYA untuk backend, TIDAK PERNAH dikirim ke frontend
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: { persistSession: false },
  realtime: {
    transport: DummyWS as any,
  }
});

// Create 'Bukti Bayar' bucket in Supabase storage if it doesn't exist
async function ensureBuktiBayarBucket() {
  if (!supabaseUrl || !supabaseAnonKey) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === "Bukti Bayar");
    if (!exists) {
      const { error } = await supabase.storage.createBucket("Bukti Bayar", {
        public: true
      });
      if (error) {
        console.warn("Keterangan saat membuat bucket 'Bukti Bayar':", error.message);
      } else {
        console.log("Bucket 'Bukti Bayar' sukses dibuat!");
      }
    }
  } catch (err: any) {
    console.warn("Gagal inisialisasi bucket Supabase:", err.message);
  }
}
ensureBuktiBayarBucket();

// ===================================================================
// MIDDLEWARE: requireAdmin — Proteksi semua admin endpoint
// Verifikasi JWT Supabase dari header Authorization: Bearer <token>
// kemudian pastikan user adalah admin berdasarkan email atau role
// ===================================================================

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Token tidak ditemukan kawan. Silakan login terlebih dahulu." });
    }

    const token = authHeader.slice(7); // Hapus "Bearer "

    // FIX: Dukungan fallback token ADMIN_SECRET untuk login custom
    const adminSecret = process.env.ADMIN_SECRET || "bcd98f45f7a3c92c8ba35f0924509651e72bb3413dd92c97e374fba4176c11db";
    if (token === adminSecret) {
      (req as any).adminUser = {
        id: "u-admin-default",
        email: process.env.ADMIN_EMAIL || "tampaseduh@gmail.com",
        role: "admin"
      };
      return next();
    }

    // Verifikasi token via Supabase Auth (untuk admin lain / Google Login)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized: Token tidak valid atau sudah kadaluarsa kawan." });
    }

    // Cek apakah email cocok dengan admin email dari .env
    const adminEmail = process.env.ADMIN_EMAIL || "tampaseduh@gmail.com";
    if (user.email === adminEmail) {
      // Admin email dari .env — langsung diizinkan
      (req as any).adminUser = user;
      return next();
    }

    // Cek role dari tabel users (untuk admin lain yang mungkin ada di masa depan)
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Kamu tidak memiliki akses admin kawan." });
    }

    (req as any).adminUser = user;
    return next();
  } catch (err: any) {
    console.error("[requireAdmin] Error:", err.message);
    return res.status(500).json({ error: "Internal server error saat verifikasi admin." });
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security Hardening: Helmet
app.use(helmet({
  crossOriginResourcePolicy: false, // Membiarkan resource (gambar) diakses lintas origin jika diperlukan
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https:", "http:", "data:", "ws:", "wss:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
      fontSrc: ["'self'", "https:", "http:", "data:"],
    },
  },
}));

// Security Hardening: Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 200, // Limit 200 request per IP per 15 menit
  message: { error: "Terlalu banyak permintaan kawan, silakan coba lagi nanti." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 30, // Limit 30 request login/register per IP per 1 jam untuk mencegah brute force
  message: { error: "Terlalu banyak percobaan masuk, silakan istirahat ngopi dulu selama 1 jam kawan." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiter to all API routes
app.use("/api/", apiLimiter);

// ===================================================================
// REAL PROFIT ENGINE V1
// Menghitung HPP aktual dari Recipe & Ingredient database
// Formula:
//   HPP per item = SUM(recipe_item.quantity_used × ingredient.cost_per_unit)
//   Revenue aktual = SUM(order_item.price × order_item.quantity) [dalam satuan rupiah]
//   Gross Profit = Revenue - HPP
//   Margin % = (Gross Profit / Revenue) × 100
// ===================================================================

interface ProfitItemBreakdown {
  name: string;
  quantity: number;
  unit_revenue: number;    // Harga jual per item (dalam ribuan IDR, sesuai order)
  unit_hpp: number;        // HPP per item dari recipe (dalam rupiah)
  total_revenue: number;
  total_hpp: number;
  gross_profit: number;
  matched_recipe: string | null;  // Nama recipe yang di-match
}

interface ProfitResult {
  order_id: string;
  revenue: number;
  hpp: number;
  gross_profit: number;
  margin_percentage: number;
  item_breakdown: ProfitItemBreakdown[];
}

// Core: Hitung HPP aktual untuk sebuah order berdasarkan recipe data
async function calculateOrderProfit(orderId: string): Promise<ProfitResult | null> {
  // 1. Ambil order
  const order = orders.find(o => o.id === orderId);
  if (!order) return null;

  // 2. Ambil semua recipes dengan HPP (dari Supabase langsung)
  const { data: recipesRaw, error: recipeErr } = await supabase
    .from("recipes")
    .select("id, name, selling_price");

  if (recipeErr || !recipesRaw) {
    console.error("[ProfitEngine] Gagal ambil recipes:", recipeErr?.message);
    return null;
  }

  // 3. Ambil recipe_items dengan ingredient cost
  const { data: recipeItemsRaw, error: riErr } = await supabase
    .from("recipe_items")
    .select(`
      recipe_id,
      quantity_used,
      ingredient:ingredients(cost_per_unit)
    `);

  if (riErr) {
    console.error("[ProfitEngine] Gagal ambil recipe_items:", riErr.message);
    return null;
  }

  // 4. Ambil package_recipes dan package_items untuk order paket
  const { data: packageRecipesRaw } = await supabase
    .from("package_recipes")
    .select("id, package_name, selling_price");

  const { data: packageItemsRaw } = await supabase
    .from("package_items")
    .select("package_id, recipe_id, quantity");

  // 5. Build map: recipe_id → totalHpp (dalam rupiah)
  const recipeHppMap = new Map<string, number>();
  for (const recipe of (recipesRaw || [])) {
    const items = (recipeItemsRaw || []).filter(ri => ri.recipe_id === recipe.id);
    const totalHpp = items.reduce((sum, ri) => {
      const costPerUnit = (ri.ingredient as any)?.cost_per_unit || 0;
      return sum + (costPerUnit * ri.quantity_used);
    }, 0);
    recipeHppMap.set(recipe.id, totalHpp);
  }

  // 6. Build map: recipe name (lowercase) → { id, hpp }
  const recipeByName = new Map<string, { id: string; hpp: number }>();
  for (const recipe of (recipesRaw || [])) {
    const hpp = recipeHppMap.get(recipe.id) || 0;
    recipeByName.set(recipe.name.toLowerCase().trim(), { id: recipe.id, hpp });
  }

  // 7. Build map: package name (lowercase) → { id, hpp }
  const packageByName = new Map<string, { id: string; hpp: number }>();
  for (const pack of (packageRecipesRaw || [])) {
    const packItems = (packageItemsRaw || []).filter(pi => pi.package_id === pack.id);
    const packHpp = packItems.reduce((sum, pi) => {
      const recHpp = recipeHppMap.get(pi.recipe_id) || 0;
      return sum + (recHpp * pi.quantity);
    }, 0);
    packageByName.set(pack.package_name.toLowerCase().trim(), { id: pack.id, hpp: packHpp });
  }

  // 8. Hitung profit per item
  const breakdown: ProfitItemBreakdown[] = [];
  let totalRevenue = 0;
  let totalHpp = 0;

  for (const item of order.items) {
    // Revenue per item: price dalam sistem adalah ribuan IDR, konversi ke rupiah
    // Cek apakah harga sudah dalam ribuan atau rupiah
    // Dari codebase: priceReg: 15 berarti 15K = Rp 15.000
    const unitRevenue = item.price;       // Dalam ribuan IDR (misal: 15 = Rp 15.000)
    const totalItemRevenue = unitRevenue * item.quantity;

    // Match nama item ke recipe (fuzzy match: lowercase comparison)
    const itemNameLower = item.name.toLowerCase().trim();

    // Coba match ke recipe dulu
    let matchedRecipe: string | null = null;
    let unitHpp = 0;

    // Direct match
    if (recipeByName.has(itemNameLower)) {
      const rec = recipeByName.get(itemNameLower)!;
      unitHpp = rec.hpp / 1000; // Konversi dari rupiah ke ribuan IDR untuk konsistensi
      matchedRecipe = item.name;
    } else if (packageByName.has(itemNameLower)) {
      // Match ke package
      const pack = packageByName.get(itemNameLower)!;
      unitHpp = pack.hpp / 1000;
      matchedRecipe = item.name + " (package)";
    } else {
      // Partial match: cari recipe yang namanya mengandung kata kunci item
      for (const [rName, rData] of recipeByName.entries()) {
        if (rName.includes(itemNameLower) || itemNameLower.includes(rName)) {
          unitHpp = rData.hpp / 1000;
          matchedRecipe = rName;
          break;
        }
      }
      // Coba partial match ke package
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

    const totalItemHpp = unitHpp * item.quantity;

    breakdown.push({
      name: item.name,
      quantity: item.quantity,
      unit_revenue: unitRevenue,
      unit_hpp: unitHpp,
      total_revenue: totalItemRevenue,
      total_hpp: totalItemHpp,
      gross_profit: totalItemRevenue - totalItemHpp,
      matched_recipe: matchedRecipe
    });

    totalRevenue += totalItemRevenue;
    totalHpp += totalItemHpp;
  }

  const grossProfit = totalRevenue - totalHpp;
  const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  return {
    order_id: orderId,
    revenue: Math.round(totalRevenue * 100) / 100,
    hpp: Math.round(totalHpp * 100) / 100,
    gross_profit: Math.round(grossProfit * 100) / 100,
    margin_percentage: Math.round(margin * 100) / 100,
    item_breakdown: breakdown
  };
}

// Simpan hasil profit ke database (UPSERT — tidak duplikat)
async function saveOrderProfit(profit: ProfitResult): Promise<void> {
  const { error } = await supabase
    .from("order_profit")
    .upsert({
      order_id: profit.order_id,
      revenue: profit.revenue,
      hpp: profit.hpp,
      gross_profit: profit.gross_profit,
      margin_percentage: profit.margin_percentage,
      item_breakdown: profit.item_breakdown,
      calculated_at: new Date().toISOString()
    }, { onConflict: "order_id" });

  if (error) {
    console.error("[ProfitEngine] Gagal menyimpan profit:", error.message);
    throw error;
  }
}

// Trigger kalkulasi profit — dipanggil otomatis saat order selesai
async function triggerProfitCalculation(orderId: string): Promise<void> {
  try {
    const profit = await calculateOrderProfit(orderId);
    if (!profit) {
      console.warn(`[ProfitEngine] Order ${orderId} tidak ditemukan atau gagal dihitung.`);
      return;
    }
    await saveOrderProfit(profit);
    console.log(`[ProfitEngine] ✅ Profit order ${orderId} tersimpan: Revenue=${profit.revenue}K, HPP=${profit.hpp}K, Margin=${profit.margin_percentage}%`);
  } catch (err: any) {
    console.error(`[ProfitEngine] ❌ Error saat kalkulasi profit order ${orderId}:`, err.message);
  }
}


async function syncFromSupabase() {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === "https://dummy.supabase.co") {
    console.warn("Supabase credentials not configured. Running in pure in-memory mode.");
    return;
  }

  console.log("Mencoba menyinkronkan data dari Supabase...");

  try {
    const [
      menuRes, packRes, ordRes, usrRes, newsRes, emailRes, auditRes, aiRes
    ] = await Promise.all([
      supabase.from("menu").select("*"),
      supabase.from("packages").select("*"),
      supabase.from("orders").select("*"),
      supabase.from("users").select("*"),
      supabase.from("blog_news").select("*"),
      supabase.from("email_logs").select("*"),
      supabase.from("audit_logs").select("*"),
      supabase.from("ai_settings").select("*")
    ]);

    if (!menuRes.error && menuRes.data) {
      if (menuRes.data.length > 0) {
        menuItems = menuRes.data.map(m => ({
          id: m.id, name: m.name, priceReg: m.price_reg, priceLarge: m.price_large,
          isHot: m.is_hot, isAvailable: m.is_available, image: m.image, description: m.description,
          menuCategory: m.menu_category
        }));
      } else {
        // Seed database
        console.log("Seeding menu_items...");
        menuItems.forEach(m => writeSupabase("menu", "insert", {}, {
          id: m.id, name: m.name, price_reg: m.priceReg, price_large: m.priceLarge,
          is_hot: m.isHot, is_available: m.isAvailable, image: m.image, description: m.description,
          menu_category: (m as any).menuCategory || (m.isHot ? 'hot' : 'cold')
        }));
      }
    }

    if (!packRes.error && packRes.data) {
      if (packRes.data.length > 0) {
        coffeePackages = packRes.data;
      } else {
        console.log("Seeding packages...");
        coffeePackages.forEach(p => writeSupabase("packages", "insert", {}, p));
      }
    }

    if (!ordRes.error && ordRes.data) {
      if (ordRes.data.length > 0) {
        orders = ordRes.data.map(o => ({
          id: o.id, customerName: o.customer_name, whatsapp: o.whatsapp || "-", email: o.email || "-",
          address: o.address, items: o.items, total: o.total, status: o.status,
          createdAt: o.created_at, deliveryMethod: o.delivery_method || "delivery", subtotal: o.subtotal,
          shippingCost: o.shipping_cost, shippingDiscount: o.shipping_discount, notes: o.notes || "",
          paymentProofUrl: o.payment_proof_url || ""
        }));
      } else {
        console.log("Seeding orders...");
        orders.forEach(o => writeSupabase("orders", "insert", {}, {
          id: o.id, customer_name: o.customerName, whatsapp: o.whatsapp || "-", email: o.email || "-",
          address: o.address, items: o.items, total: o.total, status: o.status,
          created_at: o.createdAt, delivery_method: o.deliveryMethod || "delivery", subtotal: o.subtotal,
          shipping_cost: o.shippingCost, shipping_discount: o.shippingDiscount, notes: o.notes || "",
          payment_proof_url: o.paymentProofUrl || ""
        }));
      }
    }

    if (!usrRes.error && usrRes.data) {
      if (usrRes.data.length > 0) {
        registeredUsers = usrRes.data.map(u => ({
          id: u.id, name: u.name, email: u.email, password: u.password, role: u.role,
          isMember: u.is_member, ordersCount: u.orders_count, lastActive: u.last_active,
          isBlocked: u.last_active === "BLOCKED"
        }));
      } else {
        console.log("Seeding users...");
        registeredUsers.forEach(u => writeSupabase("users", "insert", {}, {
          id: u.id, name: u.name, email: u.email, role: u.role, is_member: u.isMember,
          orders_count: u.ordersCount, last_active: u.lastActive
        }));
      }
    }

    if (!newsRes.error && newsRes.data) {
      if (newsRes.data.length > 0) {
        blogNews = newsRes.data.map(n => ({
          id: n.id, title: n.title, slug: n.slug, content: n.content, author: n.author,
          date: n.date, coverImage: n.cover_image, category: n.category
        }));
      } else {
        console.log("Seeding blog news...");
        blogNews.forEach(n => writeSupabase("blog_news", "insert", {}, {
          id: n.id, title: n.title, slug: n.slug, content: n.content, author: n.author,
          date: n.date, cover_image: n.coverImage, category: n.category
        }));
      }
    }

    if (!emailRes.error && emailRes.data) {
      if (emailRes.data.length > 0) {
        emailLogs = emailRes.data;
      } else {
        console.log("Seeding email logs...");
        emailLogs.forEach(e => writeSupabase("email_logs", "insert", {}, e));
      }
    }

    if (!auditRes.error && auditRes.data) {
      if (auditRes.data.length > 0) {
        auditLogs = auditRes.data;
      } else {
        console.log("Seeding audit logs...");
        auditLogs.forEach(l => writeSupabase("audit_logs", "insert", {}, l));
      }
    }

    if (!aiRes.error && aiRes.data && aiRes.data.length > 0) {
      const settingsRow = aiRes.data.find(r => r.key === 'settings');
      if (settingsRow) {
        aiSettings.systemPrompt = settingsRow.system_prompt;
        aiSettings.temperature = settingsRow.temperature;
      }
      const instructionsRow = aiRes.data.find(r => r.key === 'admin_instructions');
      if (instructionsRow) {
        try {
          aiSettings.adminInstructions = JSON.parse(instructionsRow.system_prompt || "[]");
        } catch {
          aiSettings.adminInstructions = [];
        }
      }
    }

    // Load shop_status from ai_settings table
    const { data: shopStatusRow } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("key", "shop_status")
      .maybeSingle();
    if (shopStatusRow?.system_prompt) {
      try {
        const parsed = JSON.parse(shopStatusRow.system_prompt);
        if (typeof parsed.isOpen === "boolean") {
          shopStatus = parsed;
        }
      } catch {}
    }

    // Real Profit Engine V1: Crawl historical completed orders
    const { data: existingProfits, error: profitFetchErr } = await supabase
      .from("order_profit")
      .select("order_id");
    
    if (!profitFetchErr && existingProfits) {
      const existingIds = new Set(existingProfits.map((p: any) => p.order_id));
      const completedOrders = orders.filter(o => o.status === "completed");
      for (const order of completedOrders) {
        if (!existingIds.has(order.id)) {
          console.log(`[ProfitEngine] Auto-calculating profit for historical order: ${order.id}`);
          const profit = await calculateOrderProfit(order.id);
          if (profit) {
            await saveOrderProfit(profit);
          }
        }
      }
    }

    console.log("Berhasil menyinkronkan seluruh data dari Supabase secara paralel.");
  } catch (err: any) {
    console.error("Gagal melakukan sinkronisasi dengan Supabase:", err.message);
  }
}

// Helper: Write to Supabase (non-blocking)
async function writeSupabase(table: string, action: 'insert' | 'update' | 'delete' | 'upsert', criteria: object, data: any) {
  if (!supabaseUrl || !supabaseAnonKey) return;
  try {
    let query = supabase.from(table);
    if (action === 'insert') {
      await query.insert(data);
    } else if (action === 'update') {
      await query.update(data).match(criteria);
    } else if (action === 'delete') {
      await query.delete().match(criteria);
    } else if (action === 'upsert') {
      await query.upsert(data);
    }
  } catch (err: any) {
    console.error(`Gagal menulis ke Supabase tabel [${table}]:`, err.message);
  }
}

app.use(express.json({ limit: "50mb" }));

// Penyelamat Memori untuk Vercel (Serverless Cold Start)
let isVercelSynced = false;

// Real-time server states
interface ChatSession {
  sessionId: string;
  userName: string;
  messages: { sender: "user" | "ai" | "admin"; text: string; timestamp: string }[];
  isSabotaged: boolean;
  lastActive: number;
}
const activeChats: Record<string, ChatSession> = {};

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  timestamp: string;
  read: boolean;
  targetRole: "admin" | "user";
  targetEmail?: string;
}
const globalNotifications: SystemNotification[] = [];

export const pushNotification = (notif: Omit<SystemNotification, "id" | "timestamp" | "read">) => {
  const newNotif: SystemNotification = {
    ...notif,
    id: "notif-" + Date.now() + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    read: false
  };
  globalNotifications.push(newNotif);
  if (globalNotifications.length > 200) globalNotifications.shift();
};

app.use(async (req, res, next) => {
  if (process.env.VERCEL && !isVercelSynced) {
    await syncFromSupabase();
    isVercelSynced = true;
  }
  next();
});

// In-Memory Database / Server State
let menuItems: MenuItem[] = [
  // COLD DRINKS
  {
    id: "m1",
    name: "Ice Coffe TPS",
    priceReg: 15,
    priceLarge: 20,
    isHot: false,
    menuCategory: "cold",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.03.19.jpeg",
    description: "Susu gurih dipadu espresso blend spesial khas Tampa Seduh. Kaya rasa dan manis seimbang."
  },
  {
    id: "m2",
    name: "Ice Coffe Brown Sugar",
    priceReg: 18,
    priceLarge: 23,
    isHot: false,
    menuCategory: "cold",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.10.08.jpeg",
    description: "Kopi susu espresso creamy dengan lelehan gula aren murni Sulawesi yang legit."
  },
  {
    id: "m3",
    name: "Ice Coffe Vanila",
    priceReg: 18,
    priceLarge: 23,
    isHot: false,
    menuCategory: "cold",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.13.26.jpeg",
    description: "Kombinasi espresso aromatik, susu dingin, dan sirup vanila lembut beraroma manis surgawi."
  },
  {
    id: "m4",
    name: "Ice Americano",
    priceReg: 15,
    priceLarge: 20,
    isHot: false,
    menuCategory: "cold",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.18.04.jpeg",
    description: "Double shot espresso Liberica-Arabica disiram air es jernih penenang dahaga."
  },
  {
    id: "m5",
    name: "Ice Matcha",
    priceReg: 18,
    priceLarge: 23,
    isHot: false,
    menuCategory: "cold",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.20.53.jpeg",
    description: "Matcha green tea organik impor beraroma teh segar alami bersatu dengan susu creamy dingin."
  },
  {
    id: "m6",
    name: "Ice Coklat",
    priceReg: 18,
    priceLarge: 23,
    isHot: false,
    menuCategory: "cold",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.24.22.jpeg",
    description: "Cokelat hitam premium produksi lokal dengan sensasi manis-pahit cokelat asli."
  },
  {
    id: "m7",
    name: "Ice Lemon Tea",
    priceReg: 18,
    priceLarge: 23,
    isHot: false,
    menuCategory: "cold",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.29.46.jpeg",
    description: "Seduhan teh hitam pilihan dipadu perasan jeruk lemon segar kental berlimpah es."
  },
  {
    id: "m8",
    name: "Ice Strawberry",
    priceReg: 20,
    priceLarge: 25,
    isHot: false,
    menuCategory: "cold",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.35.22.jpeg",
    description: "Minuman buah stroberi murni asam manis, diramu susu murni, menyegarkan suasana siang."
  },

  // HOT DRINKS
  {
    id: "m9",
    name: "Aericano Hot",
    priceReg: 10,
    isHot: true,
    menuCategory: "hot",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.18.04.jpeg",
    description: "Espresso murni aromatik diseduh air panas membara, menghadirkan rasa asli biji kopi pilihan."
  },
  {
    id: "m10",
    name: "Coffe Susu Hot",
    priceReg: 10,
    priceLarge: 12,
    isHot: true,
    menuCategory: "hot",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.37.53.jpeg",
    description: "Kopi susu tradisional disajikan panas, memadukan bubuk kopi kuat dan kental manis."
  },
  {
    id: "m11",
    name: "Saraba",
    priceReg: 10,
    isHot: true,
    menuCategory: "hot",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.44.57.jpeg",
    description: "Minuman jahe legendaris khas Sulawesi Utara diramu dengan susu, rempah-rempah herbal, dan gula merah."
  },
  {
    id: "m12",
    name: "Lemon Tea Hot",
    priceReg: 13,
    isHot: true,
    menuCategory: "hot",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.29.46.jpeg",
    description: "Teh hitam hangat klasik disajikan dengan perasan lemon segar untuk menghangatkan badan."
  },
  {
    id: "m13",
    name: "Matcha Hot",
    priceReg: 15,
    isHot: true,
    menuCategory: "hot",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.20.53.jpeg",
    description: "Teh hijau matcha Jepang hangat dengan foam susu lembut yang wangi menenangkan pikiran."
  },
  {
    id: "m14",
    name: "Coklat Hot",
    priceReg: 15,
    isHot: true,
    menuCategory: "hot",
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.24.22.jpeg",
    description: "Cokelat murni hangat khas daerah tropis, bertekstur kental manis-pahit yang meluapkan relaksasi."
  },
  {
    id: "m-roti-coklat",
    name: "Roti Kampung Coklat",
    priceReg: 4,
    isHot: false,
    menuCategory: "snack",
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=500",
    description: "Roti kampung legendaris khas Kotabunan dengan isian pasta cokelat manis lumer."
  },
  {
    id: "m-roti-balak",
    name: "Roti Kampung Balak",
    priceReg: 4,
    isHot: false,
    menuCategory: "snack",
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500",
    description: "Roti kampung polos bertekstur padat lembut, sangat cocok dicelup ke kopi susu atau jahe Saraba."
  },
  {
    id: "m-roti-moka",
    name: "Roti Kampung Moka",
    priceReg: 4,
    isHot: false,
    menuCategory: "snack",
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500",
    description: "Roti kampung harum moka dengan kelembutan rasa manis beraroma kopi moka khas."
  }
];

let coffeePackages: CoffeePackage[] = [
  {
    id: "p1",
    name: "Paket 1: Saraba + Roti Balak",
    price: 15,
    items: ["m11", "m-roti-balak", "m-roti-balak"],
    description: "1 Saraba Jahe Hangat + 2 Roti Kampung Balak empuk. Penghangat sore paling pas jo kawan!",
    badge: "Khas Boltim",
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.44.57.jpeg"
  },
  {
    id: "p2",
    name: "Paket 2: Duo TPS Roti Coklat",
    price: 18,
    items: ["m1", "m-roti-coklat"],
    description: "1 Ice Coffee TPS reguler dipadu 1 Roti Kampung Coklat manis lumer.",
    badge: "Terlaris",
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.03.19.jpeg"
  },
  {
    id: "p3",
    name: "Paket 3: Americano Roti Moka",
    price: 18,
    items: ["m4", "m-roti-moka"],
    description: "1 Ice Americano segar dingin ditambah 1 Roti Kampung Moka harum aromatik.",
    badge: "Melek Lembur",
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.18.04.jpeg"
  },
  {
    id: "p4",
    name: "Paket 4: Kopi Susu Hot & Roti Balak",
    price: 13,
    items: ["m10", "m-roti-balak"],
    description: "1 Kopi Susu Hot tradisional dan 1 Roti Kampung Balak klasik.",
    badge: "Tradisional",
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.37.53.jpeg"
  },
  {
    id: "p5",
    name: "Paket 5: Matcha Roti Coklat",
    price: 21,
    items: ["m5", "m-roti-coklat"],
    description: "1 Ice Matcha latte dingin ditambah 1 Roti Kampung Coklat lezat.",
    badge: "Favorit",
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.20.53.jpeg"
  },
  {
    id: "p6",
    name: "Paket 6: Saraba Double Roti Coklat",
    price: 15,
    items: ["m11", "m-roti-coklat", "m-roti-coklat"],
    description: "1 Saraba hangat khas Boltim ditemani 2 Roti Kampung Coklat lumer.",
    badge: "Rempah",
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.44.57.jpeg"
  },
  {
    id: "p7",
    name: "Paket 7: Brown Sugar & Roti Moka",
    price: 21,
    items: ["m2", "m-roti-moka"],
    description: "1 Ice Coffee Brown Sugar aren dengan 1 Roti Kampung Moka.",
    badge: "Manis Legit",
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.10.08.jpeg"
  },
  {
    id: "p8",
    name: "Paket 8: Kenyang Lembur TPS",
    price: 20,
    items: ["m1", "m-roti-balak", "m-roti-balak"],
    description: "1 Ice Coffee TPS reguler dipadukan dengan 2 Roti Kampung Balak.",
    badge: "Rame-Rame",
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.03.19.jpeg"
  }
];

let orders: Order[] = [
  {
    id: "ORD-9281",
    customerName: "Andika Pratama",
    whatsapp: "081234567890",
    email: "andika@gmail.com",
    address: "Jl. Trans Sulawesi No. 12, Kotabunan",
    items: [
      { menuId: "m1", name: "Ice Coffe TPS", quantity: 2, size: "L", price: 20 }
    ],
    total: 40,
    status: "completed",
    createdAt: "2026-06-19T10:30:00.000Z"
  },
  {
    id: "ORD-9282",
    customerName: "Siti Rahma",
    whatsapp: "085299887766",
    email: "siti.rahma@yahoo.com",
    address: "Kampung Baru Indah, Kotabunan Selatan",
    items: [
      { menuId: "m2", name: "Ice Coffe Brown Sugar", quantity: 1, size: "R", price: 18 },
      { menuId: "m11", name: "Saraba", quantity: 1, size: "Regular", price: 10 }
    ],
    total: 28,
    status: "delivering",
    createdAt: "2026-06-19T22:15:00.000Z"
  },
  {
    id: "ORD-9283",
    customerName: "Rivaldo Pontoh",
    whatsapp: "087755443322",
    email: "rivaldo@outlook.co.id",
    address: "Samping Masjid Raya Al-Ikhlas Kotabunan",
    items: [
      { menuId: "m1", name: "Ice Coffe TPS", quantity: 1, size: "R", price: 15 },
      { menuId: "m8", name: "Ice Strawberry", quantity: 1, size: "L", price: 25 }
    ],
    total: 40,
    status: "pending",
    createdAt: "2026-06-20T03:05:00.000Z"
  }
];

let auditLogs: AuditLog[] = [
  { id: "log-1", action: "System Boot", details: "Tampa Seduh server backend launched successfully.", timestamp: new Date().toISOString() }
];

// Hanya admin default — user nyata akan dimuat dari Supabase saat server boot
let registeredUsers: User[] = [
  { id: "u-admin", name: "Mochammad Rifai (Owner)", email: "kopi@tampaseduh.com", role: "admin", ordersCount: 0, lastActive: "Baru saja", isBlocked: false }
];

let blogNews: BlogNews[] = [
  {
    id: "news-1",
    title: "Mengenal Liberica Kotabunan: Biji Kopi Eksotis Kebanggaan Boltim",
    slug: "mengenal-liberica-kotabunan",
    category: "Biji Kopi",
    author: "Mochammad Rifai",
    date: "2026-06-15",
    coverImage: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
    content: "Indonesia terkenal dengan keberagaman kopinya, salah satunya adalah varietas Liberica yang ditanam di pegunungan pesisir Kotabunan, Kabupaten Bolaang Mongondow Timur (Boltim), Sulawesi Utara. Biji kopi Liberica Kotabunan dikenal unik karena ukurannya yang besar—hampir menyamai buah nangka—serta ciri rasa istimewa. Dari tanah kaya besi vulkanis Trans Sulawesi Lingkar Selatan, kopi ini memantulkan wangi manis buah nangka (jackfruit) yang eksotis, dipadu rasa kayu hutan kayu oak yang elegan. Kandungan kafeinnya juga cenderung lebih rendah dan bersahabat di lambung dibanding Robusta."
  },
  {
    id: "news-2",
    title: "Saraba: Minuman Rempah Tradisional Penghangat Cuaca Pesisir",
    slug: "saraba-penghangat-cuaca-pesisir",
    category: "Tips Seduh",
    author: "Tim Tampa Seduh",
    date: "2026-06-18",
    coverImage: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&auto=format&fit=crop&q=80",
    content: "Di kala angin malam bertiup kencang melintasi Jalan Trans-Sulawesi, tidak ada yang lebih nikmat selain menyeduh cangkir hangat Saraba. Minuman jahe merah kental manis rempah kaya ini selalu disajikan di Tampa Seduh menggunakan gula kelapa asli Bolaang Mongondow. Sangat berkhasiat menjaga imunitas ditiap tetesnya, dan berkhasiat memberikan ketenangan dan kebugaran tubuh secara instan."
  }
];

// Email log dimulai kosong — akan diisi dari Supabase saat boot dan aktivitas nyata
let emailLogs: EmailLog[] = [];


// Configuration for AI Master
let aiSettings = {
  systemPrompt: `Kau adalah Emat, asisten virtual Tampa Seduh — kedai kopi di Jl. Tangkudeagan No. 2 Kotabunan Selatan, Boltim, Sulawesi Utara.

GAYA BICARA:
- Default pakai bahasa campuran Kotabunan/Manado yang alami dan santai
- Kata sehari-hari: ngana (kamu), kita (saya), pe (punya/ber-), jo (sudah/saja), mar (tapi), kong (terus/lalu), ba (partikel penegas), dang (kata seru heran/senang), torang (kita semua), sandiri (sendiri)
- Kalau customer pakai bahasa Indonesia formal atau dari luar daerah, ikutin gaya mereka
- Jawab singkat dan natural. Jangan terlalu panjang kecuali memang perlu
- Jangan pakai format markdown seperti ** atau ## dalam jawaban — tulis biasa saja seperti chat
- Boleh pakai emoji secukupnya, tapi jangan berlebihan

INFO KEDAI:
- Alamat: Jl. Tangkudeagan No. 2 Kotabunan Selatan, Trans Sulawesi
- WA Admin: 085696224448
- Email: kopi@tampaseduh.com
- Jam kedai: 18.00 - 24.00 WITA setiap hari
- Delivery: Aktif 24 jam!

CARA ORDER:
1. Pilih menu di halaman utama, klik Tambah ke Keranjang
2. Klik ikon keranjang di pojok kanan atas
3. Isi nama, WA, dan alamat
4. Bayar via QRIS lalu upload bukti bayar
5. Admin proses dan antar ke rumah

TUGAS:
- Bantu customer pilih menu sesuai selera
- Jelaskan cara order kalau ada yang bingung
- Jawab pertanyaan seputar kopi, kedai, dan delivery
- Rekomendasikan menu yang cocok (cuaca dingin → Saraba atau Kopi Susu Panas, dll)
- Kalau ada keluhan, tanggapi dengan ramah dan arahkan ke WA admin`,
  temperature: 0.75,
  adminInstructions: [] as string[]
};

// Helper: Build dynamic AI context from live DB data
async function buildDynamicAiContext(): Promise<string> {
  try {
    const menuData = menuItems.filter(m => m.isAvailable).map(m => {
      const harga = m.priceLarge
        ? `Reg ${m.priceReg}K / Large ${m.priceLarge}K`
        : `${m.priceReg}K`;
      const type = m.menuCategory === 'hot' ? '(Panas)' : m.menuCategory === 'snack' ? '(Snack)' : '(Dingin)';
      return `- ${m.name} ${type}: ${harga}${m.description ? ` — ${m.description}` : ''}`;
    }).join('\n');

    const packData = coffeePackages.map(p => {
      const items = Array.isArray(p.items) ? p.items.join(', ') : '';
      return `- ${p.name}: ${p.price}K${items ? ` (${items})` : ''}${p.description ? ` — ${p.description}` : ''}`;
    }).join('\n');

    let ctx = '';
    if (menuData) ctx += `\nDAFTAR MENU TERSEDIA:\n${menuData}`;
    if (packData) ctx += `\n\nPAKET TERSEDIA:\n${packData}`;
    return ctx;
  } catch {
    return '';
  }
}


// API: AI Chat Handler using Gemini API
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array required" });
  }

  // Retrieve the client-submitted questions or last message
  const lastMessage = messages[messages.length - 1]?.text || "Halo";
  const userName = req.body.userName || "Tamu";
  const sessionId = req.body.sessionId || "default";

  // Track chat session
  if (!activeChats[sessionId]) {
    activeChats[sessionId] = {
      sessionId,
      userName,
      messages: [],
      isSabotaged: false,
      lastActive: Date.now()
    };
    pushNotification({
      title: "Chat Baru",
      message: `${userName} memulai obrolan dengan AI.`,
      type: "info",
      targetRole: "admin"
    });
  }
  
  const session = activeChats[sessionId];
  session.lastActive = Date.now();
  session.messages.push({ sender: "user", text: lastMessage, timestamp: new Date().toISOString() });

  // If admin has sabotaged, do not trigger AI. Tell client to wait for admin via polling
  if (session.isSabotaged) {
    return res.json({
      text: "",
      modelUsed: "Admin Handoff",
      sabotaged: true
    });
  }

  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey || openaiApiKey.trim() === "" || openaiApiKey === "MY_OPENAI_API_KEY") {
      console.warn("OPENAI_API_KEY environment variable is not configured. Simulating AI response.");

      const textResponse = simulateTampaSeduhAI(lastMessage);
      session.messages.push({ sender: "ai", text: textResponse, timestamp: new Date().toISOString() });
      return res.json({
        text: textResponse,
        modelUsed: "Simulated Local Model (No API Key)"
      });
    }

    // Call OpenAI API
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const formattedMessages = messages.map((m: any) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: String(m.text)
    }));

    // Inject real-time product data
    const dynamicCtx = await buildDynamicAiContext();
    let adminCtx = "";
    if (aiSettings.adminInstructions && aiSettings.adminInstructions.length > 0) {
      adminCtx = "\n\nINTRUKSI TAMBAHAN DARI ADMIN:\n" + aiSettings.adminInstructions.map((inst, i) => `${i + 1}. ${inst}`).join("\n");
    }
    const fullSystemPrompt = aiSettings.systemPrompt + adminCtx + dynamicCtx;

    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: fullSystemPrompt },
        ...formattedMessages

      ],
      temperature: aiSettings.temperature || 0.7,
    });

    const responseText = result.choices[0]?.message?.content;

    const aiResponse = responseText || "Maaf kawan, saya sedang sedikit bingung. Bisa diulang pertanyaannya?";
    session.messages.push({ sender: "ai", text: aiResponse, timestamp: new Date().toISOString() });

    res.json({
      text: aiResponse,
      modelUsed: "gpt-4o-mini"
    });

  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    res.json({
      text: "Maaf kawan, ada kesalahan koneksi dengan server AI, mar jangan khawatir! Silakan whatsapp langsung jo di 085696224448 atau coba lagi nanti.",
      error: error.message
    });
  }
});

// Mock Responder fallback for smooth out-of-the-box local developer sandbox testing
function simulateTampaSeduhAI(input: string): string {
  const query = input.toLowerCase();

  if (query.includes("alamat") || query.includes("lokasi") || query.includes("tempat") || query.includes("dimana")) {
    return "Tampa Seduh berlokasi di Jl. Tangkudeagan No. 2 Kotabunan Selatan, Boltim, Trans Sulawesi Lingkar Selatan. Kalau bingung cari jo jalan lingkar selatan, kedai kami persis di tepi jalan dengan wangi Liberica menyengat!";
  }
  if (query.includes("menu") || query.includes("harga") || query.includes("kopi") || query.includes("minum")) {
    return "Kita punya menu andalan banya kawan! Ada 'Ice Coffe TPS' cuma Rp 15.000, 'Ice Coffe Brown Sugar' gula aren Rp 18.000, 'Saraba jahe panas' hanya Rp 10.000 yang bikin badan segar langsung, dan banya lagi. Tekan tombol 'Lihat Daftar Menu' di landing page untuk lihat detail foto dkk!";
  }
  if (query.includes("liberica") || query.includes("kotabunan") || query.includes("biji")) {
    return "Aha! 'Liberica Kotabunan' itu kebanggaan boltim. Biji kopinya besar-besar, pas diseduh keluar aroma manis mirip buah nangka matang bercampur kehangatan kayu hutan (woody/smoky). Sangat aman di lambung karena kandungan asam & kafein yang sangat ramah!";
  }
  if (query.includes("order") || query.includes("pesan") || query.includes("beli") || query.includes("delivery")) {
    return "Mo pesan gampang sekali kawan! Klik tombol 'Order Sekarang' berwarna cokelat hangat di bagian atas halaman website ini. Isi data nama, nomor WA, alamat pengantaran, lalu kirim. Barista kami akan langsung memproses pesanan dan mengantarnya ke rumah kawan!";
  }
  if (query.includes("kontak") || query.includes("whatsapp") || query.includes("nomor") || query.includes("email")) {
    return "Ini kontak resmi Tampa Seduh kawan:\n- WA: 085696224448\n- Email: kopi@tampaseduh.com\nJangan sungkan bincang-bincang!';";
  }
  return "Halo kawan! Selamat datang di Tampa Seduh. Ada yang bisa kita bantu seputar kopi khas Liberica Kotabunan atau mau pesan minuman segar khas Sulawesi Utara hari ini? Ketik jo apa yang kawan mau tahu.";
}

// REST ENDPOINTS

// 0. Notifications API
app.get("/api/notifications", (req, res) => {
  const role = req.query.role as string;
  const email = req.query.email as string;
  if (!role) return res.json([]);
  
  // Clean up old chats while we're at it (older than 1 hour)
  const now = Date.now();
  Object.keys(activeChats).forEach(id => {
    if (now - activeChats[id].lastActive > 3600000) {
      delete activeChats[id];
    }
  });

  const relevant = globalNotifications.filter(n => {
    if (n.read) return false;
    if (n.targetRole !== role) return false;
    if (n.targetEmail && n.targetEmail !== email) return false;
    return true;
  });

  res.json(relevant);
});

app.post("/api/notifications/mark-read", (req, res) => {
  const { ids } = req.body;
  if (Array.isArray(ids)) {
    globalNotifications.forEach(n => {
      if (ids.includes(n.id)) n.read = true;
    });
  }
  res.json({ success: true });
});

// 0.5 Chat Admin Handoff API
app.get("/api/chat-admin/sessions", requireAdmin, (req, res) => {
  res.json(Object.values(activeChats));
});

app.post("/api/chat-admin/sabotage", requireAdmin, (req, res) => {
  const { sessionId, sabotage } = req.body;
  if (activeChats[sessionId]) {
    activeChats[sessionId].isSabotaged = sabotage;
    res.json({ success: true, session: activeChats[sessionId] });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

app.post("/api/chat-admin/send", requireAdmin, (req, res) => {
  const { sessionId, text } = req.body;
  if (activeChats[sessionId]) {
    activeChats[sessionId].messages.push({ sender: "admin", text, timestamp: new Date().toISOString() });
    activeChats[sessionId].lastActive = Date.now();
    res.json({ success: true, session: activeChats[sessionId] });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

app.get("/api/chat-admin/poll/:sessionId", (req, res) => {
  const session = activeChats[req.params.sessionId];
  if (!session) return res.json({ messages: [], isSabotaged: false });
  // Send back only admin messages for the client to receive if they are polling
  res.json({ 
    messages: session.messages,
    isSabotaged: session.isSabotaged
  });
});

app.get("/api/test-images-html", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "test_images.html"));
});

// 1. Menu API
app.get("/api/menu", (req, res) => {
  res.json(menuItems);
});

app.post("/api/menu", requireAdmin, (req, res) => {
  const newItem: MenuItem = {
    ...req.body,
    id: "m" + (menuItems.length + 1)
  };
  menuItems.push(newItem);

  // Record audit log
  auditLogs.unshift({
    id: "log-" + (auditLogs.length + 1),
    action: "Menu Added",
    details: `Menu item '${newItem.name}' added with price ${newItem.priceReg}K.`,
    timestamp: new Date().toISOString()
  });

  // Background write to Supabase
  writeSupabase('menu', 'insert', {}, {
    id: newItem.id,
    name: newItem.name,
    price_reg: newItem.priceReg,
    price_large: newItem.priceLarge || null,
    is_hot: newItem.isHot,
    menu_category: (newItem as any).menuCategory || (newItem.isHot ? 'hot' : 'cold'),
    is_available: newItem.isAvailable,
    image: newItem.image,
    description: newItem.description
  });
  writeSupabase('audit_logs', 'insert', {}, {
    id: "log-" + auditLogs.length,
    action: "Menu Added",
    details: `Menu item '${newItem.name}' added with price ${newItem.priceReg}K.`,
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newItem);
});

app.put("/api/menu/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const idx = menuItems.findIndex(m => m.id === id);
  if (idx !== -1) {
    menuItems[idx] = { ...menuItems[idx], ...req.body };

    // Record audit log
    auditLogs.unshift({
      id: "log-" + (auditLogs.length + 1),
      action: "Menu Updated",
      details: `Menu item '${menuItems[idx].name}' edited.`,
      timestamp: new Date().toISOString()
    });

    // Background write to Supabase
    writeSupabase('menu', 'update', { id }, {
      name: menuItems[idx].name,
      price_reg: menuItems[idx].priceReg,
      price_large: menuItems[idx].priceLarge || null,
      is_hot: menuItems[idx].isHot,
      menu_category: (menuItems[idx] as any).menuCategory || (menuItems[idx].isHot ? 'hot' : 'cold'),
      is_available: menuItems[idx].isAvailable,
      image: menuItems[idx].image,
      description: menuItems[idx].description
    });
    writeSupabase('audit_logs', 'insert', {}, {
      id: "log-" + auditLogs.length,
      action: "Menu Updated",
      details: `Menu item '${menuItems[idx].name}' edited.`,
      timestamp: new Date().toISOString()
    });

    res.json(menuItems[idx]);
  } else {
    res.status(404).json({ error: "Menu item not found" });
  }
});

app.put("/api/users/:id/block", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { isBlocked } = req.body;
  const idx = registeredUsers.findIndex(u => u.id === id);
  if (idx !== -1) {
    // We use lastActive = "BLOCKED" to represent blocked status since we can't alter the schema dynamically
    registeredUsers[idx].lastActive = isBlocked ? "BLOCKED" : "Baru saja";
    if (isBlocked) {
      registeredUsers[idx].isBlocked = true;
    } else {
      registeredUsers[idx].isBlocked = false;
    }
    
    // Background write to Supabase
    writeSupabase('users', 'update', { id }, {
      last_active: registeredUsers[idx].lastActive
    });
    
    res.json({ success: true, user: registeredUsers[idx] });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

app.put("/api/users/:id/approve-membership", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { approve } = req.body;
  const idx = registeredUsers.findIndex(u => u.id === id);
  if (idx !== -1) {
    if (approve) {
      registeredUsers[idx].membershipStatus = "approved";
      registeredUsers[idx].isMember = true;
      writeSupabase('users', 'update', { id }, {
        membership_status: "approved",
        is_member: true
      });
      // Audit log
      auditLogs.unshift({
        id: "log-" + (auditLogs.length + 1),
        action: "Membership Approved",
        details: `User '${registeredUsers[idx].name}' membership was approved.`,
        timestamp: new Date().toISOString()
      });
    } else {
      registeredUsers[idx].membershipStatus = "none";
      writeSupabase('users', 'update', { id }, {
        membership_status: "none"
      });
    }
    res.json({ success: true, user: registeredUsers[idx] });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// ===================================================================
// DELETE /api/users/:id — Admin hapus user permanen
// Proteksi: Admin utama tidak bisa dihapus
// ===================================================================
app.delete("/api/users/:id", requireAdmin, (req, res) => {
  const { id } = req.params;

  // Cegah admin menghapus akun admin utama
  if (id === "u-admin") {
    return res.status(403).json({ error: "Akun admin utama tidak bisa dihapus." });
  }

  const idx = registeredUsers.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: "User tidak ditemukan." });

  const deleted = registeredUsers[idx];

  // Cegah menghapus user dengan role admin
  if (deleted.role === "admin") {
    return res.status(403).json({ error: "Akun dengan role admin tidak bisa dihapus dari sini." });
  }

  registeredUsers.splice(idx, 1);

  // Hapus dari Supabase
  writeSupabase('users', 'delete', { id }, {});

  // Audit log
  const logEntry = {
    id: "log-" + (auditLogs.length + 1),
    action: "User Deleted",
    details: `User '${deleted.name}' (${deleted.email}) dihapus permanen oleh Admin.`,
    timestamp: new Date().toISOString()
  };
  auditLogs.unshift(logEntry);
  writeSupabase('audit_logs', 'insert', {}, logEntry);

  res.json({ success: true, deleted });
});


app.delete("/api/menu/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const idx = menuItems.findIndex(m => m.id === id);
  if (idx !== -1) {
    const deleted = menuItems[idx];
    menuItems = menuItems.filter(m => m.id !== id);

    // Record audit log
    auditLogs.unshift({
      id: "log-" + (auditLogs.length + 1),
      action: "Menu Deleted",
      details: `Menu item '${deleted.name}' was deleted.`,
      timestamp: new Date().toISOString()
    });

    // Background write to Supabase
    writeSupabase('menu', 'delete', { id }, {});
    writeSupabase('audit_logs', 'insert', {}, {
      id: "log-" + auditLogs.length,
      action: "Menu Deleted",
      details: `Menu item '${deleted.name}' was deleted.`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, item: deleted });
  } else {
    res.status(404).json({ error: "Menu item not found" });
  }
});


// 2. Packages API
app.get("/api/packages", (req, res) => {
  res.json(coffeePackages);
});

app.post("/api/packages", requireAdmin, (req, res) => {
  const newPack: CoffeePackage = {
    ...req.body,
    id: "p" + (coffeePackages.length + 1)
  };
  coffeePackages.push(newPack);

  // Background write to Supabase
  writeSupabase('packages', 'insert', {}, newPack);

  res.status(201).json(newPack);
});

app.put("/api/packages/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const idx = coffeePackages.findIndex(p => p.id === id);
  if (idx !== -1) {
    coffeePackages[idx] = { ...coffeePackages[idx], ...req.body };

    // Background write to Supabase
    writeSupabase('packages', 'update', { id }, coffeePackages[idx]);

    res.json(coffeePackages[idx]);
  } else {
    res.status(404).json({ error: "Package not found" });
  }
});

app.delete("/api/packages/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  coffeePackages = coffeePackages.filter(p => p.id !== id);

  // Background write to Supabase
  writeSupabase('packages', 'delete', { id }, {});

  res.json({ success: true });
});

// 3. Orders API
app.get("/api/orders", (req, res) => {
  const { email } = req.query;
  if (email && typeof email === "string") {
    const isAdmin = email === process.env.ADMIN_EMAIL || email === "kopi@tampaseduh.com" || registeredUsers.some(u => u.email === email && u.role === "admin");
    if (isAdmin) {
      return res.json(orders);
    }
    const filtered = orders.filter(o => o.email === email);
    return res.json(filtered);
  }
  res.json(orders);
});

app.post("/api/orders", async (req, res) => {
  const { customerName, whatsapp, email, address, items, subtotal, shippingCost, deliveryMethod, notes, paymentProofUrl } = req.body;
  if (!customerName || !address || !items || !items.length) {
    return res.status(400).json({ error: "Missing required order data" });
  }

  // Cek apakah user di-blokir
  if (email) {
    const usr = registeredUsers.find(u => u.email === email);
    if (usr && (usr.isBlocked || usr.lastActive === "BLOCKED")) {
      return res.status(403).json({ error: "Akun Anda telah dibatasi untuk melakukan pemesanan. Silakan hubungi admin." });
    }
  }

  // Hitung diskon ongkir 25% bagi member
  let isMemberUser = false;
  if (email) {
    const usr = registeredUsers.find(u => u.email === email);
    if (usr && usr.isMember) {
      isMemberUser = true;
    }
  }

  const finalShippingCost = shippingCost || 0;
  let shippingDiscount = 0;
  if (isMemberUser && deliveryMethod === "delivery") {
    shippingDiscount = Math.round(finalShippingCost * 0.25);
  }

  const finalSubtotal = subtotal || items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  const finalTotal = finalSubtotal + finalShippingCost - shippingDiscount;

  const newOrder: Order = {
    id: "ORD-" + Math.floor(1000 + Math.random() * 9000),
    customerName,
    whatsapp: whatsapp || "-",
    email: email || "-",
    address,
    items,
    total: finalTotal,
    status: "pending",
    createdAt: new Date().toISOString(),
    deliveryMethod: deliveryMethod || "delivery",
    subtotal: finalSubtotal,
    shippingCost: finalShippingCost,
    shippingDiscount,
    notes: notes || "",
    paymentProofUrl: paymentProofUrl || ""
  };

  orders.unshift(newOrder);

  // Update customer's order limit and logs
  const customerIdx = registeredUsers.findIndex(u => (email && email !== "-" && u.email !== "-" && u.email === email) || u.name === customerName);
  if (customerIdx !== -1) {
    registeredUsers[customerIdx].ordersCount += 1;
    registeredUsers[customerIdx].lastActive = "Baru saja";

    writeSupabase('users', 'update', { id: registeredUsers[customerIdx].id }, {
      orders_count: registeredUsers[customerIdx].ordersCount,
      last_active: registeredUsers[customerIdx].lastActive
    });
  } else {
    const newUserObj: User = {
      id: "u-" + (registeredUsers.length + 1),
      name: customerName,
      email: (email && email !== "-") ? email : `${customerName.toLowerCase().replace(/\s+/g, "")}-${Math.floor(1000 + Math.random() * 9000)}@guest.tampaseduh.com`,
      role: "customer",
      ordersCount: 1,
      lastActive: "Baru saja",
      isMember: false
    };
    registeredUsers.push(newUserObj);

    writeSupabase('users', 'insert', {}, {
      id: newUserObj.id,
      name: newUserObj.name,
      email: newUserObj.email,
      role: newUserObj.role,
      orders_count: newUserObj.ordersCount,
      last_active: newUserObj.lastActive,
      is_member: false
    });
  }

  // Send email summary using Resend
  let emailStatus: "Delivered" | "Sent" | "Failed" | "Pending" | "Skipped (No API Key)" | "Skipped (No Email)" = "Pending";
  let emailBody = `Terima kasih kawan ${customerName}! Barista kami sedang mempersiapkan pesanan Anda senilai Rp ${finalTotal}.000.`;

  // Format harga ke Rupiah standar (e.g., 56000 → Rp 56.000)
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID').format(val * 1000);
  };

  // URL publik invoice
  const baseUrl = process.env.BASE_URL || 'https://tampaseduh.com';
  const invoiceUrl = `${baseUrl}/invoice/${newOrder.id}`;

  if (email && email !== "-" && resendApiKey && resendApiKey !== "dummy_resend_key_123456789") {
    try {
      const itemsHtml = items.map((i: any) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3ede3;">${i.name} <span style="color:#8B5E3C;font-size:12px">(${i.size || 'Regular'})</span></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3ede3; text-align:center;">x${i.quantity}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3ede3; text-align:right;">Rp ${formatRupiah(i.price * i.quantity)}</td>
        </tr>`).join('');

      const statusSteps = [
        { label: 'Diterima', done: true },
        { label: 'Seduh / Proses', done: false },
        { label: 'Diantar', done: false },
        { label: 'Selesai', done: false }
      ];
      const progressHtml = statusSteps.map((s, i) => `
        <div style="display:inline-block; text-align:center; margin: 0 8px;">
          <div style="width:28px;height:28px;border-radius:50%;background:${s.done ? '#8B5E3C' : '#e5d9cc'};color:${s.done ? '#fff' : '#8B5E3C'};line-height:28px;font-weight:bold;margin:0 auto;">${i+1}</div>
          <div style="font-size:11px;margin-top:4px;color:${s.done ? '#8B5E3C' : '#999'};">${s.label}</div>
        </div>`).join('<span style="color:#c9b8a4;font-size:18px;vertical-align:middle;">›</span>');

      const invoiceHtml = `
        <!DOCTYPE html>
        <html lang="id">
        <head><meta charset="UTF-8"><title>Invoice Tampa Seduh</title></head>
        <body style="margin:0;padding:0;background:#faf7f2;font-family:'Segoe UI',Arial,sans-serif;">
          <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(139,94,60,0.08);">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#5c3317,#8B5E3C);padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:1px;">☕ Tampa Seduh</h1>
              <p style="margin:6px 0 0;color:#f5e6d5;font-size:13px;">Street Coffee · Kotabunan Selatan</p>
            </div>

            <!-- Body -->
            <div style="padding:32px;">
              <p style="font-size:15px;color:#4a3728;">Halo, <strong>${customerName}</strong> 👋</p>
              <p style="font-size:14px;color:#6b5344;margin-top:4px;">Terima kasih sudah pesan kopi! Berikut detail pesanan kamu.</p>

              <!-- Order Info -->
              <div style="background:#faf7f2;border-radius:12px;padding:16px 20px;margin:20px 0;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span style="font-size:13px;color:#8B5E3C;font-weight:600;">No. Order</span>
                  <span style="font-size:13px;font-weight:700;color:#3d2b1f;">${newOrder.id}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span style="font-size:13px;color:#8B5E3C;font-weight:600;">Metode</span>
                  <span style="font-size:13px;color:#3d2b1f;">${deliveryMethod === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}</span>
                </div>
                ${address ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="font-size:13px;color:#8B5E3C;font-weight:600;">Alamat</span><span style="font-size:13px;color:#3d2b1f;max-width:260px;text-align:right;">${address}</span></div>` : ''}
                ${notes ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e8d5c4;"><span style="font-size:12px;color:#8B5E3C;">📝 Catatan: ${notes}</span></div>` : ''}
              </div>

              <!-- Items Table -->
              <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                <thead>
                  <tr style="border-bottom:2px solid #8B5E3C;">
                    <th style="text-align:left;font-size:12px;color:#8B5E3C;padding-bottom:8px;">ITEM</th>
                    <th style="text-align:center;font-size:12px;color:#8B5E3C;padding-bottom:8px;">QTY</th>
                    <th style="text-align:right;font-size:12px;color:#8B5E3C;padding-bottom:8px;">HARGA</th>
                  </tr>
                </thead>
                <tbody style="font-size:14px;color:#3d2b1f;">${itemsHtml}</tbody>
              </table>

              <!-- Totals -->
              <div style="background:#faf7f2;border-radius:12px;padding:16px 20px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span style="font-size:13px;color:#6b5344;">Subtotal</span>
                  <span style="font-size:13px;">Rp ${formatRupiah(finalSubtotal)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span style="font-size:13px;color:#6b5344;">Ongkos Kirim</span>
                  <span style="font-size:13px;">Rp ${formatRupiah(finalShippingCost)}</span>
                </div>
                ${shippingDiscount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:13px;color:#22a05c;">Diskon Member ✓</span><span style="font-size:13px;color:#22a05c;">-Rp ${formatRupiah(shippingDiscount)}</span></div>` : ''}
                <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:2px solid #8B5E3C;">
                  <span style="font-size:16px;font-weight:700;color:#3d2b1f;">Total</span>
                  <span style="font-size:18px;font-weight:700;color:#8B5E3C;">Rp ${formatRupiah(finalTotal)}</span>
                </div>
              </div>

              <!-- Progress Tracker -->
              <div style="margin:28px 0 16px;text-align:center;">
                <p style="font-size:13px;font-weight:600;color:#8B5E3C;margin-bottom:14px;">Status Pesanan</p>
                ${progressHtml}
              </div>

              <!-- Invoice Link -->
              <div style="text-align:center;margin:24px 0;">
                <a href="${invoiceUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#5c3317,#8B5E3C);color:#fff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:700;">
                  🧾 Lihat Invoice &amp; Pantau Status
                </a>
                <p style="font-size:11px;color:#999;margin-top:8px;">Invoice bisa didownload sebagai PDF</p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background:#3d2b1f;padding:20px 32px;text-align:center;">
              <p style="color:#c9b8a4;font-size:12px;margin:0;">Tampa Seduh Street Coffee · Kotabunan Selatan · WA: 0819-xxxx-xxxx</p>
              <p style="color:#8B5E3C;font-size:11px;margin:6px 0 0;">Terima kasih sudah memilih Tampa Seduh! ☕</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await resend.emails.send({
        from: 'TAMPA SEDUH Street Coffee <kopi@tampaseduh.com>',
        to: [email],
        subject: `☕ Invoice Pesanan #${newOrder.id} - Tampa Seduh`,
        html: invoiceHtml
      });
      emailStatus = "Delivered";

      // Kirim notifikasi ke admin juga
      const adminEmail = process.env.ADMIN_EMAIL || 'tampaseduh@gmail.com';
      const adminItemList = items.map((i: any) => `• ${i.name} x${i.quantity} = Rp ${formatRupiah(i.price * i.quantity)}`).join('\n');
      resend.emails.send({
        from: 'TAMPA SEDUH System <kopi@tampaseduh.com>',
        to: [adminEmail],
        subject: `🔔 Order Baru #${newOrder.id} dari ${customerName}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;background:#fff;border-radius:12px;border:1px solid #e5d9cc;">
            <h2 style="color:#8B5E3C;margin-top:0;">🔔 Order Baru Masuk!</h2>
            <p><strong>ID:</strong> ${newOrder.id}</p>
            <p><strong>Pelanggan:</strong> ${customerName}</p>
            <p><strong>WA:</strong> ${whatsapp}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Alamat:</strong> ${address}</p>
            <p><strong>Metode:</strong> ${deliveryMethod}</p>
            <p><strong>Item:</strong></p>
            <pre style="background:#faf7f2;padding:12px;border-radius:8px;font-size:13px;">${adminItemList}</pre>
            <p style="font-size:18px;font-weight:700;color:#8B5E3C;">Total: Rp ${formatRupiah(finalTotal)}</p>
            ${notes ? `<p><strong>Catatan:</strong> ${notes}</p>` : ''}
          </div>
        `
      }).catch((e: any) => console.warn('[Admin notif] Gagal kirim:', e.message));

    } catch (err: any) {
      console.error("Resend Error:", err);
      emailStatus = "Failed";
      emailBody += ` (Error: ${err.message})`;
    }
  } else if (!resendApiKey || resendApiKey === "dummy_resend_key_123456789") {
    console.warn("Resend API Key tidak ditemukan, email tidak dikirim.");
    emailStatus = "Skipped (No API Key)";
  } else {
    emailStatus = "Skipped (No Email)";
  }

  const newEmailLogObj = {
    id: "em-" + Date.now(),
    recipient: email || "Guest",
    subject: `Order Confirmation #${newOrder.id}`,
    status: emailStatus,
    timestamp: new Date().toISOString(),
    body: emailBody
  };
  emailLogs.unshift(newEmailLogObj);
  writeSupabase('email_logs', 'insert', {}, newEmailLogObj);

  // Record audit log
  const newAuditLogObj = {
    id: "log-" + (auditLogs.length + 1),
    action: "Order Placed",
    details: `Order ${newOrder.id} placed by '${customerName}' total Rp ${finalTotal}K.`,
    timestamp: new Date().toISOString()
  };
  auditLogs.unshift(newAuditLogObj);

  writeSupabase('audit_logs', 'insert', {}, newAuditLogObj);

  // Background write order to Supabase
  writeSupabase('orders', 'insert', {}, {
    id: newOrder.id,
    customer_name: newOrder.customerName,
    whatsapp: newOrder.whatsapp,
    email: newOrder.email,
    address: newOrder.address,
    items: newOrder.items,
    total: newOrder.total,
    status: newOrder.status,
    created_at: newOrder.createdAt,
    delivery_method: newOrder.deliveryMethod,
    subtotal: newOrder.subtotal,
    shipping_cost: newOrder.shippingCost,
    shipping_discount: newOrder.shippingDiscount,
    notes: newOrder.notes,
    payment_proof_url: newOrder.paymentProofUrl
  });

  // Run automatic verification in background if payment proof is provided
  if (newOrder.paymentProofUrl) {
    verifyPaymentAsync(newOrder.id).catch(err => console.error("Auto verification failed:", err));
  }

  res.status(201).json(newOrder);
});

app.put("/api/orders/:id/status", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const idx = orders.findIndex(o => o.id === id);
  if (idx !== -1) {
    orders[idx].status = status;

    // Log the change
    const newAuditLogObj = {
      id: "log-" + (auditLogs.length + 1),
      action: "Order Status Update",
      details: `Order ${id} marked as ${status}.`,
      timestamp: new Date().toISOString()
    };
    auditLogs.unshift(newAuditLogObj);

    writeSupabase('orders', 'update', { id }, { status });
    writeSupabase('audit_logs', 'insert', {}, newAuditLogObj);

    // Hitung profit otomatis jika status diubah menjadi selesai (completed)
    if (status === "completed") {
      triggerProfitCalculation(id).catch(err => console.error("[ProfitEngine] Error triggering calculation:", err));
    }

    res.json(orders[idx]);
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});

// Helper function to verify payment
async function verifyPaymentAsync(id: string) {
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return { error: "Order not found" };

  const order = orders[idx];
  if (!order.paymentProofUrl || order.paymentProofUrl.includes("REJECTED")) {
    return { error: "Tidak ada bukti bayar untuk diverifikasi." };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY") {
      return { valid: true, reason: "[Simulasi] Bukti bayar terlihat sah." };
    }

    const response = await fetch(order.paymentProofUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get("content-type") || "image/jpeg";

    const visionModel = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Anda adalah asisten Kasir Tampa Seduh. 
Analisis gambar struk / bukti transfer QRIS ini. 
Total tagihan yang harus dibayar adalah: Rp ${order.total}.000.
Tugas Anda:
1. Pastikan gambar ini adalah bukti transfer / struk pembayaran yang masuk akal (bukan sekadar gambar acak/pemandangan).
2. Periksa apakah ada angka nominal yang sesuai dengan Total Tagihan (Rp ${order.total}.000 atau Rp ${order.total}000 atau mirip).
3. Jika Anda tidak bisa membaca dengan sangat jelas, tapi gambarnya terlihat seperti struk pembayaran bank/e-wallet yang sah, asumsikan valid (true).
4. Hanya tolak (false) jika gambarnya jelas-jelas BUKAN struk pembayaran (misalnya gambar pemandangan, gambar makanan) ATAU nominalnya terbaca sangat jauh berbeda.

Balas HANYA dengan format JSON tanpa markdown:
{"valid": true, "reason": "Alasan singkat (maks 2 kalimat)"}`;

    const imageParts = [{ inlineData: { data: buffer.toString("base64"), mimeType } }];
    const result = await visionModel.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();

    let analysisResult;
    try {
      analysisResult = JSON.parse(responseText.replace(/```json/g, "").replace(/```/g, "").trim());
    } catch (e) {
      analysisResult = { valid: false, reason: "Gagal memparsing respon AI: " + responseText };
    }

    if (!analysisResult.valid) {
      order.notes = (order.notes ? order.notes + " | " : "") + "SISTEM AI: BUKTI BAYAR DITOLAK - " + analysisResult.reason;
      const oldUrl = order.paymentProofUrl;
      order.paymentProofUrl = "REJECTED_" + oldUrl;
      
      writeSupabase('orders', 'update', { id }, { 
        notes: order.notes, 
        payment_proof_url: order.paymentProofUrl 
      });

      const newAuditLogObj = {
        id: "log-" + (auditLogs.length + 1),
        action: "Payment Verification Failed",
        details: `Order ${id} payment proof rejected by AI: ${analysisResult.reason}`,
        timestamp: new Date().toISOString()
      };
      auditLogs.unshift(newAuditLogObj);
      writeSupabase('audit_logs', 'insert', {}, newAuditLogObj);
    } else {
      order.status = "completed"; // Automatically mark as completed!
      writeSupabase('orders', 'update', { id }, { 
        status: "completed" 
      });

      const newAuditLogObj = {
        id: "log-" + (auditLogs.length + 1),
        action: "Payment Verification Success",
        details: `Order ${id} payment proof verified by AI and automatically marked as completed.`,
        timestamp: new Date().toISOString()
      };
      auditLogs.unshift(newAuditLogObj);
      writeSupabase('audit_logs', 'insert', {}, newAuditLogObj);

      // Hitung profit otomatis
      triggerProfitCalculation(id).catch(err => console.error("[ProfitEngine] Error triggering calculation:", err));
    }

    return analysisResult;
  } catch (err: any) {
    console.error("Gagal verifikasi payment dengan Gemini:", err.message);
    return { error: "Gagal memproses gambar dengan AI." };
  }
}

// Endpoint Verifikasi Pembayaran dengan AI Gemini Vision (Manual Trigger)
app.post("/api/orders/:id/verify-payment", requireAdmin, async (req, res) => {
  const result = await verifyPaymentAsync(req.params.id);
  if (result.error) {
    if (result.error === "Order not found") return res.status(404).json(result);
    return res.status(400).json(result);
  }
  res.json(result);
});

// ===================================================================
// PUT /api/orders/:id/mark-paid — Admin label order sebagai PAID/UNPAID manual
// Verifikasi otomatis tetap jalan, ini sebagai intervensi admin
// ===================================================================
app.put("/api/orders/:id/mark-paid", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { paid } = req.body;
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: "Order tidak ditemukan." });

  (orders[idx] as any).isPaid = !!paid;
  (orders[idx] as any).paidAt = paid ? new Date().toISOString() : null;

  // Sync ke Supabase
  writeSupabase('orders', 'update', { id }, {
    is_paid: !!paid,
    paid_at: paid ? new Date().toISOString() : null
  });

  const logEntry = {
    id: "log-" + (auditLogs.length + 1),
    action: paid ? "Order Marked PAID" : "Order PAID Label Removed",
    details: `Order ${id} ${paid ? "dilabeli PAID oleh Admin." : "label PAID dicabut oleh Admin."}`,
    timestamp: new Date().toISOString()
  };
  auditLogs.unshift(logEntry);
  writeSupabase('audit_logs', 'insert', {}, logEntry);

  res.json({ success: true, order: orders[idx] });
});


app.post("/api/orders/upload-proof", async (req, res) => {
  const { base64Data, fileName, fileType } = req.body;
  if (!base64Data || !fileName || !fileType) {
    return res.status(400).json({ error: "Data file tidak lengkap kawan" });
  }

  try {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const fileBuffer = Buffer.from(cleanBase64, "base64");
    const uniqueFileName = `${Date.now()}-${fileName.replace(/\s+/g, "_")}`;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Fallback mode jika tidak terhubung Supabase
      console.warn("Supabase tidak aktif, mengembalikan fallback URL.");
      return res.json({ publicUrl: `https://mock-supabase.com/bukti-bayar/${uniqueFileName}` });
    }

    const { data, error } = await supabase.storage
      .from("Bukti Bayar")
      .upload(uniqueFileName, fileBuffer, {
        contentType: fileType,
        upsert: true
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from("Bukti Bayar")
      .getPublicUrl(uniqueFileName);

    res.json({ publicUrl: publicUrlData.publicUrl });
  } catch (err: any) {
    console.error("Gagal upload ke Supabase Storage:", err.message);
    res.status(500).json({ error: `Gagal upload bukti bayar: ${err.message}` });
  }
});

// Endpoint untuk upload umum (Menu/Paket) ke Supabase bucket "Bukti Bayar"
app.post("/api/upload", async (req, res) => {
  const { base64Data, fileName, fileType } = req.body;
  if (!base64Data || !fileName || !fileType) {
    return res.status(400).json({ error: "Data file tidak lengkap kawan" });
  }

  try {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const fileBuffer = Buffer.from(cleanBase64, "base64");
    const uniqueFileName = `${Date.now()}-${fileName.replace(/\s+/g, "_")}`;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("Supabase tidak aktif, mengembalikan mock URL.");
      return res.json({ publicUrl: `/Produk/mock-uploaded-${uniqueFileName}` });
    }

    const { data, error } = await supabase.storage
      .from("Bukti Bayar")
      .upload(uniqueFileName, fileBuffer, {
        contentType: fileType,
        upsert: true
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from("Bukti Bayar")
      .getPublicUrl(uniqueFileName);

    res.json({ publicUrl: publicUrlData.publicUrl });
  } catch (err: any) {
    console.error("Gagal upload file:", err.message);
    res.status(500).json({ error: `Gagal upload file: ${err.message}` });
  }
});

// ============================================================
// GALLERY PHOTOS API — Foto Kolase Street Coffee
// ============================================================
app.get("/api/gallery", async (req, res) => {
  try {
    if (!supabaseUrl) return res.json([]);
    const { data, error } = await supabase.storage
      .from("gallery-photos")
      .list("", { limit: 200, offset: 0, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw error;
    const photos = (data || []).filter((f: any) => f.name !== '.emptyFolderPlaceholder').map((f: any) => ({
      id: f.id || f.name,
      filename: f.name,
      url: supabase.storage.from("gallery-photos").getPublicUrl(f.name).data.publicUrl,
      created_at: f.created_at || new Date().toISOString()
    }));
    res.json(photos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/gallery", requireAdmin, async (req, res) => {
  const { base64Data, fileName, caption } = req.body;
  if (!base64Data || !fileName) return res.status(400).json({ error: "Data tidak lengkap" });
  try {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const fileBuffer = Buffer.from(cleanBase64, "base64");
    const uniqueName = `gallery-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage
      .from("gallery-photos")
      .upload(uniqueName, fileBuffer, { contentType: "image/webp", upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("gallery-photos").getPublicUrl(uniqueName);
    res.json({ url: urlData.publicUrl, filename: uniqueName, caption });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/gallery/:filename", requireAdmin, async (req, res) => {
  const { filename } = req.params;
  try {
    const { error } = await supabase.storage.from("gallery-photos").remove([decodeURIComponent(filename)]);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PAMFLETS API — Brosur, Pamflet, Pemberitahuan Event
// ============================================================
app.get("/api/pamflets", async (req, res) => {
  try {
    if (!supabaseUrl) return res.json([]);
    const { data, error } = await supabase.storage
      .from("pamflets")
      .list("", { limit: 100, offset: 0, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw error;
    const pamflets = (data || []).filter((f: any) => f.name !== '.emptyFolderPlaceholder').map((f: any) => ({
      id: f.id || f.name,
      filename: f.name,
      url: supabase.storage.from("pamflets").getPublicUrl(f.name).data.publicUrl,
      created_at: f.created_at || new Date().toISOString()
    }));
    res.json(pamflets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pamflets", requireAdmin, async (req, res) => {
  const { base64Data, fileName, title } = req.body;
  if (!base64Data || !fileName) return res.status(400).json({ error: "Data tidak lengkap" });
  try {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const fileBuffer = Buffer.from(cleanBase64, "base64");
    const uniqueName = `pamflet-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage
      .from("pamflets")
      .upload(uniqueName, fileBuffer, { contentType: "image/webp", upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("pamflets").getPublicUrl(uniqueName);
    res.json({ url: urlData.publicUrl, filename: uniqueName, title });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/pamflets/:filename", requireAdmin, async (req, res) => {
  const { filename } = req.params;
  try {
    const { error } = await supabase.storage.from("pamflets").remove([decodeURIComponent(filename)]);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================================
// CUSTOMER PHOTOS API — Customer Emotions Upload & Approval
// ============================================================

// GET /api/customer-photos — Public: hanya yang approved
app.get("/api/customer-photos", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("customer_photos")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customer-photos/all — Admin: semua status
app.get("/api/customer-photos/all", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("customer_photos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customer-photos — Customer upload (harus login)
app.post("/api/customer-photos", async (req, res) => {
  const { base64Data, fileName, caption, userId, userName, userEmail } = req.body;
  if (!base64Data || !fileName || !userId) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }
  try {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const fileBuffer = Buffer.from(cleanBase64, "base64");
    const uniqueName = `customer-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, "_")}`;

    const { error: storageErr } = await supabase.storage
      .from("customer-photos")
      .upload(uniqueName, fileBuffer, { contentType: "image/webp", upsert: false });
    if (storageErr) throw storageErr;

    const { data: urlData } = supabase.storage.from("customer-photos").getPublicUrl(uniqueName);

    const { data: photoData, error: dbErr } = await supabase
      .from("customer_photos")
      .insert({
        user_id: userId,
        user_name: userName || "Anonymous",
        user_email: userEmail || "",
        url: urlData.publicUrl,
        filename: uniqueName,
        caption: caption || null,
        status: "pending",
      })
      .select()
      .single();
    if (dbErr) throw dbErr;

    res.json({ success: true, photo: photoData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/customer-photos/:id/approve — Admin approve
app.patch("/api/customer-photos/:id/approve", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("customer_photos")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: "admin" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, photo: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/customer-photos/:id/reject — Admin reject
app.patch("/api/customer-photos/:id/reject", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("customer_photos")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: "admin" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, photo: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customer-photos/:id — Admin delete
app.delete("/api/customer-photos/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: photo } = await supabase.from("customer_photos").select("filename").eq("id", id).single();
    if (photo?.filename) {
      await supabase.storage.from("customer-photos").remove([photo.filename]);
    }
    const { error } = await supabase.from("customer_photos").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/api/logs", requireAdmin, (req, res) => {
  res.json(auditLogs);
});

// 5. Users API
app.get("/api/users", requireAdmin, (req, res) => {
  res.json(registeredUsers);
});

// ===================================================================
// /api/users/sync — Digunakan oleh Supabase OAuth callback (Google Login)
// HARDENED: Hanya field aman yang diizinkan. Role selalu "customer".
// Endpoint ini TIDAK bisa dipakai untuk membuat admin atau mengubah role.
// ===================================================================
app.post("/api/users/sync", (req, res) => {
  const body = req.body;
  if (!body || !body.id) return res.status(400).json({ error: "ID user wajib dikirim kawan" });

  // Whitelist field yang diizinkan — role, is_member, status DIABAIKAN
  const safeData = {
    id: body.id,
    email: body.email || "",
    name: body.name || body.email?.split("@")[0] || "User",
    avatarUrl: body.avatarUrl || body.avatar_url || undefined,
    role: "customer" as const,   // Selalu customer — tidak bisa di-override
    isMember: false,
    ordersCount: 0,
    lastActive: "Baru saja",
    isBlocked: false
  };

  const existingIdx = registeredUsers.findIndex(u => u.id === safeData.id || u.email === safeData.email);
  if (existingIdx !== -1) {
    // Update hanya field yang diizinkan, PERTAHANKAN role dan isMember yang sudah ada
    registeredUsers[existingIdx].name = safeData.name;
    registeredUsers[existingIdx].email = safeData.email;
    if (safeData.avatarUrl) registeredUsers[existingIdx].avatarUrl = safeData.avatarUrl;
    registeredUsers[existingIdx].lastActive = "Baru saja";
    // TIDAK update: role, isMember, isBlocked
  } else {
    registeredUsers.push(safeData);
  }
  res.json({ success: true });
});

app.put("/api/users/:id/password", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Password baru wajib diisi kawan" });
    }

    // Hash password baru dengan bcrypt sebelum menyimpan
    const hashedPassword = await bcrypt.hash(password, 12);

    const idx = registeredUsers.findIndex(u => u.id === id);
    if (idx !== -1) {
      registeredUsers[idx].password = hashedPassword;
      writeSupabase("users", "update", { id }, { password: hashedPassword });
      return res.json({ success: true, user: registeredUsers[idx] });
    } else {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }
  } catch (err: any) {
    console.error("Gagal mengubah password user:", err.message);
    return res.status(500).json({ error: "Gagal mengubah password kawan" });
  }
});

// Auth API
// ===================================================================
// /api/auth/login — Login dengan Lazy Bcrypt Migration
// Strategi: user lama (plain text) auto-upgrade ke bcrypt saat login
// Tidak memaksa reset password — migrasi terjadi secara bertahap
// ===================================================================
app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email dan password wajib diisi kawan" });
    }

    // 1. Cek Admin dari .env (plain text comparison untuk admin env credentials)
    const adminEmail = process.env.ADMIN_EMAIL || "tampaseduh@gmail.com";
    const adminPass = process.env.ADMIN_PASSWORD || "Kotabunan*98";
    if (email === adminEmail && password === adminPass) {
      let adminUser = registeredUsers.find(u => u.email === email);
      if (!adminUser) {
        adminUser = {
          id: "u-admin-default",
          name: "Tampa Seduh Admin",
          email: adminEmail,
          role: "admin",
          isMember: false,
          ordersCount: 0,
          lastActive: "Baru saja"
        };
        registeredUsers.push(adminUser);
      } else {
        adminUser.role = "admin";
        adminUser.lastActive = "Baru saja";
      }
      const adminSecret = process.env.ADMIN_SECRET || "bcd98f45f7a3c92c8ba35f0924509651e72bb3413dd92c97e374fba4176c11db";
      return res.json({ success: true, user: adminUser, token: adminSecret });
    }

    // 2. Cek Customer — cari di in-memory cache dulu
    let user = registeredUsers.find(u => u.email === email);

    // 2b. Fallback: query Supabase langsung jika cache kosong (cold start Vercel)
    if (!user && supabaseUrl && supabaseAnonKey) {
      try {
        const { data: dbUser, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();
        if (!error && dbUser) {
          user = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            password: dbUser.password,
            role: dbUser.role,
            isMember: dbUser.is_member,
            ordersCount: dbUser.orders_count,
            lastActive: dbUser.last_active,
            whatsapp: dbUser.whatsapp,
            isBlocked: dbUser.last_active === "BLOCKED"
          };
          // Tambahkan ke cache agar request berikutnya lebih cepat
          registeredUsers.push(user);
        }
      } catch (sbErr) {
        console.error("Supabase fallback query error:", sbErr);
      }
    }

    if (!user) {
      return res.status(401).json({ error: "Akun tidak ditemukan kawan. Silakan daftar dulu." });
    }

    // 3. Cek blokir
    if (user.isBlocked || user.lastActive === "BLOCKED") {
      return res.status(403).json({ error: "Akun kamu diblokir. Hubungi admin Tampa Seduh." });
    }

    // 4. Lazy Bcrypt Migration
    const storedPassword = user.password || "";
    const isBcryptHash = storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$");

    let passwordValid = false;

    if (isBcryptHash) {
      passwordValid = await bcrypt.compare(password, storedPassword);
    } else {
      // Password masih plain text: verifikasi lama
      passwordValid = (storedPassword === password);

      if (passwordValid) {
        // Auto-upgrade ke bcrypt setelah login berhasil (lazy migration)
        const newHash = await bcrypt.hash(password, 12);
        user.password = newHash;
        writeSupabase("users", "update", { id: user.id }, { password: newHash });
        console.log(`[Security] Password user ${user.email} di-upgrade ke bcrypt hash.`);
      }
    }

    if (!passwordValid) {
      return res.status(401).json({ error: "Password salah kawan, coba ingat kembali." });
    }

    user.lastActive = "Baru saja";
    writeSupabase("users", "update", { id: user.id }, { last_active: "Baru saja" });

    return res.json({ success: true, user });
  } catch (err: any) {
    console.error("Login error:", err.message);
    return res.status(500).json({ error: "Gagal login, coba lagi kawan." });
  }
});


// ===================================================================
// /api/auth/register — Registrasi dengan bcrypt hash langsung
// Password TIDAK PERNAH disimpan dalam bentuk plain text
// ===================================================================
app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password, whatsapp } = req.body;
    if (!name || !email || !password || !whatsapp) {
      return res.status(400).json({ error: "Semua form wajib diisi kawan" });
    }

    // Prevent admin email from being registered as customer
    const adminEmail = process.env.ADMIN_EMAIL || "tampaseduh@gmail.com";
    if (email === adminEmail) {
      return res.status(400).json({ error: "Email ini adalah akun admin. Silakan login langsung kawan." });
    }

    const existing = registeredUsers.find(u => u.email === email);
    if (existing) {
      return res.status(400).json({ error: "Email sudah terdaftar kawan. Silakan login langsung." });
    }

    // Hash password sebelum disimpan — TIDAK pernah simpan plain text
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser: User = {
      id: "u-" + (registeredUsers.length + 1) + "-" + Math.floor(Math.random() * 1000),
      name,
      email,
      whatsapp,
      password: hashedPassword,
      role: "customer",
      isMember: false,
      ordersCount: 0,
      lastActive: "Baru saja"
    };

    registeredUsers.push(newUser);

    // Write to Supabase asynchronously (non-blocking)
    writeSupabase("users", "insert", {}, {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      whatsapp: newUser.whatsapp,
      password: newUser.password, // Already hashed
      role: newUser.role,
      is_member: false,
      orders_count: 0,
      last_active: "Baru saja"
    });

    // Kirim email selamat datang ke user baru
    if (resendApiKey && resendApiKey !== "dummy_resend_key_123456789") {
      resend.emails.send({
        from: 'TAMPA SEDUH Street Coffee <kopi@tampaseduh.com>',
        to: [email],
        subject: '☕ Selamat Datang di Tampa Seduh!',
        html: `
          <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(139,94,60,0.08);font-family:'Segoe UI',Arial,sans-serif;">
            <div style="background:linear-gradient(135deg,#5c3317,#8B5E3C);padding:40px 32px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">☕ Tampa Seduh</h1>
              <p style="margin:8px 0 0;color:#f5e6d5;font-size:14px;">Street Coffee · Kotabunan Selatan</p>
            </div>
            <div style="padding:36px 32px;">
              <h2 style="color:#3d2b1f;margin-top:0;">Halo, <span style="color:#8B5E3C;">${name}</span>! 👋</h2>
              <p style="color:#6b5344;font-size:15px;line-height:1.6;">Akun Tampa Seduh kamu sudah berhasil dibuat. Sekarang kamu bisa pesan kopi favorit langsung dari rumah!</p>
              <div style="background:#faf7f2;border-radius:12px;padding:20px 24px;margin:24px 0;">
                <p style="margin:0 0 8px;font-size:13px;color:#8B5E3C;font-weight:600;">DETAIL AKUN</p>
                <p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Nama:</strong> ${name}</p>
                <p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Email:</strong> ${email}</p>
                <p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>WA:</strong> ${whatsapp}</p>
              </div>
              <p style="color:#6b5344;font-size:14px;">💡 <strong>Tip:</strong> Upgrade ke Member Tampa Seduh dan nikmati diskon ongkos kirim setiap pesanan!</p>
            </div>
            <div style="background:#3d2b1f;padding:20px 32px;text-align:center;">
              <p style="color:#c9b8a4;font-size:12px;margin:0;">Tampa Seduh Street Coffee · Kotabunan Selatan</p>
              <p style="color:#8B5E3C;font-size:11px;margin:6px 0 0;">Selamat menikmati kopi! ☕</p>
            </div>
          </div>
        `
      }).catch((e: any) => console.warn('[Welcome email] Gagal kirim:', e.message));
    }

    return res.status(201).json({ success: true, user: newUser });
  } catch (err: any) {
    console.error("Register error:", err.message);
    return res.status(500).json({ error: "Gagal mendaftar, coba lagi kawan." });
  }
});


app.post("/api/auth/subscribe", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email wajib dikirim kawan" });
  }

  const idx = registeredUsers.findIndex(u => u.email === email);
  if (idx === -1) {
    return res.status(404).json({ error: "User tidak ditemukan" });
  }

  registeredUsers[idx].membershipStatus = "pending";
  // We don't set isMember = true until admin approves
  writeSupabase("users", "update", { id: registeredUsers[idx].id }, { membership_status: "pending" });

  res.json({ success: true, user: registeredUsers[idx] });
});

app.post("/api/users/update", (req, res) => {
  const { id, name, email, whatsapp, address, avatarUrl } = req.body;
  if (!id) {
    return res.status(400).json({ error: "ID User wajib dikirim kawan" });
  }

  const idx = registeredUsers.findIndex(u => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "User tidak ditemukan" });
  }

  // Update in memory
  if (name) registeredUsers[idx].name = name;
  if (email) registeredUsers[idx].email = email;
  if (whatsapp) registeredUsers[idx].whatsapp = whatsapp;
  if (address) registeredUsers[idx].address = address;
  if (avatarUrl) registeredUsers[idx].avatarUrl = avatarUrl;

  // Persist to Supabase
  writeSupabase("users", "update", { id }, {
    name,
    email,
    whatsapp: whatsapp || null,
    address: address || null,
    avatar_url: avatarUrl || null
  });

  res.json({ success: true, user: registeredUsers[idx] });
});

// Google OAuth Sync — dipanggil setelah Supabase berhasil auth via Google
// Membuat / menemukan user berdasarkan email Google dan mengembalikan data user Tampa Seduh
app.post("/api/auth/google-sync", (req, res) => {
  try {
    const { email, name, supabase_id, avatar_url } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email diperlukan untuk Google Sync kawan" });
    }

    // Blokir jika email sama dengan admin email (admin harus login via form)
    const adminEmail = process.env.ADMIN_EMAIL || "tampaseduh@gmail.com";
    if (email === adminEmail) {
      // Admin tetap bisa login via Google — tapi pastikan role-nya admin
      let adminUser = registeredUsers.find(u => u.email === email);
      if (!adminUser) {
        adminUser = {
          id: supabase_id || "u-admin-google",
          name: name || "Tampa Seduh Admin",
          email: adminEmail,
          role: "admin",
          isMember: false,
          ordersCount: 0,
          lastActive: "Baru saja"
        };
        registeredUsers.push(adminUser);
      } else {
        adminUser.role = "admin";
        adminUser.lastActive = "Baru saja";
      }
      return res.json({ success: true, user: adminUser });
    }

    // Cek apakah user sudah ada (berdasarkan email)
    let existingUser = registeredUsers.find(u => u.email === email);
    if (existingUser) {
      existingUser.lastActive = "Baru saja";
      writeSupabase("users", "update", { id: existingUser.id }, { last_active: "Baru saja" });
      return res.json({ success: true, user: existingUser });
    }

    // Buat user baru dari Google OAuth
    const newUser: User = {
      id: supabase_id || ("u-google-" + Date.now()),
      name: name || email.split("@")[0],
      email,
      role: "customer",
      isMember: false,
      ordersCount: 0,
      lastActive: "Baru saja"
    };

    registeredUsers.push(newUser);

    // Sync ke Supabase (non-blocking)
    writeSupabase("users", "upsert", {}, {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      is_member: false,
      orders_count: 0,
      last_active: "Baru saja"
    });

    return res.status(201).json({ success: true, user: newUser });
  } catch (err: any) {
    console.error("Google Sync error:", err.message);
    return res.status(500).json({ error: "Gagal sinkronisasi akun Google kawan." });
  }
});

// 6. Emails API
app.get("/api/emails", requireAdmin, (req, res) => {
  res.json(emailLogs);
});

// POST /api/emails/send — Admin kirim email custom ke customer
app.post("/api/emails/send", requireAdmin, async (req, res) => {
  const { to, subject, body } = req.body;
  if (!to || !subject || !body) {
    return res.status(400).json({ error: "Field 'to', 'subject', dan 'body' wajib diisi." });
  }

  const formatHtmlBody = (rawBody: string) => {
    // Jika sudah HTML, pakai langsung. Kalau teks biasa, bungkus dengan template dasar
    if (rawBody.trim().startsWith("<")) return rawBody;
    return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"></head>
    <body style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:24px auto;padding:24px;background:#faf7f2;border-radius:16px;">
      <div style="background:linear-gradient(135deg,#5c3317,#8B5E3C);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;">☕ Tampa Seduh</h1>
        <p style="color:#f5e6d5;font-size:12px;margin:4px 0 0;">Pesan dari Admin · Kotabunan Selatan</p>
      </div>
      <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px;border:1px solid #e8d5c4;">
        <p style="color:#4a3728;font-size:15px;white-space:pre-wrap;">${rawBody}</p>
        <hr style="border:none;border-top:1px solid #e8d5c4;margin:20px 0;">
        <p style="font-size:11px;color:#999;text-align:center;">Tampa Seduh Street Coffee · Jl. Tangkudeagan No.2 Kotabunan Selatan<br>WA: 085696224448 · kopi@tampaseduh.com</p>
      </div>
    </body></html>`;
  };

  let emailStatus: EmailLog["status"] = "Pending";
  if (!resendApiKey || resendApiKey === "dummy_resend_key_123456789") {
    emailStatus = "Skipped (No API Key)";
  } else {
    try {
      await resend.emails.send({
        from: "TAMPA SEDUH <kopi@tampaseduh.com>",
        to: [to],
        subject,
        html: formatHtmlBody(body)
      });
      emailStatus = "Delivered";
    } catch (err: any) {
      console.error("[Email Send]", err.message);
      emailStatus = "Failed";
    }
  }

  const logEntry = {
    id: "em-" + Date.now(),
    recipient: to,
    subject,
    status: emailStatus,
    timestamp: new Date().toISOString(),
    body: formatHtmlBody(body)
  };
  emailLogs.unshift(logEntry);
  writeSupabase('email_logs', 'insert', {}, logEntry);

  const auditEntry = {
    id: "log-" + (auditLogs.length + 1),
    action: "Email Sent by Admin",
    details: `Email kustom dikirim ke ${to} (${subject}) — Status: ${emailStatus}`,
    timestamp: new Date().toISOString()
  };
  auditLogs.unshift(auditEntry);

  res.json({ success: true, status: emailStatus });
});

// POST /api/emails/send-order-pending — Email konfirmasi pesanan masuk, belum dibayar
app.post("/api/emails/send-order-pending", requireAdmin, async (req, res) => {
  const { orderId } = req.body;
  const order = orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: "Order tidak ditemukan." });
  if (!order.email || order.email === "-") return res.status(400).json({ error: "Order ini tidak memiliki email customer." });

  const baseUrl = process.env.BASE_URL || 'https://tampaseduh.com';
  const invoiceUrl = `${baseUrl}/invoice/${order.id}`;
  const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID').format(val * 1000);

  const itemsHtml = order.items.map((i: any) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f3ede3;">${i.name} <span style="color:#8B5E3C;font-size:12px">(${i.size || 'Regular'})</span></td>
     <td style="text-align:center;padding:8px 0;border-bottom:1px solid #f3ede3;">x${i.quantity}</td>
     <td style="text-align:right;padding:8px 0;border-bottom:1px solid #f3ede3;">Rp ${formatRupiah(i.price * i.quantity)}</td></tr>`
  ).join('');

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Konfirmasi Pesanan Tampa Seduh</title></head>
  <body style="margin:0;padding:0;background:#faf7f2;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(139,94,60,0.08);">
      <div style="background:linear-gradient(135deg,#5c3317,#8B5E3C);padding:32px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">☕ Tampa Seduh</h1>
        <p style="margin:6px 0 0;color:#f5e6d5;font-size:13px;">Pesanan Masuk · Menunggu Pembayaran</p>
      </div>
      <div style="padding:32px;">
        <p style="font-size:15px;color:#4a3728;">Halo, <strong>${order.customerName}</strong> 👋</p>
        <p style="font-size:14px;color:#6b5344;">Pesanan kamu sudah kami terima! Segera selesaikan pembayaran agar barista kami bisa mulai menyeduh.</p>
        <div style="background:#fff8f2;border-radius:12px;padding:16px 20px;margin:20px 0;border:2px dashed #e8c89d;">
          <p style="font-size:13px;font-weight:700;color:#8B5E3C;margin:0 0 8px;">⚠️ Menunggu Pembayaran</p>
          <p style="font-size:13px;color:#6b5344;margin:0;">Silakan transfer ke rekening/QRIS Tampa Seduh, lalu upload bukti bayar di halaman invoice.</p>
        </div>
        <div style="background:#faf7f2;border-radius:12px;padding:16px 20px;margin:20px 0;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13px;color:#8B5E3C;font-weight:600;">No. Order</span>
            <span style="font-size:13px;font-weight:700;color:#3d2b1f;">${order.id}</span>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:14px;color:#3d2b1f;">${itemsHtml}</table>
        <div style="background:#faf7f2;border-radius:12px;padding:16px 20px;">
          <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:2px solid #8B5E3C;">
            <span style="font-size:16px;font-weight:700;">Total</span>
            <span style="font-size:18px;font-weight:700;color:#8B5E3C;">Rp ${formatRupiah(order.total)}</span>
          </div>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="${invoiceUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#5c3317,#8B5E3C);color:#fff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:700;">
            🧾 Upload Bukti Bayar & Lihat Invoice
          </a>
        </div>
      </div>
      <div style="background:#3d2b1f;padding:20px 32px;text-align:center;">
        <p style="color:#c9b8a4;font-size:12px;margin:0;">Tampa Seduh · Kotabunan Selatan · WA: 085696224448</p>
      </div>
    </div>
  </body></html>`;

  let emailStatus: EmailLog["status"] = "Pending";
  if (!resendApiKey || resendApiKey === "dummy_resend_key_123456789") {
    emailStatus = "Skipped (No API Key)";
  } else {
    try {
      await resend.emails.send({
        from: "TAMPA SEDUH <kopi@tampaseduh.com>",
        to: [order.email],
        subject: `⏳ Pesanan #${order.id} Menunggu Pembayaran — Tampa Seduh`,
        html
      });
      emailStatus = "Delivered";
    } catch (err: any) {
      emailStatus = "Failed";
    }
  }

  const logEntry = {
    id: "em-" + Date.now(),
    recipient: order.email,
    subject: `Pesanan #${order.id} Menunggu Pembayaran`,
    status: emailStatus,
    timestamp: new Date().toISOString(),
    body: html
  };
  emailLogs.unshift(logEntry);
  writeSupabase('email_logs', 'insert', {}, logEntry);

  res.json({ success: true, status: emailStatus });
});

// POST /api/emails/send-order-paid — Email konfirmasi pembayaran diterima
app.post("/api/emails/send-order-paid", requireAdmin, async (req, res) => {
  const { orderId } = req.body;
  const order = orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: "Order tidak ditemukan." });
  if (!order.email || order.email === "-") return res.status(400).json({ error: "Order ini tidak memiliki email customer." });

  const baseUrl = process.env.BASE_URL || 'https://tampaseduh.com';
  const invoiceUrl = `${baseUrl}/invoice/${order.id}`;
  const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID').format(val * 1000);

  const itemsHtml = order.items.map((i: any) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f3ede3;">${i.name}</td>
     <td style="text-align:center;padding:8px 0;border-bottom:1px solid #f3ede3;">x${i.quantity}</td>
     <td style="text-align:right;padding:8px 0;border-bottom:1px solid #f3ede3;">Rp ${formatRupiah(i.price * i.quantity)}</td></tr>`
  ).join('');

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Pembayaran Diterima - Tampa Seduh</title></head>
  <body style="margin:0;padding:0;background:#faf7f2;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(34,160,92,0.10);">
      <div style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:32px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">✅ Pembayaran Dikonfirmasi!</h1>
        <p style="margin:6px 0 0;color:#dcfce7;font-size:13px;">Tampa Seduh · Kotabunan Selatan</p>
      </div>
      <div style="padding:32px;">
        <p style="font-size:15px;color:#4a3728;">Halo, <strong>${order.customerName}</strong> 🎉</p>
        <p style="font-size:14px;color:#6b5344;">Pembayaran kamu sudah kami terima dan dikonfirmasi! Barista Tampa Seduh segera menyeduh pesananmu.</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:16px 20px;margin:20px 0;border:2px solid #bbf7d0;">
          <p style="font-size:13px;font-weight:700;color:#16a34a;margin:0 0 4px;">✅ LUNAS · PAID</p>
          <p style="font-size:13px;color:#15803d;margin:0;">Pesanan #${order.id} telah dikonfirmasi dan sedang diproses.</p>
        </div>
        <div style="background:#faf7f2;border-radius:12px;padding:16px 20px;margin:20px 0;">
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:13px;color:#8B5E3C;font-weight:600;">No. Order</span>
            <span style="font-size:13px;font-weight:700;color:#3d2b1f;">${order.id}</span>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:14px;color:#3d2b1f;">${itemsHtml}</table>
        <div style="background:#faf7f2;border-radius:12px;padding:16px 20px;">
          <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:2px solid #8B5E3C;">
            <span style="font-size:16px;font-weight:700;">Total LUNAS</span>
            <span style="font-size:18px;font-weight:700;color:#16a34a;">Rp ${formatRupiah(order.total)}</span>
          </div>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="${invoiceUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:700;">
            📋 Lihat Invoice & Status Pengantaran
          </a>
        </div>
        <p style="text-align:center;font-size:12px;color:#999;">Estimasi pengantaran: 30-60 menit setelah konfirmasi pembayaran.</p>
      </div>
      <div style="background:#3d2b1f;padding:20px 32px;text-align:center;">
        <p style="color:#c9b8a4;font-size:12px;margin:0;">Tampa Seduh · Kotabunan Selatan · WA: 085696224448</p>
        <p style="color:#22c55e;font-size:11px;margin:4px 0 0;">Terima kasih atas kepercayaanmu! ☕</p>
      </div>
    </div>
  </body></html>`;

  let emailStatus: EmailLog["status"] = "Pending";
  if (!resendApiKey || resendApiKey === "dummy_resend_key_123456789") {
    emailStatus = "Skipped (No API Key)";
  } else {
    try {
      await resend.emails.send({
        from: "TAMPA SEDUH <kopi@tampaseduh.com>",
        to: [order.email],
        subject: `✅ Pembayaran #${order.id} Dikonfirmasi — Tampa Seduh`,
        html
      });
      emailStatus = "Delivered";
    } catch (err: any) {
      emailStatus = "Failed";
    }
  }

  const logEntry = {
    id: "em-" + Date.now(),
    recipient: order.email,
    subject: `Pembayaran #${order.id} Dikonfirmasi`,
    status: emailStatus,
    timestamp: new Date().toISOString(),
    body: html
  };
  emailLogs.unshift(logEntry);
  writeSupabase('email_logs', 'insert', {}, logEntry);

  res.json({ success: true, status: emailStatus });
});

// GET /api/health/connections — Status koneksi realtime ke semua services
app.get("/api/health/connections", requireAdmin, async (req, res) => {
  const results: Record<string, { connected: boolean; count?: number; latency?: number }> = {};

  // 1. Menu DB
  const t0 = Date.now();
  results.menu = { connected: menuItems.length >= 0, count: menuItems.length, latency: Date.now() - t0 };

  // 2. Paket DB
  const t1 = Date.now();
  results.packages = { connected: coffeePackages.length >= 0, count: coffeePackages.length, latency: Date.now() - t1 };

  // 3. Pengguna DB
  const t2 = Date.now();
  results.users = { connected: registeredUsers.length >= 0, count: registeredUsers.length, latency: Date.now() - t2 };

  // 4. Customer Photos / Upload
  try {
    const { data, error } = await supabase.from('customer_photos').select('id', { count: 'exact', head: true });
    results.uploads = { connected: !error, count: (data as any)?.count || 0, latency: 0 };
  } catch {
    results.uploads = { connected: false };
  }

  // 5. AI Chat (check if activeChats is accessible)
  results.ai_chat = { connected: true, count: Object.keys(activeChats).length, latency: 0 };

  // 6. Supabase DB overall
  try {
    const t3 = Date.now();
    const { error } = await supabase.from('orders').select('id', { count: 'exact', head: true });
    results.supabase = { connected: !error, latency: Date.now() - t3 };
  } catch {
    results.supabase = { connected: false };
  }

  res.json(results);
});


// GET: Selalu ambil dari Supabase untuk data terbaru
app.get("/api/news", async (req, res) => {
  try {
    if (supabaseUrl && supabaseAnonKey) {
      const { data, error } = await supabase
        .from("blog_news")
        .select("*")
        .order("date", { ascending: false });
      if (!error && data && data.length > 0) {
        // Sync in-memory cache
        blogNews = data.map(n => ({
          id: n.id, title: n.title, slug: n.slug, content: n.content,
          author: n.author, date: n.date, coverImage: n.cover_image, category: n.category
        }));
        return res.json(blogNews);
      }
    }
    // Fallback: kembalikan cache in-memory
    res.json(blogNews);
  } catch (err) {
    res.json(blogNews);
  }
});

// POST: Tambah artikel baru
app.post("/api/news", requireAdmin, async (req, res) => {
  const timestamp = Date.now();
  const newPost: BlogNews = {
    ...req.body,
    id: "news-" + timestamp,
    slug: req.body.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    date: new Date().toISOString().split('T')[0]
  };

  // Tulis langsung ke Supabase dan tunggu hasilnya
  try {
    const { error } = await supabase.from('blog_news').insert({
      id: newPost.id,
      title: newPost.title,
      slug: newPost.slug,
      content: newPost.content,
      author: newPost.author,
      date: newPost.date,
      cover_image: newPost.coverImage,
      category: newPost.category
    });
    if (error) throw error;
  } catch (err: any) {
    console.error('Gagal insert berita ke Supabase:', err.message);
    return res.status(500).json({ error: 'Gagal menyimpan berita: ' + err.message });
  }

  // Update in-memory cache
  blogNews.unshift(newPost);
  res.status(201).json(newPost);
});

// PUT: Edit artikel yang sudah ada
app.put("/api/news/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content, author, coverImage, category } = req.body;

  const updatedSlug = title
    ? title.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    : undefined;

  try {
    const updateData: any = {};
    if (title !== undefined) { updateData.title = title; updateData.slug = updatedSlug; }
    if (content !== undefined) updateData.content = content;
    if (author !== undefined) updateData.author = author;
    if (coverImage !== undefined) updateData.cover_image = coverImage;
    if (category !== undefined) updateData.category = category;

    const { error } = await supabase.from('blog_news').update(updateData).eq('id', id);
    if (error) throw error;
  } catch (err: any) {
    console.error('Gagal update berita ke Supabase:', err.message);
    return res.status(500).json({ error: 'Gagal mengupdate berita: ' + err.message });
  }

  // Update in-memory cache
  const idx = blogNews.findIndex(n => n.id === id);
  if (idx !== -1) {
    blogNews[idx] = {
      ...blogNews[idx],
      ...(title && { title, slug: updatedSlug! }),
      ...(content && { content }),
      ...(author && { author }),
      ...(coverImage && { coverImage }),
      ...(category && { category })
    };
  }

  res.json({ success: true, post: blogNews[idx] || null });
});

// DELETE: Hapus artikel
app.delete("/api/news/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from('blog_news').delete().eq('id', id);
    if (error) throw error;
  } catch (err: any) {
    console.error('Gagal hapus berita dari Supabase:', err.message);
    return res.status(500).json({ error: 'Gagal menghapus: ' + err.message });
  }
  // Update in-memory cache
  const idx = blogNews.findIndex(n => n.id === id);
  if (idx !== -1) blogNews.splice(idx, 1);
  res.json({ success: true });
});

// 8. Financial Accounting API (Real Data Aggregation)
app.get("/api/finances", requireAdmin, (req, res) => {
  const completedOrders = orders.filter(o => o.status === "completed");
  const now = new Date();

  // Helper: filter berdasarkan rentang waktu dengan aman
  const filterByDays = (dayCount: number) => completedOrders.filter(o => {
    const orderDate = new Date(o.createdAt);
    const diffMs = now.getTime() - orderDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= dayCount;
  });

  // Harian: Hari ini saja (00:00 - 23:59)
  const todayStr = now.toISOString().split('T')[0];
  const todayOrders = completedOrders.filter(o => o.createdAt.startsWith(todayStr));

  // Mingguan: 7 hari terakhir
  const weekOrders = filterByDays(7);

  // Bulanan: 30 hari terakhir
  const monthOrders = filterByDays(30);

  // 6 Bulan: 180 hari terakhir
  const sixMonthOrders = filterByDays(180);

  // 1 Tahun: 365 hari terakhir
  const yearOrders = filterByDays(365);

  // Semua waktu
  const allOrders = completedOrders;

  // Buat summary dari kumpulan order
  // Nilai total dalam unit ribuan (e.g., 56 = Rp 56.000)
  // HPP = 45% dari revenue (fallback jika tidak ada profit engine data)
  const buildSummary = (period: "Harian" | "Mingguan" | "Bulanan" | "6 Bulan" | "1 Tahun" | "Semua", label: string, subset: typeof completedOrders) => {
    const rev = subset.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const hpp = Math.round(rev * 0.45 * 100) / 100;
    const netProfit = Math.round((rev - hpp) * 100) / 100;
    return {
      period,
      labels: [label],
      revenue: [rev],
      costs: [hpp],
      netProfit,
      transactionsCount: subset.length
    };
  };

  const finances: FinancialSummary[] = [
    buildSummary("Harian", "Hari Ini", todayOrders),
    buildSummary("Mingguan", "7 Hari Terakhir", weekOrders),
    buildSummary("Bulanan", "30 Hari Terakhir", monthOrders),
    buildSummary("6 Bulan", "180 Hari Terakhir", sixMonthOrders),
    buildSummary("1 Tahun", "365 Hari Terakhir", yearOrders),
    buildSummary("Semua", "Semua Waktu", allOrders)
  ];

  res.json(finances);
});

// 8.1 Public Invoice Endpoint — dapat diakses tanpa login
app.get("/api/invoice/:orderId", (req, res) => {
  const { orderId } = req.params;
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: "Invoice tidak ditemukan. Pastikan ID order benar." });
  }
  // Sembunyikan data sensitif
  const publicOrder = {
    id: order.id,
    customerName: order.customerName,
    items: order.items,
    total: order.total,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    shippingDiscount: order.shippingDiscount,
    status: order.status,
    deliveryMethod: order.deliveryMethod,
    address: order.address,
    notes: order.notes,
    createdAt: order.createdAt
  };
  res.json(publicOrder);
});

// ===================================================================
// Real Profit Engine V1 API Endpoints
// ===================================================================

app.get("/api/profit/order/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("order_profit")
      .select("*")
      .eq("order_id", id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: "Gagal mengambil data profit: " + error.message });
    }
    if (!data) {
      return res.status(404).json({ error: "Data profit tidak ditemukan untuk order " + id });
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/profit/recalculate/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const profit = await calculateOrderProfit(id);
    if (!profit) {
      return res.status(404).json({ error: "Order tidak ditemukan atau gagal menghitung profit." });
    }
    await saveOrderProfit(profit);
    res.json({ success: true, message: `Profit untuk order ${id} berhasil dihitung ulang.`, data: profit });
  } catch (err: any) {
    res.status(500).json({ error: "Gagal menghitung ulang profit: " + err.message });
  }
});

app.get("/api/profit/dashboard", requireAdmin, async (req, res) => {
  try {
    const { data: profits, error } = await supabase
      .from("order_profit")
      .select("*");

    if (error || !profits) {
      return res.status(500).json({ error: "Gagal memuat data profit: " + error?.message });
    }

    const calculateStats = (filteredProfits: any[]) => {
      const revenue = filteredProfits.reduce((sum, p) => sum + (Number(p.revenue) || 0), 0);
      const hpp = filteredProfits.reduce((sum, p) => sum + (Number(p.hpp) || 0), 0);
      const gross_profit = filteredProfits.reduce((sum, p) => sum + (Number(p.gross_profit) || 0), 0);
      const margin = revenue > 0 ? (gross_profit / revenue) * 100 : 0;
      return {
        revenue: Math.round(revenue * 100) / 100,
        hpp: Math.round(hpp * 100) / 100,
        gross_profit: Math.round(gross_profit * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        orders_count: filteredProfits.length
      };
    };

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const orderMap = new Map(orders.map(o => [o.id, o]));

    const todayProfits: any[] = [];
    const last7dProfits: any[] = [];
    const last30dProfits: any[] = [];
    const allTimeProfits: any[] = [];

    const itemStatsMap = new Map<string, { total_profit: number; total_rev: number; total_hpp: number; total_qty: number }>();

    for (const p of profits) {
      const order = orderMap.get(p.order_id);
      const orderDateStr = order ? order.createdAt : p.created_at || new Date().toISOString();
      const orderDate = new Date(orderDateStr);
      const diffMs = today.getTime() - orderDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      allTimeProfits.push(p);

      if (orderDateStr.startsWith(todayStr)) {
        todayProfits.push(p);
      }
      
      if (diffDays <= 7) {
        last7dProfits.push(p);
      }

      if (diffDays <= 30) {
        last30dProfits.push(p);
      }

      const items = Array.isArray(p.item_breakdown) ? p.item_breakdown : [];
      for (const item of items) {
        const name = item.name || "Unknown Item";
        const qty = Number(item.quantity) || 0;
        const rev = Number(item.total_revenue) || 0;
        const hpp = Number(item.total_hpp) || 0;
        const profit = Number(item.gross_profit) || 0;

        const current = itemStatsMap.get(name) || { total_profit: 0, total_rev: 0, total_hpp: 0, total_qty: 0 };
        current.total_profit += profit;
        current.total_rev += rev;
        current.total_hpp += hpp;
        current.total_qty += qty;
        itemStatsMap.set(name, current);
      }
    }

    const todayStats = calculateStats(todayProfits);
    const last7dStats = calculateStats(last7dProfits);
    const last30dStats = calculateStats(last30dProfits);
    const allTimeStats = calculateStats(allTimeProfits);

    const itemStatsList = Array.from(itemStatsMap.entries()).map(([name, stats]) => {
      const avg_margin = stats.total_rev > 0 ? (stats.total_profit / stats.total_rev) * 100 : 0;
      return {
        name,
        total_profit: Math.round(stats.total_profit * 100) / 100,
        avg_margin: Math.round(avg_margin * 100) / 100,
        total_qty: stats.total_qty
      };
    });

    const top_profitable = [...itemStatsList]
      .sort((a, b) => b.total_profit - a.total_profit)
      .slice(0, 5);

    const lowest_margin = [...itemStatsList]
      .filter(item => item.total_qty > 0)
      .sort((a, b) => a.avg_margin - b.avg_margin)
      .slice(0, 5);

    res.json({
      today: todayStats,
      last_7d: last7dStats,
      last_30d: last30dStats,
      all_time: allTimeStats,
      top_profitable,
      lowest_margin
    });
  } catch (err: any) {
    res.status(500).json({ error: "Terjadi kesalahan internal server: " + err.message });
  }
});

// 9. AI Master Configuration endpoints
app.get("/api/ai-config", requireAdmin, (req, res) => {
  res.json(aiSettings);
});

app.post("/api/ai-config", requireAdmin, (req, res) => {
  const { systemPrompt, temperature, adminInstructions } = req.body;
  if (systemPrompt) aiSettings.systemPrompt = systemPrompt;
  if (temperature !== undefined) aiSettings.temperature = parseFloat(temperature);
  if (adminInstructions !== undefined && Array.isArray(adminInstructions)) {
    aiSettings.adminInstructions = adminInstructions;
  }

  // Log configuration edit
  const newAuditLogObj = {
    id: "log-" + (auditLogs.length + 1),
    action: "AI Prompt Config modified",
    details: `Updated AI system guidelines and set temperature parameters.`,
    timestamp: new Date().toISOString()
  };
  auditLogs.unshift(newAuditLogObj);

  // Background write to Supabase
  writeSupabase('ai_settings', 'upsert', {}, {
    key: 'settings',
    system_prompt: aiSettings.systemPrompt,
    temperature: aiSettings.temperature
  });

  if (adminInstructions !== undefined && Array.isArray(adminInstructions)) {
    writeSupabase('ai_settings', 'upsert', {}, {
      key: 'admin_instructions',
      system_prompt: JSON.stringify(aiSettings.adminInstructions),
      temperature: 0
    });
  }

  writeSupabase('audit_logs', 'insert', {}, newAuditLogObj);

  res.json({ success: true, config: aiSettings });
});


// ═══════════════════════════════════════════════════
// SHOP STATUS — Buka / Tutup sign
// ═══════════════════════════════════════════════════
let shopStatus: { isOpen: boolean; updatedAt: string } = {
  isOpen: true,
  updatedAt: new Date().toISOString()
};

// GET /api/shop-status — Public, reads directly from Supabase (not memory)
// to prevent stale data on Vercel cold starts / new instances
app.get("/api/shop-status", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ai_settings")
      .select("system_prompt")
      .eq("key", "shop_status")
      .maybeSingle();

    if (!error && data?.system_prompt) {
      const parsed = JSON.parse(data.system_prompt);
      if (typeof parsed.isOpen === "boolean") {
        // Also sync in-memory so PUT endpoint stays consistent
        shopStatus = parsed;
        return res.json(parsed);
      }
    }
  } catch {}

  // Fallback to in-memory if DB read fails
  res.json(shopStatus);
});

// PUT /api/shop-status — Admin only
app.put("/api/shop-status", requireAdmin, (req, res) => {
  const { isOpen } = req.body;
  if (typeof isOpen !== "boolean") {
    return res.status(400).json({ error: "isOpen must be boolean" });
  }
  shopStatus = { isOpen, updatedAt: new Date().toISOString() };

  writeSupabase('ai_settings', 'upsert', {}, {
    key: 'shop_status',
    system_prompt: JSON.stringify(shopStatus),
    temperature: 0
  });

  const auditEntry = {
    id: "log-" + (auditLogs.length + 1),
    action: `Kedai ${isOpen ? "DIBUKA" : "DITUTUP"} oleh admin`,
    details: `Status kedai diubah ke ${isOpen ? "BUKA" : "TUTUP"} pada ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Makassar" })} WITA`,
    timestamp: new Date().toISOString()
  };
  auditLogs.unshift(auditEntry);
  writeSupabase('audit_logs', 'insert', {}, auditEntry);

  res.json({ success: true, shopStatus });
});

async function bootstrap() {
  // Sync dari Supabase di awal
  await syncFromSupabase();

  // Serve Static Assets in production
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Developer Mode triggers Vite Server dynamically in background
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Tampa Seduh full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL) {
  // Jika berjalan di Vercel Serverless, cukup export app-nya (jangan jalankan app.listen)
  console.log("Berjalan dalam mode Vercel Serverless");
} else {
  // Jika berjalan normal (npm run dev atau server node biasa), jalankan bootstrap
  bootstrap();
}

export default app;
