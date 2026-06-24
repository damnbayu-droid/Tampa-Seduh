import React from "react";
import { motion } from "motion/react";
import { ArrowLeft, Shield, FileText, RefreshCw } from "lucide-react";

const EFFECTIVE_DATE = "1 Juni 2025";
const BRAND = "Tampa Seduh";
const DOMAIN = "www.tampaseduh.com";
const EMAIL = "kopi@tampaseduh.com";
const WA = "085696224448";

interface PolicyLayoutProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  onBack: () => void;
  children: React.ReactNode;
}

function PolicyLayout({ title, subtitle, icon, accentColor, onBack, children }: PolicyLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F9F7F2] dark:bg-zinc-950 text-stone-900 dark:text-stone-100">
      {/* Header */}
      <div className={`${accentColor} text-white py-16 px-4`}>
        <div className="max-w-3xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 cursor-pointer text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Tampa Seduh
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/10 rounded-2xl">
              {icon}
            </div>
            <div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Tampa Seduh Legal</p>
              <h1 className="text-3xl sm:text-4xl font-serif font-black leading-tight">{title}</h1>
            </div>
          </div>
          <p className="text-white/70 text-sm">{subtitle}</p>
          <p className="text-white/50 text-xs mt-2">Berlaku sejak: {EFFECTIVE_DATE}</p>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto px-4 py-12"
      >
        <div className="prose prose-stone dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        <div className="mt-12 p-5 bg-amber-50 dark:bg-zinc-800/50 rounded-2xl border border-amber-200 dark:border-zinc-700">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Pertanyaan terkait kebijakan ini? Hubungi kami di{" "}
            <a href={`mailto:${EMAIL}`} className="text-amber-700 dark:text-amber-400 font-bold hover:underline">{EMAIL}</a>{" "}
            atau WhatsApp{" "}
            <a href={`https://wa.me/62${WA.substring(1)}`} className="text-amber-700 dark:text-amber-400 font-bold hover:underline">+62 {WA}</a>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-serif font-black text-amber-900 dark:text-amber-400 border-b border-amber-200 dark:border-zinc-700 pb-2 mb-4">{title}</h2>
      <div className="space-y-3 text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// 1. PRIVACY POLICY
