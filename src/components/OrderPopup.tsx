import React, { useState } from "react";
import { X, ShoppingBag, Send, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MenuItem, OrderItem } from "../types";

interface OrderPopupProps {
  isOpen: boolean;
  onClose: () => void;
  cart: { item: MenuItem; quantity: number; size: "R" | "L" }[];
  clearCart: () => void;
  onSuccess: (orderId: string) => void;
}

export default function OrderPopup({ isOpen, onClose, cart, clearCart, onSuccess }: OrderPopupProps) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedId, setGeneratedId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const totalCost = cart.reduce((sum, entry) => {
    const unitPrice = entry.size === "L" && entry.item.priceLarge ? entry.item.priceLarge : entry.item.priceReg;
    return sum + (unitPrice * entry.quantity);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) return setErrorMessage("Nama lengkap harus diisi");
    if (!whatsapp.trim()) return setErrorMessage("Nomor Whatsapp harus diisi");
    if (!address.trim()) return setErrorMessage("Alamat pengantaran harus diisi");
    if (cart.length === 0) return setErrorMessage("Keranjang belanja Anda masih kosong! Tambahkan kopi favorit Anda terlebih dahulu.");

    setIsSubmitting(true);

    const orderItems: OrderItem[] = cart.map(entry => {
      const unitPrice = entry.size === "L" && entry.item.priceLarge ? entry.item.priceLarge : entry.item.priceReg;
      return {
        menuId: entry.item.id,
        name: entry.item.name,
        quantity: entry.quantity,
        size: entry.size,
        price: unitPrice
      };
    });

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          whatsapp,
          email,
          address,
          items: orderItems,
          total: totalCost
        })
      });

      if (!response.ok) {
        throw new Error("Gagal mengirim pesanan ke server");
      }

      const data = await response.json();
      setGeneratedId(data.id);
      setIsSuccess(true);
      clearCart();
      onSuccess(data.id);
    } catch (err: any) {
      setErrorMessage(err.message || "Koneksi bermasalah. Silakan periksa jaringan internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-lg overflow-hidden bg-amber-50 dark:bg-zinc-900 border border-amber-900/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header Banner */}
          <div className="p-6 bg-gradient-to-r from-amber-900 to-amber-950 text-amber-50 flex justify-between items-center relative">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-amber-300" />
              <div>
                <h3 className="font-serif font-bold text-xl tracking-wide">Formulir Pesanan</h3>
                <p className="text-xs text-amber-200/80">Kopi premium siap antar ke alamat Anda</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-amber-200 hover:bg-white/10 transition-colors"
              id="btn-close-order-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-2">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="font-serif font-bold text-2xl text-amber-900 dark:text-amber-100">Pesanan Diterima!</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto">
                  Terima kasih, kawan <strong className="text-amber-800 dark:text-amber-400">{name}</strong>. Pesanan Anda dengan nomor ID 
                  <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 px-2 py-1 rounded font-mono font-bold mx-2">{generatedId}</span>
                  telah tersalurkan langsung ke barista Tampa Seduh.
                </p>
                <div className="bg-amber-900/5 dark:bg-white/5 p-4 rounded-xl text-left border border-amber-900/10 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                  <p><strong>Alamat:</strong> {address}</p>
                  <p><strong>Whatsapp:</strong> {whatsapp}</p>
                  <p><strong>Total Kiriman:</strong> Rp {totalCost}.000 (Bayar ditempat/COD)</p>
                </div>
                <p className="text-xs text-zinc-400">Barista kami akan segera menghubungi nomor Whatsapp Anda.</p>
                <button
                  onClick={() => {
                    setIsSuccess(false);
                    setName("");
                    setWhatsapp("");
                    setEmail("");
                    setAddress("");
                    onClose();
                  }}
                  className="w-full bg-amber-900 hover:bg-amber-800 text-amber-50 font-bold py-3 px-4 rounded-xl transition-all shadow"
                  id="btn-close-success"
                >
                  Selesai
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Cart Overview */}
                <div className="bg-amber-900/5 dark:bg-white/5 p-4 rounded-xl border border-amber-900/10 space-y-3">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider block">Ringkasan Pesanan</span>
                  {cart.length === 0 ? (
                    <p className="text-sm text-amber-900/60 dark:text-zinc-400 py-2">Belum ada item kopi yang dipilih. Tutup form dan tekan (+) di daftar menu.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {cart.map((entry, index) => {
                        const unitPrice = entry.size === "L" && entry.item.priceLarge ? entry.item.priceLarge : entry.item.priceReg;
                        return (
                          <div key={index} className="flex justify-between items-center text-sm text-zinc-700 dark:text-zinc-300">
                            <span className="font-medium">
                              {entry.item.name} <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/10 dark:bg-amber-400/20 text-amber-900 dark:text-amber-300 font-bold font-mono">{entry.size}</span>
                              <span className="text-zinc-400 text-xs ml-1">x{entry.quantity}</span>
                            </span>
                            <span className="font-mono">{unitPrice * entry.quantity} K</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="pt-2 border-t border-amber-900/10 dark:border-zinc-700 flex justify-between items-center font-bold text-amber-950 dark:text-amber-100">
                    <span>Total Bayar (COD):</span>
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
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-800 text-zinc-900 dark:text-zinc-100"
                      placeholder="Masukkan nama kawan..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider mb-1.5">No. Whatsapp (Aktif)</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-800 text-zinc-900 dark:text-zinc-100"
                        placeholder="Contoh: 085696224448"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider mb-1.5">Email (Opsional)</label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-800 text-zinc-900 dark:text-zinc-100"
                        placeholder="kopi@tampaseduh.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider mb-1.5">Alamat Pengantaran Lengkap</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-800 text-zinc-900 dark:text-zinc-100"
                      placeholder="Tuliskan alamat pengantaran lengkap kawan beserta petunjuk patokan..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || cart.length === 0}
                  className="w-full mt-6 bg-gradient-to-r from-amber-800 to-amber-950 hover:from-amber-900 hover:to-black text-amber-50 font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
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
                      Kirim Pesanan Sekarang (Bayar di Tempat)
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
