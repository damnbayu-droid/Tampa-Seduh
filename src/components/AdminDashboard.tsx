import React, { useState, useEffect } from "react";
import {
  BarChart3, MessageSquare, Users, Coffee, Layers, ShoppingBag,
  Sparkles, FileClock, Wallet, Mail, BookOpen, Plus, Trash2, Edit2, CheckCircle, RefreshCw, Moon, Sun, ArrowLeft, X, Lock, Receipt, Download, PanelLeftOpen, PanelLeftClose, ImageIcon, Calculator
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

  useEffect(() => {
    if (activeTab === "aimaster") {
      const interval = setInterval(async () => {
        try {
          const res = await fetchWithAuth(getApiUrl("/api/chat-admin/sessions"));
          if (res.ok) setChatSessions(await res.json());
        } catch {}
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

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
                                <div className="inline-flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                                  <button
                                    onClick={() => setSelectedInvoiceOrder(order)}
                                    className="text-[10px] font-bold px-2 py-1 bg-amber-900 text-amber-50 hover:bg-amber-850 rounded cursor-pointer"
                                    title="Invoice"
                                  >
                                    Invoice
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
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, "menu")}
                              className="w-full text-xs text-zinc-500"
                              id="menu-file-upload"
                            />
                            {isUploadingImage && <div className="w-4 h-4 border-2 border-amber-900 border-t-transparent rounded-full animate-spin"></div>}
                          </div>
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
                                setIsMenuOpen(true);
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
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, "package")}
                              className="w-full text-xs text-zinc-500"
                              id="pack-file-upload"
                            />
                            {isUploadingImage && <div className="w-4 h-4 border-2 border-amber-900 border-t-transparent rounded-full animate-spin"></div>}
                          </div>
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
                              setIsPackOpen(true);
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
                      <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50">📸 Foto & Pamflet</h3>
                      <div className="flex gap-2 flex-wrap">
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
                    <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50 mb-3 border-b pb-3 border-zinc-100 dark:border-zinc-800">Kawan Setia (Pengguna Sistem & Customers)</h3>
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
                            </tr>
                            );
                          })}
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
                      <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-50">Sistem Live Chat & Handoff</h3>
                      <span className="text-xs bg-amber-900/5 text-amber-900 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">Real-time Sabotage</span>
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
    </div>
  );
}
