import express from "express";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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

// Gunakan DummyWS agar Vercel Serverless tidak crash akibat module "ws" native
class DummyWS {
    constructor() {}
    send() {}
    close() {}
}

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

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security Hardening: Helmet
app.use(helmet({
  crossOriginResourcePolicy: false, // Membiarkan resource (gambar) diakses lintas origin jika diperlukan
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

// Helper: Sync with Supabase if tables exist
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
      supabase.from("ai_settings").select("*").eq("key", "settings")
    ]);

    if (!menuRes.error && menuRes.data) {
      if (menuRes.data.length > 0) {
        menuItems = menuRes.data.map(m => ({
          id: m.id, name: m.name, priceReg: m.price_reg, priceLarge: m.price_large,
          isHot: m.is_hot, isAvailable: m.is_available, image: m.image, description: m.description
        }));
      } else {
        // Seed database
        console.log("Seeding menu_items...");
        menuItems.forEach(m => writeSupabase("menu", "insert", {}, {
          id: m.id, name: m.name, price_reg: m.priceReg, price_large: m.priceLarge,
          is_hot: m.isHot, is_available: m.isAvailable, image: m.image, description: m.description
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
          id: o.id, customerName: o.customer_name, whatsapp: o.whatsapp, email: o.email,
          address: o.address, items: o.items, total: o.total, status: o.status,
          createdAt: o.created_at, deliveryMethod: o.delivery_method, subtotal: o.subtotal,
          shippingCost: o.shipping_cost, shippingDiscount: o.shipping_discount, notes: o.notes,
          paymentProofUrl: o.payment_proof_url
        }));
      } else {
        console.log("Seeding orders...");
        orders.forEach(o => writeSupabase("orders", "insert", {}, {
          id: o.id, customer_name: o.customerName, whatsapp: o.whatsapp, email: o.email,
          address: o.address, items: o.items, total: o.total, status: o.status,
          created_at: o.createdAt, delivery_method: o.deliveryMethod, subtotal: o.subtotal,
          shipping_cost: o.shippingCost, shipping_discount: o.shippingDiscount, notes: o.notes,
          payment_proof_url: o.paymentProofUrl
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
      aiSettings.systemPrompt = aiRes.data[0].system_prompt;
      aiSettings.temperature = aiRes.data[0].temperature;
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
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.37.53.jpeg",
    description: "Kopi susu tradisional disajikan panas, memadukan bubuk kopi kuat dan kental manis."
  },
  {
    id: "m11",
    name: "Saraba",
    priceReg: 10,
    isHot: true,
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.44.57.jpeg",
    description: "Minuman jahe legendaris khas Sulawesi Utara diramu dengan susu, rempah-rempah herbal, dan gula merah."
  },
  {
    id: "m12",
    name: "Lemon Tea Hot",
    priceReg: 13,
    isHot: true,
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.29.46.jpeg",
    description: "Teh hitam hangat klasik disajikan dengan perasan lemon segar untuk menghangatkan badan."
  },
  {
    id: "m13",
    name: "Matcha Hot",
    priceReg: 15,
    isHot: true,
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.20.53.jpeg",
    description: "Teh hijau matcha Jepang hangat dengan foam susu lembut yang wangi menenangkan pikiran."
  },
  {
    id: "m14",
    name: "Coklat Hot",
    priceReg: 15,
    isHot: true,
    isAvailable: true,
    image: "/Produk/WhatsApp Image 2026-06-11 at 00.24.22.jpeg",
    description: "Cokelat murni hangat khas daerah tropis, bertekstur kental manis-pahit yang meluapkan relaksasi."
  },
  {
    id: "m-roti-coklat",
    name: "Roti Kampung Coklat",
    priceReg: 4,
    isHot: false,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=500",
    description: "Roti kampung legendaris khas Kotabunan dengan isian pasta cokelat manis lumer."
  },
  {
    id: "m-roti-balak",
    name: "Roti Kampung Balak",
    priceReg: 4,
    isHot: false,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500",
    description: "Roti kampung polos bertekstur padat lembut, sangat cocok dicelup ke kopi susu atau jahe Saraba."
  },
  {
    id: "m-roti-moka",
    name: "Roti Kampung Moka",
    priceReg: 4,
    isHot: false,
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
  { id: "log-1", action: "System Boot", details: "Tampa Seduh server backend launched successfully.", timestamp: "2026-06-19T08:00:00.000Z" },
  { id: "log-2", action: "Order Placed", details: "Order ORD-9281 submitted by Andika Pratama.", timestamp: "2026-06-19T10:30:00.000Z" },
  { id: "log-3", action: "Order Completed", details: "Order ORD-9281 marked as Completed by Admin.", timestamp: "2026-06-19T11:00:00.000Z" },
  { id: "log-4", action: "Order Placed", details: "Order ORD-9282 submitted by Siti Rahma.", timestamp: "2026-06-19T22:15:00.000Z" },
  { id: "log-5", action: "Order Placed", details: "Order ORD-9283 submitted by Rivaldo Pontoh.", timestamp: "2026-06-20T03:05:00.000Z" }
];

let registeredUsers: User[] = [
  { id: "u-admin", name: "Mochammad Rifai (Owner)", email: "kopi@tampaseduh.com", role: "admin", ordersCount: 0, lastActive: "Baru saja" },
  { id: "u-1", name: "Andika Pratama", email: "andika@gmail.com", role: "customer", ordersCount: 1, lastActive: "1 hari yang lalu" },
  { id: "u-2", name: "Siti Rahma", email: "siti.rahma@yahoo.com", role: "customer", ordersCount: 1, lastActive: "2 jam yang lalu" },
  { id: "u-3", name: "Rivaldo Pontoh", email: "rivaldo@outlook.co.id", role: "customer", ordersCount: 1, lastActive: "30 menit yang lalu" },
  { id: "u-4", name: "Jane Moningka", email: "jane.m@gmail.com", role: "customer", ordersCount: 0, lastActive: "3 hari yang lalu" }
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

let emailLogs: EmailLog[] = [
  { id: "em-1", recipient: "andika@gmail.com", subject: "Tagihan Order Tampa Seduh #ORD-9281", status: "Delivered", timestamp: "2026-06-19T10:31:00.000Z", body: "Konfirmasi invoice untuk 2x Ice Coffe TPS (L) seharga Rp 40.000." },
  { id: "em-2", recipient: "siti.rahma@yahoo.com", subject: "Sistem Pengantaran Kurir Tampa Seduh #ORD-9282", status: "Sent", timestamp: "2026-06-19T22:16:00.000Z", body: "Kopi Anda sedang dalam perjalanan menuju Kampung Baru Indah, Kotabunan Selatan." },
  { id: "em-3", recipient: "rivaldo@outlook.co.id", subject: "Pesanan Masuk Kedai Kopi Tampa Seduh #ORD-9283", status: "Sent", timestamp: "2026-06-20T03:06:00.000Z", body: "Pesanan Anda terdaftar di sistem kami dan sedang menunggu antrean konfirmasi baris barista." }
];

// Configuration for AI Master
let aiSettings = {
  systemPrompt: `Anda adalah AI Assistant resmi dari "Tampa Seduh", kedai kopi kebanggaan di Jl. Tangkudeagan No. 2 Kotabunan Selatan, Bolaang Mongondow Timur (Boltim), Sulawesi Utara.
  
PERAN DAN NADA BICARA:
- Gunakan bahasa Kotabunan / Manado sehari-hari secara default agar terasa dekat dengan warga lokal (seperti penggunaan kata: ngana, kita, pe, jo, mar, kong, dkk).
- Gunakan bahasa Indonesia yang baik, sopan, ramah, dan bersahabat jika pengguna menggunakan bahasa Indonesia baku atau berasal dari luar daerah.
- Selalu tampil antusias, hangat, dan sangat memahami dunia perkopian.

INFORMASI KEDAI TAMPA SEDUH:
- Alamat: Jl. Tangkudeagan No. 2 Kotabunan Selatan, Trans Sulawesi Lingkar Selatan.
- Kontak Admin/WA: 085696224448
- Email: kopi@tampaseduh.com
- Jam Operasional Kedai: Setiap hari, 18.00 WITA - 24.00 WITA.
- Layanan Pesan Antar (Delivery): Aktif 24 jam!

PRODUK DAN HARGA (Biji Kopi andalan: Liberica Kotabunan, manis aroma nangka/jackfruit, oak smoky, low acid, aman di lambung):
1. Minuman Dingin (Ice):
   - Ice Coffe TPS (Rp 15K Reg / 20K Large) - Kopi susu blend spesial manis seimbang.
   - Ice Coffe Brown Sugar (Rp 18K Reg / 23K Large) - Kopi susu gula aren asli Sulawesi.
   - Ice Coffe Vanila (Rp 18K Reg / 23K Large)
   - Ice Americano (Rp 15K Reg / 20K Large)
   - Ice Matcha, Ice Coklat, Ice Lemon Tea (Rp 18K Reg / 23K Large)
   - Ice Strawberry (Rp 20K Reg / 25K Large)
2. Minuman Panas (Hot):
   - Americano Hot (Rp 10K)
   - Coffe Susu Hot (Rp 10K Reg / 12K Large)
   - Saraba (Rp 10K) - Minuman jahe herbal khas Sulawesi, gula merah, sangat sehat.
   - Lemon Tea Hot (Rp 13K), Matcha Hot & Coklat Hot (Rp 15K)
3. Roti Pendamping (Rp 4K):
   - Roti Kampung Coklat, Roti Kampung Balak (polos, enak dicelup kopi/saraba), Roti Kampung Moka.

PAKET HEMAT (COFFEE PACKAGES):
- Paket "Begadang Santai" (Rp 35K): 2x Ice Coffe TPS + 2 Roti Balak.
- Paket "Nongkrong Ramean" (Rp 85K): 5x Es Kopi (Brown Sugar/TPS/Vanila) + 5 Roti Bebas Pilih. (Cocok untuk acara kantor).

CARA MEMESAN MELALUI WEBSITE:
1. Pelanggan cukup memilih produk di halaman utama dan klik "Tambah ke Keranjang" (ikon keranjang kuning).
2. Setelah selesai memilih, klik ikon keranjang di kanan atas layar untuk masuk ke proses Checkout.
3. Di sana, isi Nama, WhatsApp, Email, dan Alamat Lengkap. Pilih metode antar (Delivery/Ambil Sendiri).
4. Klik "Pesan Sekarang". Invoice tagihan akan otomatis dikirim ke Email pelanggan.
5. Admin kami akan langsung memproses dan mengantarkannya ke depan pintu rumah!

TUGAS ANDA:
- Pandu pelanggan cara memesan jika mereka bingung.
- Berikan rekomendasi menu terbaik sesuai selera mereka (misal: kalau cuaca dingin rekomendasikan Saraba atau Kopi Susu Panas).
- Jawab segala keluhan atau pertanyaan dengan solutif.
- Terus belajar dan adaptif menjawab pertanyaan sekitar Kotabunan / Boltim.`,
  temperature: 0.7,
};

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

    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: aiSettings.systemPrompt },
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
app.get("/api/chat-admin/sessions", (req, res) => {
  res.json(Object.values(activeChats));
});

app.post("/api/chat-admin/sabotage", (req, res) => {
  const { sessionId, sabotage } = req.body;
  if (activeChats[sessionId]) {
    activeChats[sessionId].isSabotaged = sabotage;
    res.json({ success: true, session: activeChats[sessionId] });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

app.post("/api/chat-admin/send", (req, res) => {
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
app.get("/api/menu", async (req, res) => {
  if (supabaseUrl) {
    const { data, error } = await supabase.from('menu').select('*');
    if (!error && data) {
      menuItems = data.map(m => ({
        id: m.id, name: m.name, priceReg: m.price_reg, priceLarge: m.price_large,
        isHot: m.is_hot, isAvailable: m.is_available, image: m.image, description: m.description
      }));
    }
  }
  res.json(menuItems);
});

app.post("/api/menu", (req, res) => {
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

app.put("/api/menu/:id", (req, res) => {
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

app.put("/api/users/:id/block", (req, res) => {
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

app.put("/api/users/:id/approve-membership", (req, res) => {
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

app.delete("/api/menu/:id", (req, res) => {
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
app.get("/api/packages", async (req, res) => {
  if (supabaseUrl) {
    const { data, error } = await supabase.from('packages').select('*');
    if (!error && data) {
      coffeePackages = data;
    }
  }
  res.json(coffeePackages);
});

app.post("/api/packages", (req, res) => {
  const newPack: CoffeePackage = {
    ...req.body,
    id: "p" + (coffeePackages.length + 1)
  };
  coffeePackages.push(newPack);

  // Background write to Supabase
  writeSupabase('packages', 'insert', {}, newPack);

  res.status(201).json(newPack);
});

app.put("/api/packages/:id", (req, res) => {
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

app.delete("/api/packages/:id", (req, res) => {
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
  if (!customerName || !whatsapp || !address || !items || !items.length) {
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
    whatsapp,
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
  const customerIdx = registeredUsers.findIndex(u => (email && u.email === email) || u.name === customerName);
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
      email: email || `${customerName.toLowerCase().replace(/\s+/g, "")}@example.com`,
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

  if (email && email !== "-" && resendApiKey) {
    try {
      const itemsHtml = items.map((i: any) => `<li>${i.name} (${i.size || 'Regular'}) x${i.quantity} - Rp ${i.price * i.quantity}.000</li>`).join('');
      const invoiceHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #8B5E3C; text-align: center;">INVOICE TAMPA SEDUH</h2>
          <p>Halo <strong>${customerName}</strong>,</p>
          <p>Terima kasih telah memesan kopi di Tampa Seduh! Berikut adalah detail pesanan Anda (Order #${newOrder.id}):</p>
          <ul>
            ${itemsHtml}
          </ul>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Subtotal:</strong> Rp ${finalSubtotal}.000</p>
          <p><strong>Ongkir:</strong> Rp ${finalShippingCost}.000</p>
          <p><strong>Diskon Member:</strong> -Rp ${shippingDiscount}.000</p>
          <h3><strong>Total Tagihan:</strong> Rp ${finalTotal}.000</h3>
          <p><strong>Metode Pengantaran:</strong> ${deliveryMethod}</p>
          <p><strong>Alamat:</strong> ${address}</p>
          ${notes ? `<p><strong>Catatan:</strong> ${notes}</p>` : ''}
          <br/>
          <p>Pesanan Anda sedang kami proses kawan!</p>
          <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">Tampa Seduh Street Coffee, Kotabunan Selatan</p>
        </div>
      `;

      await resend.emails.send({
        from: 'TAMPA SEDUH Street Coffee <kopi@tampaseduh.com>',
        to: [email],
        subject: `Invoice Pesanan #${newOrder.id} - Tampa Seduh`,
        html: invoiceHtml
      });
      emailStatus = "Delivered";
    } catch (err: any) {
      console.error("Resend Error:", err);
      emailStatus = "Failed";
      emailBody += ` (Error: ${err.message})`;
    }
  } else if (!resendApiKey) {
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

app.put("/api/orders/:id/status", (req, res) => {
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
    }

    return analysisResult;
  } catch (err: any) {
    console.error("Gagal verifikasi payment dengan Gemini:", err.message);
    return { error: "Gagal memproses gambar dengan AI." };
  }
}

// Endpoint Verifikasi Pembayaran dengan AI Gemini Vision (Manual Trigger)
app.post("/api/orders/:id/verify-payment", async (req, res) => {
  const result = await verifyPaymentAsync(req.params.id);
  if (result.error) {
    if (result.error === "Order not found") return res.status(404).json(result);
    return res.status(400).json(result);
  }
  res.json(result);
});

// Endpoint untuk upload bukti bayar ke Supabase bucket "Bukti Bayar"
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

// 4. Logs API
app.get("/api/logs", (req, res) => {
  res.json(auditLogs);
});

// 5. Users API
app.get("/api/users", (req, res) => {
  res.json(registeredUsers);
});

app.put("/api/users/:id/password", (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Password baru wajib diisi kawan" });
    }

    const idx = registeredUsers.findIndex(u => u.id === id);
    if (idx !== -1) {
      registeredUsers[idx].password = password;
      writeSupabase("users", "update", { id }, { password });
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
app.post("/api/auth/login", authLimiter, (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email dan password wajib diisi kawan" });
    }

    // 1. Cek Admin dari .env
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
        // Make sure role is admin even if synced from Supabase
        adminUser.role = "admin";
      }
      return res.json({ success: true, user: adminUser });
    }

    // 2. Cek Customer
    const user = registeredUsers.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: "Akun tidak ditemukan kawan. Silakan daftar dulu." });
    }

    if (user.password !== password) {
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


app.post("/api/auth/register", authLimiter, (req, res) => {
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

    const newUser: User = {
      id: "u-" + (registeredUsers.length + 1) + "-" + Math.floor(Math.random() * 1000),
      name,
      email,
      password,
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
      password: newUser.password,
      role: newUser.role,
      is_member: false,
      orders_count: 0,
      last_active: "Baru saja"
    });

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
app.get("/api/emails", (req, res) => {
  res.json(emailLogs);
});

// 7. Blog/News API
app.get("/api/news", (req, res) => {
  res.json(blogNews);
});

app.post("/api/news", (req, res) => {
  const newPost: BlogNews = {
    ...req.body,
    id: "news-" + (blogNews.length + 1),
    slug: req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    date: new Date().toISOString().split('T')[0]
  };
  blogNews.unshift(newPost);

  // Background write to Supabase
  writeSupabase('blog_news', 'insert', {}, {
    id: newPost.id,
    title: newPost.title,
    slug: newPost.slug,
    content: newPost.content,
    author: newPost.author,
    date: newPost.date,
    cover_image: newPost.coverImage,
    category: newPost.category
  });

  res.status(201).json(newPost);
});

// 8. Financial Accounting API (Real Data Aggregation)
app.get("/api/finances", (req, res) => {
  const completedOrders = orders.filter(o => o.status === "completed");
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalCosts = totalRevenue * 0.45; // Asumsi Modal 45% dari omset
  const netProfit = totalRevenue - totalCosts;

  // We will build dynamic buckets based on the actual dates of orders
  // However, to keep the UI shape consistent, we can define standard labels
  
  // 1. Harian (Today)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todayOrders = completedOrders.filter(o => o.createdAt.startsWith(todayStr));
  const dailyRev = todayOrders.reduce((sum, o) => sum + o.total, 0);

  // 2. Mingguan (Last 7 days)
  const weekRev = completedOrders.filter(o => {
    const diff = (today.getTime() - new Date(o.createdAt).getTime()) / (1000 * 3600 * 24);
    return diff <= 7;
  }).reduce((sum, o) => sum + o.total, 0);

  // Default empty shell
  const createEmptyShell = (period: "Harian" | "Mingguan" | "Bulanan" | "6 Bulan" | "1 Tahun" | "Semua", label: string, rev: number) => ({
    period,
    labels: [label],
    revenue: [rev],
    costs: [rev * 0.45],
    netProfit: rev - (rev * 0.45),
    transactionsCount: completedOrders.length
  });

  const finances: FinancialSummary[] = [
    createEmptyShell("Harian", "Hari Ini", dailyRev),
    createEmptyShell("Mingguan", "7 Hari Terakhir", weekRev),
    createEmptyShell("Bulanan", "Bulan Ini", totalRevenue), // simplifies month calculation
    createEmptyShell("6 Bulan", "Semester Ini", totalRevenue),
    createEmptyShell("1 Tahun", "Tahun Ini", totalRevenue),
    createEmptyShell("Semua", "Semua Waktu", totalRevenue)
  ];

  res.json(finances);
});

// 9. AI Master Configuration endpoints
app.get("/api/ai-config", (req, res) => {
  res.json(aiSettings);
});

app.post("/api/ai-config", (req, res) => {
  const { systemPrompt, temperature } = req.body;
  if (systemPrompt) aiSettings.systemPrompt = systemPrompt;
  if (temperature !== undefined) aiSettings.temperature = parseFloat(temperature);

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
  writeSupabase('audit_logs', 'insert', {}, newAuditLogObj);

  res.json({ success: true, config: aiSettings });
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
