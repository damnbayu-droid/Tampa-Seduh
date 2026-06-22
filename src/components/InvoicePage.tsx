import React, { useState, useEffect, useRef } from "react";
import {
  Coffee, ArrowLeft, Download, CheckCircle, Clock, Truck, Package,
  MapPin, Phone, FileText, AlertCircle, Loader2
} from "lucide-react";
import { getApiUrl } from "../lib/api";

interface InvoiceOrder {
  id: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; size: string; price: number; isPackage?: boolean }>;
  total: number;
  subtotal?: number;
  shippingCost?: number;
  shippingDiscount?: number;
  status: "pending" | "preparing" | "delivering" | "completed";
  deliveryMethod?: string;
  address: string;
  notes?: string;
  createdAt: string;
}

interface InvoicePageProps {
  orderId: string;
  onBack: () => void;
}

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID").format(val * 1000);
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch { return iso; }
};

const STATUS_STEPS = [
  { key: "pending", label: "Diterima", icon: FileText, description: "Pesanan diterima, menunggu konfirmasi" },
  { key: "preparing", label: "Seduh / Proses", icon: Coffee, description: "Barista sedang menyeduh pesananmu" },
  { key: "delivering", label: "Diantar", icon: Truck, description: "Pesanan sedang dalam perjalanan" },
  { key: "completed", label: "Selesai", icon: CheckCircle, description: "Pesanan berhasil diterima" }
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0, preparing: 1, delivering: 2, completed: 3
};

