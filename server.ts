import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { MenuItem, CoffeePackage, Order, AuditLog, User, BlogNews, EmailLog, FinancialSummary } from "./src/types.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=60",
    description: "Susu gurih dipadu espresso blend spesial khas Tampa Seduh. Kaya rasa dan manis seimbang."
  },
  {
    id: "m2",
    name: "Ice Coffe Brown Sugar",
    priceReg: 18,
    priceLarge: 23,
    isHot: false,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1534706936964-119b829b1486?w=500&auto=format&fit=crop&q=60",
    description: "Kopi susu espresso creamy dengan lelehan gula aren murni Sulawesi yang legit."
  },
  {
    id: "m3",
    name: "Ice Coffe Vanila",
    priceReg: 18,
    priceLarge: 23,
    isHot: false,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=500&auto=format&fit=crop&q=60",
    description: "Kombinasi espresso aromatik, susu dingin, dan sirup vanila lembut beraroma manis surgawi."
  },
  {
    id: "m4",
    name: "Ice Americano",
    priceReg: 15,
    priceLarge: 20,
    isHot: false,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60",
    description: "Double shot espresso Liberica-Arabica disiram air es jernih penenang dahaga."
  },
  {
    id: "m5",
    name: "Ice Mathca",
    priceReg: 18,
    priceLarge: 23,
    isHot: false,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=60",
    description: "Matcha green tea organik impor beraroma teh segar alami bersatu dengan susu creamy dingin."
  },
  {
    id: "m6",
    name: "Ice Coklat",
    priceReg: 18,
    priceLarge: 23,
    isHot: false,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=500&auto=format&fit=crop&q=60",
    description: "Cokelat hitam premium produksi lokal dengan sensasi manis-pahit cokelat asli."
  },
  {
    id: "m7",
    name: "Ice Lemon Tea",
    priceReg: 18,
    priceLarge: 23,
    isHot: false,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60",
    description: "Seduhan teh hitam pilihan dipadu perasan jeruk lemon segar kental berlimpah es."
  },
  {
    id: "m8",
    name: "Ice Strawberry",
    priceReg: 20,
    priceLarge: 25,
    isHot: false,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1497534446932-c925b458314e?w=500&auto=format&fit=crop&q=60",
    description: "Minuman buah stroberi murni asam manis, diramu susu murni, menyegarkan suasana siang."
  },

  // HOT DRINKS
  {
    id: "m9",
    name: "Aericano Hot",
    priceReg: 10,
    isHot: true,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&auto=format&fit=crop&q=60",
    description: "Espresso murni aromatik diseduh air panas membara, menghadirkan rasa asli biji kopi pilihan."
  },
  {
    id: "m10",
    name: "Coffe Susu Hot",
    priceReg: 10,
    priceLarge: 12,
    isHot: true,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=60",
    description: "Kopi susu tradisional disajikan panas, memadukan bubuk kopi kuat dan kental manis."
  },
  {
    id: "m11",
    name: "Saraba",
    priceReg: 10,
    isHot: true,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=60",
    description: "Minuman jahe legendaris khas Sulawesi Utara diramu dengan susu, rempah-rempah herbal, dan gula merah."
  },
  {
    id: "m12",
    name: "Lemon Tea Hot",
    priceReg: 13,
    isHot: true,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=60",
    description: "Teh hitam hangat klasik disajikan dengan perasan lemon segar untuk menghangatkan badan."
  },
  {
    id: "m13",
    name: "Matcha Hot",
    priceReg: 15,
    isHot: true,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=500&auto=format&fit=crop&q=60",
    description: "Teh hijau matcha Jepang hangat dengan foam susu lembut yang wangi menenangkan pikiran."
  },
  {
    id: "m14",
    name: "Coklat Hot",
    priceReg: 15,
    isHot: true,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=500&auto=format&fit=crop&q=60",
    description: "Cokelat murni hangat khas daerah tropis, bertekstur kental manis-pahit yang meluapkan relaksasi."
  }
];

