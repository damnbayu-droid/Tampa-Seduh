import React, { useState, useEffect } from "react";
import { ArrowLeft, ShoppingBag, Send, CheckCircle2, Truck, Store, Upload, CreditCard, Loader2, Download, X, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CartItem, OrderItem, User } from "../types";
import { getApiUrl, safeParseJson } from "../lib/api";

interface CheckoutPageProps {
  cart: CartItem[];
  clearCart: () => void;
  currentUser: User | null;
  onBack: () => void;
  onSuccess: (orderId: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  navigateTo: (path: string) => void;
}

// Delivery zones with pricing
const DELIVERY_ZONES = [
  { label: "Pilih Area Pengantaran...", value: "", cost: 0 },
  { label: "Kotabunan & Bulawan — 5K", value: "kotabunan", cost: 5 },
  { label: "Panang — 10K", value: "panang", cost: 10 },
  { label: "Paret — 10K", value: "paret", cost: 10 },
  { label: "Kec. Tutuyan & Buyat — 15K", value: "tutuyan", cost: 15 },
];

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mwvdevlj";

export default function CheckoutPage({
  cart,
  clearCart,
  currentUser,
  onBack,
  onSuccess,
  darkMode,
  setDarkMode,
  navigateTo
}: CheckoutPageProps) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [selectedZone, setSelectedZone] = useState("");
  const [notes, setNotes] = useState("");

