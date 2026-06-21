import React, { useState } from "react";
import { 
  User as UserIcon, LogOut, ArrowLeft, Coffee, Gift, 
  ShoppingBag, CheckCircle, Clock, Truck, Store, Moon, Sun, Check 
} from "lucide-react";
import { motion } from "motion/react";
import { User } from "../types";

interface UserDashboardProps {
  currentUser: User;
  onBack: () => void;
  orders: any[];
  onSubscribe: () => void;
  isSubscribing: boolean;
  onLogout: () => void;
  onUpdateProfile?: (updates: Partial<User>) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export default function UserDashboard({
  currentUser,
  onBack,
  orders,
  onSubscribe,
  isSubscribing,
  onLogout,
  onUpdateProfile,
  darkMode,
  setDarkMode
}: UserDashboardProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: currentUser.name || "",
    email: currentUser.email || "",
    whatsapp: currentUser.whatsapp || "",
    address: currentUser.address || "",
    avatarUrl: currentUser.avatarUrl || "",
    newPassword: ""
  });

  const handleSaveProfile = () => {
    if (onUpdateProfile) {
      const updates: Partial<User> = { ...editForm };
      if (editForm.newPassword.trim() !== "") {
        updates.password = editForm.newPassword;
      }
      onUpdateProfile(updates);
    }
    setEditForm(prev => ({ ...prev, newPassword: "" }));
    setIsEditingProfile(false);
  };

  const isMember = currentUser.isMember || false;

  return (
    <div className={`min-h-screen font-sans ${
      darkMode ? "bg-zinc-950 text-stone-100" : "bg-[#F9F7F2] text-stone-900"
    }`}>
      {/* Dashboard Nav Bar */}
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
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-full hover:bg-amber-900/10 dark:hover:bg-white/5 text-amber-900 dark:text-amber-400 transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 py-2 px-3 text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl cursor-pointer transition-all"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Dashboard */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Member Card & Profile */}
          <div className="space-y-6 lg:col-span-1">
            {/* Interactive Member Card (Premium Gold/Shimmer effect) */}
            <div className={`relative overflow-hidden rounded-3xl p-6 shadow-2xl transition-all aspect-[1.586/1] ${
              isMember
                ? "bg-gradient-to-br from-zinc-900 via-neutral-950 to-amber-950 border border-amber-500/30 text-amber-100"
                : "bg-gradient-to-br from-zinc-700 via-stone-800 to-zinc-900 border border-white/5 text-zinc-300"
            }`}>
              {/* Shimmer overlay */}
              {isMember && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3.5s_infinite] pointer-events-none" />
              )}

              <div className="flex justify-between items-start h-full flex-col">
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-1.5">
                    <Coffee className={`w-6 h-6 ${isMember ? "text-amber-400" : "text-zinc-500"}`} />
                    <span className="font-serif font-black text-sm tracking-widest">TAMPA SEDUH.</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                    isMember 
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                      : "bg-white/10 text-zinc-400"
                  }`}>
                    {isMember ? "Vip Member" : "Non Member"}
                  </span>
                </div>

                <div className="space-y-1 my-4 text-left">
                  <h3 className="font-serif font-black text-xl tracking-wide line-clamp-1">{currentUser.name}</h3>
                  <p className="text-xs font-mono opacity-65 tracking-wider">{currentUser.email}</p>
                </div>

                <div className="flex justify-between items-end w-full border-t pt-3 border-white/10">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider opacity-50 block">Status Keanggotaan</span>
                    <span className="text-xs font-bold">{isMember ? "Aktif (Diskon Ongkir 25%)" : "Belum Berlangganan"}</span>
                  </div>
                  <Gift className={`w-8 h-8 ${isMember ? "text-amber-400/70" : "text-zinc-600"}`} />
                </div>
              </div>
            </div>

            {/* Subscribe Box */}
            {!isMember && (
              <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm space-y-4">
                <h4 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-100 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-500" />
                  Aktivasi Member Gratis!
                </h4>
                <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed">
                  Gabung menjadi keluarga besar **Tampa Seduh** kawan! Dapatkan langsung potongan harga **Diskon Ongkir 25%** untuk setiap pemesanan layanan delivery kami di wilayah Kotabunan.
                </p>
                <button
                  onClick={onSubscribe}
                  disabled={isSubscribing}
                  className="w-full py-3 bg-[#4B3621] hover:bg-[#322314] text-white rounded-2xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSubscribing ? "Aktivasi Member..." : "Gabung Member Sekarang"}
                </button>
              </div>
            )}

            {/* Membership Promo (If already member) */}
            {isMember && (
              <div className="p-6 bg-amber-900/5 dark:bg-amber-400/5 rounded-3xl border border-amber-950/10 dark:border-amber-400/10 shadow-inner text-left space-y-3">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-widest block">Kupon Aktif</span>
                <div className="flex gap-3 items-center">
                  <div className="p-3 bg-amber-900 text-white rounded-2xl font-serif text-lg font-black tracking-tight leading-none text-center">
                    25%
                    <span className="text-[8px] uppercase tracking-wider block font-sans font-normal mt-0.5">Diskon</span>
                  </div>
                  <div>
                    <h5 className="font-serif font-bold text-sm text-amber-950 dark:text-amber-100">Diskon Ongkir Member</h5>
                    <p className="text-[10px] text-zinc-500">Potongan pengiriman flat Rp 10K menjadi Rp 7.5K di Kotabunan.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Profile Form Section */}
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-100">Profil Saya</h4>
                <button 
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="text-xs text-amber-600 hover:text-amber-800 font-bold"
                >
                  {isEditingProfile ? "Batal" : "Edit Profil"}
                </button>
              </div>

              {isEditingProfile ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nama Lengkap"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                  />
                  <input
                    type="text"
                    placeholder="WhatsApp"
                    value={editForm.whatsapp}
                    onChange={(e) => setEditForm({...editForm, whatsapp: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                  />
                  <textarea
                    placeholder="Alamat Pengantaran Default"
                    value={editForm.address}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                    rows={2}
                  />
                  <input
                    type="password"
                    placeholder="Ganti Password (Kosongkan jika tidak ingin ganti)"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({...editForm, newPassword: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm mt-2"
                  />
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 mb-3">Privasi & Keamanan: Data pesanan Anda dilindungi. Password dienkripsi.</p>
                    <button 
                      onClick={handleSaveProfile}
                      className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <p><strong>WA:</strong> {currentUser.whatsapp || "-"}</p>
                  <p><strong>Alamat:</strong> {currentUser.address || "-"}</p>
                </div>
              )}
            </div>

            {/* Support / WhatsApp CTA Section */}
            <div className="p-6 bg-[#25D366]/10 dark:bg-[#25D366]/5 rounded-3xl border border-[#25D366]/20 shadow-sm space-y-4">
              <h4 className="font-serif font-bold text-lg text-green-900 dark:text-green-400">Bantuan & Dukungan</h4>
              <p className="text-xs text-green-800/80 dark:text-green-500/80">
                Ada kendala pesanan atau ingin ganti alamat mendadak? Hubungi barista kami langsung via WhatsApp untuk respon cepat!
              </p>
              <a 
                href="https://wa.me/6285696224448?text=Halo%20Tampa%20Seduh,%20saya%20ingin%20bertanya%20seputar%20pesanan%20saya"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-2xl text-xs font-bold tracking-wider uppercase transition-all shadow-md flex justify-center items-center gap-2"
              >
                Chat via WhatsApp
              </a>
            </div>

          </div>

          {/* Column 2 & 3: Order History */}
          <div className="space-y-6 lg:col-span-2">
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm space-y-6 text-left">
              <div className="flex justify-between items-center border-b pb-4 border-zinc-100 dark:border-zinc-800">
                <div>
                  <h4 className="font-serif font-bold text-xl text-amber-955 dark:text-amber-100">Riwayat Pesanan</h4>
                  <p className="text-xs text-zinc-400">Total pesanan terdaftar kawan di Tampa Seduh</p>
                </div>
                <span className="bg-amber-900/10 dark:bg-amber-400/10 text-amber-900 dark:text-amber-300 font-mono font-bold text-sm px-3.5 py-1 rounded-full">
                  {orders.length} Transaksi
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400 dark:text-zinc-650">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-serif font-bold text-base text-zinc-700 dark:text-zinc-300">Belum ada pesanan kawan</h5>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">Silakan pilih kopi Liberica andalan kami di beranda, lalu lakukan checkout pesanan pertama Anda.</p>
                  </div>
                  <button 
                    onClick={onBack}
                    className="px-6 py-2.5 bg-amber-900 hover:bg-amber-800 text-amber-50 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Pesan Sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    const orderDate = new Date(order.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    return (
                      <div 
                        key={order.id}
                        className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                          isExpanded 
                            ? "border-amber-900/30 bg-amber-900/5 dark:bg-white/5" 
                            : "border-zinc-100 dark:border-zinc-800 hover:border-amber-900/10 bg-zinc-50/50 dark:bg-zinc-850"
                        }`}
                      >
                        {/* Summary Block */}
                        <div 
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="p-4 sm:p-5 flex justify-between items-center gap-4 cursor-pointer select-none"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs bg-amber-900/10 dark:bg-amber-400/20 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded">
                                {order.id}
                              </span>
                              <span className="text-[10px] text-zinc-400">{orderDate}</span>
                            </div>
                            <p className="text-xs text-zinc-500 font-medium truncate max-w-xs sm:max-w-md">
                              {order.items.map((i: any) => `${i.name} (${i.quantity}x)`).join(", ")}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-xs text-zinc-400 block leading-none">Total</span>
                              <span className="font-mono font-bold text-sm text-[#2D1B0D] dark:text-amber-400">Rp {order.total}.000</span>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                              order.status === "completed" 
                                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" 
                                : order.status === "preparing" || order.status === "delivering"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-zinc-150 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}>
                              {order.status === "completed" ? "Selesai" : order.status === "delivering" ? "Diantar" : order.status === "preparing" ? "Disiapkan" : "Menunggu"}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                alert("Invoice sedang disiapkan, kawan!");
                              }}
                              className="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-[10px] font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
                            >
                              Cetak Invoice
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Details */}
                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-zinc-200/50 dark:border-zinc-800 pt-4 text-xs text-zinc-650 dark:text-zinc-400 space-y-4">
                            <div className="flex gap-2 mb-3">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Trigger chat widget to open and handoff to admin
                                  window.dispatchEvent(new CustomEvent('trigger-admin-chat'));
                                }}
                                className="flex-1 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                              >
                                Pesan Admin
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const original = document.body.innerHTML;
                                  const isPaid = order.status === "completed" || order.paymentProofUrl;
                                  const statusBadge = isPaid 
                                    ? '<span style="background:#22c55e; color:white; padding:4px 12px; border-radius:999px; font-weight:bold; font-size:12px;">PAID</span>'
                                    : '<span style="background:#f59e0b; color:white; padding:4px 12px; border-radius:999px; font-weight:bold; font-size:12px;">UNPAID</span>';

                                  const itemsHtml = order.items.map((i: any) => 
                                    `<tr>
                                      <td style="padding:12px; border-bottom:1px solid #eee;">${i.name} (${i.size})</td>
                                      <td style="padding:12px; border-bottom:1px solid #eee; text-align:center;">${i.quantity}</td>
                                      <td style="padding:12px; border-bottom:1px solid #eee; text-align:right;">Rp ${i.price}.000</td>
                                    </tr>`
                                  ).join('');

                                  document.body.innerHTML = `
                                    <html>
                                      <head>
                                        <title>Invoice ${order.id}</title>
                                        <style>
                                          @media print {
                                            @page { size: A4 portrait; margin: 0; }
                                            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact; background: white; margin: 0; padding: 20mm; height: 100%; overflow: hidden; }
                                          }
                                        </style>
                                      </head>
                                      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: white; padding: 40px; color: #333; max-width: 800px; margin: 0 auto;">
                                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 40px; border-bottom: 2px solid #78350f; padding-bottom: 20px;">
                                          <div>
                                            <h1 style="margin:0; color:#78350f; font-size: 32px; font-weight:900;">TAMPA SEDUH.</h1>
                                            <p style="margin:5px 0 0 0; color:#666; font-size: 14px;">Kedai Kopi Boltim<br>Kotabunan, Sulawesi Utara</p>
                                          </div>
                                          <div style="text-align:right;">
                                            <h2 style="margin:0; font-size:24px; color:#111;">INVOICE</h2>
                                            <p style="margin:5px 0; font-size:14px; color:#666;">#${order.id.split('-')[0].toUpperCase()}</p>
                                            ${statusBadge}
                                          </div>
                                        </div>
                                        
                                        <div style="display:flex; justify-content:space-between; margin-bottom: 40px;">
                                          <div>
                                            <p style="margin:0; font-size:12px; color:#666; font-weight:bold; text-transform:uppercase;">Ditagihkan Kepada:</p>
                                            <p style="margin:5px 0 0 0; font-size:16px; font-weight:bold;">${order.userEmail.split('@')[0]}</p>
                                            <p style="margin:5px 0 0 0; font-size:14px; color:#444;">${order.address}<br>WA: ${order.whatsapp}</p>
                                          </div>
                                          <div style="text-align:right;">
                                            <p style="margin:0; font-size:12px; color:#666; font-weight:bold; text-transform:uppercase;">Informasi Order:</p>
                                            <p style="margin:5px 0 0 0; font-size:14px;">Tanggal: ${new Date(order.createdAt).toLocaleDateString('id-ID')}</p>
                                            <p style="margin:5px 0 0 0; font-size:14px;">Metode: ${order.deliveryMethod === 'pickup' ? 'Ambil di Kedai' : 'Kirim Ke Alamat'}</p>
                                          </div>
                                        </div>

                                        <table style="width:100%; border-collapse: collapse; margin-bottom: 30px;">
                                          <thead>
                                            <tr style="background:#f8f9fa;">
                                              <th style="padding:12px; text-align:left; border-bottom:2px solid #ccc; font-size:14px;">Deskripsi Item</th>
                                              <th style="padding:12px; text-align:center; border-bottom:2px solid #ccc; font-size:14px;">Qty</th>
                                              <th style="padding:12px; text-align:right; border-bottom:2px solid #ccc; font-size:14px;">Harga</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            ${itemsHtml}
                                          </tbody>
                                        </table>

                                        <div style="width: 100%; display: flex; justify-content: flex-end;">
                                          <table style="width: 300px; font-size: 14px;">
                                            <tr>
                                              <td style="padding: 5px 0;">Subtotal:</td>
                                              <td style="text-align:right; padding: 5px 0;">Rp ${order.subtotal || order.total}.000</td>
                                            </tr>
                                            ${order.shippingCost ? `<tr>
                                              <td style="padding: 5px 0;">Ongkir:</td>
                                              <td style="text-align:right; padding: 5px 0;">Rp ${order.shippingCost}.000</td>
                                            </tr>` : ''}
                                            ${order.shippingDiscount ? `<tr>
                                              <td style="padding: 5px 0; color:#b45309;">Diskon Ongkir:</td>
                                              <td style="text-align:right; padding: 5px 0; color:#b45309;">-Rp ${order.shippingDiscount}.000</td>
                                            </tr>` : ''}
                                            <tr>
                                              <td style="padding: 10px 0; font-weight:bold; font-size: 18px; border-top: 2px solid #333;">TOTAL TAGIHAN:</td>
                                              <td style="text-align:right; padding: 10px 0; font-weight:bold; font-size: 18px; border-top: 2px solid #333;">Rp ${order.total}.000</td>
                                            </tr>
                                          </table>
                                        </div>

                                        <div style="margin-top: 60px; text-align:center; color:#666; font-size: 14px;">
                                          <p>Terima kasih telah berbelanja di Tampa Seduh!</p>
                                          <p style="font-size:12px; color:#999;">Invoice ini sah dan diterbitkan secara digital oleh sistem.</p>
                                        </div>
                                      </body>
                                    </html>
                                  `;
                                  setTimeout(() => {
                                    window.print();
                                    document.body.innerHTML = original;
                                    window.location.reload();
                                  }, 100);
                                }}
                                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                              >
                                Download Invoice
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                <span className="font-bold text-zinc-400 block uppercase text-[9px] tracking-widest">Detail Delivery</span>
                                <p className="font-medium text-stone-800 dark:text-stone-200 flex items-center gap-1.5 mt-1">
                                  {order.deliveryMethod === "pickup" ? (
                                    <>
                                      <Store className="w-3.5 h-3.5 text-amber-500" />
                                      Ambil di Kedai
                                    </>
                                  ) : (
                                    <>
                                      <Truck className="w-3.5 h-3.5 text-amber-500" />
                                      Kirim Ke Alamat
                                    </>
                                  )}
                                </p>
                                <p className="text-[11px] leading-relaxed mt-1 text-zinc-500">{order.address}</p>
                              </div>
                              <div className="space-y-1 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                <span className="font-bold text-zinc-400 block uppercase text-[9px] tracking-widest">Catatan / No. WA</span>
                                <p className="font-medium text-stone-800 dark:text-stone-200 mt-1">WhatsApp: {order.whatsapp}</p>
                                <p className="text-[11px] italic mt-1 text-zinc-500">Catatan: {order.notes || "-"}</p>
                              </div>
                            </div>

                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-2">
                              <span className="font-bold text-zinc-400 block uppercase text-[9px] tracking-widest mb-1">Rincian Item</span>
                              {order.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-[11px]">
                                  <span>{item.name} ({item.size}) <strong className="text-zinc-400">x{item.quantity}</strong></span>
                                  <span className="font-mono">{item.price * item.quantity}.000 K</span>
                                </div>
                              ))}
                              
                              <div className="border-t pt-2 mt-2 dark:border-zinc-800 space-y-1 text-zinc-500">
                                <div className="flex justify-between">
                                  <span>Subtotal:</span>
                                  <span>{order.subtotal || order.total}.000 K</span>
                                </div>
                                {order.shippingCost > 0 && (
                                  <div className="flex justify-between">
                                    <span>Ongkir:</span>
                                    <span>{order.shippingCost}.000 K</span>
                                  </div>
                                )}
                                {order.shippingDiscount > 0 && (
                                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                    <span>Diskon Ongkir:</span>
                                    <span>-{order.shippingDiscount}.000 K</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold text-stone-900 dark:text-amber-300 text-xs pt-1 border-t dark:border-zinc-800">
                                  <span>Total (COD):</span>
                                  <span>Rp {order.total}.000</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
      
      {/* Styles for Shimmer animation */}
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
