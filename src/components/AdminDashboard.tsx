import React, { useState, useEffect } from "react";
import {
  BarChart3, MessageSquare, Users, Coffee, Layers, ShoppingBag,
  Sparkles, FileClock, Wallet, Mail, BookOpen, Plus, Trash2, Edit2, CheckCircle, RefreshCw, Moon, Sun, ArrowLeft, X, Lock, Receipt, Download, PanelLeftOpen, PanelLeftClose, ImageIcon, Calculator, HelpCircle, Upload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MenuItem, CoffeePackage, Order, AuditLog, User, BlogNews, EmailLog, FinancialSummary, ProfitDashboard, GalleryPhoto, Pamflet, CustomerPhoto } from "../types";
import { getApiUrl } from "../lib/api";
import { supabase } from "../lib/supabase";
import AdminRecipeLab from "./AdminRecipeLab";

// ===================================================================
// fetchWithAuth — wrapper fetch yang menyertakan JWT Supabase
// Digunakan untuk semua request ke admin endpoint yang dilindungi
// requireAdmin middleware di backend.
// ===================================================================
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Pastikan Content-Type tidak diset jika body adalah FormData
    if (options.body && !(options.body instanceof FormData)) {
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
    }

    return fetch(url, { ...options, headers });
  } catch (err) {
    console.error("[fetchWithAuth] Gagal mengambil session Supabase:", err);
    // Fallback: kirim request tanpa token (akan ditolak oleh backend dengan 401)
    return fetch(url, options);
  }
}



interface AdminDashboardProps {
  onBackToStorefront: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onLogoutAdmin?: () => void;
}

type ActiveTab =
  | "overview"
  | "chat"
  | "users"
  | "menu"
  | "packages"
  | "orders"
  | "invoices"
  | "aimaster"
  | "logs"
  | "finances"
  | "emails"
  | "recipelab"
  | "news"
  | "media";