// ═══════════════════════════════════════════════════
export function PrivacyPolicyPage({ onBack }: { onBack: () => void }) {
  return (
    <PolicyLayout
      title="Privacy Policy"
      subtitle="Bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda."
      icon={<Shield className="w-8 h-8 text-white" />}
      accentColor="bg-gradient-to-br from-amber-900 to-amber-800"
      onBack={onBack}
    >
      <Section title="1. Pendahuluan">
        <p>
          {BRAND} ("<strong>kami</strong>") berkomitmen untuk melindungi privasi Anda. Kebijakan Privasi ini menjelaskan
          bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda ketika menggunakan layanan di{" "}
          <strong>{DOMAIN}</strong>.
        </p>
        <p>
          Dengan menggunakan layanan kami, Anda menyetujui praktik yang dijelaskan dalam kebijakan ini.
        </p>
      </Section>

      <Section title="2. Data yang Kami Kumpulkan">
        <p>Kami dapat mengumpulkan informasi berikut:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Data Identitas:</strong> Nama lengkap, username akun.</li>
          <li><strong>Data Kontak:</strong> Nomor WhatsApp, alamat email.</li>
          <li><strong>Data Pengiriman:</strong> Alamat pengantaran, kecamatan/kelurahan.</li>
          <li><strong>Data Transaksi:</strong> Riwayat pesanan, item yang dipesan, total pembayaran.</li>
          <li><strong>Data Teknis:</strong> IP address, jenis browser, perangkat yang digunakan (dikumpulkan otomatis).</li>
          <li><strong>Foto Upload:</strong> Foto yang Anda unggah secara sukarela ke galeri Customer Emotions.</li>
        </ul>
      </Section>

      <Section title="3. Cara Kami Menggunakan Data Anda">
        <p>Data Anda digunakan untuk:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Memproses dan mengantarkan pesanan Anda.</li>
          <li>Mengirimkan konfirmasi pesanan dan notifikasi via WhatsApp atau email.</li>
          <li>Meningkatkan kualitas layanan dan pengalaman pengguna.</li>
          <li>Mencegah penipuan dan menjaga keamanan platform.</li>
          <li>Memenuhi kewajiban hukum yang berlaku di Indonesia.</li>
        </ul>
      </Section>

      <Section title="4. Keamanan Data">
        <p>
          Kami menggunakan enkripsi (HTTPS/TLS), sistem autentikasi aman (Supabase Auth), dan pembatasan akses berlapis
          untuk melindungi data Anda. Hanya admin terverifikasi yang dapat mengakses data pesanan dan pengguna.
        </p>
        <p>
          Meski demikian, tidak ada sistem yang 100% aman. Kami mendorong Anda untuk menggunakan kata sandi yang kuat
          dan tidak membagikan akun Anda kepada pihak lain.
        </p>
      </Section>

      <Section title="5. Berbagi Data dengan Pihak Ketiga">
        <p>
          Kami <strong>tidak menjual</strong> data pribadi Anda kepada pihak ketiga. Data hanya dibagikan kepada:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Supabase:</strong> Platform database kami (data tersimpan aman di server Supabase Inc.).</li>
          <li><strong>Resend:</strong> Layanan email transaksional untuk pengiriman konfirmasi pesanan.</li>
          <li><strong>Otoritas hukum:</strong> Jika diwajibkan oleh hukum Indonesia yang berlaku.</li>
        </ul>
      </Section>

      <Section title="6. Hak-Hak Anda">
        <p>Sesuai dengan Undang-Undang No. 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP), Anda berhak:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Mengakses dan memperbarui data pribadi Anda melalui halaman akun.</li>
          <li>Meminta penghapusan akun dan data terkait.</li>
          <li>Mengajukan keberatan atas penggunaan data tertentu.</li>
        </ul>
        <p>Untuk menggunakan hak-hak ini, hubungi kami di <strong>{EMAIL}</strong>.</p>
      </Section>

      <Section title="7. Cookie & Penyimpanan Lokal">
        <p>
          Kami menggunakan <em>localStorage</em> browser untuk menyimpan sesi login dan preferensi tampilan (dark/light mode).
          Tidak ada cookie pihak ketiga untuk pelacakan iklan yang dipasang di situs ini.
        </p>
      </Section>

      <Section title="8. Perubahan Kebijakan">
        <p>
          Kami berhak memperbarui kebijakan ini sewaktu-waktu. Perubahan signifikan akan diberitahukan melalui notifikasi
          di website atau email. Penggunaan layanan setelah perubahan dianggap sebagai persetujuan terhadap kebijakan baru.
        </p>
      </Section>
    </PolicyLayout>
  );
}