export default function InvoicePage({ orderId, onBack }: InvoicePageProps) {
  const [order, setOrder] = useState<InvoiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const res = await fetch(getApiUrl(`/api/invoice/${orderId}`));
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Invoice tidak ditemukan");
        }
        const data = await res.json();
        setOrder(data);
      } catch (e: any) {
        setError(e.message || "Gagal memuat invoice");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();

    // Auto-refresh every 30s to show status update
    const interval = setInterval(fetchInvoice, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-amber-700 mx-auto" />
          <p className="text-amber-900 font-semibold">Memuat Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-zinc-800">Invoice Tidak Ditemukan</h2>
          <p className="text-zinc-500 text-sm">{error || "Pastikan link invoice yang kamu gunakan benar."}</p>
          <button
            onClick={onBack}
            className="mt-2 px-6 py-3 bg-amber-900 text-white rounded-xl font-bold text-sm hover:bg-amber-800 transition-colors cursor-pointer"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const currentStatusIdx = STATUS_ORDER[order.status] ?? 0;
  const subtotal = order.subtotal ?? order.total;
  const shippingCost = order.shippingCost ?? 0;
  const shippingDiscount = order.shippingDiscount ?? 0;

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-card { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-[#FAF7F2] to-amber-50/40 font-sans">
        {/* Nav Bar */}
        <nav className="no-print sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-amber-100 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-bold text-amber-900 hover:opacity-70 transition-opacity cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Kedai
            </button>
            <div className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-amber-700" />
              <span className="font-serif font-bold text-amber-900">Tampa Seduh</span>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 text-sm font-bold bg-amber-900 text-white px-4 py-2 rounded-xl hover:bg-amber-800 transition-colors cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-4 py-8 space-y-6" ref={printRef}>
          
          {/* Invoice Header */}
          <div className="print-card bg-gradient-to-br from-amber-950 via-stone-900 to-black rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-600 rounded-xl">
                    <Coffee className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-serif font-black">Tampa Seduh</h1>
                    <p className="text-amber-300 text-xs font-medium">Street Coffee · Kotabunan Selatan</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-amber-300 uppercase tracking-widest font-bold block mb-1">Invoice</span>
                <span className="font-mono font-black text-lg text-amber-100">{order.id}</span>
                <p className="text-xs text-amber-400 mt-1">{formatDate(order.createdAt)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">Pelanggan</p>
                <p className="font-semibold text-white">{order.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">Metode Pengantaran</p>
                <p className="font-semibold text-white capitalize flex items-center gap-1">
                  {order.deliveryMethod === "delivery"
                    ? <><Truck className="w-4 h-4 text-amber-400" /> Delivery</>
                    : <><Package className="w-4 h-4 text-amber-400" /> Pickup</>
                  }
                </p>
              </div>
              {order.address && (
                <div className="col-span-2">
                  <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">Alamat</p>
                  <p className="font-medium text-amber-100 flex items-start gap-1">
                    <MapPin className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                    {order.address}
                  </p>
                </div>
              )}
              {order.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">Catatan</p>
                  <p className="text-amber-200 text-sm italic">"{order.notes}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Tracker */}
          <div className="print-card bg-white rounded-2xl shadow-sm border border-amber-100/80 p-6">
            <h2 className="font-serif font-bold text-lg text-amber-950 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-700" />
              Status Pesanan
              <span className="ml-auto text-xs bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full animate-pulse">
                Live
              </span>
            </h2>
            
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-zinc-100" style={{ zIndex: 0 }}>
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-800 transition-all duration-700"
                  style={{ width: `${(currentStatusIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
                />
              </div>

              <div className="relative flex justify-between" style={{ zIndex: 1 }}>
                {STATUS_STEPS.map((step, idx) => {
                  const isDone = idx <= currentStatusIdx;
                  const isCurrent = idx === currentStatusIdx;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                          isCurrent
                            ? "bg-amber-700 border-amber-700 shadow-lg shadow-amber-400/30 scale-110"
                            : isDone
                            ? "bg-amber-800 border-amber-800"
                            : "bg-white border-zinc-200"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isDone ? "text-white" : "text-zinc-300"}`} />
                      </div>
                      <div className="text-center">
                        <p className={`text-xs font-bold ${isCurrent ? "text-amber-800" : isDone ? "text-zinc-700" : "text-zinc-400"}`}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <p className="text-[10px] text-amber-600 mt-0.5 max-w-[80px] text-center leading-tight">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {order.status === "completed" && (
              <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-xl text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="font-bold text-green-800 text-sm">Pesanan telah selesai! Terima kasih, kawan! ☕</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="print-card bg-white rounded-2xl shadow-sm border border-amber-100/80 p-6">
            <h2 className="font-serif font-bold text-lg text-amber-950 mb-4 border-b pb-3 border-zinc-100">
              Detail Pesanan
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                  <th className="pb-3 text-left">Item</th>
                  <th className="pb-3 text-center">Ukuran</th>
                  <th className="pb-3 text-center">Qty</th>
                  <th className="pb-3 text-right">Harga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="py-3">
                    <td className="py-3">
                      <span className="font-semibold text-zinc-800">{item.name}</span>
                      {item.isPackage && (
                        <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">Paket</span>
                      )}
                    </td>
                    <td className="py-3 text-center text-zinc-500">{item.size || "-"}</td>
                    <td className="py-3 text-center font-bold text-zinc-700">x{item.quantity}</td>
                    <td className="py-3 text-right font-mono font-bold text-amber-900">
                      Rp {formatRupiah(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-zinc-100 space-y-2">
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Subtotal</span>
                <span className="font-mono">Rp {formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Ongkos Kirim</span>
                <span className="font-mono">Rp {formatRupiah(shippingCost)}</span>
              </div>
              {shippingDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="font-semibold">Diskon Member ✓</span>
                  <span className="font-mono font-semibold">-Rp {formatRupiah(shippingDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-zinc-200">
                <span className="font-bold text-lg text-zinc-900">Total</span>
                <span className="font-mono font-black text-2xl text-amber-900">Rp {formatRupiah(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="print-card bg-gradient-to-r from-amber-950 to-stone-900 rounded-2xl p-6 text-center">
            <Coffee className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            <p className="text-amber-100 font-semibold text-sm">Terima kasih sudah memilih Tampa Seduh!</p>
            <p className="text-amber-400 text-xs mt-1">Tampa Seduh Street Coffee · Kotabunan Selatan</p>
            <p className="text-amber-600 text-[10px] mt-3 no-print">
              Halaman ini otomatis diperbarui setiap 30 detik • Invoice bisa didownload dengan tombol di atas
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