  const [isPaying, setIsPaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedId, setGeneratedId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Delivery info mini popup
  const [showDeliveryInfo, setShowDeliveryInfo] = useState(false);

  // Pre-fill user details if logged in
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
    }
  }, [currentUser]);

  // Show delivery info popup on mount
  useEffect(() => {
    const timer = setTimeout(() => setShowDeliveryInfo(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss delivery info popup after 8 seconds
  useEffect(() => {
    if (showDeliveryInfo) {
      const timer = setTimeout(() => setShowDeliveryInfo(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showDeliveryInfo]);

  const subtotal = cart.reduce((sum, entry) => sum + (entry.price * entry.quantity), 0);
  const isMember = currentUser?.isMember || false;
  
  // Shipping calculations
  const zoneObj = DELIVERY_ZONES.find(z => z.value === selectedZone);
  const rawShippingCost = deliveryMethod === "delivery" ? (zoneObj?.cost || 0) : 0;
  const shippingDiscount = isMember && deliveryMethod === "delivery" ? Math.round(rawShippingCost * 0.25) : 0;
  const shippingCost = rawShippingCost - shippingDiscount;
  const totalCost = subtotal + shippingCost;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage("");

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
      } catch (err: any) {
        setErrorMessage(err.message || "Gagal upload file.");
      } finally {
        setIsUploading(false);
      }
    };
  };

  // Forward to Formspree
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
          delivery_method: deliveryMethod === "delivery" ? `Delivery - ${zoneObj?.label || ""}` : "Ambil Sendiri",
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
    } catch (err) {
      // Formspree failure is non-critical, don't block the order
      console.warn("Formspree forward gagal:", err);
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
      if (!response.ok) {
        throw new Error(data.error || "Gagal mengirim pesanan ke server");
      }
      setGeneratedId(data.id);
      
      // Forward to Formspree for email notification
      await forwardToFormspree(data.id);
      
      setIsSuccess(true);
      clearCart();
      onSuccess(data.id);

    } catch (err: any) {
      setErrorMessage(err.message || "Koneksi bermasalah. Silakan periksa jaringan internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans ${
      darkMode ? "bg-zinc-950 text-stone-100" : "bg-[#F9F7F2] text-stone-900"
    }`}>
      {/* Delivery Info Mini Popup */}
      <AnimatePresence>
        {showDeliveryInfo && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 right-4 z-50 max-w-xs bg-amber-900 text-amber-50 p-4 rounded-2xl shadow-2xl border border-amber-700/40"
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
      </AnimatePresence>

      {/* Navbar Checkout */}
      <nav className={`border-b sticky top-0 z-40 backdrop-blur-md transition-all ${
        darkMode ? "bg-zinc-950/90 border-amber-900/10" : "bg-[#F9F7F2]/90 border-zinc-200"
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-400 hover:opacity-80 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali ke Kedai
          </button>
          
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            <span className="font-serif font-black text-sm tracking-wide">TAMPA SEDUH CHECKOUT.</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-lg mx-auto space-y-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="font-serif font-bold text-2xl text-amber-900 dark:text-amber-50">Pesanan Dikonfirmasi!</h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Terima kasih kawan <strong className="text-amber-800 dark:text-amber-400">{name}</strong>. Pesanan Anda dengan nomor ID 
              <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 px-2 py-1 rounded font-mono font-bold mx-2">{generatedId}</span>
              telah tersimpan dan bukti pembayaran Anda sudah dikirim. Barista kami akan segera memproses pesanan.
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl text-left border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
              <p><strong>Alamat:</strong> {deliveryMethod === "pickup" ? "Ambil Sendiri di Kedai" : address}</p>
              <p><strong>Whatsapp:</strong> {whatsapp}</p>
              <p><strong>Metode:</strong> {deliveryMethod === "delivery" ? `Delivery — ${zoneObj?.label || ""}` : "Pickup"}</p>
              <p><strong>Total Dibayar (QRIS):</strong> Rp {totalCost}.000</p>
            </div>
            <p className="text-xs text-zinc-400 italic">📧 Notifikasi order telah dikirim ke email pemilik Tampa Seduh.</p>
            <button
              onClick={() => navigateTo("/")}
              className="w-full bg-[#4B3621] hover:bg-[#322314] text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow cursor-pointer text-xs uppercase tracking-wider"
            >
              Kembali ke Beranda
            </button>
          </motion.div>
        ) : cart.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm max-w-lg mx-auto space-y-5">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="font-serif font-bold text-xl text-zinc-700 dark:text-zinc-300">Keranjang Belanja Kosong kawan</h3>
            <p className="text-xs text-zinc-400">Silakan pilih menu kopi Liberica andalan kami terlebih dahulu di beranda kedai.</p>
            <button 
              onClick={() => navigateTo("/")}
              className="px-6 py-3 bg-amber-900 hover:bg-amber-800 text-amber-50 rounded-xl text-xs font-bold cursor-pointer transition-all shadow"
            >
              Pilih Menu Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Checkout Form & QRIS Payment */}
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              <h3 className="font-serif font-bold text-2xl text-amber-900 dark:text-amber-50 text-left border-b pb-4 dark:border-zinc-800">Detail Pengiriman & Pembayaran</h3>

              {errorMessage && (
                <div className="p-3.5 text-xs bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 rounded-xl">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 text-left">
                {/* Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1.5">Nama Lengkap Penerima</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 font-sans"
                      placeholder="Masukkan nama kawan..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1.5">No. Whatsapp (Aktif)</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 font-sans"
                        placeholder="Contoh: 085696224448"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1.5">Email (Opsional)</label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 font-sans"
                        placeholder="kawan@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Delivery Options */}
                  <div className="space-y-2 text-xs">
                    <span className="block text-[10px] font-bold text-amber-900 dark:text-amber-400 uppercase tracking-widest">Metode Pengantaran</span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod("delivery")}
                        className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                          deliveryMethod === "delivery"
                            ? "bg-[#4B3621] border-[#322314] text-white shadow-md"
                            : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50"
                        }`}
                      >
                        <Truck className="w-4 h-4" />
                        Delivery Kurir
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeliveryMethod("pickup"); setSelectedZone(""); }}
                        className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                          deliveryMethod === "pickup"
                            ? "bg-[#4B3621] border-[#322314] text-white shadow-md"
                            : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50"
                        }`}
                      >
                        <Store className="w-4 h-4" />
                        Ambil Sendiri
                      </button>
                    </div>
                  </div>

                  {/* Delivery Zone Selector */}
                  {deliveryMethod === "delivery" && (
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1.5">Area Pengantaran</label>
                      <select
                        value={selectedZone}
                        onChange={(e) => setSelectedZone(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 font-sans"
                        required={deliveryMethod === "delivery"}
                      >
                        {DELIVERY_ZONES.map(zone => (
                          <option key={zone.value} value={zone.value}>{zone.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {deliveryMethod === "delivery" && (
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1.5">Alamat Pengantaran Lengkap</label>
                      <textarea
                        rows={2}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 font-sans"
                        placeholder="Tuliskan alamat lengkap beserta patokan rumah kawan..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1.5">Catatan Pesanan (Opsional)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none text-zinc-900 dark:text-zinc-100 font-sans"
                      placeholder="Contoh: Jahe saraba manis sedang, kopi TPS es dipisah..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* QRIS Payment Section */}
                <div className="p-4 bg-amber-900/5 dark:bg-white/5 rounded-2xl border border-amber-900/10 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-amber-500" />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-100 uppercase tracking-wider">Pembayaran QRIS</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Pembayaran di Tampa Seduh hanya melalui <strong>QRIS</strong>. Klik tombol di bawah untuk menampilkan kode QRIS, lalu scan menggunakan aplikasi Mobile Banking atau E-Wallet Anda.
                  </p>

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
                      {/* QRIS Image */}
                      <div className="bg-white p-3 rounded-2xl border-2 border-[#8B5E3C] shadow-md max-w-[260px] relative overflow-hidden">
                        <img 
                          src="/QRIS Tampa Seduh.png" 
                          alt="QRIS Tampa Seduh" 
                          className="w-full h-auto object-contain rounded-lg"
                          id="qris-image"
                        />
                      </div>

                      {/* Download QRIS Button */}
                      <a
                        href="/QRIS Tampa Seduh.png"
                        download="QRIS-Tampa-Seduh.png"
                        className="flex items-center gap-2 px-5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700"
                      >
                        <Download className="w-4 h-4 text-amber-600" />
                        Unduh QRIS untuk Dibayar
                      </a>
                      
                      <div className="text-center max-w-md space-y-2">
                        <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">Pindai & Transfer Senilai Rp {totalCost}.000</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          Scan kode QRIS Tampa Seduh di atas melalui aplikasi Mobile Banking (BCA, Mandiri, BRI, dll) atau E-Wallet (Gopay, OVO, Dana, LinkAja).
                        </p>
                        <div className="p-3 bg-amber-900/10 dark:bg-amber-400/10 rounded-xl border border-amber-900/10 dark:border-amber-400/10 text-[10px] text-amber-950 dark:text-amber-300 leading-relaxed text-left font-serif italic">
                          💡 <strong>Info:</strong> Setelah melakukan pembayaran, unggah tangkapan layar bukti transfer di bawah. <strong>Upload bukti bayar sudah cukup sebagai konfirmasi — tidak perlu chat WhatsApp lagi kawan.</strong>
                        </div>
                      </div>

                      {/* File Uploader */}
                      <div className="w-full">
                        <input
                          type="file"
                          id="payment-proof-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={isUploading || isSubmitting}
                        />

                        {!paymentProofUrl ? (
                          <label
                            htmlFor="payment-proof-upload"
                            className={`w-full py-3.5 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                              isUploading ? "opacity-50 pointer-events-none" : ""
                            } ${
                              darkMode ? "border-zinc-700 text-zinc-400" : "border-zinc-300 text-zinc-500"
                            }`}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                                <span className="text-[11px] font-bold tracking-wider">Mengunggah Bukti Bayar...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-[#8B5E3C]" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Unggah Bukti Bayar (Konfirmasi)</span>
                                <span className="text-[9px] opacity-60">Format: PNG, JPG, WEBP (Max 5MB)</span>
                              </>
                            )}
                          </label>
                        ) : (
                          <div className="p-4 bg-green-500/10 dark:bg-green-400/10 rounded-xl border border-green-500/20 text-center space-y-2">
                            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-bold text-xs">
                              <CheckCircle2 className="w-5 h-5" />
                              <span>Bukti Pembayaran Terunggah! ✓</span>
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate max-w-sm mx-auto">{paymentProofUrl}</p>
                            <label
                              htmlFor="payment-proof-upload"
                              className="text-[10px] font-bold text-amber-800 dark:text-amber-400 hover:underline cursor-pointer inline-block"
                            >
                              Ganti Bukti Transfer
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
                  className="w-full mt-6 bg-gradient-to-r from-amber-800 to-amber-950 hover:from-amber-900 hover:to-black text-amber-50 font-bold py-4 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed text-xs uppercase tracking-widest font-sans"
                  id="btn-submit-checkout"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                      Memproses & Mengkonfirmasi Pesanan...
                    </span>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-amber-300" />
                      Konfirmasi Pesanan (Bayar via QRIS)
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right: Cart Summary Column */}
            <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6 text-left">
              <h4 className="font-serif font-bold text-xl text-amber-900 dark:text-amber-50 border-b pb-4 dark:border-zinc-800">Daftar Belanja Kawan</h4>

              <div className="space-y-4 divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[350px] overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div key={idx} className={`flex justify-between items-center gap-4 pt-4 ${idx === 0 ? "pt-0 border-t-0" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-50 border dark:border-zinc-800 shrink-0">
                        <img 
                          src={item.image || "/Logo Tampa Seduh.png"} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs">
                        <h5 className="font-bold text-stone-900 dark:text-stone-100">{item.name}</h5>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Ukuran: <strong className="text-amber-800 dark:text-amber-400 font-mono font-bold uppercase">{item.size}</strong>
                        </p>
                        <p className="text-[10px] text-zinc-400">Kuantitas: x{item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs text-amber-900 dark:text-amber-300">{item.price * item.quantity}.000 K</span>
                  </div>
                ))}
              </div>

              {/* Invoice Calculations */}
              <div className="bg-zinc-50 dark:bg-zinc-850 p-4 rounded-2xl border dark:border-zinc-800 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Subtotal Pesanan:</span>
                  <span className="font-mono font-semibold">{subtotal}.000 K</span>
                </div>

                {deliveryMethod === "delivery" ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span>Area: {zoneObj?.label?.split("—")[0] || "Belum dipilih"}</span>
                      <div className="flex items-center gap-1.5">
                        {isMember && rawShippingCost > 0 ? (
                          <>
                            <span className="line-through text-zinc-400 font-mono">{rawShippingCost}.000 K</span>
                            <span className="text-amber-600 dark:text-amber-400 font-bold font-mono">{shippingCost}.000 K</span>
                            <span className="bg-amber-900/10 dark:bg-amber-400/20 text-amber-900 dark:text-amber-300 px-1 py-0.5 rounded text-[8px] font-bold">MEMBER -25%</span>
                          </>
                        ) : (
                          <span className="font-mono">{rawShippingCost > 0 ? `${rawShippingCost}.000 K` : "—"}</span>
                        )}
                      </div>
                    </div>

                    {/* Delivery zone reference */}
                    <div className="pt-1 space-y-0.5 text-[9px] text-zinc-400 border-t dark:border-zinc-800">
                      <p className="font-bold uppercase tracking-wider text-zinc-500 mb-1">Tarif Ongkir:</p>
                      <p>• Kotabunan & Bulawan: 5K</p>
                      <p>• Panang / Paret: 10K</p>
                      <p>• Kec. Tutuyan & Buyat: 15K</p>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>Ongkos Kirim:</span>
                    <span className="text-green-600 dark:text-green-400 font-bold">Gratis (Pickup)</span>
                  </div>
                )}

                <div className="border-t pt-3 mt-1.5 dark:border-zinc-800 flex justify-between items-center font-bold text-sm text-stone-900 dark:text-amber-100">
                  <span>Grand Total (QRIS):</span>
                  <span className="font-mono text-base text-[#8B5E3C] dark:text-amber-400">Rp {totalCost}.000</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
