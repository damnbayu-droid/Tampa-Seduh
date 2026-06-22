import React, { useState, useEffect } from "react";
import { X, ShoppingBag, Send, CheckCircle2, Truck, Store, Plus, Minus, Coffee, Package, Info, ChevronDown, Upload, CreditCard, Loader2, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CartItem, MenuItem, CoffeePackage, OrderItem, User } from "../types";

import { getApiUrl, safeParseJson } from "../lib/api";
import { supabase } from "../lib/supabase";

interface OrderPopupProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  clearCart: () => void;
  onSuccess: (orderId: string) => void;
  currentUser: User | null;
  menuItems: MenuItem[];
  packages: CoffeePackage[];
  addToCart: (item: MenuItem | CoffeePackage, size: "R" | "L" | "Default", isPackage: boolean) => void;
  removeFromCart: (itemId: string, size: "R" | "L" | "Default") => void;
}

// Delivery zones
const DELIVERY_ZONES = [
  { label: "Pilih Area Pengantaran...", value: "", cost: 0 },
  { label: "Kotabunan & Bulawan — 5K", value: "kotabunan", cost: 5 },
  { label: "Panang — 10K", value: "panang", cost: 10 },
  { label: "Paret — 10K", value: "paret", cost: 10 },
  { label: "Kec. Tutuyan & Buyat — 15K", value: "tutuyan", cost: 15 },
];

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mwvdevlj";