export default function AdminDashboard({ onBackToStorefront, darkMode, setDarkMode, onLogoutAdmin }: AdminDashboardProps) {
  // Local fast toggle for dark mode to prevent full App re-render delay
  const [isDark, setIsDark] = useState(
    typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : darkMode
  );
  
  const handleToggleDark = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Update global state asynchronously to prevent blocking UI
    setTimeout(() => {
      setDarkMode(nextDark);
    }, 50);
  };
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
  // ── Shop Status (Buka/Tutup Sign control) ───────────────────────────────
  const [shopIsOpen, setShopIsOpen] = useState<boolean>(true);
  const [shopStatusLoading, setShopStatusLoading] = useState(false);
  const [shopStatusMsg, setShopStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const toggleShopStatus = async () => {
    setShopStatusLoading(true);
    setShopStatusMsg(null);
    try {
      const res = await fetchWithAuth(getApiUrl("/api/shop-status"), {
        method: "PUT",
        body: JSON.stringify({ isOpen: !shopIsOpen })
      });
      if (res.ok) {
        const data = await res.json();
        setShopIsOpen(data.shopStatus.isOpen);
        setShopStatusMsg({
          type: "success",
          text: data.shopStatus.isOpen
            ? "✅ Kedai berhasil DIBUKA — Sign hijau menyala di homepage!"
            : "✅ Kedai berhasil DITUTUP — Sign gelap di homepage."
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        setShopStatusMsg({ type: "error", text: `❌ Gagal: ${errData.error || res.statusText || "Server error"}` });
      }
    } catch (err: any) {
      setShopStatusMsg({ type: "error", text: `❌ Koneksi gagal: ${err.message || "Tidak dapat terhubung ke server"}` });
    }
    setShopStatusLoading(false);
    // Auto-dismiss pesan setelah 4 detik
    setTimeout(() => setShopStatusMsg(null), 4000);
  };
  const [profitDashboard, setProfitDashboard] = useState<ProfitDashboard | null>(null);
  const [selectedProfitPeriod, setSelectedProfitPeriod] = useState<"today" | "last_7d" | "last_30d" | "all_time">("last_30d");
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [adminChatInput, setAdminChatInput] = useState("");
  
  // AI Master State
  const [aiConfig, setAiConfig] = useState({ systemPrompt: "", temperature: 0.7 });
  
  // Loading & Action State
  const [loading, setLoading] = useState(true);
  const [isVerifyingProof, setIsVerifyingProof] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [globalNotif, setGlobalNotif] = useState<{message: string, type: "success" | "error" | "info" | "loading"} | null>(null);
  const [isSidebarShrunk, setIsSidebarShrunk] = useState(false);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarShrunk(true);
    }
  }, []);
  const showNotif = (message: string, type: "success" | "error" | "info" | "loading" = "info", ms: number = 3000) => {
    setGlobalNotif({ message, type });
    if (type !== "loading") {
      setTimeout(() => setGlobalNotif(null), ms);
    }
  };
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [editingPack, setEditingPack] = useState<CoffeePackage | null>(null);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [guideModal, setGuideModal] = useState<string | null>(null); // null = tutup, string = nama panel
  const [previewEmail, setPreviewEmail] = useState<any>(null); // untuk modal preview email HTML

  // Email Compose State
  const [composeEmail, setComposeEmail] = useState({ to: "", subject: "", body: "" });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Database Connection Status
  const [dbConnections, setDbConnections] = useState<Record<string, { connected: boolean; count?: number; latency?: number }>>({});
  const [refreshingConn, setRefreshingConn] = useState<string | null>(null);

  // Forms states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [newMenu, setNewMenu] = useState<Omit<MenuItem, "id">>({
    name: "", priceReg: 12, priceLarge: 17, isHot: false, menuCategory: "cold", isAvailable: true,
    image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500",
    description: ""
  });

  const [isPackOpen, setIsPackOpen] = useState(false);
  const [newPack, setNewPack] = useState<Omit<CoffeePackage, "id">>({
    name: "", price: 25, items: [], description: "", badge: "Promo", image: ""
  });

  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [newNews, setNewNews] = useState<Omit<BlogNews, "id" | "slug" | "date">>({
    title: "", content: "", author: "Mochammad Rifai",
    coverImage: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800",
    category: "Tips Seduh"
  });
  const [editingNews, setEditingNews] = useState<BlogNews | null>(null);

  // Media Panel state
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [pamfletList, setPamfletList] = useState<Pamflet[]>([]);
  const [customerPhotos, setCustomerPhotos] = useState<CustomerPhoto[]>([]);
  const [mediaSubTab, setMediaSubTab] = useState<"gallery" | "pamflet" | "customer">("gallery");
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [isUploadingPamflet, setIsUploadingPamflet] = useState(false);
  const [isUploadingEditNewsImg, setIsUploadingEditNewsImg] = useState(false);

  const [financePeriod, setFinancePeriod] = useState<"Harian" | "Mingguan" | "Bulanan" | "6 Bulan" | "1 Tahun" | "Semua">("Bulanan");

  // Fetch all core system databases
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [mRes, pRes, oRes, uRes, lRes, eRes, nRes, fRes, aiRes, profitRes, galRes, pamRes, custRes] = await Promise.all([
        fetchWithAuth(getApiUrl("/api/menu")),
        fetchWithAuth(getApiUrl("/api/packages")),
        fetchWithAuth(getApiUrl("/api/orders")),
        fetchWithAuth(getApiUrl("/api/users")),
        fetchWithAuth(getApiUrl("/api/logs")),
        fetchWithAuth(getApiUrl("/api/emails")),
        fetchWithAuth(getApiUrl("/api/news")),
        fetchWithAuth(getApiUrl("/api/finances")),
        fetchWithAuth(getApiUrl("/api/ai-config")),
        fetchWithAuth(getApiUrl("/api/profit/dashboard")),
        fetch(getApiUrl("/api/gallery")),
        fetch(getApiUrl("/api/pamflets")),
        fetchWithAuth(getApiUrl("/api/customer-photos/all"))
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
      if (profitRes.ok) setProfitDashboard(await profitRes.json());
      if (galRes.ok) setGalleryPhotos(await galRes.json());
      if (pamRes.ok) setPamfletList(await pamRes.json());
      if (custRes.ok) setCustomerPhotos(await custRes.json());

      // Load current shop open/closed status
      try {
        const shopRes = await fetch(getApiUrl("/api/shop-status"));
        if (shopRes.ok) { const s = await shopRes.json(); setShopIsOpen(s.isOpen); }
      } catch {}
      
      const chatsRes = await fetchWithAuth(getApiUrl("/api/chat-admin/sessions"));
      if (chatsRes.ok) setChatSessions(await chatsRes.json());
      
      setLoading(false);
    } catch (err) {
      console.error("Gagal menjemput data admin:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [refreshKey]);

  // Realtime polling untuk Chat Admin panel (tab "chat") — setiap 2 detik
  useEffect(() => {
    if (activeTab !== "chat" && activeTab !== "aimaster") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetchWithAuth(getApiUrl("/api/chat-admin/sessions"));
        if (res.ok) setChatSessions(await res.json());
      } catch {}
    }, 2000); // 2 detik untuk responsivitas optimal
    return () => clearInterval(interval);
  }, [activeTab]);

  // Fetch DB connection status
  const fetchConnections = async (specificKey?: string) => {
    if (specificKey) setRefreshingConn(specificKey);
    try {
      const res = await fetchWithAuth(getApiUrl("/api/health/connections"));
      if (res.ok) {
        const data = await res.json();
        if (specificKey) {
          setDbConnections(prev => ({ ...prev, [specificKey]: data[specificKey] }));
        } else {
          setDbConnections(data);
        }
      }
    } catch {
      if (specificKey) setDbConnections(prev => ({ ...prev, [specificKey]: { connected: false } }));
    } finally {
      setRefreshingConn(null);
    }
  };

  // Auto-fetch connections saat buka overview
  useEffect(() => {
    if (activeTab === "overview") {
      fetchConnections();
      const interval = setInterval(fetchConnections, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Handler: Kirim email kustom
  const handleSendCustomEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeEmail.to || !composeEmail.subject || !composeEmail.body) return;
    setIsSendingEmail(true);
    showNotif("Mengirim email...", "loading");
    try {
      const res = await fetchWithAuth(getApiUrl("/api/emails/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(composeEmail)
      });
      const data = await res.json();
      if (res.ok) {
        showNotif(`✅ Email berhasil dikirim ke ${composeEmail.to} (Status: ${data.status})`, "success", 5000);
        setComposeEmail({ to: "", subject: "", body: "" });
        setRefreshKey(k => k + 1);
      } else {
        showNotif(data.error || "Gagal mengirim email", "error");
      }
    } catch {
      showNotif("Gagal terhubung ke server", "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Handler: Quick email — pesanan belum dibayar
  const handleSendOrderPendingEmail = async (orderId: string) => {
    showNotif("Mengirim email konfirmasi...", "loading");
    try {
      const res = await fetchWithAuth(getApiUrl("/api/emails/send-order-pending"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      if (res.ok) {
        showNotif(`📧 Email "Belum Bayar" dikirim! Status: ${data.status}`, "success", 5000);
        setRefreshKey(k => k + 1);
      } else {
        showNotif(data.error || "Gagal kirim email", "error");
      }
    } catch {
      showNotif("Gagal terhubung ke server", "error");
    }
  };

  // Handler: Quick email — pembayaran dikonfirmasi
  const handleSendOrderPaidEmail = async (orderId: string) => {
    showNotif("Mengirim email konfirmasi bayar...", "loading");
    try {
      const res = await fetchWithAuth(getApiUrl("/api/emails/send-order-paid"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      if (res.ok) {
        showNotif(`✅ Email "Pembayaran Dikonfirmasi" dikirim! Status: ${data.status}`, "success", 5000);
        setRefreshKey(k => k + 1);
      } else {
        showNotif(data.error || "Gagal kirim email", "error");
      }
    } catch {
      showNotif("Gagal terhubung ke server", "error");
    }
  };

  // Actions
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [updatingUserPass, setUpdatingUserPass] = useState<User | null>(null);
  const [newUserPassword, setNewUserPassword] = useState("");


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "menu" | "package") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    showNotif("Mengunggah foto, mohon tunggu...", "loading");
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Gagal mengambil context canvas 2D");
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to WebP
          const webpData = canvas.toDataURL("image/webp", 0.85);

          // Upload to backend
          const uploadRes = await fetchWithAuth(getApiUrl("/api/upload"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64Data: webpData,
              fileName: file.name.replace(/\.[^/.]+$/, "") + ".webp",
              fileType: "image/webp"
            })
          });

          if (!uploadRes.ok) {
            throw new Error("Gagal mengunggah gambar ke server");
          }

          const uploadData = await uploadRes.json();
          if (type === "menu") {
            if (editingMenu) {
              setEditingMenu(prev => prev ? { ...prev, image: uploadData.publicUrl } : null);
            } else {
              setNewMenu(prev => ({ ...prev, image: uploadData.publicUrl }));
            }
          } else {
            if (editingPack) {
              setEditingPack(prev => prev ? { ...prev, image: uploadData.publicUrl } : null);
            } else {
              setNewPack(prev => ({ ...prev, image: uploadData.publicUrl }));
            }
          }
          showNotif("Foto berhasil diunggah!", "success");
        };
      } catch (err: any) {
        showNotif("Gagal memproses gambar: " + err.message, "error");
      } finally {
        setIsUploadingImage(false);
        if (globalNotif?.type === "loading") setGlobalNotif(null);
      }
    };
  };

  const handleChangeUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingUserPass) return;
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/users/${updatingUserPass.id}/password`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newUserPassword })
      });
      if (res.ok) {
        alert(`Password untuk kawan ${updatingUserPass.name} berhasil diubah!`);
        setUpdatingUserPass(null);
        setNewUserPassword("");
        setRefreshKey(p => p + 1);
      } else {
        const errData = await res.json();
        alert("Gagal mengubah password: " + errData.error);
      }
    } catch (err: any) {
      alert("Gagal menghubungi server: " + err.message);
    }
  };

  // 1. Menu Actions
  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    showNotif(editingMenu ? "Menyimpan perubahan menu..." : "Menambahkan menu baru...", "loading");
    try {
      const url = editingMenu ? `/api/menu/${editingMenu.id}` : "/api/menu";
      const method = editingMenu ? "PUT" : "POST";
      const body = editingMenu ? editingMenu : newMenu;
      const res = await fetchWithAuth(getApiUrl(url), {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setIsMenuOpen(false);
        setEditingMenu(null);
        setNewMenu({
          name: "", priceReg: 12, priceLarge: 17, isHot: false, menuCategory: "cold", isAvailable: true,
          image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500",
          description: ""
        });
        setRefreshKey(p => p + 1);
        showNotif(editingMenu ? "Menu berhasil diperbarui!" : "Menu baru berhasil ditambahkan!", "success");
      } else {
        showNotif("Gagal menyimpan menu.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotif("Terjadi kesalahan jaringan.", "error");
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!confirm("Hapus menu kopi ini kawan?")) return;
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/menu/${id}`), { method: "DELETE" });
      if (res.ok) {
        setRefreshKey(p => p + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await fetchWithAuth(getApiUrl(`/api/menu/${item.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !item.isAvailable })
      });
      setRefreshKey(p => p + 1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePack = async (e: React.FormEvent) => {
    e.preventDefault();
    showNotif(editingPack ? "Menyimpan perubahan paket..." : "Menambahkan paket baru...", "loading");
    try {
      const url = editingPack ? `/api/packages/${editingPack.id}` : "/api/packages";
      const method = editingPack ? "PUT" : "POST";
      const body = editingPack ? { ...editingPack } : { ...newPack };
      const res = await fetchWithAuth(getApiUrl(url), {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setIsPackOpen(false);
        setEditingPack(null);
        setNewPack({ name: "", price: 25, items: [], description: "", badge: "Promo", image: "" });
        setRefreshKey(p => p + 1);
        showNotif(editingPack ? "Paket berhasil diperbarui!" : "Paket baru berhasil ditambahkan!", "success");
      } else {
        showNotif("Gagal menyimpan paket.", "error");
      }
    } catch (err) {
      console.error("Gagal menyimpan paket:", err);
      showNotif("Terjadi kesalahan jaringan.", "error");
    }
  };

  const handleDeletePack = async (id: string) => {
    if (!confirm("Hapus paket hemat ini kawan?")) return;
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/packages/${id}`), { method: "DELETE" });
      if (res.ok) {
        setRefreshKey(p => p + 1);
      }
    } catch (err) {
      console.error("Gagal menghapus paket:", err);
    }
  };

  // 2. Orders Action
  const handleUpdateOrderStatus = async (id: string, status: Order["status"]) => {
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/orders/${id}/status`), {
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

  const handleToggleBlockUser = async (user: User) => {
    try {
      const isCurrentlyBlocked = user.isBlocked || user.lastActive === "BLOCKED";
      const res = await fetchWithAuth(getApiUrl(`/api/users/${user.id}/block`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !isCurrentlyBlocked })
      });
      if (res.ok) {
        setRefreshKey(p => p + 1);
      } else {
        const errData = await res.json();
        alert("Gagal memperbarui status blokir pengguna: " + errData.error);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal terhubung ke server.");
    }
  };

  const handleApproveMembership = async (user: User, approve: boolean) => {
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/users/${user.id}/approve-membership`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve })
      });
      if (res.ok) {
        setRefreshKey(k => k + 1);
        if (approve) {
          alert(`Berhasil mengaktifkan member untuk ${user.name}`);
        } else {
          alert(`Permintaan member untuk ${user.name} telah ditolak.`);
        }
      }
    } catch (e) {
      alert("Gagal menyetujui member.");
    }
  };

  // Hapus user permanen
  const handleDeleteUser = async (user: User) => {
    if (!confirm(`⚠️ Hapus permanen akun:\n\n"${user.name}" (${user.email})\n\nTindakan ini TIDAK BISA dibatalkan!`)) return;
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/users/${user.id}`), { method: "DELETE" });
      if (res.ok) {
        showNotif(`✅ User "${user.name}" berhasil dihapus permanen`, "success");
        setRefreshKey(k => k + 1);
      } else {
        const err = await res.json();
        showNotif(err.error || "Gagal menghapus user", "error");
      }
    } catch {
      showNotif("Gagal terhubung ke server", "error");
    }
  };

  // Label order sebagai PAID / cabut PAID
  const handleMarkPaid = async (orderId: string, paid: boolean) => {
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/orders/${orderId}/mark-paid`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid })
      });
      if (res.ok) {
        showNotif(paid ? `✅ Order ${orderId} dilabeli PAID` : `Order ${orderId} label PAID dicabut`, "success");
        setRefreshKey(k => k + 1);
      } else {
        showNotif("Gagal menandai pembayaran", "error");
      }
    } catch {
      showNotif("Gagal terhubung ke server", "error");
    }
  };

  // 3. AI configuration action
  const handleSaveAiPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(getApiUrl("/api/ai-config"), {
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
  const [isUploadingNewsImage, setIsUploadingNewsImage] = useState(false);
  const handleUploadNewsImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingNewsImage(true);
    try {
      await uploadImageAsWebP(file, (url) => {
        setNewNews({ ...newNews, coverImage: url });
      });
      showNotif("Gambar berita berhasil diunggah", "success");
    } catch (err: any) {
      showNotif("Gagal unggah gambar", "error");
    } finally {
      setIsUploadingNewsImage(false);
    }
  };

  // Handler upload foto untuk editingNews (ganti foto artikel saat edit)
  const handleUploadEditingNewsImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingNews) return;
    setIsUploadingEditNewsImg(true);
    showNotif("Mengunggah foto artikel, mohon tunggu...", "loading");
    try {
      await uploadImageAsWebP(file, (url) => {
        setEditingNews({ ...editingNews, coverImage: url });
      });
      showNotif("Foto artikel berhasil diperbarui!", "success");
    } catch (err: any) {
      showNotif("Gagal unggah foto", "error");
    } finally {
      setIsUploadingEditNewsImg(false);
    }
  };

  // Handler upload foto Gallery Kolase
  const handleUploadGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingGallery(true);
    showNotif("Mengunggah foto kolase...", "loading");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const max = 1200;
          const ratio = Math.min(max / img.width, max / img.height, 1);
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          const ctx2 = canvas.getContext('2d')!;
          ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
          const webpData = canvas.toDataURL('image/webp', 0.88);
          const res = await fetchWithAuth(getApiUrl('/api/gallery'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data: webpData, fileName: file.name.replace(/\.[^/.]+$/, '') + '.webp' })
          });
          if (!res.ok) throw new Error('Upload gagal');
          const data = await res.json();
          setGalleryPhotos(prev => [{ id: data.filename, url: data.url, filename: data.filename, created_at: new Date().toISOString() }, ...prev]);
          showNotif('Foto kolase berhasil diunggah!', 'success');
          setIsUploadingGallery(false);
        };
      };
    } catch (err: any) {
      showNotif('Gagal upload foto: ' + err.message, 'error');
      setIsUploadingGallery(false);
    }
  };

  // Handler delete Gallery
  const handleDeleteGallery = async (filename: string) => {
    if (!confirm('Hapus foto ini?')) return;
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/gallery/${encodeURIComponent(filename)}`), { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus');
      setGalleryPhotos(prev => prev.filter(p => p.filename !== filename));
      showNotif('Foto dihapus', 'success');
    } catch (err: any) {
      showNotif('Gagal hapus foto: ' + err.message, 'error');
    }
  };

  // Handler upload Pamflet
  const handleUploadPamflet = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPamflet(true);
    showNotif('Mengunggah pamflet...', 'loading');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const max = 1600;
          const ratio = Math.min(max / img.width, max / img.height, 1);
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          const ctx2 = canvas.getContext('2d')!;
          ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
          const webpData = canvas.toDataURL('image/webp', 0.92);
          const res = await fetchWithAuth(getApiUrl('/api/pamflets'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data: webpData, fileName: file.name.replace(/\.[^/.]+$/, '') + '.webp' })
          });
          if (!res.ok) throw new Error('Upload gagal');
          const data = await res.json();
          setPamfletList(prev => [{ id: data.filename, url: data.url, filename: data.filename, created_at: new Date().toISOString() }, ...prev]);
          showNotif('Pamflet berhasil diunggah!', 'success');
          setIsUploadingPamflet(false);
        };
      };
    } catch (err: any) {
      showNotif('Gagal upload pamflet: ' + err.message, 'error');
      setIsUploadingPamflet(false);
    }
  };

  // Handler delete Pamflet
  const handleDeletePamflet = async (filename: string) => {
    if (!confirm('Hapus pamflet ini?')) return;
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/pamflets/${encodeURIComponent(filename)}`), { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus');
      setPamfletList(prev => prev.filter(p => p.filename !== filename));
      showNotif('Pamflet dihapus', 'success');
    } catch (err: any) {
      showNotif('Gagal hapus pamflet: ' + err.message, 'error');
    }
  };

  // Customer Photo — Approve
  const handleApproveCustomerPhoto = async (id: string) => {
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/customer-photos/${id}/approve`), { method: 'PATCH' });
      if (!res.ok) throw new Error('Gagal approve');
      setCustomerPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p));
      showNotif('Foto disetujui dan akan tampil di website!', 'success');
    } catch (err: any) {
      showNotif('Gagal approve: ' + err.message, 'error');
    }
  };

  // Customer Photo — Reject
  const handleRejectCustomerPhoto = async (id: string) => {
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/customer-photos/${id}/reject`), { method: 'PATCH' });
      if (!res.ok) throw new Error('Gagal reject');
      setCustomerPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
      showNotif('Foto ditolak.', 'success');
    } catch (err: any) {
      showNotif('Gagal reject: ' + err.message, 'error');
    }
  };

  // Customer Photo — Delete
  const handleDeleteCustomerPhoto = async (id: string) => {
    if (!confirm('Hapus foto customer ini secara permanen?')) return;
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/customer-photos/${id}`), { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus');
      setCustomerPhotos(prev => prev.filter(p => p.id !== id));
      showNotif('Foto customer dihapus.', 'success');
    } catch (err: any) {
      showNotif('Gagal hapus: ' + err.message, 'error');
    }
  };

  // Shared WebP upload helper
  const uploadImageAsWebP = (file: File, onSuccess: (url: string) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            const max = 1200;
            const ratio = Math.min(max / img.width, max / img.height, 1);
            canvas.width = Math.round(img.width * ratio);
            canvas.height = Math.round(img.height * ratio);
            const ctx2 = canvas.getContext('2d')!;
            ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
            const webpData = canvas.toDataURL('image/webp', 0.85);
            const uploadRes = await fetchWithAuth(getApiUrl('/api/upload'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ base64Data: webpData, fileName: file.name.replace(/\.[^/.]+$/, '') + '.webp', fileType: 'image/webp' })
            });
            if (!uploadRes.ok) throw new Error('Upload gagal');
            const data = await uploadRes.json();
            onSuccess(data.publicUrl);
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Gagal load image'));
      };
      reader.onerror = () => reject(new Error('Gagal baca file'));
    });
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Gunakan API endpoint (bukan direct Supabase) agar melewati service role key
      // dan tidak terblokir oleh Row Level Security (RLS)
      const res = await fetchWithAuth(getApiUrl("/api/news"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newNews.title,
          content: newNews.content,
          author: newNews.author,
          coverImage: newNews.coverImage,
          category: newNews.category
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menambahkan berita");
      }
      showNotif("Berita berhasil ditambahkan!", "success");
      setIsNewsOpen(false);
      setNewNews({
        title: "", content: "", author: "Mochammad Rifai",
        coverImage: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800",
        category: "Tips Seduh"
      });
      setRefreshKey(p => p + 1);
    } catch (err: any) {
      console.error(err);
      showNotif(err.message || "Gagal menambah berita", "error");
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm("Hapus berita ini?")) return;
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/news/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus berita");
      showNotif("Berita berhasil dihapus!", "success");
      setRefreshKey(p => p + 1);
    } catch (err: any) {
      console.error(err);
      showNotif("Gagal menghapus berita", "error");
    }
  };

  const handleEditNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews) return;
    try {
      const res = await fetchWithAuth(getApiUrl(`/api/news/${editingNews.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingNews.title,
          content: editingNews.content,
          author: editingNews.author,
          coverImage: editingNews.coverImage,
          category: editingNews.category
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal mengedit berita");
      }
      showNotif("Berita berhasil diperbarui!", "success");
      setEditingNews(null);
      setRefreshKey(p => p + 1);
    } catch (err: any) {
      showNotif(err.message || "Gagal mengedit berita", "error");
    }
  };

  // Sidebar Menu Items
  const sidebarItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "orders", label: "Order", icon: ShoppingBag, badge: orderList.filter(o => o.status === "pending").length },
    { id: "invoices", label: "Invoice & Bukti", icon: Receipt },
    { id: "menu", label: "Daftar Menu", icon: Coffee },
    { id: "packages", label: "Daftar Paket", icon: Layers },
    { id: "finances", label: "Keuangan", icon: Wallet },
    { id: "recipelab", label: "Costing & Recipe Lab", icon: Calculator },
    { id: "news", label: "Kopi News", icon: BookOpen },
    { id: "media", label: "Foto & Pamflet", icon: ImageIcon },
    { id: "users", label: "Pengguna", icon: Users },
    { id: "chat", label: "Chat Admin", icon: MessageSquare },
    { id: "aimaster", label: "AI Master", icon: Sparkles },
    { id: "emails", label: "Email Master", icon: Mail },
    { id: "logs", label: "Logs (Immutable)", icon: FileClock }
  ];

  const activeFin = finances.find(f => f.period === financePeriod) || finances[2];

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-stone-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-row font-sans w-full max-w-[100vw]">
      
      {/* Sidebar Navigation */}
      <aside className={`bg-gradient-to-b from-amber-950 via-zinc-900 to-black text-amber-100 min-h-screen flex flex-col sticky top-0 z-30 transition-all duration-300 flex-shrink-0 ${isSidebarShrunk ? "w-20" : "w-64"}`}>
        <div className="p-4 border-b border-amber-900/30 flex flex-col items-center justify-center gap-4">
          <div className={`flex items-center ${isSidebarShrunk ? "justify-center" : "justify-between"} w-full`}>
            {!isSidebarShrunk && (
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-900 rounded-lg shrink-0">
                  <Coffee className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-serif font-bold text-lg tracking-wide text-amber-50 leading-none truncate">Tampa Seduh</h1>
                  <span className="text-[10px] text-amber-400 font-sans tracking-widest uppercase block truncate">Admin Terminal</span>
                </div>
              </div>
            )}
            {isSidebarShrunk && (
              <div className="p-1.5 bg-amber-900 rounded-lg shrink-0 mx-auto">
                <Coffee className="w-6 h-6 text-amber-400" />
              </div>
            )}
          </div>
          
          <div className={`flex items-center w-full ${isSidebarShrunk ? "justify-center flex-col gap-3" : "justify-between"}`}>
            <button 
              onClick={() => setIsSidebarShrunk(!isSidebarShrunk)}
              className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-amber-200 transition-all shadow-sm flex items-center justify-center"
              title={isSidebarShrunk ? "Perluas Panel" : "Perkecil Panel"}
            >
              {isSidebarShrunk ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <button 
              onClick={handleToggleDark}
              className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-amber-200 transition-all shadow-sm flex items-center justify-center"
              title="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                title={isSidebarShrunk ? item.label : undefined}
                className={`w-full flex items-center ${isSidebarShrunk ? "justify-center" : "justify-between"} ${isSidebarShrunk ? "px-2 py-3" : "px-3.5 py-2.5"} rounded-xl text-sm font-medium transition-all duration-150 group cursor-pointer ${
                  isActive
                    ? "bg-amber-900 text-amber-50 shadow"
                    : "text-amber-200/80 hover:text-amber-100 hover:bg-white/5"
                }`}
              >
                <div className={`flex items-center ${isSidebarShrunk ? "justify-center" : "gap-2.5"}`}>
                  <div className="relative">
                    <Icon className={`${isSidebarShrunk ? "w-6 h-6" : "w-4 h-4"} ${isActive ? "text-amber-300" : "text-amber-400 group-hover:text-amber-300"}`} />
                    {isSidebarShrunk && item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full ring-2 ring-amber-950" />
                    )}
                  </div>
                  {!isSidebarShrunk && <span className="truncate">{item.label}</span>}
                </div>
                {!isSidebarShrunk && item.badge && item.badge > 0 && (
                  <span className="bg-red-500 text-white font-sans text-[10px] font-bold px-2 py-0.5 rounded-full ring-2 ring-amber-950 shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-amber-900/30 space-y-2">
          <button
            onClick={onBackToStorefront}
            title={isSidebarShrunk ? "Kembali Ke Kedai" : undefined}
            className="w-full bg-amber-900/30 hover:bg-amber-900/60 text-amber-200 border border-amber-800/40 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className={isSidebarShrunk ? "w-5 h-5" : "w-3.5 h-3.5 shrink-0"} />
            {!isSidebarShrunk && <span className="truncate">Kembali Ke Kedai</span>}
          </button>
          
          <button
            onClick={async () => {
              if (confirm("Keluar dari Sesi Admin dari Perangkat ini?")) {
                await supabase.auth.signOut();
                if (onLogoutAdmin) onLogoutAdmin();
              }
            }}
            title={isSidebarShrunk ? "Keluar (Logout)" : undefined}
            className="w-full bg-red-900/20 hover:bg-red-900/50 text-red-400 border border-red-900/30 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lock className={isSidebarShrunk ? "w-5 h-5" : "w-3.5 h-3.5 shrink-0"} />
            {!isSidebarShrunk && <span className="truncate">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen relative">
        {/* Global Notification Overlay */}
        <AnimatePresence>
          {globalNotif && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: -20, x: "-50%" }}
              className={`fixed top-6 left-1/2 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border ${
                globalNotif.type === "success" ? "bg-emerald-50 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100" :
                globalNotif.type === "error" ? "bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-700 text-red-900 dark:text-red-100" :
                "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
              }`}
            >
              {globalNotif.type === "loading" && <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />}
              <span className="text-sm font-bold">{globalNotif.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Header toolbar */}
        <header className="bg-white dark:bg-zinc-900/90 border-b border-zinc-250 dark:border-zinc-800 py-4 px-6 sm:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-20 backdrop-blur">
          <div>
            <h2 className="font-serif font-bold text-2xl text-amber-950 dark:text-amber-50 capitalize tracking-tight flex items-center gap-2">
              Management - {activeTab}
            </h2>
            <p className="text-xs text-zinc-500">Terminal monitoring penjualan dan konten kedai Tampa Seduh</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 text-amber-950 dark:text-amber-100 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
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
                  {/* ═══ SIGN CONTROL — Buka/Tutup Kedai ═══ */}
                  <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-500 p-6 flex flex-col sm:flex-row items-center justify-between gap-6
                    ${shopIsOpen
                      ? 'border-green-400/40 bg-gradient-to-br from-[#0d1f0d] to-[#0a2a12] shadow-lg shadow-green-900/20'
                      : 'border-zinc-700/50 bg-gradient-to-br from-zinc-900 to-zinc-950 shadow-lg shadow-black/30'
                    }`}
                  >
                    {/* Background glow */}
                    {shopIsOpen && <div className="absolute inset-0 bg-green-500/5 pointer-events-none animate-pulse" />}

                    {/* Mini Sign Preview */}
                    <div className="flex items-center gap-5 z-10">
                      {/* Mini café sign */}
                      <div className={`relative flex flex-col items-center justify-center rounded-xl px-5 py-3 border-2 transition-all duration-500 min-w-[110px]
                        ${shopIsOpen
                          ? 'border-green-400/70 bg-[#0a1f0a]'
                          : 'border-zinc-700 bg-zinc-900'
                        }`}
                      >
                        {/* Mini lights — top */}
                        <div className="absolute -top-1.5 left-0 right-0 flex justify-around px-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full border transition-all duration-500 ${
                              shopIsOpen
                                ? 'bg-green-400 border-green-300 shadow-[0_0_6px_2px_rgba(74,222,128,0.8)]'
                                : 'bg-zinc-700 border-zinc-600'
                            }`} />
                          ))}
                        </div>
                        {/* Mini lights — bottom */}
                        <div className="absolute -bottom-1.5 left-0 right-0 flex justify-around px-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full border transition-all duration-500 ${
                              shopIsOpen
                                ? 'bg-green-400 border-green-300 shadow-[0_0_6px_2px_rgba(74,222,128,0.8)]'
                                : 'bg-zinc-700 border-zinc-600'
                            }`} />
                          ))}
                        </div>
                        <span className="text-[7px] font-bold tracking-[0.3em] text-zinc-400 uppercase">TAMPA SEDUH</span>
                        <span className={`font-serif font-black text-xl tracking-widest leading-none mt-0.5 transition-all duration-500 ${
                          shopIsOpen ? 'text-green-300' : 'text-zinc-500'
                        }`}
                        style={shopIsOpen ? { textShadow: '0 0 8px rgba(74,222,128,0.9), 0 0 20px rgba(74,222,128,0.4)' } : {}}>
                          {shopIsOpen ? 'BUKA' : 'TUTUP'}
                        </span>
                        <span className={`text-[7px] font-bold tracking-wider mt-0.5 transition-colors duration-500 ${
                          shopIsOpen ? 'text-green-400/70' : 'text-zinc-600'
                        }`}>{shopIsOpen ? '● Open' : '○ Closed'}</span>
                      </div>

                      {/* Status text */}
                      <div>
                        <h3 className={`font-serif font-black text-xl transition-colors duration-500 ${
                          shopIsOpen ? 'text-green-300' : 'text-zinc-400'
                        }`}>
                          {shopIsOpen ? 'Kedai Sedang Buka' : 'Kedai Sedang Tutup'}
                        </h3>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {shopIsOpen
                            ? 'Sign hijau menyala di Hero — pelanggan bisa memesan sekarang'
                            : 'Sign dipadamkan di Hero — tampilkan pesan tutup ke pelanggan'
                          }
                        </p>
                        <div className={`mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          shopIsOpen
                            ? 'bg-green-900/30 text-green-400 border border-green-500/20'
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${shopIsOpen ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`} />
                          {shopIsOpen ? 'LIVE — Tampil di Homepage' : 'OFFLINE — Sign gelap di Homepage'}
                        </div>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <div className="flex flex-col items-center gap-3 z-10">
                      <button
                        onClick={toggleShopStatus}
                        disabled={shopStatusLoading}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-xl border-2 min-w-[180px] justify-center
                          ${shopIsOpen
                            ? 'bg-red-900/80 hover:bg-red-800 border-red-700/50 text-red-200 shadow-red-900/30'
                            : 'bg-green-900/80 hover:bg-green-800 border-green-600/50 text-green-200 shadow-green-900/30'
                          } ${shopStatusLoading ? 'opacity-70 cursor-not-allowed scale-95' : 'hover:scale-105'}`}
                        id="btn-toggle-shop-status"
                      >
                        {shopStatusLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                            <span>Memproses...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg">{shopIsOpen ? '🔴' : '🟢'}</span>
                            {shopIsOpen ? 'Tutup Kedai' : 'Buka Kedai'}
                          </>
                        )}
                      </button>

                      {/* Feedback toast */}
                      {shopStatusMsg && (
                        <div className={`text-xs font-semibold px-4 py-2.5 rounded-xl border max-w-[260px] text-center leading-relaxed transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                          shopStatusMsg.type === "success"
                            ? "bg-green-950/60 border-green-600/30 text-green-300"
                            : "bg-red-950/60 border-red-600/30 text-red-300"
                        }`}>
                          {shopStatusMsg.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cards matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Ringkasan Omset</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-serif font-black text-amber-950 dark:text-amber-300">Rp {new Intl.NumberFormat('id-ID').format(orderList.filter(o => o.status === "completed").reduce((sum, o) => sum + o.total, 0) * 1000)}</span>
                      </div>
                      <p className="text-[10px] text-zinc-450 mt-1">Total pendapatan dihitung otomatis</p>
                    </div>

                    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Pesanan Masuk</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-serif font-black text-amber-950 dark:text-amber-50">{orderList.length}</span>
                        <span className="text-[10px] font-bold text-zinc-400">Total Akumulasi</span>
                      </div>
                      {/* Breakdown badge: Pending + Diproses + Selesai */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                          {orderList.filter(o => o.status === "pending").length} Pending
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                          {orderList.filter(o => o.status === "preparing" || o.status === "delivering").length} Proses
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          {orderList.filter(o => o.status === "completed").length} Selesai
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-450 mt-1.5">Total akumulasi semua pesanan di database</p>
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
                                <span className="font-mono font-bold block text-amber-800 dark:text-amber-300">Rp {order.total}.000</span>
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

                  {/* ══════════════════════════════════════════════════
                      DATABASE CONNECTION STATUS PANEL (Real-time)
                  ══════════════════════════════════════════════════ */}
                  <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm">
                    <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-5">
                      <div>
                        <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50">Realtime Connection Status</h3>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Status koneksi semua layanan & database — auto-refresh setiap 15 detik</p>
                      </div>
                      <button
                        onClick={() => fetchConnections()}
                        disabled={refreshingConn !== null}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshingConn !== null ? 'animate-spin' : ''}`} />
                        Refresh Semua
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { key: "ai_chat",  label: "AI Chat (Emat)",      icon: "🤖", desc: "Percakapan AI aktif" },
                        { key: "menu",     label: "Database Menu",        icon: "☕", desc: "Kopi & teh tersedia" },
                        { key: "packages", label: "Database Paket",       icon: "📦", desc: "Paket kopi custom" },
                        { key: "users",    label: "Database Pengguna",    icon: "👤", desc: "Akun customer terdaftar" },
                        { key: "uploads",  label: "Upload Customer",      icon: "🖼", desc: "Foto dari pelanggan" },
                        { key: "supabase", label: "Supabase Database",    icon: "🗄", desc: "Koneksi database utama" },
                      ].map(({ key, label, icon, desc }) => {
                        const conn = dbConnections[key];
                        const isConnected = conn?.connected ?? null;
                        const isRefreshing = refreshingConn === key;
                        return (
                          <div
                            key={key}
                            className={`relative flex items-center justify-between p-4 rounded-xl border transition-all ${
                              isConnected === true
                                ? "bg-emerald-50/60 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/50"
                                : isConnected === false
                                ? "bg-red-50/60 dark:bg-red-950/15 border-red-200 dark:border-red-900/50"
                                : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Status dot */}
                              <div className="relative shrink-0">
                                <span className="text-xl">{icon}</span>
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${
                                  isConnected === true ? "bg-emerald-500" :
                                  isConnected === false ? "bg-red-500" :
                                  "bg-zinc-400 animate-pulse"
                                }`} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{label}</p>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{desc}</p>
                                {conn && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                      isConnected ? "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30" : "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30"
                                    }`}>
                                      {isConnected ? "● Terkoneksi" : "● Disconnected"}
                                    </span>
                                    {conn.count !== undefined && (
                                      <span className="text-[10px] text-zinc-400 font-mono">{conn.count} item</span>
                                    )}
                                    {conn.latency !== undefined && conn.latency > 0 && (
                                      <span className="text-[10px] text-zinc-400 font-mono">{conn.latency}ms</span>
                                    )}
                                  </div>
                                )}
                                {!conn && (
                                  <span className="text-[10px] text-zinc-400 mt-1 block">Memuat status...</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => fetchConnections(key)}
                              disabled={isRefreshing}
                              className="ml-2 p-1.5 rounded-lg bg-white/70 dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-all disabled:opacity-40 shrink-0"
                              title={`Refresh koneksi ${label}`}
                            >
                              <RefreshCw className={`w-3 h-3 text-zinc-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Audit Logs / Informasi Lengkap */}

                  <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm space-y-4">
                    <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50 border-b border-zinc-100 dark:border-zinc-800 pb-3">Informasi Lengkap (Log Sistem & Aktivitas)</h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                      {logsList.length === 0 ? (
                        <p className="text-sm py-4 text-center text-zinc-400">Belum ada aktivitas terekam.</p>
                      ) : (
                        logsList.map(log => (
                          <div key={log.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-xl flex flex-col gap-1">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-widest">{log.action}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">{new Date(log.timestamp).toLocaleString('id-ID')}</span>
                            </div>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300">{log.details}</p>
                          </div>
                        ))
                      )}
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
                      <div className="flex items-center gap-2">
                        <button onClick={() => setGuideModal('orders')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer">
                          <HelpCircle className="w-3.5 h-3.5" /> Panduan
                        </button>
                        <span className="text-xs bg-amber-900/5 dark:bg-amber-400/10 text-amber-900 dark:text-amber-300 font-bold px-3 py-1 rounded-full">
                          {orderList.length} Total Pesanan
                        </span>
                      </div>
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
                              <td className="p-4 font-mono font-bold text-amber-900 dark:text-amber-300">Rp {new Intl.NumberFormat('id-ID').format(order.total * 1000)}</td>
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
                                <div className="inline-flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg flex-wrap">
                                  <button
                                    onClick={() => setSelectedInvoiceOrder(order)}
                                    className="text-[10px] font-bold px-2 py-1 bg-amber-900 text-amber-50 hover:bg-amber-850 rounded cursor-pointer"
                                    title="Invoice"
                                  >
                                    Invoice
                                  </button>
                                  {/* Tombol PAID manual admin */}
                                  <button
                                    onClick={() => handleMarkPaid(order.id, !(order as any).isPaid)}
                                    className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer flex items-center gap-0.5 transition-all ${
                                      (order as any).isPaid
                                        ? "bg-green-500 text-white shadow-sm"
                                        : "bg-white dark:bg-zinc-700 border border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    }`}
                                    title={(order as any).isPaid ? "Cabut label PAID" : "Tandai sebagai PAID"}
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    {(order as any).isPaid ? "PAID ✓" : "PAID?"}
                                  </button>
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

              {/* Tab: Invoices */}
              {activeTab === "invoices" && (
                <div className="space-y-6">
                  <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                      <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50">Invoice & Riwayat Pembayaran</h3>
                      <span className="text-xs bg-amber-900/5 dark:bg-amber-400/10 text-amber-900 dark:text-amber-300 font-bold px-3 py-1 rounded-full">
                        {orderList.length} Total Invoice
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-xs font-bold tracking-wider">
                            <th className="p-3.5 rounded-l-xl">Order ID</th>
                            <th className="p-3.5">Pelanggan</th>
                            <th className="p-3.5">Total Tagihan</th>
                            <th className="p-3.5">Bukti Bayar (QRIS)</th>
                            <th className="p-3.5">Status Order</th>
                            <th className="p-3.5 rounded-r-xl text-center">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {orderList.map((order) => (
                            <tr key={order.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                              <td className="p-4 font-mono font-bold text-amber-800 dark:text-amber-400">{order.id}</td>
                              <td className="p-4 font-semibold text-zinc-900 dark:text-zinc-100">{order.customerName}</td>
                              <td className="p-4 font-mono font-bold text-amber-900 dark:text-amber-300">Rp {order.total}.000</td>
                              <td className="p-4 text-xs">
                                {order.paymentProofUrl ? (
                                  <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                    <img src={order.paymentProofUrl} alt="QRIS" className="w-8 h-8 object-cover rounded shadow-sm border border-zinc-200" />
                                    <span className="text-green-600 dark:text-green-400 font-bold">Terlampir</span>
                                  </a>
                                ) : (
                                  <span className="text-red-500 font-bold opacity-80">Belum Ada Bukti</span>
                                )}
                              </td>
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
                                <button
                                  onClick={() => setSelectedInvoiceOrder(order)}
                                  className="text-[11px] font-bold px-3 py-1.5 bg-amber-900 text-amber-50 hover:bg-amber-850 rounded-lg cursor-pointer shadow-sm transition-all"
                                >
                                  Buka Invoice
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ===== PANDUAN LENGKAP ADMIN DASHBOARD ===== */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-zinc-800 dark:to-zinc-800/50 border border-amber-200/70 dark:border-zinc-700 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      <div>
                        <p className="text-sm font-black text-amber-950 dark:text-amber-100">Panduan Lengkap Admin Dashboard</p>
                        <p className="text-[10px] text-zinc-500">Semua panel dan fungsinya — baca sekali, kelola seterusnya</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      {[
                        {
                          icon: '📊', title: 'Overview (Tab Ini)',
                          color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                          items: [
                            'Lihat total omset, jumlah pesanan, varian menu, dan total pelanggan',
                            'Tabel pesanan terbaru + status real-time (Pending, Disiapkan, Diantar, Selesai)',
                            'Update status pesanan langsung dari tabel ini',
                          ]
                        },
                        {
                          icon: '🛒', title: 'Pesanan (Orders)',
                          color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
                          items: [
                            'Lihat semua pesanan masuk secara lengkap',
                            'Klik baris pesanan → detail item, alamat, WhatsApp customer',
                            'Update status: Pending → Disiapkan → Diantar → Selesai',
                            'Bukti bayar yang diupload customer bisa dilihat di sini',
                            'Hapus pesanan jika diperlukan (tidak bisa di-undo)',
                          ]
                        },
                        {
                          icon: '☕', title: 'Menu (Daftar Kopi)',
                          color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                          items: [
                            'Tambah produk baru: klik "Tambah Menu" → isi form',
                            'Upload foto produk langsung dari form (otomatis WebP)',
                            'Edit produk: klik ✏️ di kartu → modal muncul di tengah layar',
                            'Toggle stok: klik "Ready/Habis" langsung di kartu',
                            'Hapus produk: klik 🗑️ (permanen, hati-hati!)',
                            'Setiap perubahan langsung tampil di website',
                          ]
                        },
                        {
                          icon: '🎁', title: 'Paket (Bundles)',
                          color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
                          items: [
                            'Buat paket kombinasi dari produk yang sudah ada di Menu',
                            'Centang produk yang masuk dalam paket',
                            'Tambahkan badge (POPULER, HEMAT, dll) untuk promosi',
                            'Edit paket: klik ✏️ → modal edit muncul di tengah layar',
                            'Upload foto paket tersendiri untuk tampilan yang lebih menarik',
                          ]
                        },
                        {
                          icon: '📰', title: 'Kopi News (Blog)',
                          color: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800',
                          items: [
                            'Buat artikel tentang kopi, promo, event, dan cerita kedai',
                            'Upload cover image artikel (auto WebP)',
                            'Set status Draft (tidak tampil) atau Published (tampil di website)',
                            'Edit artikel sudah ada: klik Edit di kartu artikel',
                            'Artikel Published tampil di section "Kopi News & Budaya" di beranda',
                          ]
                        },
                        {
                          icon: '🖼️', title: 'Media (Foto & Pamflet)',
                          color: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
                          items: [
                            'Tab Galeri: upload foto suasana kedai → tampil di section Street Coffee Foto',
                            'Tab Pamflet: upload brosur/iklan event → tampil di section Pamflet',
                            'Tab Customer Emotions: moderasi foto yang diupload customer',
                            '✅ Approve = foto tampil di website | ❌ Tolak = tersembunyi',
                            'Semua foto dikonversi ke WebP otomatis oleh browser',
                            'Badge merah muncul jika ada foto customer yang menunggu review',
                          ]
                        },
                        {
                          icon: '👥', title: 'Pelanggan (Customer Management)',
                          color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
                          items: [
                            'Lihat semua akun yang terdaftar di website',
                            'Approve permohonan Member → customer dapat diskon ongkir 25%',
                            'Blokir akun yang bermasalah (akun terblokir tidak bisa login)',
                            'Reset password customer jika ada permintaan',
                            'Lihat riwayat aktivitas dan total pesanan per customer',
                          ]
                        },
                        {
                          icon: '🤖', title: 'AI Chat (Gemini Assistant)',
                          color: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800',
                          items: [
                            'AI Barista bisa menjawab pertanyaan menu, harga, jam buka',
                            'Data produk & harga diambil langsung dari Admin Dashboard',
                            'Bisa menjawab dalam bahasa Kotabunan/Mongondow',
                            'Jawaban ringkas dan natural — tanpa format ** atau simbol lebih',
                            'Customer chat langsung di website tanpa perlu WhatsApp admin',
                          ]
                        },
                      ].map(({ icon, title, color, items }) => (
                        <div key={title} className={`p-3.5 rounded-xl border space-y-2 ${color}`}>
                          <p className="font-black text-xs text-zinc-800 dark:text-zinc-200">{icon} {title}</p>
                          <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
                            {items.map((item, i) => (
                              <li key={i} className="flex gap-1.5"><span className="opacity-40 shrink-0">›</span>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* Order Flow Visual */}
                    <div className="bg-white/70 dark:bg-zinc-900/60 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">🔄 Alur Pesanan dari Awal ke Selesai</p>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        {[
                          { label: 'Customer Pesan', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
                          { label: '→', color: 'text-zinc-400' },
                          { label: 'Pesanan Masuk (Pending)', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
                          { label: '→', color: 'text-zinc-400' },
                          { label: 'Admin Update: Disiapkan', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' },
                          { label: '→', color: 'text-zinc-400' },
                          { label: 'Admin Update: Diantar', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' },
                          { label: '→', color: 'text-zinc-400' },
                          { label: 'Selesai ✅', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
                        ].map((item, i) => (
                          <span key={i} className={`font-bold px-2 py-0.5 rounded-full ${item.color}`}>{item.label}</span>
                        ))}
                      </div>
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setGuideModal('menu')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" /> Panduan
                      </button>
                      <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold py-2 px-4 rounded-xl transition-all shadow cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Menu
                      </button>
                    </div>
                  </div>

                  {/* Add form */}
                  {isMenuOpen && (
                    <motion.form
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onSubmit={handleAddMenu}
                      className="p-6 bg-white dark:bg-zinc-900 border border-amber-900/10 rounded-2xl shadow-md space-y-4"
                    >
                      <h4 className="font-serif font-bold text-lg text-amber-955 dark:text-amber-100 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        {editingMenu ? `Edit Menu: ${editingMenu.name}` : "Buat Menu Baru"}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Nama Minuman</label>
                          <input
                            type="text"
                            placeholder="E.g., Ice Coffee Avocado"
                            value={editingMenu ? editingMenu.name : newMenu.name}
                            onChange={(e) => {
                              if (editingMenu) setEditingMenu({ ...editingMenu, name: e.target.value });
                              else setNewMenu({ ...newMenu, name: e.target.value });
                            }}
                            className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Harga Reguler (K)</label>
                          <input
                            type="number"
                            placeholder="E.g., 15"
                            value={editingMenu ? editingMenu.priceReg : newMenu.priceReg}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              if (editingMenu) setEditingMenu({ ...editingMenu, priceReg: val });
                              else setNewMenu({ ...newMenu, priceReg: val });
                            }}
                            className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Harga Jumbo (K - Opsional)</label>
                          <input
                            type="number"
                            placeholder="E.g., 20"
                            value={editingMenu ? (editingMenu.priceLarge || "") : (newMenu.priceLarge || "")}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || undefined;
                              if (editingMenu) setEditingMenu({ ...editingMenu, priceLarge: val });
                              else setNewMenu({ ...newMenu, priceLarge: val });
                            }}
                            className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Ilustrasi Cover (Link Image)</label>
                          <input
                            type="text"
                            value={editingMenu ? editingMenu.image : newMenu.image}
                            onChange={(e) => {
                              if (editingMenu) setEditingMenu({ ...editingMenu, image: e.target.value });
                              else setNewMenu({ ...newMenu, image: e.target.value });
                            }}
                            className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Upload Foto Produk</label>
                          <div className="flex gap-2 items-center">
                            <label
                              htmlFor="menu-file-upload"
                              className="flex items-center gap-2 px-4 py-2 bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
                            >
                              {isUploadingImage
                                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengunggah...</>
                                : <><Upload className="w-3.5 h-3.5" /> Pilih & Upload Foto</>}
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, "menu")}
                              className="hidden"
                              id="menu-file-upload"
                            />
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-1">Foto otomatis dikonversi ke WebP</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Sifat Penyajian</label>
                          <select
                            value={editingMenu ? ((editingMenu as any).menuCategory || (editingMenu.isHot ? "hot" : "cold")) : ((newMenu as any).menuCategory || "cold")}
                            onChange={(e) => {
                              const val = e.target.value as "hot" | "cold" | "snack";
                              const isHot = val === "hot";
                              if (editingMenu) setEditingMenu({ ...editingMenu, isHot, menuCategory: val } as any);
                              else setNewMenu({ ...newMenu, isHot, menuCategory: val } as any);
                            }}
                            className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                          >
                            <option value="cold">🧊 Ice Drink (Dingin)</option>
                            <option value="hot">☕ Hot Drink (Hangat)</option>
                            <option value="snack">🍪 Snack / Makanan</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-450 uppercase mb-1">Ketersediaan Stok</label>
                          <select
                            value={editingMenu ? (editingMenu.isAvailable ? "true" : "false") : (newMenu.isAvailable ? "true" : "false")}
                            onChange={(e) => {
                              const val = e.target.value === "true";
                              if (editingMenu) setEditingMenu({ ...editingMenu, isAvailable: val });
                              else setNewMenu({ ...newMenu, isAvailable: val });
                            }}
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
                          value={editingMenu ? editingMenu.description : newMenu.description}
                          onChange={(e) => {
                            if (editingMenu) setEditingMenu({ ...editingMenu, description: e.target.value });
                            else setNewMenu({ ...newMenu, description: e.target.value });
                          }}
                          className="w-full text-xs px-3 py-3 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setEditingMenu(null);
                          }}
                          className="px-4 py-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-405 rounded-xl cursor-pointer"
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
                            item.isHot ? 'bg-amber-700 text-white' : (item as any).menuCategory === 'snack' ? 'bg-green-700 text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {(item as any).menuCategory === 'snack' ? '🍪 Snack' : item.isHot ? '☕ Panas' : '🧊 Dingin'}
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
                              className={`flex-grow text-[11px] font-bold py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
                                item.isAvailable
                                  ? "bg-green-500/10 hover:bg-green-500/20 text-green-500"
                                  : "bg-red-500/10 hover:bg-red-500/20 text-red-500"
                              }`}
                            >
                              {item.isAvailable ? "Ready" : "Habis"}
                            </button>
                            <button
                              onClick={() => {
                                setEditingMenu(item);
                                // Buka modal edit di tengah layar, BUKAN scroll ke atas
                              }}
                              className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl transition-all cursor-pointer"
                              title="Edit Kopi"
                            >
                              <Edit2 className="w-4 h-4" />
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setGuideModal('packages')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" /> Panduan
                      </button>
                      <button
                        onClick={() => {
                          setEditingPack(null);
                          setNewPack({
                            name: "", price: 25, items: [], description: "", badge: "Promo"
                          });
                          setIsPackOpen(!isPackOpen);
                        }}
                        className="bg-amber-950 hover:bg-amber-900 text-amber-50 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Buat Paket Baru
                      </button>
                    </div>
                  </div>

                  {/* Pack Add/Edit Form */}
                  {isPackOpen && (
                    <motion.form
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onSubmit={handleSavePack}
                      className="p-6 bg-white dark:bg-zinc-900 border border-amber-900/10 rounded-2xl shadow-md space-y-4"
                    >
                      <h4 className="font-serif font-bold text-lg text-amber-955 dark:text-amber-100 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        {editingPack ? `Edit Paket: ${editingPack.name}` : "Buat Paket Hemat Baru"}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-left">
                        <div>
                          <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase mb-1">Nama Paket</label>
                          <input
                            type="text"
                            value={editingPack ? editingPack.name : newPack.name}
                            onChange={(e) => {
                              if (editingPack) setEditingPack({ ...editingPack, name: e.target.value });
                              else setNewPack({ ...newPack, name: e.target.value });
                            }}
                            className="w-full px-3 py-2 border rounded-xl dark:bg-zinc-800 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
                            placeholder="Contoh: Paket Duo TPS"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase mb-1">Harga (K - Ribu)</label>
                          <input
                            type="number"
                            value={editingPack ? editingPack.price : newPack.price}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              if (editingPack) setEditingPack({ ...editingPack, price: val });
                              else setNewPack({ ...newPack, price: val });
                            }}
                            className="w-full px-3 py-2 border rounded-xl dark:bg-zinc-800 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase mb-1">Badge Promo</label>
                          <input
                            type="text"
                            value={editingPack ? editingPack.badge || "" : newPack.badge || ""}
                            onChange={(e) => {
                              if (editingPack) setEditingPack({ ...editingPack, badge: e.target.value });
                              else setNewPack({ ...newPack, badge: e.target.value });
                            }}
                            className="w-full px-3 py-2 border rounded-xl dark:bg-zinc-800 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
                            placeholder="Contoh: Hemat, Terlaris"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase mb-1">Foto Cover Paket (Link/URL)</label>
                          <input
                            type="text"
                            value={editingPack ? editingPack.image || "" : newPack.image || ""}
                            onChange={(e) => {
                              if (editingPack) setEditingPack({ ...editingPack, image: e.target.value });
                              else setNewPack({ ...newPack, image: e.target.value });
                            }}
                            className="w-full px-3 py-2 border rounded-xl dark:bg-zinc-800 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
                            placeholder="Contoh: /Produk/WhatsApp Image..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase mb-1">Upload Foto Cover Paket</label>
                          <div className="flex gap-2 items-center">
                            <label
                              htmlFor="pack-file-upload"
                              className="flex items-center gap-2 px-4 py-2 bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
                            >
                              {isUploadingImage
                                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengunggah...</>
                                : <><Upload className="w-3.5 h-3.5" /> Pilih & Upload Foto</>}
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, "package")}
                              className="hidden"
                              id="pack-file-upload"
                            />
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-1">Foto otomatis dikonversi ke WebP</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase mb-1">Deskripsi Paket</label>
                        <textarea
                          value={editingPack ? editingPack.description : newPack.description}
                          onChange={(e) => {
                            if (editingPack) setEditingPack({ ...editingPack, description: e.target.value });
                            else setNewPack({ ...newPack, description: e.target.value });
                          }}
                          className="w-full px-3 py-2 border rounded-xl dark:bg-zinc-800 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
                          rows={2}
                          placeholder="Tuliskan keuntungan paket kawan..."
                          required
                        />
                      </div>

                      {/* Items selection checkboxes */}
                      <div className="text-left">
                        <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase mb-1">Pilih Produk untuk Paket</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 border rounded-xl bg-zinc-50 dark:bg-zinc-950/20 max-h-40 overflow-y-auto dark:border-zinc-800">
                          {menuList.map((m) => {
                            const isChecked = editingPack
                              ? editingPack.items.includes(m.id)
                              : newPack.items.includes(m.id);
                            return (
                              <label key={m.id} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    if (editingPack) {
                                      const updatedItems = checked
                                        ? [...editingPack.items, m.id]
                                        : editingPack.items.filter(id => id !== m.id);
                                      setEditingPack({ ...editingPack, items: updatedItems });
                                    } else {
                                      const updatedItems = checked
                                        ? [...newPack.items, m.id]
                                        : newPack.items.filter(id => id !== m.id);
                                      setNewPack({ ...newPack, items: updatedItems });
                                    }
                                  }}
                                  className="rounded border-zinc-300 dark:border-zinc-700 text-amber-900 focus:ring-amber-800"
                                />
                                <span className="truncate text-zinc-900 dark:text-zinc-150">{m.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsPackOpen(false);
                            setEditingPack(null);
                          }}
                          className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Simpan Paket
                        </button>
                      </div>
                    </motion.form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {packages.map((pack) => (
                      <div key={pack.id} className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full uppercase">
                              {pack.badge || "PROMO"}
                            </span>
                            <span className="font-serif font-black text-xl text-amber-900 dark:text-amber-400">Rp {pack.price}.000</span>
                          </div>
                          <div>
                            <h4 className="font-serif font-bold text-lg dark:text-amber-50 text-left">{pack.name}</h4>
                            <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed mt-1 text-left">{pack.description}</p>
                          </div>
                          <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-xl space-y-1.5 text-xs text-left">
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
                        <div className="flex gap-2 justify-end border-t pt-3 mt-2 dark:border-zinc-800">
                          <button
                            onClick={() => {
                              setEditingPack(pack);
                              // Buka modal edit di tengah layar
                            }}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                            title="Edit Paket"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePack(pack.id)}
                            className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors cursor-pointer"
                            title="Hapus Paket"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                            Rp {new Intl.NumberFormat('id-ID').format(activeFin.revenue.reduce((a, b) => a + b, 0) * 1000)}
                          </h4>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-1">Dihitung otomatis per periode {financePeriod}</span>
                        </div>

                        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl">
                          <span className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-widest block">Biaya Operasional & Bahan</span>
                          <h4 className="text-3xl font-serif font-black text-red-950 dark:text-red-300 mt-2">
                            Rp {new Intl.NumberFormat('id-ID').format(activeFin.costs.reduce((a, b) => a + b, 0) * 1000)}
                          </h4>
                          <span className="text-[10px] text-red-650 dark:text-red-400 font-medium block mt-1">Susu, biji kopi, gaji barista, listrik, sewa</span>
                        </div>

                        <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                          <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest block">Laba Bersih Usaha (Net Profit)</span>
                          <h4 className="text-3xl font-serif font-black text-amber-950 dark:text-amber-300 mt-2">
                            Rp {new Intl.NumberFormat('id-ID').format((activeFin.revenue.reduce((a, b) => a + b, 0) - activeFin.costs.reduce((a, b) => a + b, 0)) * 1000)}
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

                      {/* REAL PROFIT ENGINE V1 SECTION */}
                      <div className="border-t border-zinc-200/50 dark:border-zinc-800/80 pt-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                          <div>
                            <h2 className="text-xl font-serif font-black text-amber-950 dark:text-amber-100 flex items-center gap-2">
                              <Calculator className="w-5 h-5 text-amber-700 dark:text-amber-500" />
                              Real Profit Engine <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300 font-sans font-bold px-2 py-0.5 rounded-full border border-amber-250/20">V1 ACTIVE</span>
                            </h2>
                            <p className="text-xs text-zinc-500 mt-1">Dihitung dari resep & costing bahan baku riil untuk setiap pesanan selesai.</p>
                          </div>
                          
                          {/* Period Selector for Real Profit */}
                          <div className="flex bg-zinc-150 dark:bg-zinc-850 p-1 rounded-xl w-fit self-start md:self-auto border border-zinc-200/20">
                            {([
                              { key: "today", label: "Hari Ini" },
                              { key: "last_7d", label: "7 Hari Terakhir" },
                              { key: "last_30d", label: "30 Hari Terakhir" },
                              { key: "all_time", label: "Semua Waktu" }
                            ] as const).map((p) => (
                              <button
                                key={p.key}
                                type="button"
                                onClick={() => setSelectedProfitPeriod(p.key)}
                                className={`text-xs py-1.5 px-3 rounded-lg font-bold cursor-pointer transition-all ${
                                  selectedProfitPeriod === p.key
                                    ? "bg-amber-900 text-amber-50 shadow"
                                    : "text-zinc-500 hover:bg-zinc-200/50"
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {profitDashboard ? (
                          <div className="space-y-6">
                            {/* Selected Period Stats */}
                            {(() => {
                              const periodData = profitDashboard[selectedProfitPeriod];
                              return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                  <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-950/10 dark:to-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl shadow-sm">
                                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest block">Omset Aktual (Revenue)</span>
                                    <h4 className="text-2xl font-serif font-black text-emerald-950 dark:text-emerald-300 mt-2">
                                      Rp {periodData.revenue.toLocaleString("id-ID")}.000
                                    </h4>
                                    <span className="text-[10px] text-zinc-500 mt-1 block font-medium">{periodData.orders_count} pesanan selesai</span>
                                  </div>

                                  <div className="p-5 bg-gradient-to-br from-red-50 to-red-100/30 dark:from-red-950/10 dark:to-red-950/20 border border-red-100 dark:border-red-900/20 rounded-2xl shadow-sm">
                                    <span className="text-[10px] font-bold text-red-800 dark:text-red-400 uppercase tracking-widest block">HPP Aktual (Recipe Cost)</span>
                                    <h4 className="text-2xl font-serif font-black text-red-950 dark:text-red-300 mt-2">
                                      Rp {periodData.hpp.toLocaleString("id-ID")}.000
                                    </h4>
                                    <span className="text-[10px] text-zinc-500 mt-1 block font-medium">Berdasarkan HPP resep di lab</span>
                                  </div>

                                  <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100/30 dark:from-amber-950/10 dark:to-amber-950/20 border border-amber-100 dark:border-amber-900/20 rounded-2xl shadow-sm">
                                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest block">Laba Kotor Aktual</span>
                                    <h4 className="text-2xl font-serif font-black text-amber-950 dark:text-amber-300 mt-2">
                                      Rp {periodData.gross_profit.toLocaleString("id-ID")}.000
                                    </h4>
                                    <span className="text-[10px] text-zinc-500 mt-1 block font-medium">Laba sebelum biaya operasional tetap</span>
                                  </div>

                                  <div className="p-5 bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-900/40 dark:to-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl shadow-sm">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Margin Profit Aktual</span>
                                    <h4 className="text-2xl font-serif font-black text-zinc-800 dark:text-zinc-250 mt-2">
                                      {periodData.margin}%
                                    </h4>
                                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                      <div className="bg-amber-700 h-full rounded-full" style={{ width: `${Math.min(periodData.margin, 100)}%` }} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Top and Bottom Items Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Top profitable menu items */}
                              <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                                  <h3 className="font-serif font-bold text-sm text-zinc-850 dark:text-zinc-100 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    5 Menu Paling Menguntungkan
                                  </h3>
                                  <span className="text-[10px] text-zinc-400">Diurutkan berdasarkan total profit</span>
                                </div>

                                {profitDashboard.top_profitable.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                          <th className="py-2 pb-3">Menu</th>
                                          <th className="py-2 pb-3 text-center">Terjual</th>
                                          <th className="py-2 pb-3 text-right">Profit Aktual</th>
                                          <th className="py-2 pb-3 text-right">Margin %</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                                        {profitDashboard.top_profitable.map((item, i) => (
                                          <tr key={i} className="text-xs hover:bg-zinc-50/50 dark:hover:bg-zinc-805/30 transition-colors">
                                            <td className="py-2.5 font-bold text-zinc-700 dark:text-zinc-350">{item.name}</td>
                                            <td className="py-2.5 text-center text-zinc-500 font-semibold">{item.total_qty}x</td>
                                            <td className="py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">Rp {item.total_profit.toLocaleString("id-ID")}.000</td>
                                            <td className="py-2.5 text-right font-mono font-bold text-zinc-650">{item.avg_margin}%</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="py-8 text-center text-xs text-zinc-400">Belum ada data penjualan menu.</div>
                                )}
                              </div>

                              {/* Lowest margin menu items */}
                              <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                                  <h3 className="font-serif font-bold text-sm text-zinc-850 dark:text-zinc-100 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                    5 Menu dengan Margin Terendah
                                  </h3>
                                  <span className="text-[10px] text-zinc-400">Evaluasi penetapan harga menu</span>
                                </div>

                                {profitDashboard.lowest_margin.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                          <th className="py-2 pb-3">Menu</th>
                                          <th className="py-2 pb-3 text-center">Terjual</th>
                                          <th className="py-2 pb-3 text-right">Margin %</th>
                                          <th className="py-2 pb-3 text-right">Aksi Rekomendasi</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                                        {profitDashboard.lowest_margin.map((item, i) => (
                                          <tr key={i} className="text-xs hover:bg-zinc-50/50 dark:hover:bg-zinc-805/30 transition-colors">
                                            <td className="py-2.5 font-bold text-zinc-700 dark:text-zinc-350">{item.name}</td>
                                            <td className="py-2.5 text-center text-zinc-500 font-semibold">{item.total_qty}x</td>
                                            <td className={`py-2.5 text-right font-mono font-bold ${
                                              item.avg_margin < 20 
                                                ? "text-red-650 dark:text-red-400" 
                                                : item.avg_margin < 40 
                                                  ? "text-amber-600 dark:text-amber-400" 
                                                  : "text-zinc-650"
                                            }`}>
                                              {item.avg_margin}%
                                            </td>
                                            <td className="py-2.5 text-right">
                                              <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                                item.avg_margin < 20
                                                  ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-405 border border-red-200/25"
                                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-405 border border-amber-200/25"
                                              }`}>
                                                {item.avg_margin < 20 ? "Naikkan Harga / Resep Ekonomis" : "Pantau Costing"}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="py-8 text-center text-xs text-zinc-400">Belum ada data penjualan menu.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 bg-zinc-50 dark:bg-zinc-805/20 border border-dashed border-zinc-200/60 dark:border-zinc-800 rounded-2xl">
                            <Calculator className="w-8 h-8 text-zinc-400 animate-pulse" />
                            <span className="text-xs text-zinc-500 mt-2 font-medium">Menghitung analitik profit transaksi...</span>
                          </div>
                        )}
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
                    <span className="text-xs font-semibold text-zinc-500">Kopi News &amp; Blogs yang dipublikasikan di halaman depan</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setGuideModal('news')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer">
                        <HelpCircle className="w-3.5 h-3.5" /> Panduan
                      </button>
                      <button
                        onClick={() => setIsNewsOpen(!isNewsOpen)}
                        className="bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Bikin Artikel Baru
                      </button>
                    </div>
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
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cover Foto</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newNews.coverImage}
                              onChange={(e) => setNewNews({ ...newNews, coverImage: e.target.value })}
                              className="w-full text-xs px-3 py-2 border dark:bg-zinc-800 rounded-xl"
                              placeholder="URL atau Unggah..."
                            />
                            <input type="file" id="news-img-upload" accept="image/*" className="hidden" onChange={handleUploadNewsImage} />
                            <label htmlFor="news-img-upload" className="shrink-0 p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 hover:bg-amber-200 cursor-pointer rounded-xl transition-all" title="Unggah Foto">
                              {isUploadingNewsImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                            </label>
                          </div>
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

                  {/* Modal Edit Artikel */}
                  <AnimatePresence>
                    {editingNews && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={(e) => e.target === e.currentTarget && setEditingNews(null)}
                      >
                        <motion.form
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          onSubmit={handleEditNews}
                          className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-amber-900/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
                        >
                          <div className="flex justify-between items-center border-b pb-3 dark:border-zinc-800">
                            <h4 className="font-serif font-bold text-lg dark:text-amber-50">✏️ Edit Artikel</h4>
                            <button type="button" onClick={() => setEditingNews(null)} className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Judul Artikel</label>
                              <input
                                type="text"
                                value={editingNews.title}
                                onChange={(e) => setEditingNews({ ...editingNews, title: e.target.value })}
                                className="w-full text-xs px-3 py-2 border dark:bg-zinc-800 dark:border-zinc-700 rounded-xl"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Kategori</label>
                              <select
                                value={editingNews.category}
                                onChange={(e) => setEditingNews({ ...editingNews, category: e.target.value as any })}
                                className="w-full text-xs px-3 py-2 border dark:bg-zinc-800 dark:border-zinc-700 rounded-xl"
                              >
                                <option value="Petani">Petani</option>
                                <option value="Biji Kopi">Biji Kopi</option>
                                <option value="Tips Seduh">Tips Seduh</option>
                                <option value="Kabar Kedai">Kabar Kedai</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cover Foto</label>
                              <div className="flex flex-col gap-2">
                                {editingNews.coverImage && (
                                  <img src={editingNews.coverImage} alt="preview" className="w-full h-28 object-cover rounded-xl opacity-80" referrerPolicy="no-referrer" />
                                )}
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={editingNews.coverImage}
                                    onChange={(e) => setEditingNews({ ...editingNews, coverImage: e.target.value })}
                                    className="flex-1 text-xs px-3 py-2 border dark:bg-zinc-800 dark:border-zinc-700 rounded-xl"
                                    placeholder="URL foto atau upload di bawah"
                                  />
                                </div>
                                <input type="file" id="edit-news-img" accept="image/*" className="hidden"
                                  onChange={handleUploadEditingNewsImage} disabled={isUploadingEditNewsImg} />
                                <label htmlFor="edit-news-img"
                                  className={`flex items-center justify-center gap-2 py-2 px-3 border-2 border-dashed border-amber-400/50 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all ${isUploadingEditNewsImg ? 'opacity-50 pointer-events-none' : ''}`}>
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  {isUploadingEditNewsImg ? 'Mengunggah...' : 'Ganti Foto (auto WebP)'}
                                </label>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Penulis</label>
                              <input
                                type="text"
                                value={editingNews.author}
                                onChange={(e) => setEditingNews({ ...editingNews, author: e.target.value })}
                                className="w-full text-xs px-3 py-2 border dark:bg-zinc-800 dark:border-zinc-700 rounded-xl"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Isi Artikel</label>
                            <textarea
                              rows={6}
                              value={editingNews.content}
                              onChange={(e) => setEditingNews({ ...editingNews, content: e.target.value })}
                              className="w-full text-xs p-3 border dark:bg-zinc-800 dark:border-zinc-700 rounded-xl"
                              required
                            />
                          </div>
                          {editingNews.coverImage && (
                            <img src={editingNews.coverImage} alt="preview" className="hidden" />
                          )}
                          <div className="flex justify-end gap-2 text-xs pt-2 border-t dark:border-zinc-800">
                            <button type="button" onClick={() => setEditingNews(null)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl cursor-pointer">Batal</button>
                            <button type="submit" className="px-4 py-2 bg-amber-900 text-amber-50 font-bold rounded-xl cursor-pointer">Simpan Perubahan</button>
                          </div>
                        </motion.form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-4">
                    {newsList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                        <BookOpen className="w-8 h-8 text-zinc-300 mb-2" />
                        <p className="text-sm text-zinc-400 font-medium">Belum ada artikel. Buat artikel pertama!</p>
                      </div>
                    ) : (
                      newsList.map((post) => (
                        <div key={post.id} className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                          <div className="flex gap-4">
                            <img
                              src={post.coverImage || "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200"}
                              className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                              referrerPolicy="no-referrer"
                              onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200"; }}
                            />
                            <div className="min-w-0">
                              <span className="text-[10px] bg-amber-900/10 text-amber-900 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">{post.category}</span>
                              <h4 className="font-serif font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-1 line-clamp-2">{post.title}</h4>
                              <p className="text-zinc-500 text-xs font-sans line-clamp-2 mt-1">{post.content}</p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col justify-between items-end flex-shrink-0">
                            <span className="text-xs text-zinc-400">{post.date}</span>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs font-bold text-amber-950 dark:text-amber-200 hidden sm:block">by {post.author}</span>
                              <button
                                onClick={() => setEditingNews({ ...post })}
                                className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg transition-colors cursor-pointer"
                                title="Edit Artikel"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteNews(post.id)}
                                className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Artikel"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {/* Tab: Media — Foto Kolase & Pamflet */}
              {activeTab === "media" && (
                <div className="space-y-6">
                  <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm">
                    <div className="flex items-center justify-between mb-4 border-b pb-3 border-zinc-100 dark:border-zinc-800">
                      <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50">📸 Foto &amp; Pamflet</h3>
                      <div className="flex gap-2 flex-wrap items-center">
                        <button onClick={() => setGuideModal('media')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer">
                          <HelpCircle className="w-3.5 h-3.5" /> Panduan
                        </button>
                        <button onClick={() => setMediaSubTab("gallery")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${mediaSubTab === "gallery" ? "bg-amber-900 text-amber-50" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}>
                          🖼️ Foto Kolase
                        </button>
                        <button onClick={() => setMediaSubTab("pamflet")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${mediaSubTab === "pamflet" ? "bg-amber-900 text-amber-50" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}>
                          📋 Pamflet / Brosur
                        </button>
                        <button onClick={() => setMediaSubTab("customer")} className={`relative px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${mediaSubTab === "customer" ? "bg-amber-900 text-amber-50" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}>
                          😊 Customer Emotions
                          {customerPhotos.filter(p => p.status === 'pending').length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                              {customerPhotos.filter(p => p.status === 'pending').length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Gallery Sub-Tab */}
                    {mediaSubTab === "gallery" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Foto Kolase Street Coffee</p>
                            <p className="text-xs text-zinc-400">Foto random kejadian di kedai, suasana, dan momen seru. Ditampilkan sebagai galeri swipe di halaman utama.</p>
                          </div>
                          <div>
                            <input type="file" id="upload-gallery" accept="image/*" className="hidden" onChange={handleUploadGallery} disabled={isUploadingGallery} />
                            <label htmlFor="upload-gallery"
                              className={`flex items-center gap-2 px-4 py-2 bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold rounded-xl cursor-pointer transition-all ${isUploadingGallery ? 'opacity-50 pointer-events-none' : ''}`}>
                              <ImageIcon className="w-3.5 h-3.5" />
                              {isUploadingGallery ? 'Mengunggah...' : 'Upload Foto'}
                            </label>
                          </div>
                        </div>
                        {galleryPhotos.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                            <ImageIcon className="w-8 h-8 text-zinc-300 mb-2" />
                            <p className="text-sm text-zinc-400 font-medium">Belum ada foto. Upload foto pertama!</p>
                            <p className="text-xs text-zinc-400 mt-1">Foto akan otomatis dikonversi ke WebP</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {galleryPhotos.map((photo) => (
                              <div key={photo.id} className="relative group rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 aspect-square">
                                <img src={photo.url} alt={photo.caption || photo.filename} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button onClick={() => handleDeleteGallery(photo.filename)}
                                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full cursor-pointer transition-all">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/50 text-white text-[9px] truncate">
                                  {photo.filename.replace(/^gallery-\d+-/, '').replace(/_/g, ' ')}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-zinc-400 text-center">{galleryPhotos.length} foto tersimpan • Klik foto untuk opsi hapus</p>
                      </div>
                    )}

                    {/* Pamflet Sub-Tab */}
                    {mediaSubTab === "pamflet" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Pamflet / Brosur / Pemberitahuan</p>
                            <p className="text-xs text-zinc-400">Brosur event, promo, dan pengumuman dalam bentuk gambar. Ditampilkan sebagai carousel swipe di halaman utama.</p>
                          </div>
                          <div>
                            <input type="file" id="upload-pamflet" accept="image/*" className="hidden" onChange={handleUploadPamflet} disabled={isUploadingPamflet} />
                            <label htmlFor="upload-pamflet"
                              className={`flex items-center gap-2 px-4 py-2 bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold rounded-xl cursor-pointer transition-all ${isUploadingPamflet ? 'opacity-50 pointer-events-none' : ''}`}>
                              <ImageIcon className="w-3.5 h-3.5" />
                              {isUploadingPamflet ? 'Mengunggah...' : 'Upload Pamflet'}
                            </label>
                          </div>
                        </div>
                        {pamfletList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                            <ImageIcon className="w-8 h-8 text-zinc-300 mb-2" />
                            <p className="text-sm text-zinc-400 font-medium">Belum ada pamflet. Upload pamflet pertama!</p>
                            <p className="text-xs text-zinc-400 mt-1">Format: JPG/PNG/WebP, auto dikonversi ke WebP</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {pamfletList.map((pam) => (
                              <div key={pam.id} className="relative group rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                <img src={pam.url} alt={pam.title || pam.filename} className="w-full object-cover" style={{ aspectRatio: '9/16', objectFit: 'cover' }} />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button onClick={() => handleDeletePamflet(pam.filename)}
                                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full cursor-pointer transition-all">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="p-2 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                  {pam.filename.replace(/^pamflet-\d+-/, '').replace(/_/g, ' ')}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-zinc-400 text-center">{pamfletList.length} pamflet tersimpan • Klik hover untuk opsi hapus</p>
                      </div>
                    )}

                    {/* Customer Emotions Sub-Tab */}
                    {mediaSubTab === "customer" && (
                      <div className="space-y-4">
                        {/* Info Flow Card */}
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-zinc-800 dark:to-zinc-800/60 border border-amber-200/80 dark:border-zinc-700 rounded-2xl p-4 space-y-3">
                          <p className="text-xs font-black uppercase tracking-widest text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                            <span>📋</span> Panduan Alur Customer Emotions
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            {[
                              { step: '1', icon: '🌐', label: 'Customer buka website', desc: 'Scroll ke section "Customer Emotions"', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
                              { step: '2', icon: '🔑', label: 'Belum login', desc: 'Tombol "Login untuk Upload Foto" muncul', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' },
                              { step: '3', icon: '📸', label: 'Setelah login', desc: 'Form caption + tombol Upload tersedia', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' },
                              { step: '4', icon: '🔄', label: 'Auto WebP', desc: 'Browser konversi foto ke WebP sebelum upload', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300' },
                              { step: '5', icon: '⏳', label: 'Pending', desc: 'Foto masuk database dengan status PENDING', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
                              { step: '6', icon: '🔔', label: 'Badge merah muncul', desc: 'Di tab "😊 Customer Emotions" ini, angka merah muncul', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' },
                              { step: '7', icon: '✅', label: 'Admin klik Approve', desc: 'Status jadi APPROVED → foto tampil di website', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
                              { step: '8', icon: '❌', label: 'Admin klik Tolak', desc: 'Status REJECTED → foto tidak tampil, tersimpan di bucket', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
                              { step: '9', icon: '🗑️', label: 'Hapus Permanen', desc: 'Tombol hapus menghapus dari bucket & database selamanya', color: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300' },
                            ].map(({ step, icon, label, desc, color }) => (
                              <div key={step} className={`flex items-start gap-2 rounded-xl px-2.5 py-2 ${color}`}>
                                <span className="font-black text-[10px] opacity-60 w-4 shrink-0">#{step}</span>
                                <span className="shrink-0">{icon}</span>
                                <div>
                                  <p className="font-bold leading-tight">{label}</p>
                                  <p className="opacity-70 text-[10px] leading-tight mt-0.5">{desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Customer Emotions — Foto dari Pelanggan</p>
                            <p className="text-xs text-zinc-400">Foto yang diupload customer. Approve agar tampil di website, Reject untuk menyembunyikan.</p>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-lg font-bold">
                              {customerPhotos.filter(p => p.status === 'pending').length} Pending
                            </span>
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-lg font-bold">
                              {customerPhotos.filter(p => p.status === 'approved').length} Live
                            </span>
                          </div>
                        </div>

                        {customerPhotos.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                            <span className="text-4xl mb-2">😊</span>
                            <p className="text-sm text-zinc-400 font-medium">Belum ada foto dari customer.</p>
                            <p className="text-xs text-zinc-400 mt-1">Foto akan muncul di sini setelah customer upload dari website.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Group by status: pending first */}
                            {['pending', 'approved', 'rejected'].map(status => {
                              const filtered = customerPhotos.filter(p => p.status === status);
                              if (filtered.length === 0) return null;
                              return (
                                <div key={status}>
                                  <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md inline-block mb-2 ${
                                    status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                    status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  }`}>
                                    {status === 'pending' ? '⏳ Menunggu Persetujuan' : status === 'approved' ? '✅ Ditampilkan di Website' : '❌ Ditolak'}
                                    {' '}({filtered.length})
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {filtered.map((photo) => (
                                      <div key={photo.id} className="relative group rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                        <img src={photo.url} alt={photo.caption || photo.user_name}
                                          className="w-full aspect-square object-cover" />
                                        <div className="p-2 space-y-1">
                                          <p className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate">{photo.user_name}</p>
                                          {photo.caption && <p className="text-[9px] text-zinc-400 truncate italic">"{photo.caption}"</p>}
                                          <p className="text-[9px] text-zinc-400">{new Date(photo.created_at).toLocaleDateString('id-ID')}</p>
                                        </div>
                                        <div className="flex gap-1 p-2 pt-0">
                                          {photo.status !== 'approved' && (
                                            <button onClick={() => handleApproveCustomerPhoto(photo.id)}
                                              className="flex-1 py-1 bg-green-600 hover:bg-green-700 text-white text-[9px] font-black rounded-lg cursor-pointer transition-all">
                                              ✓ Approve
                                            </button>
                                          )}
                                          {photo.status !== 'rejected' && (
                                            <button onClick={() => handleRejectCustomerPhoto(photo.id)}
                                              className="flex-1 py-1 bg-zinc-400 hover:bg-zinc-500 text-white text-[9px] font-black rounded-lg cursor-pointer transition-all">
                                              ✗ Tolak
                                            </button>
                                          )}
                                          <button onClick={() => handleDeleteCustomerPhoto(photo.id)}
                                            className="py-1 px-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 text-red-600 text-[9px] font-black rounded-lg cursor-pointer transition-all">
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Users */}
              {activeTab === "users" && (
                <div className="space-y-6">
                  <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center mb-3 border-b pb-3 border-zinc-100 dark:border-zinc-800">
                      <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50">Kawan Setia (Pengguna Sistem &amp; Customers)</h3>
                      <button onClick={() => setGuideModal('users')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer">
                        <HelpCircle className="w-3.5 h-3.5" /> Panduan
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="bg-zinc-50 dark:bg-zinc-820 text-zinc-500 font-bold text-xs uppercase tracking-wider">
                            <th className="p-3">User ID</th>
                            <th className="p-3">Nama Lengkap</th>
                            <th className="p-3">Email & Kontak</th>
                            <th className="p-3">Role & Membership</th>
                            <th className="p-3">Histori Belanja</th>
                            <th className="p-3 text-center">Status Akses</th>
                            <th className="p-3 text-center">Hapus</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {usersList.map((usr) => {
                            const isBlocked = usr.isBlocked || usr.lastActive === "BLOCKED";
                            return (
                            <tr key={usr.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                              <td className="p-4 font-mono font-bold text-amber-800 dark:text-amber-400">{usr.id}</td>
                              <td className="p-4 font-semibold text-zinc-900 dark:text-zinc-100">
                                {usr.name}
                                {usr.lastActive && !isBlocked && <div className="text-[10px] text-green-500 font-bold mt-1">Active: {usr.lastActive}</div>}
                                {isBlocked && <div className="text-[10px] text-red-500 font-bold mt-1">DIBLOKIR SISTEM</div>}
                              </td>
                              <td className="p-4">
                                <div className="text-zinc-700 dark:text-zinc-300 font-medium">{usr.email}</div>
                                {usr.whatsapp && <div className="text-xs text-zinc-500 mt-0.5">WA: {usr.whatsapp}</div>}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    usr.role === "admin" ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300" : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                  }`}>
                                    {usr.role}
                                  </span>
                                  {usr.isMember && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                      VIP Member
                                    </span>
                                  )}
                                  {usr.membershipStatus === "pending" && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 animate-pulse">
                                      Pending Member
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-zinc-600 dark:text-zinc-400 font-bold">{usr.ordersCount || 0} Kali</td>
                              <td className="p-4 text-center flex flex-col gap-2 items-center">
                                <button
                                  onClick={() => handleToggleBlockUser(usr)}
                                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer shadow-sm transition-all w-24 ${
                                    isBlocked 
                                    ? "bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                                    : "bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                  }`}
                                >
                                  {isBlocked ? "Buka Blokir" : "Blokir Akses"}
                                </button>
                                <button
                                  onClick={() => {
                                    setUpdatingUserPass(usr);
                                    setNewUserPassword("");
                                  }}
                                  className="text-[10px] font-bold px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-lg cursor-pointer shadow-sm transition-all w-24"
                                >
                                  Ganti Sandi
                                </button>
                                {usr.membershipStatus === "pending" && (
                                  <div className="flex gap-1 w-24">
                                    <button
                                      onClick={() => handleApproveMembership(usr, true)}
                                      className="flex-1 text-[10px] font-bold py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer transition-colors"
                                    >
                                      Terima
                                    </button>
                                    <button
                                      onClick={() => handleApproveMembership(usr, false)}
                                      className="flex-1 text-[10px] font-bold py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg cursor-pointer transition-colors"
                                    >
                                      Tolak
                                    </button>
                                  </div>
                                )}
                              </td>
                              {/* Kolom Hapus Permanen */}
                              <td className="p-4 text-center">
                                {usr.role !== "admin" ? (
                                  <button
                                    onClick={() => handleDeleteUser(usr)}
                                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 cursor-pointer transition-all border border-red-200 dark:border-red-900/50"
                                    title="Hapus user permanen"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-zinc-400 italic">Admin</span>
                                )}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {usersList.filter(u => u.role !== "admin").length === 0 && (
                      <div className="text-center py-12 text-zinc-400">
                        <div className="text-4xl mb-3">👤</div>
                        <p className="font-medium text-sm">Belum ada pengguna yang mendaftar.</p>
                        <p className="text-xs mt-1">User akan muncul di sini setelah mendaftar di website.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: chat */}
              {activeTab === "chat" && (
                <div className="space-y-6">
                  <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-3 border-zinc-100 dark:border-zinc-800">
                      <div>
                        <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50">Sistem Live Chat &amp; Handoff</h3>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Pantau semua obrolan real-time · Ambil alih kapan saja · Auto-refresh setiap 2 detik</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {chatSessions.length > 0 && (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                            LIVE · {chatSessions.length} Sesi
                          </span>
                        )}
                        <span className="text-xs bg-amber-900/5 text-amber-900 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">Sabotase Aktif</span>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Session List */}
                      <div className="w-full md:w-1/3 border-r border-zinc-100 dark:border-zinc-800 pr-0 md:pr-4 space-y-2">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Sesi Aktif</h4>
                        {chatSessions.length === 0 ? (
                          <p className="text-xs text-zinc-400">Belum ada obrolan aktif saat ini.</p>
                        ) : (
                          chatSessions.map((session: any) => (
                            <button
                              key={session.sessionId}
                              onClick={() => setSelectedSessionId(session.sessionId)}
                              className={`w-full text-left p-3 rounded-xl transition-all border text-xs cursor-pointer ${
                                selectedSessionId === session.sessionId
                                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-500/50"
                                  : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              }`}
                            >
                              <div className="flex justify-between font-bold">
                                <span className="truncate text-amber-900 dark:text-amber-300">{session.userName}</span>
                                {session.isSabotaged && <span className="text-red-500 text-[10px]">HANDOFF</span>}
                              </div>
                              <div className="text-[10px] text-zinc-500 mt-1 truncate">
                                {session.messages[session.messages.length - 1]?.text}
                              </div>
                            </button>
                          ))
                        )}
                      </div>

                      {/* Chat Window */}
                      <div className="w-full md:w-2/3 flex flex-col h-[500px]">
                        {!selectedSessionId ? (
                          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
                            Pilih sesi obrolan untuk memantau atau mengambil alih.
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-t-xl border border-zinc-200 dark:border-zinc-700 border-b-0">
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                Berbincang dengan: {chatSessions.find(s => s.sessionId === selectedSessionId)?.userName}
                              </span>
                              <button
                                onClick={async () => {
                                  const sess = chatSessions.find(s => s.sessionId === selectedSessionId);
                                  const sabotage = !sess?.isSabotaged;
                                  await fetchWithAuth(getApiUrl("/api/chat-admin/sabotage"), {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ sessionId: selectedSessionId, sabotage })
                                  });
                                  setRefreshKey(k => k + 1);
                                }}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                  chatSessions.find(s => s.sessionId === selectedSessionId)?.isSabotaged
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-amber-900 text-amber-50 hover:bg-amber-800"
                                }`}
                              >
                                {chatSessions.find(s => s.sessionId === selectedSessionId)?.isSabotaged ? "Hentikan Handoff (Kembali ke AI)" : "Ambil Alih Obrolan (Sabotase)"}
                              </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50">
                              {chatSessions.find(s => s.sessionId === selectedSessionId)?.messages.map((m: any, idx: number) => (
                                <div key={idx} className={`flex flex-col text-xs ${m.sender === "user" ? "items-start" : "items-end"}`}>
                                  <div className={`flex items-center gap-2 mb-1 ${m.sender === "user" ? "" : "flex-row-reverse"}`}>
                                    <span className={`font-bold ${
                                      m.sender === "user" ? "text-amber-800 dark:text-amber-400" :
                                      m.sender === "admin" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                                    }`}>
                                      {m.sender === "user" ? "User" : m.sender === "admin" ? "Admin" : "AI Gemini"}
                                    </span>
                                    <span className="text-[9px] text-zinc-400">{new Date(m.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  <div className={`p-3 rounded-xl max-w-[80%] ${
                                    m.sender === "user" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none" :
                                    m.sender === "admin" ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-100 rounded-tr-none" :
                                    "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-100 rounded-tr-none"
                                  }`}>
                                    <p className="whitespace-pre-wrap">{m.text}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="p-3 border border-t-0 border-zinc-200 dark:border-zinc-700 rounded-b-xl flex gap-2">
                              <input
                                type="text"
                                value={adminChatInput}
                                onChange={(e) => setAdminChatInput(e.target.value)}
                                disabled={!chatSessions.find(s => s.sessionId === selectedSessionId)?.isSabotaged}
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter" && adminChatInput.trim()) {
                                    await fetchWithAuth(getApiUrl("/api/chat-admin/send"), {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ sessionId: selectedSessionId, text: adminChatInput })
                                    });
                                    setAdminChatInput("");
                                    setRefreshKey(k => k + 1);
                                  }
                                }}
                                placeholder={chatSessions.find(s => s.sessionId === selectedSessionId)?.isSabotaged ? "Ketik pesan sebagai Admin..." : "Ambil alih obrolan terlebih dahulu untuk mengetik."}
                                className="flex-1 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm disabled:opacity-50"
                              />
                              <button
                                disabled={!chatSessions.find(s => s.sessionId === selectedSessionId)?.isSabotaged || !adminChatInput.trim()}
                                onClick={async () => {
                                  if (!adminChatInput.trim()) return;
                                  await fetchWithAuth(getApiUrl("/api/chat-admin/send"), {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ sessionId: selectedSessionId, text: adminChatInput })
                                  });
                                  setAdminChatInput("");
                                  setRefreshKey(k => k + 1);
                                }}
                                className="px-3 py-2 bg-amber-900 hover:bg-amber-800 text-amber-50 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                              >
                                Kirim
                              </button>
                            </div>

                          </>
                        )}
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

                  {/* ── COMPOSE EMAIL FORM ── */}
                  <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm">
                    <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50 mb-1 border-b pb-3 border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-amber-700" />
                      Kirim Email ke Customer
                    </h3>
                    <p className="text-xs text-zinc-400 mt-2 mb-4">Tulis email langsung dari sini. Teks biasa akan otomatis dibungkus dengan template branded Tampa Seduh. Boleh juga input HTML penuh.</p>
                    <form onSubmit={handleSendCustomEmail} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Kepada (To) *</label>
                          <input
                            type="email"
                            required
                            value={composeEmail.to}
                            onChange={(e) => setComposeEmail({ ...composeEmail, to: e.target.value })}
                            placeholder="customer@email.com"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-900/30 dark:focus:ring-amber-400/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Subjek (Subject) *</label>
                          <input
                            type="text"
                            required
                            value={composeEmail.subject}
                            onChange={(e) => setComposeEmail({ ...composeEmail, subject: e.target.value })}
                            placeholder="Informasi Pesanan Tampa Seduh"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-900/30 dark:focus:ring-amber-400/20"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                          Isi Pesan (Body) * — <span className="normal-case text-zinc-400 font-normal">Teks biasa atau HTML penuh</span>
                        </label>
                        <textarea
                          rows={6}
                          required
                          value={composeEmail.body}
                          onChange={(e) => setComposeEmail({ ...composeEmail, body: e.target.value })}
                          placeholder={"Tulis pesan kamu di sini...\n\nContoh:\nHalo [nama customer],\n\nPesananmu sudah kami terima. Silakan selesaikan pembayaran untuk mulai diproses.\n\nSalam,\nTampa Seduh"}
                          className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-900/30 dark:focus:ring-amber-400/20 resize-y"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[11px] text-zinc-400">
                          ☕ Dikirim dari: <span className="font-mono">kopi@tampaseduh.com</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setComposeEmail({ to: "", subject: "", body: "" })}
                            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-all"
                          >
                            Reset
                          </button>
                          <button
                            type="submit"
                            disabled={isSendingEmail}
                            className="flex items-center gap-2 px-5 py-2 bg-amber-900 hover:bg-amber-800 text-amber-50 rounded-xl text-xs font-bold cursor-pointer transition-all shadow disabled:opacity-50 disabled:cursor-wait"
                          >
                            {isSendingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                            {isSendingEmail ? "Mengirim..." : "Kirim Email"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* ── EMAIL LOG TABLE ── */}
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
                            <th className="p-3 text-center">Preview</th>
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
                              <td className="p-3 text-xs text-zinc-550 max-w-xs overflow-hidden text-ellipsis">{em.body.slice(0, 60)}...</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => setPreviewEmail(em)}
                                  className="text-xs font-bold px-2.5 py-1 bg-amber-900/10 hover:bg-amber-900/20 text-amber-800 dark:text-amber-400 rounded-lg cursor-pointer transition-all border border-amber-900/10"
                                >
                                  👁 Lihat
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {emailsList.length === 0 && (
                      <div className="text-center py-12 text-zinc-400">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="font-medium text-sm">Belum ada email terkirim.</p>
                        <p className="text-xs mt-1">Email konfirmasi order akan muncul di sini secara otomatis.</p>
                      </div>
                    )}
                  </div>

                  {/* Modal Preview Email HTML */}
                  {previewEmail && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setPreviewEmail(null)}>
                      <div
                        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
                          <div>
                            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Preview Email Terkirim</h3>
                            <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">To: {previewEmail.recipient} · {previewEmail.subject}</p>
                            <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full mt-1 inline-block ${
                              previewEmail.status === "Delivered" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-700"
                            }`}>{previewEmail.status}</span>
                          </div>
                          <button
                            onClick={() => setPreviewEmail(null)}
                            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Email Content */}
                        <div className="flex-1 overflow-auto">
                          {previewEmail.body && previewEmail.body.includes("<") ? (
                            <iframe
                              srcDoc={previewEmail.body}
                              className="w-full border-0"
                              style={{ height: "560px" }}
                              title="Email Preview"
                              sandbox="allow-same-origin"
                            />
                          ) : (
                            <div className="p-6 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono">
                              {previewEmail.body}
                            </div>
                          )}
                        </div>
                        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 text-center">
                          Dikirim pada: {previewEmail.timestamp ? new Date(previewEmail.timestamp).toLocaleString('id-ID') : '-'}
                        </div>
                      </div>
                    </div>
                  )}
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

              {/* Tab: Costing & Recipe Lab */}
              {activeTab === "recipelab" && (
                <AdminRecipeLab showNotif={showNotif} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Invoice Panel Modal */}
      <AnimatePresence>
        {selectedInvoiceOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans print:bg-white print:p-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-amber-50 dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-amber-900/10 text-zinc-900 dark:text-zinc-100 flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:w-full print:bg-white print:text-black"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-amber-900 to-amber-955 text-amber-50 flex justify-between items-center print:hidden">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-300" />
                  <span className="font-serif font-bold text-base">Invoice Panel - Tampa Seduh</span>
                  {/* Badge LUNAS jika isPaid */}
                  {(selectedInvoiceOrder as any).isPaid && (
                    <span className="flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-green-400/20 border border-green-400/40 text-green-300 tracking-wider uppercase">
                      <CheckCircle className="w-3 h-3" /> LUNAS · PAID
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Invoice
                  </button>
                  <button
                    onClick={() => setSelectedInvoiceOrder(null)}
                    className="p-1 rounded-full text-amber-200 hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Quick Email Buttons */}
              {selectedInvoiceOrder.email && selectedInvoiceOrder.email !== "-" ? (
                <div className="px-6 py-3 bg-amber-900/5 dark:bg-zinc-800/50 border-b border-amber-900/10 dark:border-zinc-700/50 print:hidden">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">📧 Kirim Email ke {selectedInvoiceOrder.email}:</span>
                    <button
                      onClick={() => handleSendOrderPendingEmail(selectedInvoiceOrder.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-lg text-xs font-bold cursor-pointer transition-all"
                      title="Kirim email konfirmasi pesanan masuk, belum dibayar"
                    >
                      ⏳ Belum Bayar
                    </button>
                    <button
                      onClick={() => handleSendOrderPaidEmail(selectedInvoiceOrder.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold cursor-pointer transition-all"
                      title="Kirim email konfirmasi pembayaran diterima"
                    >
                      ✅ Sudah Bayar
                    </button>
                    <span className="text-[10px] text-zinc-400 italic ml-1">Klik untuk kirim email ke customer</span>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-2.5 bg-zinc-50 dark:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-700/50 print:hidden">
                  <span className="text-[11px] text-zinc-400 italic">⚠️ Email customer tidak tersedia — quick email tidak bisa dikirim.</span>
                </div>
              )}

              {/* Invoice Body */}

              <div className="p-6 overflow-y-auto flex-1 space-y-6 print:overflow-visible print:p-0">
                {/* Brand Header (Visible in print) */}
                <div className="hidden print:flex justify-between items-center border-b-2 border-stone-850 pb-4 mb-4">
                  <div>
                    <h1 className="text-2xl font-serif font-black tracking-tight text-stone-900">TAMPA SEDUH.</h1>
                    <p className="text-xs text-stone-500 font-mono">Jl. Tangkudeagan No. 2 Kotabunan Selatan</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold uppercase tracking-wider text-stone-500">Invoice Belanja</span>
                    <p className="text-xs font-mono font-bold mt-1 text-stone-900">#{selectedInvoiceOrder.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block font-mono">Pelanggan</span>
                    <strong className="text-base text-zinc-905 dark:text-zinc-100 print:text-black">{selectedInvoiceOrder.customerName}</strong>
                    <p className="text-xs font-mono text-zinc-500">{selectedInvoiceOrder.email}</p>
                    <p className="text-xs font-mono font-bold text-amber-900 dark:text-amber-400 print:text-stone-900">{selectedInvoiceOrder.whatsapp}</p>
                  </div>

                  <div className="space-y-1 sm:text-right print:text-right">
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block font-mono">Metode Antar & Tanggal</span>
                    <strong className="text-sm text-zinc-905 dark:text-zinc-100 print:text-black block">
                      {selectedInvoiceOrder.deliveryMethod === "pickup" ? "Ambil Sendiri di Kedai" : "Delivery Antar"}
                    </strong>
                    <span className="text-xs text-zinc-500 block font-mono">
                      {new Date(selectedInvoiceOrder.createdAt).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Makassar"
                      })} WITA
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-left bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800 print:bg-white print:border-stone-850 print:p-0 print:border-t print:border-b print:rounded-none">
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-2 print:text-stone-500 font-mono">Rincian Belanja</span>
                  <div className="space-y-2">
                    {selectedInvoiceOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-zinc-700 dark:text-zinc-350 print:text-black">
                        <span>
                          {item.name} ({item.size}) <strong className="text-zinc-400 print:text-stone-500">x{item.quantity}</strong>
                        </span>
                        <span className="font-mono">Rp {item.price * item.quantity}.000</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-zinc-150 dark:border-zinc-800 pt-3 mt-3 space-y-1 text-xs text-zinc-500 print:border-stone-850 print:text-black">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-mono">Rp {selectedInvoiceOrder.subtotal || selectedInvoiceOrder.total}.000</span>
                    </div>
                    {selectedInvoiceOrder.shippingCost && selectedInvoiceOrder.shippingCost > 0 ? (
                      <div className="flex justify-between">
                        <span>Ongkir Delivery:</span>
                        <span className="font-mono">Rp {selectedInvoiceOrder.shippingCost}.000</span>
                      </div>
                    ) : null}
                    {selectedInvoiceOrder.shippingDiscount && selectedInvoiceOrder.shippingDiscount > 0 ? (
                      <div className="flex justify-between text-amber-600 dark:text-amber-400 print:text-black font-semibold">
                        <span>Diskon Ongkir Member:</span>
                        <span className="font-mono">-Rp {selectedInvoiceOrder.shippingDiscount}.000</span>
                      </div>
                    ) : null}
                    <div className="border-t pt-2 mt-2 dark:border-zinc-800 flex justify-between items-center font-bold text-[#8B5E3C] dark:text-amber-400 text-sm print:border-stone-850 print:text-black">
                      <span>Grand Total:</span>
                      <span className="font-mono text-base">Rp {selectedInvoiceOrder.total}.000</span>
                    </div>
                  </div>
                </div>

                <div className="text-left bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800 print:bg-white print:border-none print:p-0">
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1 font-mono">Alamat Pengiriman & Catatan</span>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-205 print:text-black">{selectedInvoiceOrder.address}</p>
                  {selectedInvoiceOrder.notes && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 italic">Catatan: {selectedInvoiceOrder.notes}</p>
                  )}
                </div>

                {/* QRIS Proof Image (If uploaded) */}
                {selectedInvoiceOrder.paymentProofUrl && (
                  <div className="space-y-2 pt-2 border-t dark:border-zinc-800 print:hidden text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block text-left font-mono">Lampiran Bukti Transfer QRIS</span>
                      {!selectedInvoiceOrder.paymentProofUrl.includes("REJECTED") && (
                        <button 
                          onClick={async () => {
                            setIsVerifyingProof(true);
                            try {
                              const res = await fetchWithAuth(getApiUrl(`/api/orders/${selectedInvoiceOrder.id}/verify-payment`), { method: "POST" });
                              const data = await res.json();
                              if (data.valid) {
                                alert("SISTEM AI: Bukti transfer terdeteksi VALID/ASLI. Pesanan dapat dilanjutkan.");
                                // Automatically fetch again
                                setRefreshKey(k => k + 1);
                              } else {
                                alert("SISTEM AI MENOLAK: " + data.reason);
                                setSelectedInvoiceOrder(null);
                                setRefreshKey(k => k + 1);
                              }
                            } catch (e) {
                              alert("Gagal menghubungi server AI.");
                            }
                            setIsVerifyingProof(false);
                          }}
                          disabled={isVerifyingProof}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isVerifyingProof ? "Sedang Mengecek..." : "Verifikasi Otomatis dengan AI"}
                        </button>
                      )}
                    </div>
                    {selectedInvoiceOrder.paymentProofUrl.includes("REJECTED") && (
                      <div className="p-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold rounded-lg">
                        BUKTI TRANSFER PALSU / DITOLAK AI
                      </div>
                    )}
                    <div className="max-w-[200px] border dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:opacity-90 transition-opacity">
                      <a href={selectedInvoiceOrder.paymentProofUrl.replace("REJECTED_", "")} target="_blank" rel="noreferrer">
                        <img 
                          src={selectedInvoiceOrder.paymentProofUrl.replace("REJECTED_", "")} 
                          alt="Bukti Bayar" 
                          className="w-full h-auto object-cover max-h-[140px]"
                        />
                      </a>
                    </div>
                    <span className="text-[9px] text-zinc-400 block italic font-mono">Klik gambar untuk melihat resolusi penuh di tab baru.</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Ubah Password User */}
      <AnimatePresence>
        {updatingUserPass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-amber-50 dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-amber-900/10 text-zinc-900 dark:text-zinc-100"
            >
              <form onSubmit={handleChangeUserPassword} className="p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-2 border-zinc-200 dark:border-zinc-800">
                  <h4 className="font-serif font-bold text-base text-amber-955 dark:text-amber-100 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-850" />
                    Ubah Password Kawan
                  </h4>
                  <button
                    type="button"
                    onClick={() => setUpdatingUserPass(null)}
                    className="p-1 rounded-full text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-left text-xs">
                  <p><strong>Nama:</strong> {updatingUserPass.name}</p>
                  <p><strong>Email:</strong> {updatingUserPass.email}</p>
                </div>

                <div className="text-left space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-550">Password Baru</label>
                  <input
                    type="text"
                    required
                    placeholder="Ketik password baru..."
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl dark:bg-zinc-800 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setUpdatingUserPass(null)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-805 rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-900 text-amber-50 font-bold rounded-xl hover:bg-amber-800 cursor-pointer"
                  >
                    Simpan Password
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ===== GUIDE MODAL — Panduan per Panel ===== */}
      {guideModal && (() => {
        const GUIDES: Record<string, { icon: string; title: string; color: string; steps: { label: string; desc: string }[] }> = {
          overview: {
            icon: '📊', title: 'Panduan — Tab Overview',
            color: 'from-blue-600 to-indigo-600',
            steps: [
              { label: 'Ringkasan Omset', desc: 'Total pendapatan dihitung otomatis dari semua pesanan berstatus Selesai.' },
              { label: 'Pesanan Masuk', desc: 'Jumlah total pesanan + badge jumlah yang masih Pending menunggu diproses.' },
              { label: 'Varian Menu', desc: 'Jumlah produk di database + berapa yang statusnya tersedia (stok ada).' },
              { label: 'Total Pelanggan', desc: 'Jumlah akun yang terdaftar di website Tampa Seduh.' },
              { label: 'Tabel Pesanan Terbaru', desc: 'Lihat dan update status pesanan terbaru langsung dari tabel ini tanpa perlu pindah tab.' },
              { label: 'Update Status Cepat', desc: 'Klik dropdown status di kolom Status → pilih Disiapkan / Diantar / Selesai.' },
            ]
          },
          orders: {
            icon: '🛒', title: 'Panduan — Tab Pesanan',
            color: 'from-amber-600 to-orange-600',
            steps: [
              { label: 'Lihat Semua Pesanan', desc: 'Tabel lengkap semua pesanan masuk dengan detail customer, item, total, dan status.' },
              { label: 'Klik Baris untuk Detail', desc: 'Klik baris pesanan manapun untuk melihat detail lengkap termasuk foto bukti bayar.' },
              { label: 'Alur Status Pesanan', desc: 'Pending → Disiapkan (barista mulai kerja) → Diantar (kurir jalan) → Selesai (terima kopi).' },
              { label: 'Update Status', desc: 'Gunakan dropdown di kolom Status atau di modal detail untuk mengubah status pesanan.' },
              { label: 'Bukti Pembayaran', desc: 'Foto transfer yang diupload customer muncul di detail pesanan. Klik untuk memperbesar.' },
              { label: 'Hapus Pesanan', desc: 'Klik ikon 🗑️ untuk menghapus pesanan. PERINGATAN: tindakan ini permanen dan tidak bisa dibatalkan.' },
              { label: 'Cetak Invoice', desc: 'Klik ikon cetak di baris pesanan untuk mencetak invoice resmi dalam format print-friendly.' },
            ]
          },
          menu: {
            icon: '☕', title: 'Panduan — Tab Menu (Daftar Kopi)',
            color: 'from-green-600 to-teal-600',
            steps: [
              { label: 'Tambah Produk Baru', desc: 'Klik tombol "Tambah Menu" → form muncul → isi nama, harga reguler, harga large (opsional), sifat penyajian, stok, dan deskripsi.' },
              { label: 'Upload Foto Produk', desc: 'Di dalam form, klik tombol "Pilih & Upload Foto" berwarna cokelat → pilih foto dari galeri HP/laptop → foto otomatis dikonversi ke WebP dan diupload.' },
              { label: 'URL Gambar Manual', desc: 'Alternatif: paste URL gambar langsung di field "Ilustrasi Cover" jika sudah punya link foto dari internet.' },
              { label: 'Edit Produk', desc: 'Klik tombol ✏️ (pensil) di kartu produk → modal edit muncul di tengah layar → ubah data → klik Simpan Perubahan.' },
              { label: 'Toggle Stok', desc: 'Klik tombol "Ready" atau "Habis" langsung di kartu produk untuk mengubah ketersediaan stok tanpa masuk form edit.' },
              { label: 'Hapus Produk', desc: 'Klik 🗑️ di kartu → konfirmasi → produk dihapus permanen dari database dan website.' },
              { label: 'Real-time Update', desc: 'Semua perubahan (harga, stok, foto) langsung tampil di website utama setelah disimpan.' },
            ]
          },
          packages: {
            icon: '🎁', title: 'Panduan — Tab Paket (Bundle)',
            color: 'from-purple-600 to-pink-600',
            steps: [
              { label: 'Buat Paket Baru', desc: 'Klik "Buat Paket Baru" → isi nama paket, harga bundel, dan badge promo (contoh: POPULER, HEMAT, BEST VALUE).' },
              { label: 'Pilih Produk untuk Paket', desc: 'Centang produk-produk yang termasuk dalam paket ini. Produk yang dicentang akan tampil sebagai daftar item dalam kartu paket di website.' },
              { label: 'Upload Foto Paket', desc: 'Klik tombol "Pilih & Upload Foto" di form → pilih gambar representatif untuk paket ini → otomatis dikonversi WebP.' },
              { label: 'Edit Paket', desc: 'Klik ✏️ di kartu paket → modal edit muncul di tengah layar → ubah nama, harga, badge, produk, foto → simpan.' },
              { label: 'Badge Promo', desc: 'Badge adalah label kecil yang tampil di kartu paket. Gunakan teks singkat seperti "POPULER", "HEMAT 20%", "BEST SELLER".' },
              { label: 'Hapus Paket', desc: 'Klik 🗑️ untuk menghapus paket. Produk individual tidak ikut terhapus.' },
            ]
          },
          news: {
            icon: '📰', title: 'Panduan — Tab Kopi News (Blog)',
            color: 'from-cyan-600 to-blue-600',
            steps: [
              { label: 'Bikin Artikel Baru', desc: 'Klik "Bikin Artikel Baru" → isi judul, kategori, isi artikel, dan foto cover.' },
              { label: 'Upload Cover Artikel', desc: 'Klik tombol upload di field Cover → pilih foto → otomatis dikonversi ke WebP dan diupload ke storage.' },
              { label: 'Status Artikel', desc: 'Draft = tidak tampil di website. Published = langsung tampil di section Kopi News di beranda.' },
              { label: 'Edit Artikel', desc: 'Klik tombol Edit di kartu artikel yang sudah ada → form edit muncul → ubah konten atau foto → simpan.' },
              { label: 'Ganti Foto Cover', desc: 'Saat edit artikel, gunakan tombol upload foto cover untuk mengganti gambar. Foto lama tidak otomatis dihapus dari storage.' },
              { label: 'Hapus Artikel', desc: 'Klik 🗑️ untuk menghapus artikel. Artikel yang dihapus tidak bisa dipulihkan.' },
              { label: 'SEO Artikel', desc: 'Judul artikel sangat penting untuk SEO. Gunakan kata kunci seperti "kopi Kotabunan", "Tampa Seduh", "Boltim" dalam judul.' },
            ]
          },
          media: {
            icon: '🖼️', title: 'Panduan — Tab Media (Foto & Pamflet)',
            color: 'from-pink-600 to-rose-600',
            steps: [
              { label: 'Tab Foto Kolase', desc: 'Upload foto suasana kedai, momen seru, dan kejadian lucu. Foto tampil di section "Street Coffee Foto Collage" di beranda sebagai swipe galeri.' },
              { label: 'Tab Pamflet / Brosur', desc: 'Upload brosur, iklan event, atau pengumuman penting. Tampil di section Pamflet di beranda sebagai galeri swipe terpisah.' },
              { label: 'Tab Customer Emotions', desc: 'Foto yang diupload oleh customer. Ada badge merah jika ada yang masih menunggu review.' },
              { label: 'Approve Foto Customer', desc: 'Klik ✅ Approve → foto langsung tampil di section Customer Emotions di website.' },
              { label: 'Tolak Foto Customer', desc: 'Klik ❌ Tolak → foto tidak tampil di website tapi masih tersimpan di database.' },
              { label: 'Hapus Foto', desc: 'Klik 🗑️ untuk menghapus foto permanen dari storage dan database.' },
              { label: 'Format & Konversi', desc: 'Semua foto yang diupload (JPG, PNG, HEIC) otomatis dikonversi ke WebP oleh browser sebelum diupload — lebih ringan dan cepat di web.' },
            ]
          },
          users: {
            icon: '👥', title: 'Panduan — Tab Pelanggan',
            color: 'from-orange-600 to-red-600',
            steps: [
              { label: 'Lihat Semua Customer', desc: 'Tabel semua akun terdaftar dengan detail nama, email, WhatsApp, status member, dan riwayat pesanan.' },
              { label: 'Approve Member', desc: 'Customer yang mengajukan member tampil dengan status "pending". Klik ✅ Approve → customer otomatis dapat diskon ongkir 25%.' },
              { label: 'Blokir Akun', desc: 'Klik tombol Blokir di baris customer untuk memblokir akses. Akun terblokir tidak bisa login ke website.' },
              { label: 'Unblokir Akun', desc: 'Customer terblokir bisa di-unblokir dengan klik tombol Unblokir. Akses langsung pulih.' },
              { label: 'Reset Password', desc: 'Klik Reset Password untuk mengatur ulang password customer yang lupa. Password baru dikirim secara manual.' },
              { label: 'Histori Belanja', desc: 'Kolom Histori Belanja menampilkan total order dan tanggal terakhir aktif customer.' },
            ]
          },
        };

        const guide = GUIDES[guideModal];
        if (!guide) return null;
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setGuideModal(null)}>
            <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className={`p-5 rounded-t-3xl bg-gradient-to-r ${guide.color} text-white flex items-start justify-between gap-3`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{guide.icon}</span>
                  <div>
                    <p className="font-black text-base leading-tight">{guide.title}</p>
                    <p className="text-xs text-white/70 mt-0.5">Panduan lengkap penggunaan panel ini</p>
                  </div>
                </div>
                <button onClick={() => setGuideModal(null)} className="p-2 rounded-full hover:bg-white/20 transition cursor-pointer shrink-0"><X className="w-5 h-5" /></button>
              </div>
              {/* Steps */}
              <div className="p-5 space-y-3">
                {guide.steps.map((step, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                    <span className="w-6 h-6 rounded-full bg-amber-900 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <div>
                      <p className="text-xs font-black text-zinc-800 dark:text-zinc-200">{step.label}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
                <div className="text-center pt-2">
                  <button onClick={() => setGuideModal(null)} className="px-6 py-2.5 bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all">Tutup Panduan</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== EDIT MENU MODAL — muncul di tengah layar ===== */}
      {editingMenu && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setEditingMenu(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleAddMenu} className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 dark:border-zinc-800">
                <h4 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-100">✏️ Edit Menu: {editingMenu.name}</h4>
                <button type="button" onClick={() => setEditingMenu(null)} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-500"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nama Minuman</label>
                  <input type="text" required value={editingMenu.name}
                    onChange={e => setEditingMenu({ ...editingMenu, name: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Harga Reguler (K)</label>
                  <input type="number" required value={editingMenu.priceReg}
                    onChange={e => setEditingMenu({ ...editingMenu, priceReg: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Harga Large (K - Opsional)</label>
                  <input type="number" value={editingMenu.priceLarge || ""}
                    onChange={e => setEditingMenu({ ...editingMenu, priceLarge: parseInt(e.target.value) || undefined })}
                    className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Sifat Penyajian</label>
                  <select value={(editingMenu as any).menuCategory || (editingMenu.isHot ? 'hot' : 'cold')}
                    onChange={e => { const v = e.target.value as 'hot'|'cold'|'snack'; setEditingMenu({ ...editingMenu, isHot: v==='hot', menuCategory: v } as any); }}
                    className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl">
                    <option value="cold">🧊 Ice Drink</option>
                    <option value="hot">☕ Hot Drink</option>
                    <option value="snack">🍪 Snack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Ketersediaan Stok</label>
                  <select value={editingMenu.isAvailable ? 'true' : 'false'}
                    onChange={e => setEditingMenu({ ...editingMenu, isAvailable: e.target.value === 'true' })}
                    className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl">
                    <option value="true">Ada Stok</option>
                    <option value="false">Habis Stok</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Upload Foto Produk</label>
                  <div className="flex gap-2 items-center">
                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'menu')} className="w-full text-xs text-zinc-500" />
                    {isUploadingImage && <div className="w-4 h-4 border-2 border-amber-900 border-t-transparent rounded-full animate-spin" />}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">URL Gambar</label>
                <input type="text" value={editingMenu.image}
                  onChange={e => setEditingMenu({ ...editingMenu, image: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl" />
              </div>
              {editingMenu.image && <img src={editingMenu.image} alt="preview" className="w-24 h-24 object-cover rounded-xl border" />}
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Deskripsi</label>
                <textarea rows={2} required value={editingMenu.description}
                  onChange={e => setEditingMenu({ ...editingMenu, description: e.target.value })}
                  className="w-full text-xs px-3 py-3 bg-zinc-50 dark:bg-zinc-800 border rounded-xl" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingMenu(null)}
                  className="px-4 py-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 rounded-xl cursor-pointer">Batal</button>
                <button type="submit"
                  className="px-5 py-2 text-xs bg-amber-900 text-amber-50 font-bold rounded-xl hover:bg-amber-800 cursor-pointer">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== EDIT PACKAGE MODAL — muncul di tengah layar ===== */}
      {editingPack && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setEditingPack(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSavePack} className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 dark:border-zinc-800">
                <h4 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-100">✏️ Edit Paket: {editingPack.name}</h4>
                <button type="button" onClick={() => setEditingPack(null)} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-500"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nama Paket</label>
                  <input type="text" required value={editingPack.name}
                    onChange={e => setEditingPack({ ...editingPack, name: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Harga Paket</label>
                  <input type="number" required value={editingPack.price}
                    onChange={e => setEditingPack({ ...editingPack, price: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Badge (contoh: POPULER, HEMAT)</label>
                  <input type="text" value={editingPack.badge || ''}
                    onChange={e => setEditingPack({ ...editingPack, badge: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Upload Foto Paket</label>
                  <div className="flex gap-2 items-center">
                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'package')} className="w-full text-xs text-zinc-500" />
                    {isUploadingImage && <div className="w-4 h-4 border-2 border-amber-900 border-t-transparent rounded-full animate-spin" />}
                  </div>
                </div>
              </div>
              {editingPack.image && <img src={editingPack.image} alt="preview" className="w-24 h-24 object-cover rounded-xl border" />}
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Deskripsi Paket</label>
                <textarea rows={2} required value={editingPack.description}
                  onChange={e => setEditingPack({ ...editingPack, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Pilih Produk untuk Paket</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border rounded-xl bg-zinc-50 dark:bg-zinc-950/20 max-h-40 overflow-y-auto dark:border-zinc-800">
                  {menuList.map(m => {
                    const checked = editingPack.items.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={checked}
                          onChange={e => {
                            const items = e.target.checked
                              ? [...editingPack.items, m.id]
                              : editingPack.items.filter(i => i !== m.id);
                            setEditingPack({ ...editingPack, items });
                          }} />
                        {m.name}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingPack(null)}
                  className="px-4 py-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 rounded-xl cursor-pointer">Batal</button>
                <button type="submit"
                  className="px-5 py-2 text-xs bg-amber-900 text-amber-50 font-bold rounded-xl hover:bg-amber-800 cursor-pointer">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