// ═══════════════════════════════════════════════════
// 2. TERMS & CONDITIONS
// ═══════════════════════════════════════════════════
export function TermsConditionsPage({ onBack }: { onBack: () => void }) {
  return (
    <PolicyLayout
      title="Terms & Conditions"
      subtitle="Syarat dan ketentuan penggunaan layanan Tampa Seduh."
      icon={<FileText className="w-8 h-8 text-white" />}
      accentColor="bg-gradient-to-br from-stone-800 to-stone-700"
      onBack={onBack}
    >
      <Section title="1. Penerimaan Syarat">
        <p>
          Dengan mengakses dan menggunakan layanan {BRAND} di <strong>{DOMAIN}</strong>, Anda menyatakan bahwa Anda
          telah membaca, memahami, dan menyetujui Syarat dan Ketentuan ini. Jika Anda tidak setuju, mohon hentikan
          penggunaan layanan kami.
        </p>
      </Section>

      <Section title="2. Layanan yang Disediakan">
        <p>{BRAND} menyediakan:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Platform pemesanan minuman kopi, teh, dan snack secara online.</li>
          <li>Layanan pengantaran ke area Kotabunan, Tutuyan, Panang, dan Paret (Boltim).</li>
          <li>Informasi menu, paket promo, dan konten edukasi kopi.</li>
          <li>Galeri foto komunitas pelanggan (Customer Emotions).</li>
        </ul>
      </Section>

      <Section title="3. Persyaratan Akun Pengguna">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Anda harus berusia minimal 13 tahun untuk mendaftar akun.</li>
          <li>Informasi yang diberikan saat pendaftaran harus akurat dan terkini.</li>
          <li>Anda bertanggung jawab atas keamanan kata sandi akun Anda.</li>
          <li>Satu orang hanya diperbolehkan memiliki satu akun aktif.</li>
          <li>Akun yang terbukti digunakan untuk penipuan akan diblokir permanen.</li>
        </ul>
      </Section>

      <Section title="4. Proses Pemesanan & Pembayaran">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Pesanan dianggap sah setelah Anda berhasil menyelesaikan proses checkout.</li>
          <li>Pembayaran dilakukan melalui QRIS, transfer bank, atau COD (bayar di tempat).</li>
          <li>Bukti pembayaran digital (QRIS/Transfer) wajib diunggah untuk konfirmasi otomatis.</li>
          <li>Harga yang tercantum di website adalah harga final termasuk ongkos kirim standar.</li>
          <li>Kami berhak membatalkan pesanan jika terjadi kesalahan harga atau ketersediaan stok.</li>
        </ul>
      </Section>

      <Section title="5. Pengiriman">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Estimasi pengiriman: <strong>15–45 menit</strong> tergantung jarak dan kondisi jalan.</li>
          <li>Pesanan online dapat dilakukan 24 jam, namun proses pengantaran menyesuaikan jam operasional kurir.</li>
          <li>Kami tidak bertanggung jawab atas keterlambatan akibat kondisi cuaca ekstrem atau kejadian di luar kendali kami.</li>
          <li>Alamat pengiriman yang salah atau tidak lengkap sepenuhnya menjadi tanggung jawab pelanggan.</li>
        </ul>
      </Section>

      <Section title="6. Konten yang Diunggah Pengguna">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Foto yang diunggah ke Customer Emotions harus sesuai dan tidak melanggar norma.</li>
          <li>Kami berhak menolak atau menghapus konten yang tidak pantas tanpa pemberitahuan.</li>
          <li>Dengan mengunggah foto, Anda memberikan izin kepada {BRAND} untuk menampilkannya di website.</li>
        </ul>
      </Section>

      <Section title="7. Hak Kekayaan Intelektual">
        <p>
          Seluruh konten di {DOMAIN} — termasuk nama brand, logo, foto produk, dan teks — adalah milik {BRAND} dan
          dilindungi hukum hak cipta Indonesia. Dilarang menyalin atau mendistribusikan tanpa izin tertulis.
        </p>
      </Section>

      <Section title="8. Pembatasan Tanggung Jawab">
        <p>
          {BRAND} tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau konsekuensial yang timbul dari
          penggunaan layanan kami. Tanggung jawab maksimal kami terbatas pada nilai transaksi yang bersangkutan.
        </p>
      </Section>

      <Section title="9. Hukum yang Berlaku">
        <p>
          Syarat dan ketentuan ini diatur oleh hukum Republik Indonesia. Setiap sengketa diselesaikan melalui musyawarah
          mufakat, dan jika tidak tercapai, melalui pengadilan yang berwenang di Kabupaten Bolaang Mongondow Timur.
        </p>
      </Section>

      <Section title="10. Perubahan Syarat">
        <p>
          Kami berhak memperbarui Syarat dan Ketentuan ini. Versi terbaru selalu tersedia di {DOMAIN}/terms-and-conditions.
          Penggunaan berkelanjutan setelah perubahan dianggap sebagai penerimaan.
        </p>
      </Section>
    </PolicyLayout>
  );
}