export default function OrderPopup({
  isOpen,
  onClose,
  cart,
  clearCart,
  onSuccess,
  currentUser,
  menuItems,
  packages,
  addToCart,
  removeFromCart
}: OrderPopupProps) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [selectedZone, setSelectedZone] = useState("");
  const [notes, setNotes] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedId, setGeneratedId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  const [isPaying, setIsPaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  
  // Tab state: "cart" | "menu" | "packages"
  const [activeTab, setActiveTab] = useState<"cart" | "menu" | "packages">("cart");
  
  // Mini delivery info popup
  const [showDeliveryInfo, setShowDeliveryInfo] = useState(false);

  // Pre-fill user details if logged in
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
    } else {
      setName("");
      setEmail("");
      setWhatsapp("");
      setAddress("");
    }
  }, [currentUser, isOpen]);

  // Show delivery popup when popup opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowDeliveryInfo(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-dismiss delivery info after 8 seconds
  useEffect(() => {
    if (showDeliveryInfo) {
      const timer = setTimeout(() => setShowDeliveryInfo(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showDeliveryInfo]);

  const subtotal = cart.reduce((sum, entry) => sum + (entry.price * entry.quantity), 0);
  const isMember = currentUser?.isMember || false;
  const zoneObj = DELIVERY_ZONES.find(z => z.value === selectedZone);
  const rawShippingCost = deliveryMethod === "delivery" ? (zoneObj?.cost || 0) : 0;
  const shippingDiscount = isMember && deliveryMethod === "delivery" ? Math.round(rawShippingCost * 0.25) : 0;
  const shippingCost = rawShippingCost - shippingDiscount;
  const totalCost = subtotal + shippingCost;

  const forwardToFormspree = async (orderId: string) => {
    try {
      const itemSummary = cart.map(c => `${c.name} (${c.size}) x${c.quantity} = Rp ${c.price * c.quantity}.000`).join("; ");
      await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _subject: `🛒 Order Baru Tampa Seduh #${orderId}`,
          order_id: orderId,
          customer_name: name,
          whatsapp,
          email: email || "-",
          delivery_method: deliveryMethod === "delivery" ? `Delivery — ${zoneObj?.label || ""}` : "Ambil Sendiri",
          address: deliveryMethod === "pickup" ? "Ambil di Kedai" : address,
          items: itemSummary,
          subtotal: `Rp ${subtotal}.000`,
          ongkir: `Rp ${rawShippingCost}.000`,
          diskon_ongkir: isMember ? `Rp ${shippingDiscount}.000 (Member -25%)` : "-",
          total: `Rp ${totalCost}.000`,
          payment_proof: paymentProofUrl || "-",
          notes: notes || "-",
          timestamp: new Date().toLocaleString("id-ID", { timeZone: "Asia/Makassar" })
        })
      });
    } catch {
      console.warn("Formspree forward gagal - non-critical");
    }
  };

  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage("");

    const uploadDirectToSupabase = async (fileObj: File) => {
      try {
        if (!supabase || !supabase.storage) {
          throw new Error("Penyimpanan cloud database Supabase tidak terhubung.");
        }
        const uniqueFileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}-${fileObj.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { error: uploadErr } = await supabase.storage
          .from("Bukti Bayar")
          .upload(uniqueFileName, fileObj, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadErr) throw uploadErr;

        const { data: publicUrlData } = supabase.storage
          .from("Bukti Bayar")
          .getPublicUrl(uniqueFileName);

        setPaymentProofUrl(publicUrlData.publicUrl);
      } catch (err: any) {
        setErrorMessage(err.message || "Gagal mengunggah bukti bayar.");
      } finally {
        setIsUploading(false);
      }
    };

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const response = await fetch(getApiUrl("/api/orders/upload-proof"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data: reader.result,
            fileName: file.name,
            fileType: file.type
          })
        });
        const data = await safeParseJson(response);
        if (!response.ok) {
          throw new Error(data.error || "Gagal mengunggah bukti bayar");
        }
        setPaymentProofUrl(data.publicUrl);
        setIsUploading(false);
      } catch (err: any) {
        console.warn("Gagal upload bukti bayar via API, mencoba langsung ke Supabase Storage...", err.message);
        uploadDirectToSupabase(file);
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsPaying(false);
    setIsUploading(false);
    setPaymentProofUrl("");

    if (!name.trim()) return setErrorMessage("Nama lengkap harus diisi");
    if (!whatsapp.trim()) return setErrorMessage("Nomor Whatsapp harus diisi");
    if (deliveryMethod === "delivery" && !address.trim()) return setErrorMessage("Alamat pengantaran harus diisi");
    if (deliveryMethod === "delivery" && !selectedZone) return setErrorMessage("Pilih area pengantaran terlebih dahulu kawan");
    if (cart.length === 0) return setErrorMessage("Keranjang belanja Anda masih kosong!");
    if (!paymentProofUrl) return setErrorMessage("Harap unggah bukti pembayaran QRIS terlebih dahulu kawan.");

    setIsSubmitting(true);

    
    const orderItems: OrderItem[] = cart.map(entry => ({
      menuId: entry.id,
      name: entry.name,
      quantity: entry.quantity,
      size: entry.size,
      price: entry.price,
      isPackage: entry.isPackage
    }));

    let orderSuccess = false;
    let newOrderId = "ORD-" + Math.floor(1000 + Math.random() * 9000);

    try {
      const response = await fetch(getApiUrl("/api/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          whatsapp,
          email: email || "-",
          address: deliveryMethod === "pickup" ? "Ambil di Kedai (Kotabunan)" : address,
          items: orderItems,
          subtotal,
          shippingCost: rawShippingCost,
          deliveryMethod,
          notes,
          paymentProofUrl
        })
      });

      const data = await safeParseJson(response);
      if (response.ok) {
        newOrderId = data.id;
        orderSuccess = true;
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.warn("Backend API tidak merespons, mencoba menulis order langsung ke Supabase...", err.message);
    }

    if (!orderSuccess) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://yizsanjcyphlbtjcwzxl.supabase.co";
        if (supabaseUrl) {
          const { error: sbErr } = await supabase.from("orders").insert({
            id: newOrderId,
            customer_name: name,
            whatsapp: whatsapp,
            email: email || "-",
            address: deliveryMethod === "pickup" ? "Ambil di Kedai (Kotabunan)" : address,
            items: orderItems,
            total: subtotal + rawShippingCost,
            status: "pending",
            delivery_method: deliveryMethod,
            subtotal: subtotal,
            shipping_cost: rawShippingCost,
            notes: notes,
            payment_proof_url: paymentProofUrl
          });
          if (sbErr) throw sbErr;
          orderSuccess = true;
        } else {
          throw new Error("Koneksi database offline / Supabase URL tidak diset.");
        }
      } catch (sbErr: any) {
        setErrorMessage(sbErr.message || "Gagal mengirim pesanan langsung ke database.");
        setIsSubmitting(false);
        return;
      }
    }

    if (orderSuccess) {
      setGeneratedId(newOrderId);
      await forwardToFormspree(newOrderId);
      setIsSuccess(true);
      clearCart();
      onSuccess(newOrderId);
      setIsSubmitting(false);
    }
  };


  const handleClose = () => {
    setIsSuccess(false);
    setName("");
    setWhatsapp("");
    setEmail("");
    setAddress("");
    setNotes("");
    setSelectedZone("");
    setErrorMessage("");
    setActiveTab("cart");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
      {/* Delivery Info Mini Popup */}
      {showDeliveryInfo && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          className="fixed top-20 right-4 z-[60] max-w-xs bg-amber-900 text-amber-50 p-4 rounded-2xl shadow-2xl border border-amber-700/40"
        >
          <button
            onClick={() => setShowDeliveryInfo(false)}
            className="absolute top-2 right-2 text-amber-200 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-start gap-2.5 pr-4">
            <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-200 mb-1">Info Pengantaran</p>
              <p className="text-[11px] leading-relaxed text-amber-100">
                Pengantaran dilakukan setelah <strong>pembayaran terkonfirmasi</strong> atau untuk user yang <strong>sudah dikenal</strong> oleh barista Tampa Seduh. 🚴
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-2xl overflow-hidden bg-amber-50 dark:bg-zinc-900 border border-amber-900/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
        >
          {/* Header Banner */}
          <div className="p-5 bg-gradient-to-r from-amber-900 to-amber-950 text-amber-50 flex justify-between items-center relative shrink-0">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-amber-300" />
              <div>
                <h3 className="font-serif font-bold text-lg tracking-wide">Order Sekarang</h3>
                <p className="text-xs text-amber-200/80">Pilih menu & lengkapi data pengiriman</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-full text-amber-200 hover:bg-white/10 transition-colors cursor-pointer"
              id="btn-close-order-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-amber-900/10 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
            {[
              { id: "cart", label: `Keranjang (${cart.reduce((s, i) => s + i.quantity, 0)})` },
              { id: "menu", label: "Pilih Menu" },
              { id: "packages", label: "Paket" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                  activeTab === tab.id
                    ? "border-amber-900 text-amber-900 dark:text-amber-400 dark:border-amber-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ===== TAB: Menu Selection ===== */}
            {activeTab === "menu" && (
              <div className="p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Menu Tersedia — Klik untuk tambah ke keranjang</p>
                <div className="grid grid-cols-1 gap-2">
                  {menuItems.filter(m => m.isAvailable).map(item => {
                    const cartR = cart.find(c => c.id === item.id && c.size === "R");
                    const cartL = cart.find(c => c.id === item.id && c.size === "L");
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-stone-100 dark:bg-zinc-700">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                          <p className="text-[10px] text-zinc-400">{item.isHot ? "☕ Panas" : "🧊 Dingin"}</p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0 items-end">
                          {/* Regular size */}
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">R {item.priceReg}K</span>
                            {cartR ? (
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => removeFromCart(item.id, "R")} className="w-5 h-5 rounded-full bg-amber-900 text-white flex items-center justify-center cursor-pointer hover:bg-amber-800">
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="text-xs font-bold text-amber-900 dark:text-amber-400 w-4 text-center">{cartR.quantity}</span>
                                <button type="button" onClick={() => addToCart(item, "R", false)} className="w-5 h-5 rounded-full bg-amber-900 text-white flex items-center justify-center cursor-pointer hover:bg-amber-800">
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => addToCart(item, "R", false)} className="w-6 h-6 rounded-full bg-amber-900/15 dark:bg-amber-400/15 text-amber-900 dark:text-amber-400 flex items-center justify-center cursor-pointer hover:bg-amber-900/30 transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {/* Large size (if available) */}
                          {item.priceLarge && (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">L {item.priceLarge}K</span>
                              {cartL ? (
                                <div className="flex items-center gap-1">
                                  <button type="button" onClick={() => removeFromCart(item.id, "L")} className="w-5 h-5 rounded-full bg-amber-900 text-white flex items-center justify-center cursor-pointer hover:bg-amber-800">
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="text-xs font-bold text-amber-900 dark:text-amber-400 w-4 text-center">{cartL.quantity}</span>
                                  <button type="button" onClick={() => addToCart(item, "L", false)} className="w-5 h-5 rounded-full bg-amber-900 text-white flex items-center justify-center cursor-pointer hover:bg-amber-800">
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <button type="button" onClick={() => addToCart(item, "L", false)} className="w-6 h-6 rounded-full bg-amber-900/15 dark:bg-amber-400/15 text-amber-900 dark:text-amber-400 flex items-center justify-center cursor-pointer hover:bg-amber-900/30 transition-colors">
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("cart")}
                    className="w-full mt-3 py-2.5 bg-amber-900 hover:bg-amber-800 text-amber-50 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    Lanjut ke Checkout ({cart.reduce((s, i) => s + i.quantity, 0)} item)
                  </button>
                )}
              </div>
            )}

            {/* ===== TAB: Packages ===== */}
            {activeTab === "packages" && (
              <div className="p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Paket Tersedia</p>
                {packages.map(pkg => {
                  const cartPkg = cart.find(c => c.id === pkg.id && c.size === "Default");
                  return (
                    <div key={pkg.id} className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
                      <div className="flex justify-between items-start">
                        <div className="flex-grow min-w-0 pr-3">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{pkg.name}</p>
                            {pkg.badge && <span className="text-[8px] font-bold bg-amber-900/10 text-amber-900 dark:text-amber-400 px-1.5 py-0.5 rounded-full uppercase">{pkg.badge}</span>}
                          </div>
                          <p className="text-[10px] text-zinc-400">{pkg.items?.join(", ")}</p>
                          <p className="text-xs font-bold text-amber-900 dark:text-amber-400 mt-1">{pkg.price}K</p>
                        </div>
                        {cartPkg ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button type="button" onClick={() => removeFromCart(pkg.id, "Default")} className="w-6 h-6 rounded-full bg-amber-900 text-white flex items-center justify-center cursor-pointer hover:bg-amber-800">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-bold text-amber-900 dark:text-amber-400 w-5 text-center">{cartPkg.quantity}</span>
                            <button type="button" onClick={() => addToCart(pkg, "Default", true)} className="w-6 h-6 rounded-full bg-amber-900 text-white flex items-center justify-center cursor-pointer hover:bg-amber-800">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => addToCart(pkg, "Default", true)} className="flex items-center gap-1 px-3 py-1.5 bg-amber-900/10 dark:bg-amber-400/10 text-amber-900 dark:text-amber-400 rounded-lg text-xs font-bold cursor-pointer hover:bg-amber-900/20 transition-colors shrink-0">
                            <Plus className="w-3 h-3" />
                            Tambah
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("cart")}
                    className="w-full mt-3 py-2.5 bg-amber-900 hover:bg-amber-800 text-amber-50 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    Lanjut ke Checkout ({cart.reduce((s, i) => s + i.quantity, 0)} item)
                  </button>
                )}
              </div>
            )}

            {/* ===== TAB: Cart + Checkout Form ===== */}
            {activeTab === "cart" && (
              <div className="p-5 space-y-5">
                {isSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8 space-y-4"
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 mb-2">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h4 className="font-serif font-bold text-2xl text-amber-900 dark:text-amber-100">Pesanan Diterima!</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto">
                      Terima kasih, kawan <strong className="text-amber-800 dark:text-amber-400">{name}</strong>. Pesanan Anda dengan nomor ID 
                      <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 px-2 py-1 rounded font-mono font-bold mx-2">{generatedId}</span>
                      telah tersimpan dan diteruskan ke Barista Tampa Seduh via WhatsApp.
                    </p>
                    <div className="bg-amber-900/5 dark:bg-white/5 p-4 rounded-xl text-left border border-amber-900/10 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      <p><strong>Alamat:</strong> {deliveryMethod === "pickup" ? "Ambil Sendiri di Kedai" : address}</p>
                      <p><strong>Whatsapp:</strong> {whatsapp}</p>
                      <p><strong>Metode:</strong> {deliveryMethod === "delivery" ? `Delivery — ${zoneObj?.label || ""}` : "Pickup"}</p>
                      <p><strong>Total:</strong> Rp {totalCost}.000 (COD / QRIS)</p>
                    </div>
                    <button onClick={handleClose} className="w-full bg-amber-900 hover:bg-amber-800 text-amber-50 font-bold py-3 px-4 rounded-xl transition-all shadow cursor-pointer" id="btn-close-success">
                      Selesai
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Cart Overview with +/- controls */}
                    <div className="bg-amber-900/5 dark:bg-white/5 p-4 rounded-xl border border-amber-900/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider">Ringkasan Pesanan</span>
                        <button type="button" onClick={() => setActiveTab("menu")} className="text-[10px] font-bold text-amber-800 dark:text-amber-400 hover:underline cursor-pointer">+ Tambah Menu</button>
                      </div>
                      {cart.length === 0 ? (
                        <div className="text-center py-4 space-y-2">
                          <p className="text-sm text-amber-900/60 dark:text-zinc-400">Belum ada item kopi yang dipilih.</p>
                          <button type="button" onClick={() => setActiveTab("menu")} className="text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline cursor-pointer">Klik disini untuk pilih menu →</button>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                          {cart.map((entry, index) => (
                            <div key={index} className="flex justify-between items-center text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700">
                              <div>
                                <span className="font-medium text-xs">{entry.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/10 dark:bg-amber-400/20 text-amber-900 dark:text-amber-300 font-bold font-mono ml-1.5">{entry.size}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => removeFromCart(entry.id, entry.size as any)} className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center cursor-pointer hover:bg-amber-900/20 transition-colors">
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="font-bold text-xs w-4 text-center">{entry.quantity}</span>
                                <button type="button" onClick={() => addToCart(
                                  { id: entry.id, name: entry.name, priceReg: entry.price, priceLarge: undefined, isHot: false, isAvailable: true, image: entry.image || "", description: "" },
                                  entry.size as "R" | "L" | "Default", entry.isPackage
                                )} className="w-5 h-5 rounded-full bg-amber-900 text-white flex items-center justify-center cursor-pointer hover:bg-amber-800 transition-colors">
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                                <span className="font-mono text-xs text-amber-900 dark:text-amber-400 w-16 text-right">{entry.price * entry.quantity}K</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Delivery Method Selector */}
                      <div className="pt-2 border-t border-amber-900/10 dark:border-zinc-800 space-y-2 text-xs">
                        <span className="font-bold text-amber-900 dark:text-amber-400 block mb-1">Metode Pengantaran</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setDeliveryMethod("delivery")} className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${deliveryMethod === "delivery" ? "bg-amber-900 border-amber-950 text-white shadow-sm" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"}`}>
                            <Truck className="w-4 h-4" />
                            Kirim Kurir
                          </button>
                          <button type="button" onClick={() => { setDeliveryMethod("pickup"); setSelectedZone(""); }} className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${deliveryMethod === "pickup" ? "bg-amber-900 border-amber-950 text-white shadow-sm" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"}`}>
                            <Store className="w-4 h-4" />
                            Ambil di Kedai
                          </button>
                        </div>

                        {/* Zone Selector */}
                        {deliveryMethod === "delivery" && (
                          <select
                            value={selectedZone}
                            onChange={(e) => setSelectedZone(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none text-zinc-900 dark:text-zinc-100 font-sans"
                          >
                            {DELIVERY_ZONES.map(zone => (
                              <option key={zone.value} value={zone.value}>{zone.label}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Cost breakdown */}
                      <div className="pt-2 border-t border-amber-900/10 dark:border-zinc-800 text-xs space-y-1.5 text-zinc-600 dark:text-zinc-400">
                        <div className="flex justify-between">
                          <span>Subtotal Item:</span>
                          <span className="font-mono">{subtotal}.000 K</span>
                        </div>
                        {deliveryMethod === "delivery" && (
                          <div className="flex justify-between items-center">
                            <span>Ongkir {zoneObj?.label?.split("—")[0]?.trim() || ""}:</span>
                            <div className="flex items-center gap-1">
                              {isMember && rawShippingCost > 0 ? (
                                <>
                                  <span className="line-through text-zinc-400 font-mono">{rawShippingCost}K</span>
                                  <span className="text-amber-600 dark:text-amber-400 font-bold font-mono">{shippingCost}K</span>
                                  <span className="text-[8px] font-bold text-amber-900 dark:text-amber-400 bg-amber-900/10 px-1 rounded">-25%</span>
                                </>
                              ) : (
                                <span className="font-mono">{rawShippingCost > 0 ? `${rawShippingCost}K` : "—"}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-amber-900/10 dark:border-zinc-700 flex justify-between items-center font-bold text-amber-950 dark:text-amber-100">
                        <span>Total Bayar (COD / QRIS):</span>
                        <span className="font-mono text-lg text-amber-800 dark:text-amber-400">Rp {totalCost}.000</span>
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="p-3 text-xs bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 rounded-xl">
                        {errorMessage}
                      </div>
                    )}

                    {/* Inputs */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                        <input type="text" className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 font-sans" placeholder="Masukkan nama kawan..." value={name} onChange={(e) => setName(e.target.value)} required />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider mb-1.5">No. Whatsapp (Aktif)</label>
                          <input type="tel" className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 font-sans" placeholder="Contoh: 085696224448" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider mb-1.5">Email (Opsional)</label>
                          <input type="email" className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 font-sans" placeholder="kopi@tampaseduh.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                      </div>

                      {deliveryMethod === "delivery" && (
                        <div>
                          <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider mb-1.5">Alamat Pengantaran Lengkap</label>
                          <textarea rows={2} className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 font-sans" placeholder="Tuliskan alamat pengantaran lengkap kawan..." value={address} onChange={(e) => setAddress(e.target.value)} required />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider mb-1.5">Catatan Pesanan (Opsional)</label>
                        <input type="text" className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 font-sans" placeholder="Contoh: Es batu dipisah / Saraba manis sedang kawan..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                      </div>
                    </div>


                    {/* QRIS Payment Section */}
                    <div className="p-4 bg-amber-900/5 dark:bg-white/5 rounded-2xl border border-amber-900/10 dark:border-zinc-800 space-y-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-amber-500" />
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-100 uppercase tracking-wider">Pembayaran QRIS</span>
                      </div>
                      
                      {!isPaying ? (
                        <button
                          type="button"
                          onClick={() => setIsPaying(true)}
                          className="w-full py-3 bg-[#8B5E3C] hover:bg-[#734F32] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow"
                        >
                          Bayar Sekarang (Tampilkan QRIS)
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4 pt-2 flex flex-col items-center"
                        >
                          <div className="bg-white p-3 rounded-2xl border-2 border-[#8B5E3C] shadow-md max-w-[200px] relative overflow-hidden">
                            <img 
                              src="/qris_tampa_seduh.png" 
                              alt="QRIS Tampa Seduh" 
                              className="w-full h-auto object-contain rounded-lg"
                            />
                          </div>

                          <div className="w-full">
                            <input
                              type="file"
                              id="payment-proof-upload-popup"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFileUpload}
                              disabled={isUploading || isSubmitting}
                            />

                            {!paymentProofUrl ? (
                              <label
                                htmlFor="payment-proof-upload-popup"
                                className={`w-full py-3.5 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
                              >
                                {isUploading ? (
                                  <>
                                    <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                                    <span className="text-[11px] font-bold tracking-wider">Mengunggah...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-6 h-6 text-[#8B5E3C]" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Unggah Bukti Bayar</span>
                                  </>
                                )}
                              </label>
                            ) : (
                              <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-center space-y-2">
                                <div className="flex items-center justify-center gap-2 text-green-600 font-bold text-xs">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Bukti Terunggah! ✓</span>
                                </div>
                                <label
                                  htmlFor="payment-proof-upload-popup"
                                  className="text-[10px] font-bold text-amber-800 hover:underline cursor-pointer"
                                >
                                  Ganti Bukti
                                </label>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || cart.length === 0 || !paymentProofUrl}
                      className="w-full mt-2 bg-gradient-to-r from-amber-800 to-amber-950 hover:from-amber-900 hover:to-black text-amber-50 font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed text-xs uppercase tracking-wider"
                      id="btn-submit-order"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                          Memproses Pesanan...
                        </span>
                      ) : (
                        <>
                          <Send className="w-5 h-5 text-amber-300" />
                          Bayar Sekarang via QRIS
                        </>
                      )}
                    </button>

                  </form>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
        </>
      )}
    </AnimatePresence>
  );
}
