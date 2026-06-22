const fs = require('fs');
const file = './src/components/OrderPopup.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add imports
code = code.replace(
  'import { X, ShoppingBag, Send, CheckCircle2, Truck, Store, Plus, Minus, Coffee, Package, Info, ChevronDown } from "lucide-react";',
  'import { X, ShoppingBag, Send, CheckCircle2, Truck, Store, Plus, Minus, Coffee, Package, Info, ChevronDown, Upload, CreditCard, Loader2, Download } from "lucide-react";'
);
code = code.replace(
  'import { getApiUrl } from "../lib/api";',
  'import { getApiUrl, safeParseJson } from "../lib/api";\nimport { supabase } from "../lib/supabase";'
);

// Add states
code = code.replace(
  'const [errorMessage, setErrorMessage] = useState("");',
  `const [errorMessage, setErrorMessage] = useState("");
  
  const [isPaying, setIsPaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState("");`
);

// Reset states on close
code = code.replace(
  'setErrorMessage("");',
  `setErrorMessage("");
    setIsPaying(false);
    setIsUploading(false);
    setPaymentProofUrl("");`
);

// Add file upload handler
const handleFileUploadCode = `
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
        const uniqueFileName = \`\${Date.now()}-\${Math.floor(Math.random() * 10000)}-\${fileObj.name.replace(/[^a-zA-Z0-9.]/g, "_")}\`;
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
`;
code = code.replace(
  'const handleSubmit = async (e: React.FormEvent) => {',
  handleFileUploadCode + '\n  const handleSubmit = async (e: React.FormEvent) => {'
);

// Update Formspree forward to include payment proof
code = code.replace(
  'total: `Rp ${totalCost}.000`,',
  'total: `Rp ${totalCost}.000`,\n          payment_proof: paymentProofUrl || "-",'
);

// Update handleSubmit to check for payment proof and insert directly to supabase if API fails
code = code.replace(
  `    if (cart.length === 0) return setErrorMessage("Keranjang belanja Anda masih kosong!");`,
  `    if (cart.length === 0) return setErrorMessage("Keranjang belanja Anda masih kosong!");\n    if (!paymentProofUrl) return setErrorMessage("Harap unggah bukti pembayaran QRIS terlebih dahulu kawan.");`
);

// Replace handleSubmit body logic
const newSubmitLogic = `
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
`;

code = code.replace(/const orderItems: OrderItem\[\] = cart\.map\([\s\S]*?finally {\s*setIsSubmitting\(false\);\s*}\s*};/, newSubmitLogic);

// Replace button UI and add QRIS UI
const oldUI = `                    <button
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
                    </button>`;

const qrisUI = `
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
                                className={\`w-full py-3.5 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 \${isUploading ? "opacity-50 pointer-events-none" : ""}\`}
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
`;

code = code.replace(oldUI, qrisUI);

// Fix AnimatePresence double unmount
code = code.replace(
  'if (!isOpen) return null;\n\n  return (\n    <AnimatePresence>\n',
  'return (\n    <AnimatePresence>\n      {isOpen && (\n'
);
// And close it at the end
code = code.replace(
  '        </motion.div>\n      </div>\n    </AnimatePresence>',
  '        </motion.div>\n      </div>\n      )}\n    </AnimatePresence>'
);

fs.writeFileSync(file, code);
