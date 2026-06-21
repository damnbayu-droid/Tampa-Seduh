import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { 
  Coffee, ShoppingCart, Sparkles, MapPin, Phone, Mail, Clock, 
  HelpCircle, Star, ShieldAlert, ArrowDown, LogIn, Check, Plus, Minus, ChevronRight, X, Sun, Moon,
  User as UserIcon, Lock, Sparkles as SparklesIcon, Gift, LogOut, CheckCircle, Store, Truck,
  Eye, EyeOff, Loader2, Instagram, BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MenuItem, CoffeePackage, CartItem, User } from "./types";
import { supabase } from "./lib/supabase";
import { getApiUrl, safeParseJson } from "./lib/api";

// Lazy Loaded Components for Fast Open Page
const OrderPopup = lazy(() => import("./components/OrderPopup"));
const UserDashboard = lazy(() => import("./components/UserDashboard"));
const AiChatWidget = lazy(() => import("./components/AiChatWidget"));
const CoffeeNews = lazy(() => import("./components/CoffeeNews"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard"));
const CheckoutPage = lazy(() => import("./components/CheckoutPage"));
const GlobalNotification = lazy(() => import("./components/GlobalNotification"));

export default function App() {
  // Navigation & admin panel toggles
  const [isAdminMode, setIsAdminMode] = useState(false);


  // Dark/Light mode theme state
  const [darkMode, setDarkMode] = useState(false);

  // Core shop state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [packages, setPackages] = useState<CoffeePackage[]>([]);
  const [activeMenuTab, setActiveMenuTab] = useState<"all" | "cold" | "hot">("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOrderPopupOpen, setIsOrderPopupOpen] = useState(false);

  // User Authentication & Dashboard States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUserLoginOpen, setIsUserLoginOpen] = useState(false);
  const [isUserRegisterOpen, setIsUserRegisterOpen] = useState(false);
  const [showUserDashboard, setShowUserDashboard] = useState(false);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Path Router State
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  // Toggle password visibility peek
  const [showPassword, setShowPassword] = useState(false);
  // Google login loading state
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Render Error Debugging State
  const [renderError, setRenderError] = useState<string | null>(null);

  // Image Zoom/Lightbox State
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  useEffect(() => {
    const handleError = (e: ErrorEvent) => setRenderError(e.message);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // User input forms
  const [userEmailInput, setUserEmailInput] = useState("");
  const [userPasswordInput, setUserPasswordInput] = useState("");
  const [userNameInput, setUserNameInput] = useState("");
  const [userWhatsappInput, setUserWhatsappInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Active Accordion Index of FAQ
  const [faqIndex, setFaqIndex] = useState<number | null>(null);

  // Feedback notifications
  const [orderNotification, setOrderNotification] = useState<string | null>(null);

  // Track page scroll position for transparent navbar effect
  const [isScrolled, setIsScrolled] = useState(typeof window !== "undefined" ? window.scrollY > 20 : false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch shop state periodically to stay synced with Admin Dashboard operations!
  const loadShopData = async () => {
    let mDataLoaded = false;
    let pDataLoaded = false;

    // 1. Coba fetch dari Backend API dahulu
    try {
      const mRes = await fetch(getApiUrl("/api/menu"));
      const pRes = await fetch(getApiUrl("/api/packages"));
      
      if (mRes.ok) {
        const contentType = mRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const mData = await mRes.json();
          if (Array.isArray(mData)) {
            setMenuItems(mData);
            mDataLoaded = true;
          }
        }
      }
      if (pRes.ok) {
        const contentType = pRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const pData = await pRes.json();
          if (Array.isArray(pData)) {
            setPackages(pData);
            pDataLoaded = true;
          }
        }
      }
    } catch (err) {
      console.warn("Backend API tidak merespons, mencoba langsung ke Supabase...", err);
    }

    // 2. Jika gagal (misal di static Cloudflare Pages), lakukan query langsung ke Supabase client-side
    if (!mDataLoaded || !pDataLoaded) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://yizsanjcyphlbtjcwzxl.supabase.co";
        if (supabaseUrl) {
          // Fetch Menu Items
          if (!mDataLoaded) {
            const { data: menuData, error: menuErr } = await supabase.from("menu").select("*");
            if (!menuErr && menuData) {
              const mappedMenu: MenuItem[] = menuData.map((m: any) => ({
                id: m.id,
                name: m.name,
                priceReg: m.price_reg,
                priceLarge: m.price_large,
                isHot: m.is_hot,
                isAvailable: m.is_available,
                image: m.image,
                description: m.description
              }));
              setMenuItems(mappedMenu);
              mDataLoaded = true;
            } else if (menuErr) {
              console.error("Gagal fetch menu dari Supabase:", menuErr);
            }
          }

          // Fetch Packages
          if (!pDataLoaded) {
            const { data: packData, error: packErr } = await supabase.from("packages").select("*");
            if (!packErr && packData) {
              const mappedPacks: CoffeePackage[] = packData.map((p: any) => ({
                id: p.id,
                name: p.name,
                price: p.price,
                items: Array.isArray(p.items) ? p.items : JSON.parse(p.items || "[]"),
                description: p.description,
                badge: p.badge,
                image: p.image
              }));
              setPackages(mappedPacks);
              pDataLoaded = true;
            } else if (packErr) {
              console.error("Gagal fetch packages dari Supabase:", packErr);
            }
          }
        }
      } catch (sbErr) {
        console.error("Gagal query langsung ke Supabase:", sbErr);
      }
    }
  };

  useEffect(() => {
    loadShopData();
  }, [isAdminMode]);

  useEffect(() => {
    if (currentUser) {
      loadUserOrders(currentUser.email);
    }
  }, [currentUser, isOrderPopupOpen]);

  // Sync dark mode class
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Cart actions supporting CartItem
  const addToCart = (item: MenuItem | CoffeePackage, size: "R" | "L" | "Default", isPackage: boolean) => {
    const unitPrice = isPackage 
      ? (item as CoffeePackage).price 
      : (size === "L" && (item as MenuItem).priceLarge ? (item as MenuItem).priceLarge! : (item as MenuItem).priceReg);

    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id && entry.size === size);
      if (existing) {
        return prev.map((entry) => 
          entry.id === item.id && entry.size === size 
            ? { ...entry, quantity: entry.quantity + 1 } 
            : entry
        );
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        price: unitPrice,
        quantity: 1,
        size,
        isPackage,
        image: isPackage ? undefined : (item as MenuItem).image
      }];
    });
  };

  const removeFromCart = (itemId: string, size: "R" | "L" | "Default") => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === itemId && entry.size === size);
      if (existing && existing.quantity > 1) {
        return prev.map((entry) => 
          entry.id === itemId && entry.size === size 
            ? { ...entry, quantity: entry.quantity - 1 } 
            : entry
        );
      }
      return prev.filter((entry) => !(entry.id === itemId && entry.size === size));
    });
  };

  const clearCart = () => setCart([]);

  const totalCartSum = cart.reduce((sum, entry) => sum + (entry.price * entry.quantity), 0);

  // User Auth functions
  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userEmailInput,
        password: userPasswordInput
      });

      if (authError) throw new Error(authError.message);

      // Get profile from public.users
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("email", userEmailInput)
        .single();
        
      if (profileError || !profile) {
        throw new Error("Profil tidak ditemukan. Pastikan data tersinkronisasi kawan.");
      }
      
      const loggedInUser: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role || "customer",
        isMember: profile.is_member,
        whatsapp: profile.whatsapp,
        avatarUrl: profile.avatar_url
      };

      setCurrentUser(loggedInUser);
      if (loggedInUser.role === "admin" || loggedInUser.email === "tampaseduh@gmail.com") {
        setIsAdminMode(true);
        setIsUserLoginOpen(false);
        setShowUserDashboard(false);
      } else {
        setIsUserLoginOpen(false);
        loadUserOrders(loggedInUser.email);
        setShowUserDashboard(true);
      }
      setUserEmailInput("");
      setUserPasswordInput("");
    } catch (err: any) {
      setAuthError(err.message === "Invalid login credentials" ? "Password salah kawan, coba ingat kembali." : err.message);
    }
  };

  const handleUserRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userEmailInput,
        password: userPasswordInput,
        options: {
          data: {
            full_name: userNameInput,
            whatsapp: userWhatsappInput
          }
        }
      });
      
      if (authError) throw new Error(authError.message);

      // Create profile in public.users
      const newUser: User = {
        id: authData.user?.id || "u-" + Date.now(),
        name: userNameInput,
        email: userEmailInput,
        whatsapp: userWhatsappInput,
        role: "customer",
        isMember: false,
        ordersCount: 0,
        lastActive: "Baru saja"
      };

      await supabase.from("users").upsert({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        whatsapp: newUser.whatsapp,
        role: newUser.role,
        is_member: newUser.isMember,
        orders_count: newUser.ordersCount,
        last_active: newUser.lastActive
      });

      setCurrentUser(newUser);
      setIsUserLoginOpen(false);
      loadUserOrders(newUser.email);
      setShowUserDashboard(true);
      setOrderNotification("Selamat datang kawan! Akun berhasil dibuat 🎉");
      setTimeout(() => setOrderNotification(null), 5000);
      
      setUserEmailInput("");
      setUserPasswordInput("");
      setUserNameInput("");
      setUserWhatsappInput("");
    } catch (err: any) {
      setAuthError(err.message === "User already registered" ? "Email sudah terdaftar kawan." : err.message);
    }
  };

  // ================================================================
  // Google OAuth via Supabase — Real Implementation
  // ================================================================
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent"
          }
        }
      });
      if (error) throw error;
      // The page will redirect — no further action needed here
    } catch (err: any) {
      console.error("Google Sign-In error:", err.message);
      setAuthError("Gagal memulai login Google. Periksa koneksi internet Anda kawan.");
      setIsGoogleLoading(false);
    }
  };

  // Sync session Supabase (Directly to public.users)
  const syncSupabaseSession = useCallback(async (session: any) => {
    try {
      if (session?.user) {
        const supaUser = session.user;
        
        // Fetch profile directly from Supabase users table
        let { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", supaUser.id)
          .single();
          
        if (profileError || !profile) {
           // Fallback attempt by email
           const { data: profileByEmail } = await supabase
             .from("users")
             .select("*")
             .eq("email", supaUser.email)
             .single();
             
           profile = profileByEmail;
        }

        if (!profile) {
           // Create new user profile if not exists
           const newUser = {
              id: supaUser.id,
              name: supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || supaUser.email?.split("@")[0],
              email: supaUser.email,
              role: "customer",
              is_member: false,
              orders_count: 0,
              last_active: "Baru saja"
           };
           await supabase.from("users").insert(newUser);
           profile = newUser;
        }

        const loggedInUser: User = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role || "customer",
          isMember: profile.is_member,
          whatsapp: profile.whatsapp,
          avatarUrl: profile.avatar_url || supaUser.user_metadata?.avatar_url
        };
        
        // Update last active in Supabase
        await supabase.from("users").update({ last_active: "Baru saja" }).eq("id", profile.id);

        // Sync with Backend memory
        try {
          await fetch(getApiUrl("/api/users/sync"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loggedInUser)
          });
        } catch (e) {
          console.error("Gagal sync user ke backend", e);
        }

        setCurrentUser(loggedInUser);
        if (loggedInUser.role === "admin" || loggedInUser.email === "tampaseduh@gmail.com") {
          setIsAdminMode(true);
          setShowUserDashboard(false);
        } else {
          loadUserOrders(loggedInUser.email);
          setShowUserDashboard(true);
        }
        setOrderNotification(`Selamat datang kawan ${loggedInUser.name}! 🎉`);
        setTimeout(() => setOrderNotification(null), 5000);
      }
    } catch (err: any) {
      console.error("Callback sync error:", err.message);
    } finally {
      if (window.location.hash.includes("access_token")) {
         window.history.replaceState(null, "", window.location.pathname);
      }
      if (currentPath === "/auth/callback") {
         navigateTo("/");
      }
    }
  }, [currentPath]);

  // Dengarkan perubahan status login dari Supabase secara otomatis
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Supabase Auth Event:", event);
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "PASSWORD_RECOVERY") && session?.user) {
        syncSupabaseSession(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncSupabaseSession]);

  const handleSubscribeMember = async () => {
    if (!currentUser) return;
    setIsSubscribing(true);
    try {
      const response = await fetch(getApiUrl("/api/auth/subscribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email })
      });
      const data = await safeParseJson(response);
      if (response.ok && data.user) {
        setCurrentUser(data.user);
        loadShopData();
      }
    } catch (err) {
      console.error("Gagal aktivasi member:", err);
    } finally {
      setIsSubscribing(false);
    }
  };

  const loadUserOrders = async (email: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/orders?email=${encodeURIComponent(email)}`));
      if (res.ok) {
        const data = await safeParseJson(res);
        if (!data.error) {
          setUserOrders(data);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil riwayat pesanan user:", err);
    }
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    setShowUserDashboard(false);
    setUserOrders([]);
  };

  const handleUpdateProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    try {
      const res = await fetch(getApiUrl("/api/users/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentUser.id, ...updates })
      });
      if (res.ok) {
        const data = await safeParseJson(res);
        if (data.success && data.user) {
          setCurrentUser(data.user);
          alert("Profil berhasil diperbarui!");
        }
      } else {
        alert("Gagal memperbarui profil.");
      }
    } catch (err) {
      console.error("Gagal update profil:", err);
      alert("Terjadi kesalahan jaringan.");
    }
  };

  // Scroll helper
  const scrollToId = (id: string) => {
    if (currentPath !== "/") {
      navigateTo("/");
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // Render Admin Terminal instead if requested
  if (isAdminMode) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>}>
        <AdminDashboard 
          onBackToStorefront={() => setIsAdminMode(false)} 
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onLogoutAdmin={() => {
            setCurrentUser(null);
            setIsAdminMode(false);
          }}
        />
      </Suspense>
    );
  }

  // Render User Dashboard if requested
  if (showUserDashboard && currentUser) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>}>
        <UserDashboard 
          currentUser={currentUser}
          onBack={() => setShowUserDashboard(false)}
          orders={userOrders}
          onSubscribe={handleSubscribeMember}
          isSubscribing={isSubscribing}
          onLogout={handleUserLogout}
          onUpdateProfile={handleUpdateProfile}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      </Suspense>
    );
  }

  // Render Checkout Page if path matches '/checkout'
  if (currentPath === "/checkout") {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>}>
        <CheckoutPage
          cart={cart}
          clearCart={clearCart}
          currentUser={currentUser}
          onBack={() => navigateTo("/")}
          onSuccess={(id) => {
            setOrderNotification(`Pesanan QRIS sukses terkirim dengan ID ${id}!`);
            setTimeout(() => setOrderNotification(null), 5000);
            navigateTo("/");
          }}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          navigateTo={navigateTo}
        />
      </Suspense>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${
      darkMode ? "dark bg-zinc-955 text-stone-100" : "bg-[#F9F7F2] text-stone-900"
    }`}>
      
      {/* 1. Brand Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled 
          ? (darkMode 
              ? "bg-zinc-955/90 border-amber-900/10 text-stone-100 border-b backdrop-blur-md shadow-md" 
              : "bg-[#F9F7F2]/95 border-zinc-200 text-zinc-900 border-b backdrop-blur-md shadow-md")
          : "bg-transparent border-transparent text-white"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          
          {/* Logo Brand matching the provided design */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => currentPath !== "/" ? navigateTo("/") : window.scrollTo({ top: 0, behavior: "smooth" })} id="logo-tampa-seduh">
            <img 
              src="/Logo Tampa Seduh.png" 
              alt="Tampa Seduh Logo" 
              className="h-14 w-auto rounded-lg object-contain transition-all duration-300"
              style={{
                filter: (!isScrolled || darkMode)
                  ? "brightness(0) invert(1)" 
                  : "sepia(0.8) saturate(150%) hue-rotate(345deg) brightness(75%) contrast(120%)"
              }}
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col text-left justify-center">
              <span className={`font-serif font-black text-lg sm:text-xl leading-none tracking-tight transition-colors duration-300 ${
                (!isScrolled || darkMode) ? "text-amber-50" : "text-[#2D1B0D]"
              }`}>
                TAMPA
              </span>
              <span className={`font-serif font-black text-lg sm:text-xl leading-none tracking-tight mt-[-2px] transition-colors duration-300 ${
                (!isScrolled || darkMode) ? "text-amber-50" : "text-[#2D1B0D]"
              }`}>
                SEDUH.
              </span>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-3">
            {/* 1. Checkout Icon Button */}
            <button
              onClick={() => navigateTo("/checkout")}
              className={`p-2.5 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center relative border ${
                (!isScrolled || darkMode) 
                  ? "text-amber-400 hover:bg-white/5 border-white/5" 
                  : "text-amber-900 hover:bg-amber-900/10 border-amber-900/5"
              }`}
              title="Check Out"
              id="nav-checkout-button"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-zinc-950 text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-mono font-bold leading-none">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>

            {/* 2. Theme Toggler Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                (!isScrolled || darkMode) 
                  ? "text-amber-400 hover:bg-white/5" 
                  : "text-amber-900 hover:bg-amber-900/10"
              }`}
              aria-label="Toggle Dark Mode"
              id="theme-toggler"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* 3. Single Door Profile Login / Dashboard Button */}
            <button
              onClick={() => {
                if (!currentUser) {
                  setIsUserLoginOpen(true);
                } else {
                  if (currentUser.role === "admin") {
                    setIsAdminMode(!isAdminMode);
                    setShowUserDashboard(false);
                  } else {
                    setShowUserDashboard(!showUserDashboard);
                    setIsAdminMode(false);
                  }
                }
              }}
              className={`p-2.5 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center border ${
                currentUser
                  ? ((!isScrolled || darkMode)
                      ? "text-amber-300 bg-white/10 border-amber-500"
                      : "text-amber-900 bg-amber-900/10 border-amber-500")
                  : ((!isScrolled || darkMode) 
                      ? "text-amber-400 hover:bg-white/5 border-white/5" 
                      : "text-amber-900 hover:bg-amber-900/10 border-amber-900/5")
              }`}
              title={currentUser ? (currentUser.role === "admin" ? "Dashboard Admin" : "Dashboard Member") : "Masuk / Daftar"}
              id="single-login-profile-button"
            >
              <UserIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {currentPath === "/kopi-news" ? (
        <div className="pt-24 min-h-[75vh]">
          {/* Header Title for the dedicated News page */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 text-left">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest bg-amber-900/5 dark:bg-amber-400/10 px-3 py-1 rounded-full font-sans">
              Update Terbaru & Informasi
            </span>
            <h1 className="text-4xl sm:text-5xl font-serif font-black text-[#2D1B0D] dark:text-amber-300 italic tracking-tight mt-2">
              Kopi News & Budaya
            </h1>
            <p className="text-sm text-zinc-650 dark:text-zinc-400 mt-2 font-sans">
              Daftar berita terbaru, kisah menarik, dan catatan seputar perkebunan serta budaya kopi di Kotabunan Bolaang Mongondow Timur.
            </p>
          </div>
          <Suspense fallback={null}>
            <CoffeeNews />
          </Suspense>
        </div>
      ) : (
        <>
          {/* 2. Hero Section (Replicating Foto 1 Vibe & Structure) */}
      <section 
        id="hero-section" 
        className="relative overflow-hidden pt-28 lg:pt-36 pb-20 lg:pb-28 border-b transition-all duration-300 bg-cover bg-center text-white"
        style={{
          backgroundImage: "url('/Hero.jpeg')"
        }}
      >
        {/* Dark overlay with sepia coffee tint to make text highly readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/35 dark:from-zinc-950/95 dark:via-zinc-955/80 dark:to-zinc-955/45 z-0 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Column (Hero Content) */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest leading-none bg-[#4B3621] border border-amber-900/20 text-amber-200 shadow-sm animate-pulse">
              ✨ 24/7 Delivery
            </span>

            <div className="space-y-4">
              <h1 className="text-5xl sm:text-7xl font-serif font-black leading-[1.08] tracking-tight text-white dark:text-amber-50">
                TAMPA SEDUH <br/>
                <span className="italic font-light text-amber-300 dark:text-amber-350">Street Coffee</span>
              </h1>
            
            </div>

            {/* Micro-interactive quote block replicating the card on Foto 1 */}
            <motion.div 
              whileHover={{ scale: 1.02, rotate: -2 }}
              className="p-5 rounded-2xl border border-amber-900/30 bg-[#2A1B0E]/90 text-amber-100 transition-all duration-300 cursor-pointer shadow-md rotate-[-1deg] relative max-w-md"
            >
              <span className="text-3xl font-serif text-[#8B5E3C] opacity-35 absolute -top-1 left-2">“</span>
              <p className="font-serif font-black text-sm uppercase tracking-wide px-5 text-center italic leading-snug">
                "Mo Pulang Mar
                <br />
                Mo Suka Tamba Ulang"
              </p>
              <div className="mt-3 flex justify-between items-center text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-5 pr-2">
                <span>- Quote Legendaris</span>
                <span className="text-amber-300 bg-amber-900/40 px-2 py-0.5 rounded">Rasa Bersahaja</span>
              </div>
            </motion.div>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => setIsOrderPopupOpen(true)}
                className="px-8 py-4 bg-[#8B5E3C] hover:bg-[#6F4E37] text-white rounded-full font-black shadow-lg shadow-[#8B5E3C]/20 cursor-pointer transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                id="btn-hero-order-sekarang"
              >
                Order Sekarang
              </button>
              <button
                onClick={() => scrollToId("menu-section")}
                className="px-8 py-4 rounded-full font-black cursor-pointer transition-all border border-white/20 bg-white/5 text-amber-300 hover:bg-white/10 text-sm uppercase tracking-wider"
                id="btn-hero-lihat-menu"
              >
                Lihat Menu
              </button>
            </div>
          </div>

          {/* Right Column is empty to let the background Hero image show completely */}
          <div className="lg:col-span-5 hidden lg:block" />

        </div>
      </section>

      {/* 3. Catalog Menu Section (Presenting Foto 2 & Foto 3 Menu Boards under Hero) */}
      <section id="menu-section" className="py-20 bg-[#F9F7F2] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="text-center space-y-4">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full">Daftar Menu Resmi Kedai</span>
            <h2 className="text-3xl sm:text-5xl font-serif font-black text-[#2D1B0D] dark:text-amber-50">Menikmati Sajian Terbaik</h2>
            <p className="text-zinc-650 dark:text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed font-sans">
              Menyediakan seduhan segar berkualitas tinggi yang tertera di papan menu kedai kami. Silakan klik harga Regular (R) atau Large (L) untuk langsung memesan!
            </p>
          </div>

          {/* ========================================================= */}
          {/* FOTO 2: ICE MENU BOARD REPLICA (Section 1) */}
          {/* ========================================================= */}
          <div className="bg-[#FAF8F5] dark:bg-zinc-900 border border-[#E8E2D9] dark:border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
            
            {/* Top falling coffee beans background decoration as in Foto 2 */}
            <div className="absolute top-2 inset-x-0 flex justify-between px-10 opacity-30 pointer-events-none">
              <span className="text-lg rotate-12">🫘</span>
              <span className="text-2xl -rotate-45">🫘</span>
              <span className="text-base rotate-45">🫘</span>
              <span className="text-xl -rotate-12">🫘</span>
            </div>

            {/* Header: STREET COFFEE / "MENU" with Moka Pot + TAMPA SEDUH */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-b pb-6 mb-8 border-[#E8E2D9] dark:border-zinc-800 relative z-10">
              <div className="text-center sm:text-left">
                <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#8B5E3C] opacity-80 block">STREET COFFEE</span>
                {/* Large tall condensed "MENU" lettering */}
                <h3 className="text-5xl sm:text-7xl font-serif font-black tracking-tight text-[#2D1B0D] dark:text-amber-50 leading-none">
                  MENU
                </h3>
              </div>
              <div className="flex items-center gap-3 mt-4 sm:mt-0 bg-white/40 dark:bg-zinc-950/40 px-5 py-3 rounded-2xl border border-[#E8E2D9] dark:border-zinc-800">
                <div className="w-10 h-10 bg-[#4B3621] text-white rounded-full flex items-center justify-center font-bold">
                  ☕
                </div>
                <div>
                  <h4 className="font-serif font-black text-lg tracking-tight leading-none text-[#2D1B0D] dark:text-amber-50">TAMPA SEDUH.</h4>
                  <span className="text-[8px] uppercase tracking-[0.18em] font-extrabold text-[#8B5E3C] dark:text-amber-400">STREET COFFEE EST. 2019</span>
                </div>
              </div>
            </div>

            {/* Ice Menu Grid: 2 Columns styled identically to Foto 2 layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#E8E2D9] dark:bg-zinc-800 rounded-2xl overflow-hidden border border-[#E8E2D9] dark:border-zinc-800">
              {menuItems
                .filter((item) => !item.isHot) // Ice/Cold items
                .map((item) => {
                  const isInCartReg = cart.some(e => e.id === item.id && e.size === "R");
                  const isInCartLrg = cart.some(e => e.id === item.id && e.size === "L");

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.85)" }}
                      className="bg-white dark:bg-zinc-900 p-5 sm:p-6 flex justify-between items-center relative overflow-hidden group transition-all"
                    >
                      {/* Left: Size + Prices */}
                      <div className="space-y-4 flex-1">
                        <h4 className="font-serif font-black text-base sm:text-lg text-[#2D1B0D] dark:text-amber-100 h-6">
                          {item.name}
                        </h4>

                        {/* Sizes and Add buttons formatted like "R|15 K" in Foto 2 */}
                        <div className="space-y-2">
                          
                          {/* R option */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                addToCart(item, "R", false);
                                setOrderNotification(`1x ${item.name} (R) ditambahkan!`);
                                setTimeout(() => setOrderNotification(null), 3000);
                              }}
                              disabled={!item.isAvailable}
                              className={`flex items-center gap-2 py-1.5 px-3.5 rounded-xl border text-xs font-bold tracking-tight cursor-pointer transition-all ${
                                isInCartReg 
                                  ? "bg-[#8B5E3C] text-white border-[#8B5E3C]"
                                  : "bg-[#F2EDE4]/60 dark:bg-white/5 border-transparent text-[#4A3728] dark:text-[#E8E2D9] hover:bg-[#E8E2D9]"
                              }`}
                            >
                              <span className="opacity-75 font-sans">R |</span>
                              <span className="font-extrabold font-mono">{item.priceReg} K</span>
                              {isInCartReg ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </button>
                            {isInCartReg && (
                              <button 
                                onClick={() => removeFromCart(item.id, "R")}
                                className="p-1 hover:bg-red-500/10 text-red-500 rounded-lg cursor-pointer"
                                title="Kurangi item"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* L option */}
                          {item.priceLarge && (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  addToCart(item, "L", false);
                                  setOrderNotification(`1x ${item.name} (L) ditambahkan!`);
                                  setTimeout(() => setOrderNotification(null), 3000);
                                }}
                                disabled={!item.isAvailable}
                                className={`flex items-center gap-2 py-1.5 px-3.5 rounded-xl border text-xs font-bold tracking-tight cursor-pointer transition-all ${
                                  isInCartLrg 
                                    ? "bg-[#8B5E3C] text-white border-[#8B5E3C]"
                                    : "bg-[#F2EDE4]/60 dark:bg-white/5 border-transparent text-[#4A3728] dark:text-[#E8E2D9] hover:bg-[#E8E2D9]"
                                }`}
                              >
                                <span className="opacity-75 font-sans">L |</span>
                                <span className="font-extrabold font-mono">{item.priceLarge} K</span>
                                {isInCartLrg ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              </button>
                              {isInCartLrg && (
                                <button 
                                  onClick={() => removeFromCart(item.id, "L")}
                                  className="p-1 hover:bg-red-500/10 text-red-500 rounded-lg cursor-pointer"
                                  title="Kurangi item"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Beverage Image */}
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 ml-4 rounded-full overflow-hidden bg-stone-100 border-2 border-[#E8E2D9] dark:border-zinc-800">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          onClick={(e) => { e.stopPropagation(); setZoomedImage(item.image); }}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 cursor-pointer"
                          referrerPolicy="no-referrer"
                        />
                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                            <span className="text-[10px] text-white font-black uppercase tracking-wider bg-red-600 px-1.5 py-0.5 rounded">HABIS</span>
                          </div>
                        )}
                      </div>

                    </motion.div>
                  );
                })}
            </div>

            {/* Bottom scattered roasted beans as in Foto 2 */}
            <div className="absolute bottom-2 inset-x-0 flex justify-around px-8 opacity-25 pointer-events-none">
              <span className="text-xl rotate-45">🫘</span>
              <span className="text-lg -rotate-12">🫘</span>
              <span className="text-2xl rotate-12">🫘</span>
            </div>

          </div>

          {/* ========================================================= */}
          {/* FOTO 3: HOT MENU BOARD REPLICA (Section 2) */}
          {/* ========================================================= */}
          <div className="bg-[#FAF8F5] dark:bg-zinc-900 border border-[#E8E2D9] dark:border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
            
            {/* Top falling coffee beans background decoration as in Foto 3 */}
            <div className="absolute top-2 inset-x-0 flex justify-between px-16 opacity-30 pointer-events-none">
              <span className="text-2xl rotate-12">🫘</span>
              <span className="text-lg rotate-45">🫘</span>
              <span className="text-xl -rotate-45">🫘</span>
            </div>

            {/* Header: STREET COFFEE / "MENU" with Moka Pot + TAMPA SEDUH */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-b pb-6 mb-8 border-[#E8E2D9] dark:border-zinc-800 relative z-10">
              <div className="text-center sm:text-left">
                <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#8B5E3C] opacity-80 block">STREET COFFEE</span>
                <h3 className="text-5xl sm:text-7xl font-serif font-black tracking-tight text-[#2D1B0D] dark:text-amber-50 leading-none">
                  MENU
                </h3>
              </div>
              <div className="flex items-center gap-3 mt-4 sm:mt-0 bg-white/40 dark:bg-zinc-950/40 px-5 py-3 rounded-2xl border border-[#E8E2D9] dark:border-zinc-800">
                <div className="w-10 h-10 bg-[#8B5E3C] text-white rounded-full flex items-center justify-center font-bold">
                  🔥
                </div>
                <div>
                  <h4 className="font-serif font-black text-lg tracking-tight leading-none text-[#2D1B0D] dark:text-amber-50">TAMPA SEDUH.</h4>
                  <span className="text-[8px] uppercase tracking-[0.18em] font-extrabold text-[#4B3621] dark:text-amber-400">HOT BLENDS SERVED HOT</span>
                </div>
              </div>
            </div>

            {/* Hot Menu Grid: 2 Columns styled identically to Foto 3 layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#E8E2D9] dark:bg-zinc-800 rounded-2xl overflow-hidden border border-[#E8E2D9] dark:border-zinc-800">
              {menuItems
                .filter((item) => item.isHot) // Hot items
                .map((item) => {
                  const isInCartReg = cart.some(e => e.id === item.id && e.size === "R");
                  const isInCartLrg = cart.some(e => e.id === item.id && e.size === "L");

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.85)" }}
                      className="bg-white dark:bg-zinc-900 p-5 sm:p-6 flex justify-between items-center relative overflow-hidden group transition-all"
                    >
                      {/* Left: Size + Prices */}
                      <div className="space-y-4 flex-1">
                        <h4 className="font-serif font-black text-base sm:text-lg text-[#2D1B0D] dark:text-amber-100 h-6">
                          {item.name}
                        </h4>

                        {/* Prices block styled directly as in Foto 3 */}
                        <div className="space-y-2">
                          
                          {/* Standard single price or Reg price */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                addToCart(item, "R", false);
                                setOrderNotification(`1x ${item.name} ditambahkan!`);
                                setTimeout(() => setOrderNotification(null), 3000);
                              }}
                              disabled={!item.isAvailable}
                              className={`flex items-center gap-2 py-1.5 px-3.5 rounded-xl border text-xs font-bold tracking-tight cursor-pointer transition-all ${
                                isInCartReg 
                                  ? "bg-[#4B3621] text-white border-[#4B3621]"
                                  : "bg-[#F2EDE4]/65 dark:bg-white/5 border-transparent text-[#4A3728] dark:text-[#E8E2D9] hover:bg-[#E8E2D9]"
                              }`}
                            >
                              <span className="font-extrabold font-mono">{item.priceReg} K</span>
                              {isInCartReg ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </button>
                            {isInCartReg && (
                              <button 
                                onClick={() => removeFromCart(item.id, "R")}
                                className="p-1 hover:bg-red-500/10 text-red-500 rounded-lg cursor-pointer"
                                title="Kurangi item"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Optional Larger Size price for Hot drinks (e.g. Coffe Susu Hot 10/12K in Foto 3) */}
                          {item.priceLarge && (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  addToCart(item, "L", false);
                                  setOrderNotification(`1x ${item.name} (L) ditambahkan!`);
                                  setTimeout(() => setOrderNotification(null), 3000);
                                }}
                                disabled={!item.isAvailable}
                                className={`flex items-center gap-2 py-1.5 px-3.5 rounded-xl border text-xs font-bold tracking-tight cursor-pointer transition-all ${
                                  isInCartLrg 
                                    ? "bg-[#4B3621] text-white border-[#4B3621]"
                                    : "bg-[#F2EDE4]/65 dark:bg-white/5 border-transparent text-[#4A3728] dark:text-[#E8E2D9] hover:bg-[#E8E2D9]"
                                }`}
                              >
                                <span className="opacity-75 font-sans">L |</span>
                                <span className="font-extrabold font-mono">{item.priceLarge} K</span>
                                {isInCartLrg ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              </button>
                              {isInCartLrg && (
                                <button 
                                  onClick={() => removeFromCart(item.id, "L")}
                                  className="p-1 hover:bg-red-500/10 text-red-500 rounded-lg cursor-pointer"
                                  title="Kurangi item"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}

                        </div>
                      </div>

                      {/* Right: Beverage Image */}
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 ml-4 rounded-full overflow-hidden bg-stone-100 border-2 border-[#E8E2D9] dark:border-zinc-800">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          onClick={(e) => { e.stopPropagation(); setZoomedImage(item.image); }}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 cursor-pointer"
                          referrerPolicy="no-referrer"
                        />
                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                            <span className="text-[10px] text-white font-black uppercase tracking-wider bg-red-650 px-1.5 py-0.5 rounded">HABIS</span>
                          </div>
                        )}
                      </div>

                    </motion.div>
                  );
                })}
            </div>

            {/* Bottom scattered coffee beans & scoops decoration as in Foto 3 */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 font-serif italic gap-4">
              <div className="flex items-center gap-1.5">
                <span>🫘</span>
                <span>Biji Kopi Asli Indonesia Disangrai Alami</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold underline text-[#8B5E3C] cursor-pointer" onClick={() => scrollToId("liberica-section")}>Mengenal Liberica Kotabunan</span>
                <span>|</span>
                <span>100% Street Coffee</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4.5 Coffee Packages Section */}
      <section id="packages-section" className="py-20 border-t border-amber-900/5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest bg-amber-900/5 dark:bg-amber-400/10 px-3 py-1 rounded-full font-sans">Kombinasi Kopi Spesial Lebih Hemat</span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-amber-955 dark:text-amber-300 italic tracking-tight">Paket Kopi Tampa Seduh</h2>
          <p className="text-sm text-zinc-555 dark:text-zinc-400">Pilih paket kombinasi kopi dingin dan hangat tradisional untuk dinikmati rame-rame dengan harga lebih murah.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packages.map((pack) => {
            const isInCart = cart.some(e => e.id === pack.id);
            return (
              <motion.div
                key={pack.id}
                whileHover={{ y: -8 }}
                className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-md flex flex-col justify-between text-left relative"
              >
                {pack.badge && (
                  <span className="absolute top-4 right-4 bg-amber-900 text-amber-100 dark:bg-amber-450 dark:text-amber-950 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full font-sans">
                    {pack.badge}
                  </span>
                )}
                
                <div className="space-y-4">
                  {pack.image ? (
                    <div className="w-full h-44 rounded-2xl overflow-hidden mb-4 bg-stone-100 border border-zinc-150 dark:border-zinc-800 flex-shrink-0">
                      <img 
                        src={pack.image} 
                        alt={pack.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-900/5 dark:bg-white/5 inline-block rounded-2xl mb-4">
                      <Coffee className="w-6 h-6 text-amber-800 dark:text-amber-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-serif font-bold text-xl text-amber-955 dark:text-amber-50">{pack.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{pack.description}</p>
                  </div>

                  <div className="border-t border-b py-3 dark:border-zinc-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">Kombinasi Menu:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {pack.items.map((itemId, idx) => {
                        const item = menuItems.find(m => m.id === itemId);
                        return (
                          <span key={idx} className="bg-[#F2EDE4] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded-lg font-sans">
                            {item ? item.name : itemId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6">
                  <div>
                    <span className="text-[10px] text-zinc-400 block leading-none font-sans">Harga Spesial</span>
                    <span className="font-mono text-xl font-black text-[#2D1B0D] dark:text-amber-400">Rp {pack.price}.000</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!isInCart ? (
                      <button
                        onClick={() => {
                          addToCart(pack, "Default", true);
                          setOrderNotification(`Paket ${pack.name} ditambahkan!`);
                          setTimeout(() => setOrderNotification(null), 3000);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm font-sans bg-amber-900/10 hover:bg-amber-900 text-amber-900 hover:text-white dark:bg-amber-450/10 dark:text-amber-450 dark:hover:bg-amber-450 dark:hover:text-amber-955"
                      >
                        Beli Paket
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigateTo("/checkout")}
                          className="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm font-sans bg-amber-500 hover:bg-amber-600 text-zinc-950 flex items-center gap-1"
                        >
                          <span>Bayar Sekarang</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="flex items-center bg-[#F2EDE4] dark:bg-zinc-800 rounded-xl border border-zinc-250/20">
                          <button
                            onClick={() => removeFromCart(pack.id, "Default")}
                            className="p-2 hover:bg-red-500/10 text-red-500 rounded-l-xl cursor-pointer"
                            title="Kurangi"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {cart.find(e => e.id === pack.id)?.quantity || 1}
                          </span>
                          <button
                            onClick={() => addToCart(pack, "Default", true)}
                            className="p-2 hover:bg-green-500/10 text-green-600 rounded-r-xl cursor-pointer"
                            title="Tambah"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 4.7 Roti Kampung Education Section */}
      <section id="roti-edu-section" className="py-20 bg-gradient-to-b from-[#F9F7F2] to-amber-50/20 dark:from-zinc-950 dark:to-zinc-900 text-stone-900 dark:text-stone-100 border-t border-amber-900/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest bg-amber-900/5 dark:bg-amber-400/10 px-3 py-1 rounded-full font-sans">Kearifan Lokal & Selera Khas</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-[#2D1B0D] dark:text-amber-100 leading-tight">
              Roti Kampung & Kopi: <br className="hidden sm:block"/> Pasangan yang Cocok dari Dulu
            </h2>
            <p className="text-sm text-zinc-650 dark:text-zinc-400">
              Di Tampa Seduh, torang sengaja pilih <strong>roti kampung</strong> asli Kotabunan untuk jadi teman ngopi kawan, bukan roti pabrikan luar yang ba pelembut buatan.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              <div className="bg-white dark:bg-zinc-900/90 p-8 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-xs space-y-4">
                <h3 className="text-xl font-serif font-bold text-amber-955 dark:text-amber-200">Bukan Sekadar Roti Biasa jo!</h3>
                <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed font-sans">
                  Lantaran torang percaya kopi yang gaga musti berpasangan dengan makanan alami yang dibikin penuh hati dan kesabaran, ndak asal cepat saji. Sama dengan kopi yang diseduh pelan-pelan, roti kampung le diproses lambat tanpa bahan tambahan kimia berbahaya.
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 p-8 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-xs space-y-4">
                <h3 className="text-xl font-serif font-bold text-amber-955 dark:text-amber-200">Apa Itu Roti Kampung Sebenarnya?</h3>
                <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed font-sans">
                  Roti kampung tradisional Kotabunan cuma pake bahan-bahan sederhana yang sehat: tepung, air, ragi alami, dan garam. Nyanda' pake pengawet atau pelembut kimia massal. Makanya tekstur roti kampung kerasa lebe padat, berisi, dan berkarakter pas digigit. 
                </p>
                <div className="p-4 bg-amber-50 dark:bg-zinc-850 rounded-2xl border border-amber-900/5 dark:border-zinc-750">
                  <p className="text-xs text-amber-900 dark:text-amber-400 italic font-medium font-sans">
                    "Orang tua dolo di Kotabunan deng Sulawesi Utara sering bilang: Roti yang gaga itu nyanda' musti paling lembut pe leher, mar yang paling beking kenyang deng cocok skali dicelup ka kopi hangat."
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 p-8 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-xs space-y-4">
                <h3 className="text-xl font-serif font-bold text-amber-955 dark:text-amber-200">Fermentasi Lebe Lama, Rasa Lebe Kaya</h3>
                <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed font-sans">
                  Kunci kelezatannya ada di proses fermentasi lambat (4 sampai 24 jam). Ini beking aroma roti lebe harum, tekstur alami berserat gaga, kenyang tahan lama, deng lebe gampang dicerna di perut.
                </p>
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pt-2">Tentang Gluten</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed font-sans">
                  Roti kampung tetap ada gluten lantaran terigu. Mar proses fermentasi tradisional yang lama beking gluten terurai alami, jadi lebe nyaman dikonsumsi dibanding roti pabrikan yang serba instan.
                </p>
              </div>

            </div>

            {/* Right Table Column */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-[#FAF8F5] dark:bg-zinc-900/40 p-6 sm:p-8 rounded-3xl border border-amber-900/5 dark:border-zinc-800 text-left space-y-6">
                <h3 className="text-lg font-serif font-bold text-[#2D1B0D] dark:text-amber-200">Perbandingan Karakter Roti</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-sans">
                    <thead>
                      <tr className="border-b border-amber-900/10 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-450 font-bold">
                        <th className="py-2.5 text-left font-bold">Faktor</th>
                        <th className="py-2.5 text-left font-bold">Roti Kampung</th>
                        <th className="py-2.5 text-left font-bold">Roti Pabrikan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-900/5 dark:divide-zinc-850">
                      <tr>
                        <td className="py-3 font-semibold text-amber-950 dark:text-amber-300">Fermentasi</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">Lama (4-24 jam)</td>
                        <td className="py-3 text-zinc-500">Cepat (1-3 jam)</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-amber-950 dark:text-amber-300">Bahan Baku</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">Tepung, air, ragi, garam murni</td>
                        <td className="py-3 text-zinc-500">Banyak emulsifier & pengawet</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-amber-950 dark:text-amber-300">Tekstur</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">Padat, berserat, berkarakter</td>
                        <td className="py-3 text-zinc-500">Sangat empuk, berongga kosong</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-amber-950 dark:text-amber-300">Crust / Kulit</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">Tebal & renyah gurih</td>
                        <td className="py-3 text-zinc-500">Tipis & lunak basah</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-amber-950 dark:text-amber-300">Umur Simpan</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">Pendek (2-3 hari)</td>
                        <td className="py-3 text-zinc-500">Lama (berminggu-minggu)</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-amber-950 dark:text-amber-300">Cita Rasa</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">Kompleks, alami khas ragi</td>
                        <td className="py-3 text-zinc-500">Manis dominan, rasa seragam</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 border-t border-amber-900/10 dark:border-zinc-800 text-center">
                  <h4 className="text-sm font-serif font-black text-amber-900 dark:text-amber-400 italic">"Ngopi jo, makan roti jo."</h4>
                  <p className="text-[10px] text-zinc-400 mt-1">Sederhana mar beking rindu kawan.</p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 4. Educational Section 1 - Boltim Liberica Origin (Boltim) */}
      <section id="liberica-section" className="py-20 bg-amber-950 text-amber-50 border-t border-amber-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6 text-left">
            <span className="text-xs font-bold text-amber-450 uppercase tracking-widest bg-amber-900/50 border border-amber-500/20 px-3.5 py-1.5 rounded-full">Educational Bean Heritage - Bagian I</span>
            <h2 className="text-3xl sm:text-5xl font-serif font-black tracking-tight leading-tight">
              Berdampingan Dengan Alam:
              <br />
              <span className="text-amber-400 italic">Liberica Kotabunan</span>
            </h2>
            <p className="text-sm text-amber-1050 text-amber-100/80 leading-relaxed font-sans">
              Kotabunan, kawasan pesisir kaya endapan mineral vulkanis di Kabupaten Bolaang Mongondow Timur, Sulawesi Utara, melahirkan keajaiban agrikultur berupa perkebunan biji kopi **Liberica Kotabunan**. 
              <br /><br />
              Berbeda dari Arabica atau Robusta biasa, varietas Liberica ini berbuah dalam bentuk gelondongan raksasa yang membutuhkan ketelitian tinggi dari para petani lokal saat dipanen secara manual handpicked. Tanah subur berangin laut pantai selatan Sulawesi menanamkan bodi tebal, ketajaman cita rasa khas yang manis buah tropis, wangi kayu oak, serta sangat bersahabat bagi pencernaan Anda.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-2xl font-serif font-black text-amber-400">Rendah</span>
                <span className="block text-xs text-zinc-400 mt-1 uppercase font-bold">Kadar Kafein</span>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-2xl font-serif font-black text-amber-400">100%</span>
                <span className="block text-xs text-zinc-400 mt-1 uppercase font-bold">Panen Petani Sulawesi</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-amber-900/20 rounded-full blur-3xl pointer-events-none" />
            <img 
              src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80" 
              alt="Liberica coffee plantation" 
              className="w-full h-96 object-cover rounded-3xl shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
          </div>

        </div>
      </section>

      {/* 4. Educational Section 2 - Bean Characteristics & Roasting Profiles */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold text-amber-805 dark:text-amber-400 uppercase tracking-widest bg-amber-900/5 dark:bg-amber-400/10 px-3.5 py-1.5 rounded-full">Educational Bean Heritage - Bagian II</span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-amber-955 dark:text-amber-300">Karakter & Profil Seduhan Liberica</h2>
          <p className="text-zinc-650 dark:text-zinc-400 text-sm">
            Meneliti detail anatomi rasa dari biji kopi yang kami olah dengan teliti dari ceri merah segar hingga cangkir seduh kawan.
          </p>
        </div>

        {/* Profiling and flavor card layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Aroma Profil */}
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-amber-900/5 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-amber-900/5 dark:border-zinc-800 pb-3">
              <span className="p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 rounded-xl font-bold font-mono">AR</span>
              <h3 className="font-serif font-bold text-lg text-amber-955 dark:text-amber-50">Solfeggio Cita Rasa</h3>
            </div>
            
            <ul className="space-y-4">
              <li className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-zinc-555 dark:text-zinc-300">
                  <span>Wangi Buah Nangka (Jackfruit)</span>
                  <span className="text-amber-800 dark:text-amber-400">10 / 10</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </li>
              <li className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-zinc-555 dark:text-zinc-300">
                  <span>Sensasi Kayu Oak (Woody)</span>
                  <span className="text-amber-800 dark:text-amber-400">9 / 10</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "90%" }}></div>
                </div>
              </li>
              <li className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-zinc-555 dark:text-zinc-300">
                  <span>Ketebalan Bodi (Body)</span>
                  <span className="text-amber-800 dark:text-amber-400">10 / 10</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </li>
              <li className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-zinc-555 dark:text-zinc-300">
                  <span>Tingkat Keasaman (Acidity)</span>
                  <span className="text-amber-800 dark:text-amber-400">2 / 10</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "20%" }}></div>
                </div>
              </li>
            </ul>
          </div>

          {/* Card 2: Roasting & Process */}
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-amber-900/5 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-amber-900/5 dark:border-zinc-800 pb-3">
              <span className="p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 rounded-xl font-bold font-mono">RT</span>
              <h3 className="font-serif font-bold text-lg text-amber-955 dark:text-amber-50">Pengolahan & Roasting</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-0.5">
                <span className="text-zinc-400 font-bold uppercase tracking-wider block">Roasting Level</span>
                <strong className="text-sm font-serif text-amber-955 dark:text-amber-200">Medium-Dark Roast</strong>
                <p className="text-zinc-500">Maksimalisasi gula murni alami biji kopi tersangrai tanpa menghilangkan keunikan asam eksotis buah nangka.</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-zinc-400 font-bold uppercase tracking-wider block">Processing Method</span>
                <strong className="text-sm font-serif text-amber-955 dark:text-amber-200">Honey / Natural Process</strong>
                <p className="text-zinc-500">Biji kopi dijemur bersama sisa daging buah agar rasa manis alaminya meresap hingga ke dalam.</p>
              </div>
            </div>
          </div>

          {/* Card 3: Barista Recommendations */}
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-amber-900/5 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-amber-900/5 dark:border-zinc-800 pb-3">
              <span className="p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 rounded-xl font-bold font-mono">EX</span>
              <h3 className="font-serif font-bold text-lg text-amber-955 dark:text-amber-50">Rekomendasi Barista</h3>
            </div>

            <div className="space-y-3 font-sans text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <p>
                <strong>Seduhan Dingin:</strong> Kami rekomendasikan menyatukan Liberica dengan susu murni kental manis melimpah pada **Ice Coffe TPS** untuk rasa karamel pisang dan nangka yang tebal.
              </p>
              <p>
                <strong>Seduhan Hangat:</strong> Seduhlah secara perlahan menggunakan Moka pot tekanan tinggi khas kedai, lalu blend bersama irisan jahe merah kental gula kelapa Sulawesi asli (**Saraba**) untuk kebugaran tenggorokan dan badan Anda.
              </p>
            </div>
          </div>

        </div>
      </section>



      {/* 5. Coffee News Blog section on frontpage */}
      <Suspense fallback={null}>
        <CoffeeNews />
      </Suspense>

      {/* 6. FAQ Section */}
      <section id="faq-section" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 border-t border-amber-900/5">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest bg-amber-900/5 dark:bg-amber-400/10 px-3 py-1 rounded-full">Pertanyaan Sering Diutarakan</span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-amber-955 dark:text-amber-300 italic tracking-tight">Tanya & Jawab Tampa Seduh</h2>
          <p className="text-sm text-zinc-555 dark:text-zinc-400">Semua yang perlu kawan ketahui seputar rasa kopi, lokasi kedai, pemesanan online antar langsung, dan jam buka.</p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "Apa arti nama 'Tampa Seduh' kawan?",
              a: "Tampa Seduh adalah logat dari regional Sulawesi Utara yang berarti 'Tempat Menyeduh'. Kami ingin kedai kami menjadi persinggahan ternyaman bagi siapa saja pelintas jalan Trans-Sulawesi untuk menyeduh rasa persaudaraan dan kehangatan kopi."
            },
            {
              q: "Dari mana asal biji kopi Liberica Kotabunan?",
              a: "Biji kopi dipanen langsung oleh kelompok tani lokal di perkebunan wilayah pegunungan sejuk Kotabunan Selatan, Kabupaten Bolaang Mongondow Timur (Boltim), Sulawesi Utara. Benar-benar produk kedaulatan lokal kebanggaan Boltim kawan!"
            },
            {
              q: "Apakah pesanan bisa diantar ke seluruh Kotabunan?",
              a: "Bisa sekali! Dengan mengklik tombol 'Order Sekarang', kawan dipersilakan mengisi data nama, Whatsapp, dan alamat pengantaran lengkap. Barista kami akan menerima langsung detail alamat Anda via dashboard admin, memproses kopi segar Anda, lalu diantar oleh kurir kedai kami. Pembayaran dilakukan di tempat (COD) pas kopi sampai."
            },
            {
              q: "Apa itu minuman 'Saraba' di kedai Tampa Seduh?",
              a: "Saraba adalah minuman wedang jahe tradisional Sulawesi Utara yang kaya khasiat. Kami meraciknya dengan jahe merah pilihan, sereh, kayu manis, gula kelapa asli Bolaang Mongondow, dan sentuhan creamer susu kental manis segar. Sempurna dipadukan dengan senja pesisir pantai!"
            }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-amber-900/5 dark:border-zinc-800 overflow-hidden shadow-xs"
            >
              <button
                onClick={() => setFaqIndex(faqIndex === idx ? null : idx)}
                className="w-full text-left p-5 flex justify-between items-center font-bold text-stone-900 dark:text-stone-100 transition-colors cursor-pointer"
              >
                <span className="text-sm sm:text-base pr-4">{item.q}</span>
                <span className="text-amber-905 dark:text-amber-400 text-lg">{faqIndex === idx ? "−" : "+"}</span>
              </button>
              
              <AnimatePresence>
                {faqIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-50 dark:border-zinc-850">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Google Maps Reviews Section */}
      <section id="reviews-section" className="py-20 bg-amber-50/20 dark:bg-zinc-950/20 border-t border-amber-900/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest bg-amber-900/5 dark:bg-amber-400/10 px-3 py-1 rounded-full">Testimoni Pengguna Google Maps</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-amber-955 dark:text-amber-50">Ulasan Pengunjung Google Maps</h2>
            <p className="text-xs sm:text-sm text-zinc-555 dark:text-zinc-400">Inilah pendapat kawan-kawan sekalian yang telah singgah menikmati cangkir menyegarkan di kedai kancah Trans Sulawesi.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Clara Moningka",
                origin: "Limboto, Gorontalo (Local Guide)",
                text: "Lagi melintas Trans Sulawesi malam hari ngantuk berat, mampir di Tampa Seduh pesan Ice Coffe TPS reguler sama Saraba. Luar biasa langsung melek kawan! Rasa jahe hangat saraba dicampur rempahnya mantap betul. Ownernya ramah skali.",
                rating: 5,
                date: "1 minggu yang lalu"
              },
              {
                name: "Yusuf Pontoh",
                origin: "Kotabunan, East Boltim",
                text: "Biji kopi Liberica Kotabunannya juara! Ada notes manis buah nangka yang samar-samar pas diminum tanpa gulapun terasa manis alami. Tempat paling cozy nongkrong sore di Boltim. Saya sering tambah order di sini.",
                rating: 5,
                date: "3 hari yang lalu"
              },
              {
                name: "Ahmad Dani",
                origin: "Manado, North Sulawesi",
                text: "Rasa kopinya otentik skali kawan! Susu dikombinasi dengan sirup rahasia di Ice Coffe TPS benar-benar sesuai quote: 'Mo pulang mar mo suka tamba ulang'. Sukses terus kedai Tampa Seduh!",
                rating: 5,
                date: "2 minggu yang lalu"
              }
            ].map((usr, i) => (
              <div 
                key={i} 
                className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-amber-900/5 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex gap-1 text-amber-500">
                    {Array.from({ length: usr.rating }).map((_, rIdx) => (
                      <Star key={rIdx} className="w-4 h-4 fill-amber-500" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm italic text-zinc-700 dark:text-zinc-350 leading-relaxed font-sans font-medium">
                    "{usr.text}"
                  </p>
                </div>

                <div className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-850 pt-3 text-xs">
                  <div>
                    <strong className="text-zinc-900 dark:text-zinc-100 block">{usr.name}</strong>
                    <span className="text-[10px] text-zinc-400 block">{usr.origin}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase">{usr.date}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

        </>
      )}

      {/* 8. Contact Section at the Bottom */}
      <footer id="contact-section" className="bg-[#1b100a] dark:bg-black text-amber-100 py-16 border-t border-amber-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12 text-left pb-12 border-b border-white/5">
          
          {/* Logo & Slogan */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-900 rounded-lg">
                <Coffee className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-serif font-black text-lg text-white">TAMPA SEDUH.</h3>
            </div>
            <p className="text-xs text-amber-200/80 leading-relaxed font-sans max-w-sm">
              Menemani perjalanan kawan melintasi bentang alam Sulawesi dengan cangkir kopi Liberica terbaik dan kehangatan tradisional Saraba.
            </p>
            <div className="pt-2 text-xs text-amber-400">
              <span className="block font-bold">Jam Operasional Kedai:</span>
              <span className="block">Setiap hari: Pukul 18.00 WITA - 24.00 WITA</span>
              <span className="block text-amber-300 font-semibold mt-0.5">Delivery 24/7</span>
              <button 
                onClick={() => navigateTo("/kopi-news")}
                className="mt-3.5 inline-flex items-center gap-1.5 bg-amber-900/40 border border-amber-500/20 hover:bg-amber-900/80 text-amber-250 hover:text-white px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] cursor-pointer font-sans"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Baca Kopi News
              </button>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h4 className="font-serif font-bold text-sm uppercase tracking-widest text-amber-400">Kontak Resmi Kami</h4>
            <ul className="space-y-3 text-xs text-amber-100/90 font-medium">
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Nomor Whatsapp: <strong>085696224448</strong></span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Email: <strong className="underline">kopi@tampaseduh.com</strong></span>
              </li>
              <li className="flex items-center gap-2.5">
                <Instagram className="w-4 h-4 text-amber-500 shrink-0" />
                <a href="https://www.instagram.com/tampa_seduh/" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">
                  Instagram: <strong>@tampa_seduh</strong>
                </a>
              </li>
            </ul>
          </div>

          {/* Location details */}
          <div className="space-y-4 col-span-1">
            <h4 className="font-serif font-bold text-sm uppercase tracking-widest text-amber-400">Alamat Kedai</h4>
            <div className="flex gap-2.5 text-xs text-amber-100/90 font-medium">
              <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <a href="https://maps.app.goo.gl/9MbTTfGwG43hgJ527" target="_blank" rel="noreferrer" className="block hover:opacity-80 transition-opacity">
                  <strong className="block text-white">Jl. Tangkudeagan No. 2 Kotabunan Selatan</strong>
                  <span>Kec. Kotabunan, Kabupaten Bolaang Mongondow Timur, Trans Sulawesi Lingkar Selatan.</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Brand attribution copyright */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col sm:flex-row justify-between items-center text-[11px] text-amber-250/50">
          <div className="flex flex-col gap-1 text-left">
            <span>&copy; {new Date().getFullYear()} Tampa Seduh Street Coffee Boltim. All Rights Reserved.</span>
            <span className="opacity-80">Berdikari Bersama Komunitas Petani Kopi Lokal Kotabunan Malalayang.</span>
          </div>
          <div className="flex flex-col items-end gap-1 mt-4 sm:mt-0 font-sans">
            <div className="flex gap-2 text-[10px] text-amber-400/80">
              <a href="https://indodesign.website" target="_blank" rel="noopener noreferrer" className="hover:underline">indodesign.website</a>
              <span>&bull;</span>
              <a href="https://bali.enterprises" target="_blank" rel="noopener noreferrer" className="hover:underline">bali.enterprises</a>
            </div>
            <span>
              Bagian dari{" "}
              <a href="https://mybisnis.app" target="_blank" rel="noopener noreferrer" className="text-amber-400 font-bold hover:underline">
                Kotabunan Projek
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* Floating Coffee Cart Bubble on the left margin/bottom */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-6 z-45">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-amber-900 to-amber-950 text-amber-50 rounded-2xl shadow-2xl border border-amber-400/20 max-w-sm flex items-center gap-4 justify-between"
          >
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 block">Kopi Siap Dipesan</span>
              <span className="text-xs font-serif font-bold text-amber-50">{cart.reduce((a, b) => a + b.quantity, 0)} Minuman - Rp {totalCartSum}.000</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOrderPopupOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-black px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                Pesan
              </button>
              <button
                onClick={clearCart}
                className="p-1 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-amber-200"
                title="Kosongkan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Notifications overlay toast */}
      <AnimatePresence>
        {orderNotification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white font-sans font-bold text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-green-400/20"
          >
            <Check className="w-4 h-4 text-emerald-100 shrink-0" />
            {orderNotification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Popup Modal */}
      <Suspense fallback={null}>
        <OrderPopup
          isOpen={isOrderPopupOpen}
          onClose={() => setIsOrderPopupOpen(false)}
          cart={cart}
          clearCart={clearCart}
          onSuccess={(id) => {
            setOrderNotification(`Pesanan sukses terkirim dengan ID ${id}!`);
            setTimeout(() => setOrderNotification(null), 5000);
          }}
          currentUser={currentUser}
          menuItems={menuItems}
          packages={packages}
          addToCart={addToCart}
          removeFromCart={removeFromCart}
        />
      </Suspense>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <motion.button
          onClick={() => setIsOrderPopupOpen(true)}
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 z-40 bg-[#4B3621] dark:bg-amber-500 text-white dark:text-zinc-950 px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-2.5 cursor-pointer border border-amber-900/10 hover:shadow-[#4B3621]/30 transition-all font-sans font-bold text-xs uppercase tracking-wider"
          id="floating-cart-button"
        >
          <ShoppingCart className="w-4 h-4 text-amber-300 dark:text-zinc-900" />
          <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} Item</span>
          <span className="bg-amber-900 dark:bg-white text-white dark:text-zinc-950 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold leading-none">
            {totalCartSum} K
          </span>
        </motion.button>
      )}

      {/* Floating AI chat assistant */}
      <Suspense fallback={null}>
        <AiChatWidget />
        <GlobalNotification 
          userRole={isAdminMode ? "admin" : (currentUser ? "user" : null)} 
          userEmail={currentUser?.email} 
        />
      </Suspense>

      {/* User Login Dialog Modal */}
      <AnimatePresence>
        {isUserLoginOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-2xl border border-amber-900/10 text-zinc-900 dark:text-zinc-100 font-sans"
            >
              <div className="flex justify-between items-center border-b pb-3 border-zinc-100 dark:border-zinc-800">
                <h4 className="font-serif font-bold text-base text-amber-955 dark:text-amber-50">Masuk Akun Member</h4>
                <button
                  onClick={() => {
                    setIsUserLoginOpen(false);
                    setAuthError("");
                  }}
                  className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  id="btn-close-user-login"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUserLogin} className="mt-4 space-y-4 text-left">
                {authError && (
                  <p className="text-xs text-red-650 bg-red-150 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-200 dark:border-red-800/20">{authError}</p>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-550 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="kawan@example.com"
                    value={userEmailInput}
                    onChange={(e) => setUserEmailInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-555">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        const emailText = userEmailInput ? ` dengan email: ${userEmailInput}` : "";
                        const url = `https://wa.me/6285696224448?text=Halo%20Tampa%20Seduh,%20saya%20lupa%20password%20akun%20saya${encodeURIComponent(emailText)}`;
                        window.open(url, "_blank");
                      }}
                      className="text-[10px] text-amber-800 dark:text-amber-400 hover:underline font-bold transition-all cursor-pointer"
                    >
                      Lupa Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukkan password kawan..."
                      value={userPasswordInput}
                      onChange={(e) => setUserPasswordInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 focus:outline-none pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#4B3621] hover:bg-[#322314] text-white font-bold py-3 rounded-xl text-xs cursor-pointer transition-all shadow"
                  id="btn-submit-user-login"
                >
                  Masuk Sekarang
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-zinc-150 dark:border-zinc-800"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Atau</span>
                  <div className="flex-grow border-t border-zinc-150 dark:border-zinc-800"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full py-2.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-750 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm disabled:opacity-60 disabled:cursor-wait"
                  id="btn-google-login"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {isGoogleLoading ? "Mengarahkan ke Google..." : "Masuk dengan Google"}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserLoginOpen(false);
                      setIsUserRegisterOpen(true);
                      setAuthError("");
                    }}
                    className="text-xs text-amber-800 dark:text-amber-400 hover:underline font-bold"
                  >
                    Belum punya akun? Daftar gratis kawan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Register Dialog Modal */}
      <AnimatePresence>
        {isUserRegisterOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-2xl border border-amber-900/10 text-zinc-900 dark:text-zinc-100 font-sans"
            >
              <div className="flex justify-between items-center border-b pb-3 border-zinc-100 dark:border-zinc-800">
                <h4 className="font-serif font-bold text-base text-amber-955 dark:text-amber-50">Daftar Akun Baru</h4>
                <button
                  onClick={() => {
                    setIsUserRegisterOpen(false);
                    setAuthError("");
                  }}
                  className="text-zinc-400 hover:text-zinc-650 cursor-pointer"
                  id="btn-close-user-register"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUserRegister} className="mt-4 space-y-3.5 text-left">
                {authError && (
                  <p className="text-xs text-red-650 bg-red-150 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-200 dark:border-red-800/20">{authError}</p>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-550 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    placeholder="E.g., Andika Pratama"
                    value={userNameInput}
                    onChange={(e) => setUserNameInput(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-550 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="andika@gmail.com"
                    value={userEmailInput}
                    onChange={(e) => setUserEmailInput(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-550 mb-1">No. WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="Contoh: 085696224448"
                    value={userWhatsappInput}
                    onChange={(e) => setUserWhatsappInput(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-550 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimal 6 karakter"
                      value={userPasswordInput}
                      onChange={(e) => setUserPasswordInput(e.target.value)}
                      className="w-full px-4 py-2 pr-10 bg-zinc-50 dark:bg-zinc-800 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#4B3621] hover:bg-[#322314] text-white font-bold py-3 rounded-xl text-xs cursor-pointer transition-all shadow-md mt-2"
                  id="btn-submit-user-register"
                >
                  Daftar Sekarang
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserRegisterOpen(false);
                      setIsUserLoginOpen(true);
                      setAuthError("");
                    }}
                    className="text-xs text-amber-800 dark:text-amber-400 hover:underline font-bold"
                  >
                    Sudah punya akun? Masuk disini kawan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern Image Lightbox Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-4xl max-h-[90vh] w-full rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent click from closing when clicking image itself
            >
              <img 
                src={zoomedImage} 
                alt="Zoomed Product" 
                className="w-full h-full object-contain max-h-[90vh]"
              />
              <button
                onClick={() => setZoomedImage(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors backdrop-blur-md"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}
