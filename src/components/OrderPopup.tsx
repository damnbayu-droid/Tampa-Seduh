import React, { useState, useEffect } from "react";
import { X, ShoppingBag, Send, CheckCircle2, Truck, Store, Plus, Minus, Coffee, Package, Info, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CartItem, MenuItem, CoffeePackage, OrderItem, User } from "../types";

import { getApiUrl } from "../lib/api";

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
          notes: notes || "-",
          timestamp: new Date().toLocaleString("id-ID", { timeZone: "Asia/Makassar" })
        })
      });
    } catch {
      console.warn("Formspree forward gagal - non-critical");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) return setErrorMessage("Nama lengkap harus diisi");
    if (!whatsapp.trim()) return setErrorMessage("Nomor Whatsapp harus diisi");
    if (deliveryMethod === "delivery" && !address.trim()) return setErrorMessage("Alamat pengantaran harus diisi");
    if (deliveryMethod === "delivery" && !selectedZone) return setErrorMessage("Pilih area pengantaran terlebih dahulu kawan");
    if (cart.length === 0) return setErrorMessage("Keranjang belanja Anda masih kosong!");

    setIsSubmitting(true);

    const orderItems: OrderItem[] = cart.map(entry => ({
      menuId: entry.id,
      name: entry.name,
      quantity: entry.quantity,
      size: entry.size,
      price: entry.price,
      isPackage: entry.isPackage
    }));
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
          notes
        })
      });

      if (!response.ok) {
        throw new Error("Gagal mengirim pesanan ke server");
      }

      const data = await response.json();
      setGeneratedId(data.id);
      
      // Forward to Formspree for email notification
      await forwardToFormspree(data.id);

      // WhatsApp notification to barista
      const phone = "6285696224448";
      const itemSummary = cart.map(c => `- ${c.name} (${c.size}) x${c.quantity}: Rp ${c.price * c.quantity}.000`).join("\n");
      const waText = `Halo Barista Tampa Seduh kawan, saya ingin memesan dengan ID *${data.id}*

*Nama:* ${name}
*No. WA:* ${whatsapp}
*Metode:* ${deliveryMethod === "delivery" ? `Kirim Kurir (${zoneObj?.label || ""})` : "Ambil Sendiri (Pickup)"}
*Alamat:* ${deliveryMethod === "pickup" ? "Ambil di Kedai" : address}

*Pesanan:*
${itemSummary}

*Rincian Biaya:*
- Subtotal: Rp ${subtotal}.000
- Ongkir: Rp ${rawShippingCost}.000
- Diskon Ongkir (Member): Rp ${shippingDiscount}.000
*Total Bayar (COD / QRIS):* *Rp ${totalCost}.000*

*Catatan:* ${notes || "-"}`;

      const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(waText)}`;
      window.open(waUrl, "_blank");

      setIsSuccess(true);
      clearCart();
      onSuccess(data.id);

    } catch (err: any) {
      setErrorMessage(err.message || "Koneksi bermasalah. Silakan periksa jaringan internet.");
    } finally {
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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

                    <button
                      type="submit"
                      disabled={isSubmitting || cart.length === 0}
                      className="w-full mt-2 bg-gradient-to-r from-amber-800 to-amber-950 hover:from-amber-900 hover:to-black text-amber-50 font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                      id="btn-submit-order"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Menyalurkan Pesanan...
                        </span>
                      ) : (
                        <>
                          <Send className="w-5 h-5 text-amber-300" />
                          Kirim & Chat WA Barista (COD / QRIS)
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
    </AnimatePresence>
  );
}