let coffeePackages: CoffeePackage[] = [
  {
    id: "p1",
    name: "Duo Seduh Sore",
    price: 28,
    items: ["m1", "m1"],
    description: "Beli dua Ice Coffe TPS reguler lebih murah untuk dinikmati berdua saat santai.",
    badge: "Terlaris"
  },
  {
    id: "p2",
    name: "Paket Melek Lembur",
    price: 25,
    items: ["m4", "m11"],
    description: "Kombinasi menyehatkan antara Ice Americano segar dan Saraba jahe hangat tradisional.",
    badge: "Energik"
  },
  {
    id: "p3",
    name: "Paket Rame-Rame",
    price: 65,
    items: ["m1", "m2", "m3", "m6"],
    description: "4 minuman best seller dingin (TPS, Brown Sugar, Vanila, Coklat) untuk kumpul seru.",
    badge: "Pesta"
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
  systemPrompt: `Kamu adalah asisten digital virtual dari "Tampa Seduh", kedai kopi legendaris di Jl. Tangkudeagan No. 2 Kotabunan Selatan, Bolaang Mongondow Timur, Trans Sulawesi Lingkar Selatan.
Fokus kedai adalah minuman kopi dingin nikmat seperti Ice Coffe TPS, Ice Coffe Brown Sugar, dan kopi panas tradisional serta "Saraba" (minuman jahe rempah khas).
Biji kopi andalan kita adalah "Liberica Kotabunan" yang terkenal dengan rasa manis aroma nangka (jackfruit), buah-buahan tropis, aroma kayu oak yang smoky, dan bodi tebal namun rendah kafein & bersahabat bagi lambung.
Informasi Tambahan:
- Alamat: Jl. Tangkudeagan No. 2 Kotabunan Selatan.
- WA Admin: 085696224448.
- Email: kopi@tampaseduh.com.
- Jam Buka: Setiap hari pukul 10.00 WITA - 23.00 WITA.
- Jika pelanggan ingin memesan langsung online, beri tahu mereka bahwa mereka bisa langsung mengklik tombol "Order Sekarang" yang ada di landing page untuk memicu formulir popup yang otomatis terkirim ke barista kami.

Jawablah dengan bahasa Indonesia yang ramah, sopan, bersahabat, penuh gairah kopi, dan logat khas Sulawesi Utara yang santun jika memungkinkan (misal memakai sapaan kawan, mar, mo, dll, namun tetap profesional!). Balaslah secara ringkas dan informatif.`,
  temperature: 0.7,
};

// API: AI Chat Handler using modern GoogleGenAI SDK
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array required" });
  }

  // Retrieve the client-submitted questions or last message
  const lastMessage = messages[messages.length - 1]?.text || "Halo";

  // Re-map messages to candidates style or use simple chats interface
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      // Simulate/Mock responding when Gemini API Key is missing so developers face zero startup blockage
      console.warn("GEMINI_API_KEY environment variable is not configured. Simulating AI response.");
      
      const textResponse = simulateTampaSeduhAI(lastMessage);
      return res.json({
        text: textResponse,
        modelUsed: "Simulated Local Model (No API Key)"
      });
    }

    // Modern SDK usage guidelines applied (httpOptions User-Agent telemetry injected)
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // We build the full context using systemPrompt + conversation history
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `${aiSettings.systemPrompt}\n\nPercakapan sejauh ini:\n${messages.map((m: any) => `${m.role === 'user' ? 'User' : 'TampaSeduh'}: ${m.text}`).join('\n')}\nTampaSeduh:`,
      config: {
        temperature: aiSettings.temperature,
      }
    });

    res.json({
      text: response.text || "Aduh, maaf jo, ada sedikit gangguan jaringan di kuala. Coba ketik ulang kembali?",
      modelUsed: "gemini-3.5-flash"
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

// 1. Menu API
app.get("/api/menu", (req, res) => {
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

    res.json(menuItems[idx]);
  } else {
    res.status(404).json({ error: "Menu item not found" });
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

    res.json({ success: true, item: deleted });
  } else {
    res.status(404).json({ error: "Menu item not found" });
  }
});

// 2. Packages API
app.get("/api/packages", (req, res) => {
  res.json(coffeePackages);
});

app.post("/api/packages", (req, res) => {
  const newPack: CoffeePackage = {
    ...req.body,
    id: "p" + (coffeePackages.length + 1)
  };
  coffeePackages.push(newPack);
  res.status(201).json(newPack);
});

app.put("/api/packages/:id", (req, res) => {
  const { id } = req.params;
  const idx = coffeePackages.findIndex(p => p.id === id);
  if (idx !== -1) {
    coffeePackages[idx] = { ...coffeePackages[idx], ...req.body };
    res.json(coffeePackages[idx]);
  } else {
    res.status(404).json({ error: "Package not found" });
  }
});

app.delete("/api/packages/:id", (req, res) => {
  const { id } = req.params;
  coffeePackages = coffeePackages.filter(p => p.id !== id);
  res.json({ success: true });
});

// 3. Orders API
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

app.post("/api/orders", (req, res) => {
  const { customerName, whatsapp, email, address, items, total } = req.body;
  if (!customerName || !whatsapp || !address || !items || !items.length) {
    return res.status(400).json({ error: "Missing required order data" });
  }

  const newOrder: Order = {
    id: "ORD-" + Math.floor(1000 + Math.random() * 9000),
    customerName,
    whatsapp,
    email: email || "-",
    address,
    items,
    total,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  orders.unshift(newOrder);

  // Update customer's order limit and logs
  const customerIdx = registeredUsers.findIndex(u => (email && u.email === email) || u.name === customerName);
  if (customerIdx !== -1) {
    registeredUsers[customerIdx].ordersCount += 1;
    registeredUsers[customerIdx].lastActive = "Baru saja";
  } else {
    registeredUsers.push({
      id: "u-" + (registeredUsers.length + 1),
      name: customerName,
      email: email || `${customerName.toLowerCase().replace(/\s+/g, "")}@example.com`,
      role: "customer",
      ordersCount: 1,
      lastActive: "Baru saja"
    });
  }

  // Add system email log automatically
  emailLogs.unshift({
    id: "em-" + (emailLogs.length + 1),
    recipient: email || "kopi@tampaseduh.com",
    subject: `Tagihan Order Baru Tampa Seduh ${newOrder.id}`,
    status: "Sent",
    timestamp: new Date().toISOString(),
    body: `Terima kasih kawan ${customerName}! Barista kami sedang mempersiapkan pesanan Anda senilai Rp ${total}.000.`
  });

  // Record audit log
  auditLogs.unshift({
    id: "log-" + (auditLogs.length + 1),
    action: "Order Placed",
    details: `Order ${newOrder.id} placed by '${customerName}' total Rp ${total}K.`,
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newOrder);
});

app.put("/api/orders/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const idx = orders.findIndex(o => o.id === id);
  if (idx !== -1) {
    orders[idx].status = status;

    // Log the change
    auditLogs.unshift({
      id: "log-" + (auditLogs.length + 1),
      action: "Order Status Update",
      details: `Order ${id} marked as ${status}.`,
      timestamp: new Date().toISOString()
    });

    res.json(orders[idx]);
  } else {
    res.status(404).json({ error: "Order not found" });
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
  res.status(201).json(newPost);
});

// 8. Financial Accounting API (Broken down into multiple ranges)
app.get("/api/finances", (req, res) => {
  // Generate summaries for different tabs dynamically based on the current order list!
  const completedOrders = orders.filter(o => o.status === "completed");
  const baseOrderRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);

  const finances: FinancialSummary[] = [
    {
      period: "Harian",
      labels: ["08:00", "11:00", "14:00", "17:00", "20:00", "23:00"],
      revenue: [120, 240, 180, 310, 450, 200],
      costs: [80, 110, 90, 140, 210, 120],
      netProfit: 710,
      transactionsCount: 38
    },
    {
      period: "Mingguan",
      labels: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
      revenue: [1200, 1450, 1100, 1600, 2300, 3100, 2800],
      costs: [700, 850, 680, 900, 1200, 1600, 1400],
      netProfit: 6220,
      transactionsCount: 220
    },
    {
      period: "Bulanan",
      labels: ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"],
      revenue: [6200, 7400, 8100, 9500],
      costs: [3500, 4100, 4300, 4900],
      netProfit: 14400,
      transactionsCount: 880
    },
    {
      period: "6 Bulan",
      labels: ["Januari", "Februari", "Maret", "April", "Mei", "Juni"],
      revenue: [28000, 31000, 29000, 35000, 42000, 48000 + baseOrderRevenue],
      costs: [16000, 18000, 17200, 20100, 23000, 25000],
      netProfit: (28000 + 31000 + 29000 + 35000 + 42000 + 48000 + baseOrderRevenue) - 119300,
      transactionsCount: 4200
    },
    {
      period: "1 Tahun",
      labels: ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026"],
      revenue: [92000, 105000, 112000, 124000, 131000, 145000 + baseOrderRevenue],
      costs: [52000, 58000, 61000, 68000, 72000, 79000],
      netProfit: 318000 + baseOrderRevenue,
      transactionsCount: 24500
    },
    {
      period: "Semua",
      labels: ["Tahun 2024", "Tahun 2025", "Tahun 2026 YTD"],
      revenue: [380000, 433000, 276000 + baseOrderRevenue],
      costs: [210000, 239000, 151000],
      netProfit: 489000 + baseOrderRevenue,
      transactionsCount: 89300
    }
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
  auditLogs.unshift({
    id: "log-" + (auditLogs.length + 1),
    action: "AI Prompt Config modified",
    details: `Updated AI system guidelines and set temperature parameters.`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, config: aiSettings });
});


async function bootstrap() {
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

bootstrap();