// ═══════════════════════════════════════════════════
// 3. REFUND POLICY
// ═══════════════════════════════════════════════════
export function RefundPolicyPage({ onBack }: { onBack: () => void }) {
  return (
    <PolicyLayout
      title="Refund Policy"
      subtitle="Kebijakan pengembalian dana untuk pesanan di Tampa Seduh."
      icon={<RefreshCw className="w-8 h-8 text-white" />}
      accentColor="bg-gradient-to-br from-emerald-900 to-emerald-800"
      onBack={onBack}
    >
      <Section title="1. Komitmen Kepuasan Pelanggan">
        <p>
          {BRAND} berkomitmen memberikan produk dan layanan terbaik. Jika Anda tidak puas dengan pesanan Anda,
          kami akan berusaha menyelesaikan setiap masalah dengan adil dan cepat.
        </p>
      </Section>

      <Section title="2. Kondisi yang Memenuhi Syarat Refund">
        <p>Pengembalian dana dapat diproses jika:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Pesanan tidak diterima:</strong> Pesanan tidak sampai dalam waktu yang wajar tanpa sebab yang dapat dimaklumi.</li>
          <li><strong>Pesanan salah:</strong> Produk yang dikirim berbeda signifikan dari yang dipesan (contoh: rasa, ukuran, atau item salah).</li>
          <li><strong>Produk rusak:</strong> Minuman tumpah atau kemasan rusak parah saat tiba dan terbukti bukan akibat penanganan pelanggan.</li>
          <li><strong>Pembayaran double:</strong> Terjadi pembayaran ganda untuk pesanan yang sama.</li>
          <li><strong>Pesanan dibatalkan sebelum diproses:</strong> Pembatalan dilakukan sebelum pesanan mulai diproses oleh barista kami.</li>
        </ul>
      </Section>

      <Section title="3. Kondisi yang Tidak Memenuhi Syarat Refund">
        <p>Refund <strong>tidak dapat</strong> diproses jika:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Pesanan sudah sampai dan kondisi sesuai pesanan, namun pelanggan berubah pikiran.</li>
          <li>Keterlambatan pengiriman akibat alamat yang salah atau tidak dapat ditemukan.</li>
          <li>Produk sudah dikonsumsi sebagian atau seluruhnya.</li>
          <li>Pesanan dibatalkan setelah barista mulai memproses minuman.</li>
          <li>Klaim disampaikan lebih dari <strong>1 jam</strong> setelah pesanan diterima.</li>
        </ul>
      </Section>

      <Section title="4. Cara Mengajukan Refund">
        <p>Langkah-langkah pengajuan refund:</p>
        <ol className="list-decimal list-inside space-y-2 ml-2">
          <li>Hubungi kami melalui WhatsApp <strong>{WA}</strong> atau email <strong>{EMAIL}</strong> dalam waktu <strong>1 jam</strong> setelah pesanan diterima.</li>
          <li>Sertakan: <em>nomor pesanan, deskripsi masalah, dan foto bukti</em> (jika ada kerusakan/kesalahan).</li>
          <li>Tim kami akan meninjau klaim dalam waktu <strong>1×24 jam</strong> kerja.</li>
          <li>Jika klaim disetujui, refund atau kompensasi akan diproses.</li>
        </ol>
      </Section>

      <Section title="5. Metode Pengembalian Dana">
        <p>Refund yang disetujui akan dikembalikan melalui:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Transfer Bank:</strong> Dana dikembalikan ke rekening yang sama dengan sumber pembayaran (3–5 hari kerja).</li>
          <li><strong>QRIS/E-wallet:</strong> Dana dikembalikan dalam 1–3 hari kerja.</li>
          <li><strong>Kredit Tampa Seduh:</strong> Opsi kredit untuk pesanan berikutnya (langsung efektif).</li>
          <li><strong>COD:</strong> Pengembalian dilakukan secara tunai oleh kurir saat pengambilan produk.</li>
        </ul>
      </Section>

      <Section title="6. Penggantian Produk">
        <p>
          Sebagai alternatif dari refund, kami menawarkan opsi <strong>penggantian produk</strong> — pesanan yang
          sama akan diproses ulang dan diantar tanpa biaya tambahan. Opsi ini umumnya lebih cepat dari proses refund dana.
        </p>
      </Section>

      <Section title="7. Waktu Pemrosesan">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Verifikasi klaim: <strong>1×24 jam</strong></li>
          <li>Pengembalian dana: <strong>1–5 hari kerja</strong> (tergantung metode pembayaran)</li>
          <li>Penggantian produk: <strong>15–60 menit</strong> setelah klaim disetujui</li>
        </ul>
      </Section>

      <Section title="8. Kontak Pengaduan">
        <p>
          Kami serius menangani setiap pengaduan. Jika Anda tidak puas dengan respons awal kami, eskalasi pengaduan dapat
          disampaikan ke <strong>{EMAIL}</strong> dengan subjek "<em>Eskalasi Pengaduan – [Nomor Pesanan]</em>".
        </p>
        <p>
          Kami berkomitmen untuk merespons semua eskalasi dalam <strong>2×24 jam</strong> kerja.
        </p>
      </Section>
    </PolicyLayout>
  );
}
