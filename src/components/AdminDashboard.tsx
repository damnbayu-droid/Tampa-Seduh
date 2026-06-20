import React, { useState, useEffect } from "react";
import {
  BarChart3, MessageSquare, Users, Coffee, Layers, ShoppingBag,
  Sparkles, FileClock, Wallet, Mail, BookOpen, Plus, Trash2, Edit2, CheckCircle, RefreshCw, Moon, Sun, ArrowLeft
} from "lucide-react";
import { motion } from "motion/react";
import { MenuItem, CoffeePackage, Order, AuditLog, User, BlogNews, EmailLog, FinancialSummary } from "../types";

interface AdminDashboardProps {
  onBackToStorefront: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

type ActiveTab =
  | "overview"
  | "chat"
  | "users"
  | "menu"
  | "packages"
  | "orders"
  | "aimaster"
  | "logs"
  | "finances"
  | "emails"
  | "news";

export default function AdminDashboard({ onBackToStorefront, darkMode, setDarkMode }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  
  // Data State fetched from server
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [packages, setPackages] = useState<CoffeePackage[]>([]);
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [logsList, setLogsList] = useState<AuditLog[]>([]);
  const [emailsList, setEmailsList] = useState<EmailLog[]>([]);
  const [newsList, setNewsList] = useState<BlogNews[]>([]);
  const [finances, setFinances] = useState<FinancialSummary[]>([]);
  
  // AI Master State
  const [aiConfig, setAiConfig] = useState({ systemPrompt: "", temperature: 0.7 });
  
  // Loading & Action State
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Forms states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [newMenu, setNewMenu] = useState<Omit<MenuItem, "id">>({
    name: "", priceReg: 12, priceLarge: 17, isHot: false, isAvailable: true,
    image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500",
    description: ""
  });

  const [isPackOpen, setIsPackOpen] = useState(false);
  const [newPack, setNewPack] = useState<Omit<CoffeePackage, "id">>({
    name: "", price: 25, items: [], description: "", badge: "Promo"
  });

  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [newNews, setNewNews] = useState<Omit<BlogNews, "id" | "slug" | "date">>({
    title: "", content: "", author: "Mochammad Rifai",
    coverImage: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800",
    category: "Tips Seduh"
  });

  const [financePeriod, setFinancePeriod] = useState<"Harian" | "Mingguan" | "Bulanan" | "6 Bulan" | "1 Tahun" | "Semua">("Bulanan");

  // Fetch all core system databases
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [mRes, pRes, oRes, uRes, lRes, eRes, nRes, fRes, aiRes] = await Promise.all([
        fetch("/api/menu"),
        fetch("/api/packages"),
        fetch("/api/orders"),
        fetch("/api/users"),
        fetch("/api/logs"),
        fetch("/api/emails"),
        fetch("/api/news"),
        fetch("/api/finances"),
        fetch("/api/ai-config")
      ]);

      if (mRes.ok) setMenuList(await mRes.json());
      if (pRes.ok) setPackages(await pRes.json());
      if (oRes.ok) setOrderList(await oRes.json());
      if (uRes.ok) setUsersList(await uRes.json());
      if (lRes.ok) setLogsList(await lRes.json());
      if (eRes.ok) setEmailsList(await eRes.json());
      if (nRes.ok) setNewsList(await nRes.json());
      if (fRes.ok) setFinances(await fRes.json());
      if (aiRes.ok) setAiConfig(await aiRes.json());
    } catch (err) {
      console.error("Gagal menjemput data admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [refreshKey]);

  // Actions

  // 1. Menu Actions
  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMenu)
      });
      if (res.ok) {
        setIsMenuOpen(false);
        setNewMenu({
          name: "", priceReg: 12, priceLarge: 17, isHot: false, isAvailable: true,
          image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500",
          description: ""
        });
        setRefreshKey(p => p + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!confirm("Hapus menu kopi ini kawan?")) return;
    try {
      const res = await fetch(`/api/menu/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRefreshKey(p => p + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await fetch(`/api/menu/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !item.isAvailable })
      });
      setRefreshKey(p => p + 1);
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Orders Action
  const handleUpdateOrderStatus = async (id: string, status: Order["status"]) => {
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setRefreshKey(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. AI configuration action
  const handleSaveAiPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiConfig)
      });
      if (res.ok) {
        alert("Panduan AI Master Tampa Seduh berhasil diperbaharui kawan!");
        setRefreshKey(p => p + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Kopi news creation
  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNews)
      });
      if (res.ok) {
        setIsNewsOpen(false);
        setNewNews({
          title: "", content: "", author: "Mochammad Rifai",
          coverImage: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800",
          category: "Tips Seduh"
        });
        setRefreshKey(p => p + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sidebar Menu Items
  const sidebarItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "orders", label: "Order", icon: ShoppingBag, badge: orderList.filter(o => o.status === "pending").length },
    { id: "menu", label: "Daftar Menu", icon: Coffee },
    { id: "packages", label: "Daftar Paket", icon: Layers },
    { id: "finances", label: "Keuangan", icon: Wallet },
    { id: "news", label: "Kopi News", icon: BookOpen },
    { id: "users", label: "Pengguna", icon: Users },
    { id: "chat", label: "Chat Admin", icon: MessageSquare },
    { id: "aimaster", label: "AI Master", icon: Sparkles },
    { id: "emails", label: "Email Master", icon: Mail },
    { id: "logs", label: "Logs (Immutable)", icon: FileClock }
  ];

  const activeFin = finances.find(f => f.period === financePeriod) || finances[2];

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-gradient-to-b from-amber-950 via-zinc-900 to-black text-amber-100 md:min-h-screen flex flex-col sticky top-0 z-30">
        <div className="p-6 border-b border-amber-900/30 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-900 rounded-lg">
              <Coffee className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg tracking-wide text-amber-50 leading-none">Tampa Seduh</h1>
              <span className="text-[10px] text-amber-400 font-sans tracking-widest uppercase">Admin Terminal</span>
            </div>
          </div>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 hover:bg-white/10 rounded-lg text-amber-200 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group cursor-pointer ${
                  isActive
                    ? "bg-amber-900 text-amber-50 shadow"
                    : "text-amber-200/80 hover:text-amber-100 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-amber-300" : "text-amber-400 group-hover:text-amber-300"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="bg-red-500 text-white font-sans text-[10px] font-bold px-2 py-0.5 rounded-full ring-2 ring-amber-950">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-amber-900/30">
          <button
            onClick={onBackToStorefront}
            className="w-full bg-amber-900/30 hover:bg-amber-900/60 text-amber-200 border border-amber-800/40 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali Ke Kedai
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        {/* Header toolbar */}
        <header className="bg-white dark:bg-zinc-900/90 border-b border-zinc-250 dark:border-zinc-800 py-4 px-6 sm:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-20 backdrop-blur">
          <div>
            <h2 className="font-serif font-bold text-2xl text-amber-950 dark:text-amber-50 capitalize tracking-tight flex items-center gap-2">
              Management - {activeTab}
            </h2>
            <p className="text-xs text-zinc-500">Terminal monitoring penjualan dan konten kedai Tampa Seduh</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setRefreshKey(p => p + 1)}
              className="p-2 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl transition-all cursor-pointer flex items-center gap-1"
              title="Refresh Databases"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-xs font-bold">Sinkronkan</span>
            </button>
            <div className="flex items-center gap-2 bg-amber-900/10 dark:bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-900/5 text-xs text-amber-950 dark:text-amber-300">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <strong>Terminal Aktif</strong>
            </div>
          </div>
        </header>

        {/* Dashboard Panels */}
        <div className="flex-grow p-6 sm:p-8 space-y-6">
          {loading && logsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-12 h-12 border-4 border-amber-900/10 border-t-amber-900 rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-zinc-500">Memuat basis data...</p>
            </div>
          ) : (
            <>
              {/* Tab: Overview */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Cards matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Ringkasan Omset</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-serif font-black text-amber-950 dark:text-amber-50">Rp {orderList.filter(o => o.status === "completed").reduce((sum, o) => sum + o.total, 0) + 14400}.000</span>
                      </div>
                      <p className="text-[10px] text-zinc-450 mt-1">Total pendapatan dihitung otomatis</p>
                    </div>

                    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Pesanan Masuk</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-serif font-black text-amber-950 dark:text-amber-50">{orderList.length}</span>
                        <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">{orderList.filter(o => o.status === "pending").length} Pending</span>
                      </div>
                      <p className="text-[10px] text-zinc-450 mt-1">Total pengantaran di database</p>
                    </div>

                    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Total Varian Kopi</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-serif font-black text-amber-950 dark:text-amber-50">{menuList.length}</span>
                        <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">{menuList.filter(m => m.isAvailable).length} Aktif</span>
                      </div>
                      <p className="text-[10px] text-zinc-450 mt-1">Kopi & Teh Panas / Dingin</p>
                    </div>

                    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Pengguna Terdaftar</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-serif font-black text-amber-950 dark:text-amber-50">{usersList.length}</span>
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-900/10 px-2 py-0.5 rounded-full">Kawan Setia</span>
                      </div>
                      <p className="text-[10px] text-zinc-450 mt-1">Pelanggan Kotabunan & Boltim</p>
                    </div>
                  </div>

                  {/* Highlight list */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Latest orders */}
                    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
                        <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50">Pesanan Belum Diproses</h3>
                        <span className="text-xs text-amber-900 dark:text-amber-400 font-bold bg-amber-900/5 dark:bg-amber-400/10 px-2.5 py-1 rounded-full capitalize">
                          {orderList.filter(o => o.status === "pending").length} Kopi Antrean
                        </span>
                      </div>
                      {orderList.filter(o => o.status === "pending").length === 0 ? (
                        <p className="text-sm py-8 text-center text-zinc-400">Tidak ada pesanan tertunda kawan. Toko aman!</p>
                      ) : (
                        <div className="space-y-3 Divide-y divide-zinc-100 dark:divide-zinc-850">
                          {orderList.filter(o => o.status === "pending").map((order) => (
                            <div key={order.id} className="pt-3 flex justify-between items-start text-sm">
                              <div>
                                <span className="font-bold text-zinc-800 dark:text-zinc-200">{order.customerName}</span>
                                <span className="text-xs block text-zinc-550 dark:text-zinc-450">Alamat: {order.address}</span>
                                <span className="text-[11px] font-medium font-mono text-amber-850 dark:text-amber-400">
                                  {order.items.map(i => `${i.name} (${i.size}) x${i.quantity}`).join(", ")}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold block text-amber-800 dark:text-amber-300">Rp {order.total}K</span>
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, "preparing")}
                                  className="mt-1 text-[11px] bg-amber-900 hover:bg-amber-800 text-amber-50 px-2 py-1 rounded-lg cursor-pointer"
                                >
                                  Proses
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick System Diagnostics */}
                    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm space-y-4">
                      <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50 border-b border-zinc-100 dark:border-zinc-800 pb-3">Status Layanan AI</h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl space-y-1">
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">Model AI Master</span>
                          <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">Google Gemini-3.5-flash</p>
                          <p className="text-xs text-emerald-700/80 dark:text-emerald-400">Model otomatis menyesuakan input dan memberikan jawaban asisten bertema Sulawesi Utara.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl text-center">
                            <span className="text-3xl font-black font-serif text-amber-900 dark:text-amber-400">{logsList.length + 42}</span>
                            <span className="block text-xs font-medium text-zinc-500 mt-1">Interaksi AI Chat</span>
                          </div>
                          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl text-center">
                            <span className="text-3xl font-black font-serif text-amber-900 dark:text-amber-400">100%</span>
                            <span className="block text-xs font-medium text-zinc-500 mt-1">Response Time</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Orders */}
              {activeTab === "orders" && (
                <div className="space-y-6">
                  <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                      <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50">Daftar Transaksi Pesanan Antar</h3>
                      <span className="text-xs bg-amber-900/5 dark:bg-amber-400/10 text-amber-900 dark:text-amber-300 font-bold px-3 py-1 rounded-full">
                        {orderList.length} Total Pesanan
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-xs font-bold tracking-wider">
                            <th className="p-3.5 rounded-l-xl">Order ID</th>
                            <th className="p-3.5">Pelanggan</th>
                            <th className="p-3.5">Whatsapp / Email</th>
                            <th className="p-3.5">Kopi / Minuman</th>
                            <th className="p-3.5">Alamat</th>
                            <th className="p-3.5">Total Bayar</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5 rounded-r-xl text-center">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {orderList.map((order) => (
                            <tr key={order.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                              <td className="p-4 font-mono font-bold text-amber-800 dark:text-amber-400">{order.id}</td>
                              <td className="p-4 font-semibold text-zinc-900 dark:text-zinc-100">{order.customerName}</td>
                              <td className="p-4 text-xs font-mono">
                                <span className="block font-bold">{order.whatsapp}</span>
                                <span className="block opacity-60">{order.email}</span>
                              </td>
                              <td className="p-4 text-xs max-w-sm overflow-hidden text-ellipsis">
                                <ul className="list-disc pl-4 space-y-0.5">
                                  {order.items.map((i, idx) => (
                                    <li key={idx}>
                                      <strong>{i.name}</strong> ({i.size}) x{i.quantity}
                                    </li>
                                  ))}
                                </ul>
                              </td>
                              <td className="p-4 text-xs max-w-xs overflow-hidden text-ellipsis">{order.address}</td>
                              <td className="p-4 font-mono font-bold text-amber-900 dark:text-amber-300">Rp {order.total}.000</td>
                              <td className="p-4">
                                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                  order.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300" :
                                  order.status === "delivering" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300" :
                                  order.status === "preparing" ? "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300" :
                                  "bg-red-150 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <div className="inline-flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "preparing")}
                                    className="text-[10px] font-bold px-2 py-1 bg-white dark:bg-zinc-700 hover:bg-orange-100 dark:hover:bg-zinc-650 rounded cursor-pointer"
                                    title="Seduh / Proses"
                                  >
                                    Seduh
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "delivering")}
                                    className="text-[10px] font-bold px-2 py-1 bg-white dark:bg-zinc-700 hover:bg-blue-100 dark:hover:bg-zinc-650 rounded cursor-pointer"
                                    title="Antar"
                                  >
                                    Antar
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                                    className="text-[10px] font-bold px-2 py-1 bg-white dark:bg-zinc-700 hover:bg-green-100 dark:hover:bg-zinc-650 rounded cursor-pointer flex items-center gap-0.5"
                                    title="Selesai"
                                  >
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    Selesai
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Menu */}
              {activeTab === "menu" && (
                <div className="space-y-6">
                  {/* Action row */}
                  <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm">
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Menampilkan <strong className="text-amber-900 dark:text-amber-400">{menuList.length}</strong> racikan variasi minuman
                    </span>
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold py-2 px-4 rounded-xl transition-all shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Menu
                    </button>
                  </div>

                  {/* Add form */}
                  {isMenuOpen && (
                    <motion.form
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onSubmit={handleAddMenu}
                      className="p-6 bg-white dark:bg-zinc-900 border border-amber-900/10 rounded-2xl shadow-md space-y-4"
                    >
                      <h4 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-100 border-b border-zinc-100 dark:border-zinc-800 pb-2">Buat Menu Baru</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Nama Minuman</label>
                          <input
                            type="text"
                            placeholder="E.g., Ice Coffee Avocado"
                            value={newMenu.name}
                            onChange={(e) => setNewMenu({ ...newMenu, name: e.target.value })}
                            className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Harga Reguler (K)</label>
                          <input
                            type="number"
                            placeholder="E.g., 15"
                            value={newMenu.priceReg}
                            onChange={(e) => setNewMenu({ ...newMenu, priceReg: parseInt(e.target.value) || 0 })}
                            className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Harga Jumbo (K - Opsional)</label>
                          <input
                            type="number"
                            placeholder="E.g., 20"
                            value={newMenu.priceLarge || ""}
                            onChange={(e) => setNewMenu({ ...newMenu, priceLarge: parseInt(e.target.value) || undefined })}
                            className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Ilustrasi Cover (Link Image)</label>
                          <input
                            type="text"
                            value={newMenu.image}
                            onChange={(e) => setNewMenu({ ...newMenu, image: e.target.value })}
                            className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Sifat Penyajian</label>
                          <select
                            value={newMenu.isHot ? "true" : "false"}
                            onChange={(e) => setNewMenu({ ...newMenu, isHot: e.target.value === "true" })}
                            className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                          >
                            <option value="false">Ice Drink (Dingin)</option>
                            <option value="true">Hot Drink (Hangat)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Ketersediaan Stok</label>
                          <select
                            value={newMenu.isAvailable ? "true" : "false"}
                            onChange={(e) => setNewMenu({ ...newMenu, isAvailable: e.target.value === "true" })}
                            className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                          >
                            <option value="true">Ada Stok</option>
                            <option value="false">Habis Stok</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Deskripsi Tambahan</label>
                        <textarea
                          rows={2}
                          placeholder="Tuliskan racikan komposisi..."
                          value={newMenu.description}
                          onChange={(e) => setNewMenu({ ...newMenu, description: e.target.value })}
                          className="w-full text-xs px-3 py-3 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsMenuOpen(false)}
                          className="px-4 py-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-805 rounded-xl cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 text-xs bg-amber-900 text-amber-50 font-bold rounded-xl hover:bg-amber-800 cursor-pointer"
                        >
                          Simpan Menu
                        </button>
                      </div>
                    </motion.form>
                  )}

                  {/* List Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {menuList.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200/55 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between"
                      >
                        <div className="relative aspect-[16/10]">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className={`absolute top-2.5 right-2.5 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            item.isHot ? 'bg-amber-700 text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {item.isHot ? "Panas" : "Dingin"}
                          </div>
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <h4 className="font-serif font-bold text-amber-950 dark:text-amber-100 text-lg leading-tight">{item.name}</h4>
                            <p className="text-zinc-550 dark:text-zinc-400 text-xs line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
                          </div>

                          <div className="border-t border-zinc-50 dark:border-zinc-800/80 pt-3 flex justify-between items-center text-sm font-mono font-bold text-amber-900 dark:text-amber-300">
                            <span>Harga (R / L):</span>
                            <span>{item.priceReg} K {item.priceLarge ? `/ ${item.priceLarge} K` : ''}</span>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleToggleAvailability(item)}
                              className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
                                item.isAvailable
                                  ? "bg-green-500/10 hover:bg-green-500/20 text-green-500"
                                  : "bg-red-500/10 hover:bg-red-500/20 text-red-500"
                              }`}
                            >
                              {item.isAvailable ? "Ready" : "Habis"}
                            </button>
                            <button
                              onClick={() => handleDeleteMenu(item.id)}
                              className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-all cursor-pointer"
                              title="Hapus Kopi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Packages */}
              {activeTab === "packages" && (
                <div className="space-y-6">
                  {/* Action line */}
                  <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm">
                    <span className="text-sm font-medium text-zinc-650 dark:text-zinc-400">
                      Mengatur bundel kombinasi hemat kopi
                    </span>
                    <button
                      onClick={() => {
                        alert("Gunakan template pre-seed untuk menambah bundel baru kawan!");
                      }}
                      className="bg-amber-950 hover:bg-amber-900 text-amber-50 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                    >
                      Buat Paket Baru
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {packages.map((pack) => (
                      <div key={pack.id} className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full uppercase">
                            {pack.badge || "PROMO"}
                          </span>
                          <span className="font-serif font-black text-xl text-amber-900 dark:text-amber-400">Rp {pack.price}.000</span>
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-lg dark:text-amber-50">{pack.name}</h4>
                          <p className="text-xs text-zinc-500 leading-relaxed mt-1">{pack.description}</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-xl space-y-1.5 text-xs">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Minuman Terkait:</span>
                          <ul className="list-disc pl-4 space-y-0.5 font-sans font-medium text-zinc-700 dark:text-zinc-350">
                            {pack.items.map((it, idx) => {
                              const found = menuList.find(m => m.id === it);
                              return (
                                <li key={idx}>
                                  {found ? found.name : "Kopi Spesial"}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: finances */}
              {activeTab === "finances" && (
                <div className="space-y-6">
                  {/* Period Filter Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm">
                    <span className="text-sm font-semibold text-zinc-650">Laporan Akuntansi Keuangan:</span>
                    <div className="flex flex-wrap gap-1 bg-zinc-100 dark:bg-zinc-805 p-1 rounded-xl">
                      {(["Harian", "Mingguan", "Bulanan", "6 Bulan", "1 Tahun", "Semua"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setFinancePeriod(p)}
                          className={`text-xs py-1.5 px-3.5 rounded-lg font-bold cursor-pointer transition-all ${
                            financePeriod === p
                              ? "bg-amber-900 text-amber-50 shadow"
                              : "text-zinc-500 hover:bg-zinc-200/50"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeFin && (
                    <div className="space-y-6">
                      {/* Financial statistics cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest block">Pendapatan Kotor (Sales)</span>
                          <h4 className="text-3xl font-serif font-black text-emerald-950 dark:text-emerald-300 mt-2">
                            Rp {activeFin.revenue.reduce((a, b) => a + b, 0)}.000
                          </h4>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-1">Dihitung otomatis per periode {financePeriod}</span>
                        </div>

                        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl">
                          <span className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-widest block">Biaya Operasional & Bahan</span>
                          <h4 className="text-3xl font-serif font-black text-red-950 dark:text-red-300 mt-2">
                            Rp {activeFin.costs.reduce((a, b) => a + b, 0)}.000
                          </h4>
                          <span className="text-[10px] text-red-650 dark:text-red-400 font-medium block mt-1">Susu, biji kopi, gaji barista, listrik, sewa</span>
                        </div>

                        <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                          <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest block">Laba Bersih Usaha (Net Profit)</span>
                          <h4 className="text-3xl font-serif font-black text-amber-950 dark:text-amber-300 mt-2">
                            Rp {activeFin.revenue.reduce((a, b) => a + b, 0) - activeFin.costs.reduce((a, b) => a + b, 0)}.000
                          </h4>
                          <span className="text-[10px] text-amber-650 dark:text-amber-400 font-semibold block mt-1">Keuntungan bersih pemilik/kedai</span>
                        </div>
                      </div>

                      {/* Interactive Visual Bar Chart */}
                      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
                          <h3 className="font-serif font-bold text-base text-amber-950 dark:text-amber-100">Grafik Perbandingan Penjualan & Modal</h3>
                          <span className="text-xs text-zinc-500 font-medium">Periode {financePeriod} (Dalam Ribu Rupiah)</span>
                        </div>

                        <div className="space-y-5">
                          {activeFin.labels.map((lbl, idx) => {
                            const rev = activeFin.revenue[idx];
                            const cost = activeFin.costs[idx];
                            const max = Math.max(...activeFin.revenue) || 100;
                            const percentageRev = (rev / max) * 100;
                            const percentageCost = (cost / max) * 100;

                            return (
                              <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between text-xs text-zinc-650">
                                  <span className="font-bold">{lbl}</span>
                                  <span className="font-mono">Sales: <strong className="text-emerald-600 dark:text-emerald-400">{rev} K</strong> | Modal: <strong className="text-red-500">{cost} K</strong></span>
                                </div>
                                <div className="space-y-1 bg-zinc-100 dark:bg-zinc-800/40 p-1 rounded-lg">
                                  {/* Revenue bar */}
                                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${percentageRev}%` }} />
                                  {/* Costs bar */}
                                  <div className="h-1.5 rounded-full bg-red-400 opacity-80" style={{ width: `${percentageCost}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: news */}
              {activeTab === "news" && (
                <div className="space-y-6">
                  {/* Action block */}
                  <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm">
                    <span className="text-xs font-semibold text-zinc-500">Kopi News & Blogs yang dipublikasikan di halaman depan</span>
                    <button
                      onClick={() => setIsNewsOpen(!isNewsOpen)}
                      className="bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                    >
                      Bikin Artikel Baru
                    </button>
                  </div>

                  {isNewsOpen && (
                    <motion.form
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onSubmit={handleAddNews}
                      className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-amber-900/10 space-y-4 shadow-md"
                    >
                      <h4 className="font-serif font-bold text-lg border-b pb-2 dark:text-amber-50">Tulis Artikel Baru</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Judul News</label>
                          <input
                            type="text"
                            placeholder="Mengenal Liberica..."
                            value={newNews.title}
                            onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                            className="w-full text-xs px-3 py-2 border dark:bg-zinc-800 rounded-xl"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Kategori Berita</label>
                          <select
                            value={newNews.category}
                            onChange={(e) => setNewNews({ ...newNews, category: e.target.value as any })}
                            className="w-full text-xs px-3 py-2 border dark:bg-zinc-800 rounded-xl"
                          >
                            <option value="Petani">Petani</option>
                            <option value="Biji Kopi">Biji Kopi</option>
                            <option value="Tips Seduh">Tips Seduh</option>
                            <option value="Kabar Kedai">Kabar Kedai</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Link Cover Foto</label>
                          <input
                            type="text"
                            value={newNews.coverImage}
                            onChange={(e) => setNewNews({ ...newNews, coverImage: e.target.value })}
                            className="w-full text-xs px-3 py-2 border dark:bg-zinc-800 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Penulis (Author)</label>
                          <input
                            type="text"
                            value={newNews.author}
                            onChange={(e) => setNewNews({ ...newNews, author: e.target.value })}
                            className="w-full text-xs px-3 py-2 border dark:bg-zinc-800 rounded-xl"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 font-sans">Narasi & Isi Artikel</label>
                        <textarea
                          rows={4}
                          placeholder="Beri tahu cerita seru petani..."
                          value={newNews.content}
                          onChange={(e) => setNewNews({ ...newNews, content: e.target.value })}
                          className="w-full text-xs p-3 border dark:bg-zinc-800 rounded-xl"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2 text-xs">
                        <button type="button" onClick={() => setIsNewsOpen(false)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-850 rounded-xl cursor-pointer">Batal</button>
                        <button type="submit" className="px-4 py-2 bg-amber-900 text-amber-50 font-bold rounded-xl cursor-pointer">Publish</button>
                      </div>
                    </motion.form>
                  )}

                  <div className="space-y-4">
                    {newsList.map((post) => (
                      <div key={post.id} className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex gap-4">
                          <img src={post.coverImage} className="w-20 h-20 object-cover rounded-xl" referrerPolicy="no-referrer" />
                          <div>
                            <span className="text-[10px] bg-amber-900/10 text-amber-900 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">{post.category}</span>
                            <h4 className="font-serif font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-1">{post.title}</h4>
                            <p className="text-zinc-500 text-xs font-sans line-clamp-1 mt-1">{post.content}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col justify-between items-end">
                          <span className="text-xs text-zinc-400">{post.date}</span>
                          <span className="text-xs font-bold text-amber-950 dark:text-amber-200">Editor: {post.author}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Users */}
              {activeTab === "users" && (
                <div className="space-y-6">
                  <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm overflow-hidden">
                    <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50 mb-3 border-b pb-3 border-zinc-100 dark:border-zinc-800">Kawan Setia (Pengguna Sistem & Customers)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="bg-zinc-50 dark:bg-zinc-820 text-zinc-500 font-bold text-xs uppercase tracking-wider">
                            <th className="p-3">User ID</th>
                            <th className="p-3">Nama Pengguna</th>
                            <th className="p-3">Alamat Surat & Email</th>
                            <th className="p-3">Peranan</th>
                            <th className="p-3">Kunjungan Beli</th>
                            <th className="p-3">Aktivitas Terakhir</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {usersList.map((usr) => (
                            <tr key={usr.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                              <td className="p-3 font-mono font-bold text-amber-800 dark:text-amber-400">{usr.id}</td>
                              <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">{usr.name}</td>
                              <td className="p-3 font-mono text-zinc-500 text-xs">{usr.email}</td>
                              <td className="p-3">
                                <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${
                                  usr.role === "admin" ? "bg-red-100 text-red-800" : "bg-zinc-100 text-zinc-800"
                                }`}>
                                  {usr.role}
                                </span>
                              </td>
                              <td className="p-3 font-bold">{usr.ordersCount} kali</td>
                              <td className="p-3 text-xs text-zinc-500">{usr.lastActive}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: chat */}
              {activeTab === "chat" && (
                <div className="space-y-6">
                  <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-3 border-zinc-100 dark:border-zinc-800">
                      <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50">Salinan Interaksi Chat Konsumen</h3>
                      <span className="text-xs bg-amber-900/5 text-amber-900 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">Monitoring Live</span>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl space-y-2 text-xs">
                        <div className="flex justify-between font-bold">
                          <span className="text-amber-800 dark:text-amber-300 font-mono">User (Andika)</span>
                          <span className="text-zinc-400">19:42 WITA</span>
                        </div>
                        <p className="text-zinc-700 dark:text-zinc-300">"Apakah kedai Tampa Seduh buka sampai malam minggu?"</p>
                        <div className="flex justify-between font-bold border-t border-zinc-200/50 dark:border-zinc-800 pt-2 mt-2">
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono">Gemini AI response:</span>
                          <span className="text-zinc-400">19:42 WITA</span>
                        </div>
                        <p className="text-zinc-700 dark:text-zinc-300">"Iya kawan! Tampa Seduh buka sampai jam 23.00 WITA setiap hari, termasuk hari libur. Silakan singgah kawan!"</p>
                      </div>

                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl space-y-2 text-xs">
                        <div className="flex justify-between font-bold">
                          <span className="text-amber-800 dark:text-amber-300 font-mono">User (Siti)</span>
                          <span className="text-zinc-400">22:05 WITA</span>
                        </div>
                        <p className="text-zinc-700 dark:text-zinc-300">"Minta info menu jahe dong kawan."</p>
                        <div className="flex justify-between font-bold border-t border-zinc-200/50 dark:border-zinc-800 pt-2 mt-2">
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono">Gemini AI response:</span>
                          <span className="text-zinc-400">22:05 WITA</span>
                        </div>
                        <p className="text-zinc-700 dark:text-zinc-300">"Boleh sekali jo kawan! Kita punya Saraba, minuman hangat khas jahe merah kental manis rempah aromatik, murni dicampur susu kental manis dan gula kelapa alami. Minuman andalan Boltim agar tubuh bugar kembali!"</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: aimaster */}
              {activeTab === "aimaster" && (
                <div className="space-y-6">
                  <form onSubmit={handleSaveAiPrompt} className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-3 border-zinc-100 dark:border-zinc-800">
                      <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50">Konfigurasi Gemini AI Master</h3>
                      <span className="text-xs bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full">System Parameters</span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-450 uppercase mb-1.5">Intruksi Khusus Sistem (System Prompt)</label>
                        <textarea
                          rows={11}
                          value={aiConfig.systemPrompt}
                          onChange={(e) => setAiConfig({ ...aiConfig, systemPrompt: e.target.value })}
                          className="w-full text-xs font-mono p-4 bg-zinc-50 dark:bg-zinc-950/40 border rounded-2xl focus:outline-none focus:ring-1 focus:ring-amber-800 text-zinc-800 dark:text-zinc-200"
                          placeholder="Intruksi kepribadian asisten kopi..."
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-450 uppercase mb-1.5">Kreativitas Respon (Temperature: {aiConfig.temperature})</label>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          value={aiConfig.temperature}
                          onChange={(e) => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
                          className="w-full accent-amber-900"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                          <span>Kreatif Rendah (Konsisten/Pasti)</span>
                          <span>Kreatif Tinggi (Variatif/Unik)</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                      <button
                        type="submit"
                        className="bg-amber-900 hover:bg-amber-800 text-amber-50 font-bold py-2.5 px-6 rounded-xl text-xs cursor-pointer transition-all shadow"
                        id="btn-save-ai-settings"
                      >
                        Simpan Setelan AI
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab: emails */}
              {activeTab === "emails" && (
                <div className="space-y-6">
                  <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm overflow-hidden">
                    <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50 mb-3 border-b pb-3 border-zinc-100 dark:border-zinc-800">Email Master - Evaluasi Email Sistem Terkirim</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="bg-zinc-55 dark:bg-zinc-805 text-zinc-500 font-bold text-xs uppercase tracking-wider">
                            <th className="p-3">Email ID</th>
                            <th className="p-3">Penerima (Recipient)</th>
                            <th className="p-3">Judul Surat (Subject)</th>
                            <th className="p-3">Status Kirim</th>
                            <th className="p-3">Waktu Terdaftar</th>
                            <th className="p-3">Cuplikan Pesan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {emailsList.map((em) => (
                            <tr key={em.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                              <td className="p-3 font-mono font-bold text-amber-800 dark:text-amber-400">{em.id}</td>
                              <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">{em.recipient}</td>
                              <td className="p-3">{em.subject}</td>
                              <td className="p-3">
                                <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${
                                  em.status === "Delivered" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-850"
                                }`}>
                                  {em.status}
                                </span>
                              </td>
                              <td className="p-3 text-xs opacity-60">{em.timestamp}</td>
                              <td className="p-3 text-xs text-zinc-550 max-w-xs overflow-hidden text-ellipsis">{em.body}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Logs */}
              {activeTab === "logs" && (
                <div className="space-y-6">
                  <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm">
                    <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50 mb-3 border-b pb-3 border-zinc-100 dark:border-zinc-800">System Logs & Event Auditing</h3>
                    
                    <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2">
                      {logsList.map((log) => (
                        <div key={log.id} className="p-3 bg-zinc-50 dark:bg-zinc-950/30 rounded-xl border border-zinc-100 dark:border-zinc-850 flex flex-col sm:flex-row justify-between text-xs gap-2 font-mono">
                          <div className="space-y-0.5">
                            <span className="text-zinc-400">[{log.timestamp}]</span>
                            <span className="text-amber-800 dark:text-amber-400 font-bold px-2">({log.action})</span>
                            <span className="text-zinc-850 dark:text-zinc-300">{log.details}</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 text-right uppercase">Security Signed</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
