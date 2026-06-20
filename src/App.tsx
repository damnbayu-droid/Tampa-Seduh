import React, { useState, useEffect } from "react";
import { 
  Coffee, ShoppingCart, Sparkles, MapPin, Phone, Mail, Clock, 
  HelpCircle, Star, ShieldAlert, ArrowDown, LogIn, Check, Plus, Minus, ChevronRight, X, Sun, Moon 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MenuItem, CoffeePackage } from "./types";
import OrderPopup from "./components/OrderPopup";
import AiChatWidget from "./components/AiChatWidget";
import CoffeeNews from "./components/CoffeeNews";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  // Navigation & admin panel toggles
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // Dark/Light mode theme state
  const [darkMode, setDarkMode] = useState(false);

  // Core shop state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [packages, setPackages] = useState<CoffeePackage[]>([]);
  const [activeMenuTab, setActiveMenuTab] = useState<"all" | "cold" | "hot">("all");
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number; size: "R" | "L" }[]>([]);
  const [isOrderPopupOpen, setIsOrderPopupOpen] = useState(false);

  // Active Accordion Index of FAQ
  const [faqIndex, setFaqIndex] = useState<number | null>(null);

  // Feedback notifications
  const [orderNotification, setOrderNotification] = useState<string | null>(null);

  // Fetch shop state periodically to stay synced with Admin Dashboard operations!
  const loadShopData = async () => {
    try {
      const mRes = await fetch("/api/menu");
      const pRes = await fetch("/api/packages");
      if (mRes.ok) setMenuItems(await mRes.json());
      if (pRes.ok) setPackages(await pRes.json());
    } catch (err) {
      console.error("Gagal mendapatkan daftar menu kedai:", err);
    }
  };

  useEffect(() => {
    loadShopData();
  }, [isAdminMode]);

  // Sync dark mode class
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Simple cart actions
  const addToCart = (item: MenuItem, size: "R" | "L") => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.item.id === item.id && entry.size === size);
      if (existing) {
        return prev.map((entry) => 
          entry.item.id === item.id && entry.size === size 
            ? { ...entry, quantity: entry.quantity + 1 } 
            : entry
        );
      }
      return [...prev, { item, quantity: 1, size }];
    });
  };

  const removeFromCart = (item: MenuItem, size: "R" | "L") => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.item.id === item.id && entry.size === size);
      if (existing && existing.quantity > 1) {
        return prev.map((entry) => 
          entry.item.id === item.id && entry.size === size 
            ? { ...entry, quantity: entry.quantity - 1 } 
            : entry
        );
      }
      return prev.filter((entry) => !(entry.item.id === item.id && entry.size === size));
    });
  };

  const clearCart = () => setCart([]);

  const totalCartSum = cart.reduce((sum, entry) => {
    const price = entry.size === "L" && entry.item.priceLarge ? entry.item.priceLarge : entry.item.priceReg;
    return sum + (price * entry.quantity);
  }, 0);

  // Admin login handler
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "admin" || passwordInput === "tampaseduh") {
      setIsAdminMode(true);
      setIsAdminLoginOpen(false);
      setPasswordInput("");
      setLoginError("");
    } else {
      setLoginError("Password salah! Silakan coba lagi kawan.");
    }
  };

  // Scroll helper
  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Render Admin Terminal instead if requested
  if (isAdminMode) {
    return (
      <AdminDashboard 
        onBackToStorefront={() => setIsAdminMode(false)} 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${
      darkMode ? "bg-zinc-950 text-stone-100" : "bg-[#F9F7F2] text-stone-900"
    }`}>
      
      {/* 1. Brand Navigation Bar */}
      <nav className={`sticky top-0 z-40 transition-all duration-200 border-b backdrop-blur-md ${
        darkMode 
          ? "bg-zinc-950/90 border-amber-900/10 text-stone-100" 
          : "bg-[#F9F7F2]/90 border-zinc-200 text-zinc-900"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          
          {/* Logo Brand matching the provided design */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} id="logo-tampa-seduh">
            <svg className="h-12 w-auto text-stone-900 dark:text-amber-50" viewBox="0 0 280 80" fill="currentColor">
              {/* Hand sketch holding moka pot handle */}
              <path d="M 12 34 C 4 33, 2 25, 9 20 C 16 15, 23 17, 28 21 L 29 17 C 21 11, 8 11, 2 22 C -4 33, 1 44, 10 49 L 14 45 Z" />
              <path d="M 10 20 Q 15 13, 22 20" stroke="currentColor" strokeWidth="2" fill="none" />
              {/* Finger lines */}
              <path d="M 13 25 L 21 27" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 13 29 L 21 31" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 12 33 L 19 35" stroke="currentColor" strokeWidth="1.5" />

              {/* Moka Pot geometry */}
              <path d="M 32 15 L 64 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <circle cx="30" cy="11" r="3" />
              <path d="M 33 22 L 61 39" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <path d="M 35 20 L 63 38 L 47 62 L 21 44 Z" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="miter" fill="none" />
              <path d="M 21 44 C 11 46, 8 56, 15 62 L 18 58 C 13 54, 15 48, 21 46 Z" />
              <line x1="34" y1="53" x2="55" y2="50" stroke="currentColor" strokeWidth="2.5" />
              <path d="M 47 62 L 36 78 L 56 78 L 60 70 Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="miter" fill="none" />
              <circle cx="47" cy="70" r="2.5" />

              {/* Pouring stream into the logo */}
              <path d="M 62 37 Q 72 32, 75 42 C 77 50, 75 62, 85 64" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round" />

              {/* Vertical stacked "STREET COFFEE" */}
              <text x="65" y="72" fontSize="5.5" fontWeight="950" fontFamily="sans-serif" letterSpacing="0.1em" className="fill-stone-600 dark:fill-amber-300">STREET</text>
              <text x="65" y="78" fontSize="5.5" fontWeight="950" fontFamily="sans-serif" letterSpacing="0.1em" className="fill-stone-600 dark:fill-amber-300">COFFEE</text>

              {/* Giant Bold matching words "TAMPA SEDUH." */}
              <text x="90" y="44" fontSize="33" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-0.04em" className="fill-stone-900 dark:fill-white font-black">TAMPA</text>
              <text x="90" y="74" fontSize="33" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-0.04em" className="fill-stone-900 dark:fill-white font-black">SEDUH.</text>
            </svg>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-full hover:bg-amber-900/10 dark:hover:bg-white/5 text-amber-900 dark:text-amber-400 transition-colors cursor-pointer"
              aria-label="Toggle Dark Mode"
              id="theme-toggler"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsAdminLoginOpen(true)}
              className="p-2.5 rounded-full hover:bg-amber-900/10 dark:hover:bg-white/5 text-amber-900 dark:text-amber-400 transition-all cursor-pointer flex items-center gap-1 border border-amber-900/5"
              title="Admin Terminal Login"
              id="admin-login-button"
            >
              <LogIn className="w-5 h-5" />
              <span className="text-xs font-bold hidden sm:inline">Admin</span>
            </button>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section (Replicating Foto 1 Vibe & Structure) */}
      <section 
        id="hero-section" 
        className={`relative overflow-hidden py-12 lg:py-20 border-b transition-colors duration-300 ${
          darkMode 
            ? "bg-gradient-to-b from-zinc-950 via-[#1F140A]/95 to-zinc-950 border-amber-950/20 text-amber-50" 
            : "bg-[#F9F7F2] border-[#E8E2D9] text-stone-900"
        }`}
      >
        {/* Background Subtle elements */}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#8B5E3C] rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Column (Hero Content) */}
          <div className="lg:col-span-5 space-y-8 text-left">
            <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest leading-none ${
              darkMode 
                ? "bg-amber-900/30 border border-amber-550/20 text-amber-300"
                : "bg-white border border-[#E8E2D9] text-[#8B5E3C] shadow-sm animate-pulse"
            }`}>
              ✨ Premium Local Roastery
            </span>

            <div className="space-y-4">
              <h1 className="text-5xl sm:text-7xl font-serif font-black leading-[1.08] tracking-tight text-stone-950 dark:text-amber-50">
                Menikmati Kopi <br/>
                <span className="italic font-light text-[#8B5E3C] dark:text-amber-300">Tanpa Batas.</span>
              </h1>
              
              <p className="text-base sm:text-lg text-zinc-650 dark:text-stone-300 max-w-md leading-relaxed font-sans">
                Rasakan kehangatan biji kopi pilihan dari pegunungan Kotabunan, diseduh dengan hati untuk menemani harimu di tiap lintasan jalan Trans Sulawesi.
              </p>
            </div>

            {/* Micro-interactive quote block replicating the card on Foto 1 */}
            <motion.div 
              whileHover={{ scale: 1.02, rotate: -2 }}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer shadow-md rotate-[-1deg] relative max-w-md ${
                darkMode 
                  ? "bg-[#2A1B0E]/80 border-amber-900/40 text-amber-100" 
                  : "bg-white border-[#E8E2D9] text-stone-900"
              }`}
            >
              <span className="text-3xl font-serif text-[#8B5E3C] opacity-35 absolute -top-1 left-2">“</span>
              <p className="font-serif font-black text-sm uppercase tracking-wide px-5 text-center text-[#2D1B0D] dark:text-amber-100 italic leading-snug">
                "Mo Pulang Mar
                <br />
                Mo Suka Tamba Ulang"
              </p>
              <div className="mt-3 flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-5 pr-2">
                <span>- Quote Legendaris</span>
                <span className="text-[#8B5E3C] bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">Rasa Bersahaja</span>
              </div>
            </motion.div>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => setIsOrderPopupOpen(true)}
                className="px-8 py-4 bg-[#4B3621] hover:bg-[#322314] text-white rounded-full font-black shadow-lg shadow-[#4B3621]/20 cursor-pointer transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                id="btn-hero-order-sekarang"
              >
                Order Sekarang
              </button>
              <button
                onClick={() => scrollToId("menu-section")}
                className={`px-8 py-4 rounded-full font-black cursor-pointer transition-all border text-sm uppercase tracking-wider ${
                  darkMode 
                    ? "bg-white/5 border-zinc-700 text-amber-300 hover:bg-white/10" 
                    : "bg-white border-[#E8E2D9] text-[#4B3621] hover:bg-stone-50"
                }`}
                id="btn-hero-lihat-menu"
              >
                Lihat Menu
              </button>
            </div>
          </div>

          {/* Right Column (Absolute Stunning Interactive Replica of Foto 1) */}
          <div className="lg:col-span-7 flex justify-center items-center relative py-10 lg:py-0">
            {/* Visual background table slab container */}
            <div className="w-full max-w-xl h-[480px] rounded-[48px] bg-[#E8E2D9]/40 dark:bg-[#201409]/60 border border-[#E8E2D9]/80 dark:border-amber-955/40 p-8 flex flex-col justify-between overflow-hidden relative shadow-inner">
              
              {/* Scattered roasted coffee beans floating decor with real shadow */}
              <div className="absolute top-6 left-12 w-6 h-5 bg-[#3E2A17] rounded-full filter rotate-45 opacity-90 shadow-md transform hover:scale-110 cursor-pointer transition-all" title="Biji Kopi Kotabunan" />
              <div className="absolute top-1/2 left-8 w-5 h-4 bg-[#2D1B0D] rounded-full filter -rotate-12 opacity-85 shadow-md transform hover:scale-115 cursor-pointer transition-all" />
              <div className="absolute bottom-12 right-20 w-6 h-4 bg-[#3E2A17] rounded-full filter rotate-12 opacity-95 shadow-md transform hover:scale-110 cursor-pointer transition-all" />
              
              {/* Cup Carrier tray & Dual Paper Cups Layout mockup exactly from Foto 1 */}
              <div className="relative w-full h-full flex items-center justify-center gap-4 pt-10">
                
                {/* 1. Iced Paper Cup in Molded Carton Holder Basket */}
                <div className="relative z-10 flex flex-col items-center">
                  
                  {/* Textured pulp molded carrier basket bottom */}
                  <div className="absolute bottom-[-10px] w-36 h-14 bg-[#C2B6A3]/80 rounded-b-2xl border-t border-[#A89582] shadow-lg flex justify-around px-3 items-center text-[10px] font-serif italic text-stone-600">
                    <span className="opacity-40">Original Carrier</span>
                  </div>

                  {/* High Quality Paper Cup Body (Left, Iced, in tray) */}
                  <motion.div 
                    whileHover={{ y: -8 }}
                    className="w-32 h-44 bg-white rounded-b-2xl rounded-t-lg shadow-2xl flex flex-col justify-between p-3.5 relative overflow-hidden border border-zinc-200"
                  >
                    {/* Pouring/iced details - transparent cover & straw */}
                    <div className="absolute top-0 inset-x-0 h-4 bg-[#A89582]/30 backdrop-blur-xs flex items-center justify-center overflow-hidden">
                      <div className="w-2.5 h-12 bg-amber-900 border-r border-[#4B3621]/40 rounded-full rotate-12 absolute -top-4 right-1/4" />
                    </div>

                    {/* Moka Cup Logo block */}
                    <div className="text-center mt-2">
                      <div className="flex justify-center mb-1">
                        <svg className="w-5 h-5 text-stone-800" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 4h12l-2 10H8L6 4zm13 2h2v4h-2V6z" />
                        </svg>
                      </div>
                      <span className="text-[6px] uppercase tracking-widest font-black leading-none text-zinc-500 block">STREET COFFEE</span>
                    </div>

                    {/* Bold Cup Logo Text (matching cups in Foto 1 exactly) */}
                    <div className="text-center my-1">
                      <span className="font-serif font-black text-[#2D1B0D] leading-none text-xl block tracking-tighter">TAMPA</span>
                      <span className="font-serif font-black text-[#2D1B0D] leading-none text-xl block tracking-tighter mt-[-2px]">SEDUH.</span>
                    </div>

                    {/* Quote text written in tiny letters in paper cup style */}
                    <div className="text-center font-serif text-[6px] font-bold text-stone-700 italic border-t border-zinc-200 pt-1">
                      “MO PULANG MAR MO SUKA TAMBA ULANG”
                    </div>
                  </motion.div>
                </div>

                {/* 2. Hot Paper Cup (with Black Lid, resting on a wooden slab) */}
                <div className="relative z-20 flex flex-col items-center pt-8">
                  
                  {/* Thick Wood stand element */}
                  <div className="absolute bottom-[-12px] w-32 h-7 bg-[#8B5E3C]/80 rounded border-b-2 border-stone-800 shadow-md" />

                  {/* Cup element */}
                  <motion.div 
                    whileHover={{ y: -8 }}
                    className="w-28 h-36 bg-[#F2EDE4] dark:bg-stone-100 rounded-b-xl rounded-t-sm shadow-xl flex flex-col justify-between p-3 relative overflow-hidden text-stone-900 border border-zinc-300"
                  >
                    {/* Black cup lid (Foto 1) */}
                    <div className="absolute top-0 inset-x-0 h-3.5 bg-zinc-900 border-b border-black rounded-t flex justify-center items-center">
                      <div className="w-8 h-1 bg-zinc-800 rounded-full" />
                    </div>

                    {/* Logo & cursive */}
                    <div className="text-center mt-3">
                      <span className="text-[5px] uppercase tracking-[0.25em] font-black leading-none text-[#8B5E3C] block">STREET COFFEE</span>
                    </div>

                    <div className="text-center my-0.5">
                      <span className="font-serif font-black text-[#4B3621] leading-none text-base block tracking-tight">TAMPA</span>
                      <span className="font-serif font-black text-[#4B3621] leading-none text-base block tracking-tight mt-[-2px]">SEDUH.</span>
                    </div>

                    {/* Bottom ripple design (chocolate wave print) as in Foto 1 */}
                    <div className="h-6 w-full bg-[#4B3621] rounded-b-md flex justify-center items-center">
                      <span className="text-[6px] font-mono text-zinc-100 uppercase tracking-widest font-black">Hot Blend</span>
                    </div>
                  </motion.div>
                </div>

              </div>

              {/* Index Card overlay foreground mimicking typewriter layout of Foto 1 */}
              <div className="absolute bottom-4 left-4 z-30 transform rotate-[-4deg] scale-95 origin-bottom-left max-w-[210px]">
                <div className="bg-[#FFFDF9] rounded-xl p-4 shadow-xl border border-[#E8E2D9] flex flex-col space-y-2 text-stone-950">
                  <span className="text-xl font-bold font-serif leading-none text-[#8B5E3C]">“</span>
                  <p className="text-[9px] font-serif font-bold uppercase tracking-wide leading-tight text-center">
                    “MO PULANG MAR <br />
                    MO SUKA TAMBA ULANG”
                  </p>
                </div>
              </div>

              {/* Circular Coaster Stamp next to it (Foto 1 foreground) */}
              <div className="absolute bottom-3 right-6 z-30 transform rotate-[15deg] scale-90">
                <div className="w-16 h-16 rounded-full bg-[#4B3621] border border-[#2D1B0D] flex flex-col justify-center items-center text-center text-white shadow-lg cursor-pointer hover:bg-stone-900 transition-colors">
                  <span className="text-[6px] font-serif font-black tracking-widest leading-none block">TAMPA</span>
                  <span className="text-[6px] font-serif font-black tracking-widest leading-none block mt-0.5">SEDUH.</span>
                  <span className="text-[4px] uppercase tracking-normal opacity-50 block mt-1">100% Original</span>
                </div>
              </div>

            </div>
          </div>

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
                  <span className="text-[8px] uppercase tracking-[0.18em] font-extrabold text-[#8B5E3C] dark:text-amber-400">STREET COFFEE EST. 2026</span>
                </div>
              </div>
            </div>

            {/* Ice Menu Grid: 2 Columns styled identically to Foto 2 layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#E8E2D9] dark:bg-zinc-800 rounded-2xl overflow-hidden border border-[#E8E2D9] dark:border-zinc-800">
              {menuItems
                .filter((item) => !item.isHot) // Ice/Cold items
                .map((item) => {
                  const isInCartReg = cart.some(e => e.item.id === item.id && e.size === "R");
                  const isInCartLrg = cart.some(e => e.item.id === item.id && e.size === "L");

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
                                addToCart(item, "R");
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
                              <span className="opacity-75">R |</span>
                              <span className="font-extrabold">{item.priceReg} K</span>
                              {isInCartReg ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </button>
                            {isInCartReg && (
                              <button 
                                onClick={() => removeFromCart(item, "R")}
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
                                  addToCart(item, "L");
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
                                <span className="opacity-75">L |</span>
                                <span className="font-extrabold">{item.priceLarge} K</span>
                                {isInCartLrg ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              </button>
                              {isInCartLrg && (
                                <button 
                                  onClick={() => removeFromCart(item, "L")}
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
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
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
                  const isInCartReg = cart.some(e => e.item.id === item.id && e.size === "R");
                  const isInCartLrg = cart.some(e => e.item.id === item.id && e.size === "L");

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
                                addToCart(item, "R");
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
                              <span className="font-extrabold">{item.priceReg} K</span>
                              {isInCartReg ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </button>
                            {isInCartReg && (
                              <button 
                                onClick={() => removeFromCart(item, "R")}
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
                                  addToCart(item, "L");
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
                                <span className="opacity-75">L |</span>
                                <span className="font-extrabold">{item.priceLarge} K</span>
                                {isInCartLrg ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              </button>
                              {isInCartLrg && (
                                <button 
                                  onClick={() => removeFromCart(item, "L")}
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
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
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
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-amber-955 dark:text-amber-50">Karakter & Profil Seduhan Liberica</h2>
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
      <CoffeeNews />

      {/* 6. FAQ Section */}
      <section id="faq-section" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 border-t border-amber-900/5">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest bg-amber-900/5 dark:bg-amber-400/10 px-3 py-1 rounded-full">Pertanyaan Sering Diutarakan</span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-amber-955 dark:text-amber-100 italic tracking-tight">Tanya & Jawab Tampa Seduh</h2>
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
              <span>Sabtu - Jumat: Pukul 10.00 WITA - 23.00 WITA</span>
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
            </ul>
          </div>

          {/* Location details */}
          <div className="space-y-4 col-span-1">
            <h4 className="font-serif font-bold text-sm uppercase tracking-widest text-amber-400">Alamat Kedai</h4>
            <div className="flex gap-2.5 text-xs text-amber-100/90 font-medium">
              <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white">Jl. Tangkudeagan No. 2 Kotabunan Selatan</strong>
                <span>Kec. Kotabunan, Kabupaten Bolaang Mongondow Timur, Trans Sulawesi Lingkar Selatan.</span>
              </div>
            </div>
          </div>

        </div>

        {/* Brand attribution copyright */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col sm:flex-row justify-between items-center text-[11px] text-amber-250/50">
          <span>&copy; {new Date().getFullYear()} Tampa Seduh Street Coffee Boltim. All Rights Reserved.</span>
          <span className="opacity-80">Berdikari Bersama Komunitas Petani Kopi Lokal Kotabunan Malalayang.</span>
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
      <OrderPopup
        isOpen={isOrderPopupOpen}
        onClose={() => setIsOrderPopupOpen(false)}
        cart={cart}
        clearCart={clearCart}
        onSuccess={(id) => {
          setOrderNotification(`Pesanan sukses terkirim dengan ID ${id}!`);
          setTimeout(() => setOrderNotification(null), 5000);
        }}
      />

      {/* Floating AI chat assistant */}
      <AiChatWidget />

      {/* Admin Login Dialog Drawer Portal */}
      <AnimatePresence>
        {isAdminLoginOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-904 px-6 py-6 rounded-2xl shadow-2xl border border-amber-900/10 text-zinc-900 dark:text-zinc-100 bg-neutral-50 dark:bg-zinc-900"
            >
              <div className="flex justify-between items-center border-b pb-3 border-zinc-100 dark:border-zinc-800">
                <h4 className="font-serif font-bold text-base text-amber-955 dark:text-amber-50">Otorisasi Admin Kedai</h4>
                <button
                  onClick={() => {
                    setIsAdminLoginOpen(false);
                    setLoginError("");
                  }}
                  className="text-zinc-405 hover:text-zinc-600 cursor-pointer"
                  id="btn-close-admin-login"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdminLogin} className="mt-4 space-y-4">
                <div className="bg-amber-900/5 dark:bg-white/5 p-3 rounded-xl border text-[11px] leading-relaxed text-zinc-650 dark:text-zinc-400 mb-2">
                  🔐 <strong>Hak Akses Demo:</strong> Ketik password <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded font-bold font-mono">admin</code> atau <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded font-bold font-mono">tampaseduh</code> untuk masuk ke Admin Dashboard.
                </div>

                {loginError && (
                  <p className="text-xs text-red-600 bg-red-100 p-2 rounded-xl border border-red-200">{loginError}</p>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Masukan Pin Otorisasi</label>
                  <input
                    type="password"
                    placeholder="E.g., tampaseduh"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-805 text-sm rounded-xl border border-zinc-200 dark:border-zinc-750 focus:outline-none"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-900 hover:bg-amber-800 text-amber-50 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-all shadow"
                  id="btn-confirm-admin-login"
                >
                  Masuk Terminal Admin
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
