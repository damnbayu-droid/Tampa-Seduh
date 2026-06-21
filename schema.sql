-- SQL DDL untuk Inisialisasi Database Tampa Seduh di Supabase

-- Hapus tabel lama jika sudah ada untuk reset skema database secara bersih
DROP TABLE IF EXISTS menu CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS blog_news CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS ai_settings CASCADE;

-- 1. Tabel Menu
CREATE TABLE IF NOT EXISTS menu (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_reg INTEGER NOT NULL,
  price_large INTEGER,
  is_hot BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  image TEXT NOT NULL,
  description TEXT NOT NULL
);

-- 2. Tabel Paket Hemat Kopi
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  items JSONB NOT NULL,
  description TEXT NOT NULL,
  badge TEXT,
  image TEXT DEFAULT '/Produk/WhatsApp Image 2026-06-11 at 00.03.19.jpeg'
);

-- 3. Tabel Pesanan (Orders)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  items JSONB NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_method TEXT NOT NULL DEFAULT 'delivery',
  subtotal INTEGER NOT NULL DEFAULT 0,
  shipping_cost INTEGER NOT NULL DEFAULT 0,
  shipping_discount INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  payment_proof_url TEXT
);

-- 4. Tabel Pengguna (Users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL DEFAULT 'Kotabunan*98',
  role TEXT NOT NULL DEFAULT 'customer',
  is_member BOOLEAN NOT NULL DEFAULT false,
  orders_count INTEGER NOT NULL DEFAULT 0,
  last_active TEXT NOT NULL DEFAULT 'Baru saja'
);

-- 5. Tabel Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabel Berita/Blog (Blog News)
CREATE TABLE IF NOT EXISTS blog_news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  date TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  category TEXT NOT NULL
);

-- 7. Tabel Log Email
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  body TEXT NOT NULL
);

-- 8. Tabel Pengaturan AI (AI Settings)
CREATE TABLE IF NOT EXISTS ai_settings (
  key TEXT PRIMARY KEY,
  system_prompt TEXT NOT NULL,
  temperature DOUBLE PRECISION NOT NULL DEFAULT 0.7
);

-- -------------------------------------------------------------
-- SEED DATA AWAL (Optional / Mencegah Database Kosong)
-- -------------------------------------------------------------

-- Seed Menu
INSERT INTO menu (id, name, price_reg, price_large, is_hot, is_available, image, description) VALUES
('m1', 'Ice Coffe TPS', 15, 20, false, true, '/Produk/WhatsApp Image 2026-06-11 at 00.03.19.jpeg', 'Susu gurih dipadu espresso blend spesial khas Tampa Seduh. Kaya rasa dan manis seimbang.'),
('m2', 'Ice Coffe Brown Sugar', 18, 23, false, true, '/Produk/WhatsApp Image 2026-06-11 at 00.10.08.jpeg', 'Kopi susu espresso creamy dengan lelehan gula aren murni Sulawesi yang legit.'),
('m3', 'Ice Coffe Vanila', 18, 23, false, true, '/Produk/WhatsApp Image 2026-06-11 at 00.13.26.jpeg', 'Kombinasi espresso aromatik, susu dingin, dan sirup vanila lembut beraroma manis surgawi.'),
('m4', 'Ice Americano', 15, 20, false, true, '/Produk/WhatsApp Image 2026-06-11 at 00.18.04.jpeg', 'Double shot espresso Liberica-Arabica disiram air es jernih penenang dahaga.'),
('m5', 'Ice Matcha', 18, 23, false, true, '/Produk/WhatsApp Image 2026-06-11 at 00.20.53.jpeg', 'Matcha green tea organik impor beraroma teh segar alami bersatu dengan susu creamy dingin.'),
('m6', 'Ice Coklat', 18, 23, false, true, '/Produk/WhatsApp Image 2026-06-11 at 00.24.22.jpeg', 'Cokelat hitam premium produksi lokal dengan sensasi manis-pahit cokelat asli.'),
('m7', 'Ice Lemon Tea', 18, 23, false, true, '/Produk/WhatsApp Image 2026-06-11 at 00.29.46.jpeg', 'Seduhan teh hitam pilihan dipadu perasan jeruk lemon segar kental berlimpah es.'),
('m8', 'Ice Strawberry', 20, 25, false, true, '/Produk/WhatsApp Image 2026-06-11 at 00.35.22.jpeg', 'Minuman buah stroberi murni asam manis, diramu susu murni, menyegarkan suasana siang.'),
('m9', 'Aericano Hot', 10, NULL, true, true, '/Produk/WhatsApp Image 2026-06-11 at 00.18.04.jpeg', 'Espresso murni aromatik diseduh air panas membara, menghadirkan rasa asli biji kopi pilihan.'),
('m10', 'Coffe Susu Hot', 10, 12, true, true, '/Produk/WhatsApp Image 2026-06-11 at 00.37.53.jpeg', 'Kopi susu tradisional disajikan panas, memadukan bubuk kopi kuat dan kental manis.'),
('m11', 'Saraba', 10, NULL, true, true, '/Produk/WhatsApp Image 2026-06-11 at 00.44.57.jpeg', 'Minuman jahe legendaris khas Sulawesi Utara diramu dengan susu, rempah-rempah herbal, dan gula merah.'),
('m12', 'Lemon Tea Hot', 13, NULL, true, true, '/Produk/WhatsApp Image 2026-06-11 at 00.29.46.jpeg', 'Teh hitam hangat klasik disajikan dengan perasan lemon segar untuk menghangatkan badan.'),
('m13', 'Matcha Hot', 15, NULL, true, true, '/Produk/WhatsApp Image 2026-06-11 at 00.20.53.jpeg', 'Teh hijau matcha Jepang hangat dengan foam susu lembut yang wangi menenangkan pikiran.'),
('m14', 'Coklat Hot', 15, NULL, true, true, '/Produk/WhatsApp Image 2026-06-11 at 00.24.22.jpeg', 'Cokelat murni hangat khas daerah tropis, bertekstur kental manis-pahit yang meluapkan relaksasi.'),
('m-roti-coklat', 'Roti Kampung Coklat', 4, NULL, false, true, 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=500', 'Roti kampung legendaris khas Kotabunan dengan isian pasta cokelat manis lumer.'),
('m-roti-balak', 'Roti Kampung Balak', 4, NULL, false, true, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500', 'Roti kampung polos bertekstur padat lembut, sangat cocok dicelup ke kopi susu atau jahe Saraba.'),
('m-roti-moka', 'Roti Kampung Moka', 4, NULL, false, true, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500', 'Roti kampung harum moka dengan kelembutan rasa manis beraroma kopi moka khas.')
ON CONFLICT (id) DO NOTHING;

-- Seed Packages
INSERT INTO packages (id, name, price, items, description, badge, image) VALUES
('p1', 'Paket 1: Saraba + Roti Balak', 15, '["m11", "m-roti-balak", "m-roti-balak"]'::jsonb, '1 Saraba Jahe Hangat + 2 Roti Kampung Balak empuk. Penghangat sore paling pas jo kawan!', 'Khas Boltim', '/Produk/WhatsApp Image 2026-06-11 at 00.44.57.jpeg'),
('p2', 'Paket 2: Duo TPS Roti Coklat', 18, '["m1", "m-roti-coklat"]'::jsonb, '1 Ice Coffee TPS reguler dipadu 1 Roti Kampung Coklat manis lumer.', 'Terlaris', '/Produk/WhatsApp Image 2026-06-11 at 00.03.19.jpeg'),
('p3', 'Paket 3: Americano Roti Moka', 18, '["m4", "m-roti-moka"]'::jsonb, '1 Ice Americano segar dingin ditambah 1 Roti Kampung Moka harum aromatik.', 'Melek Lembur', '/Produk/WhatsApp Image 2026-06-11 at 00.18.04.jpeg'),
('p4', 'Paket 4: Kopi Susu Hot & Roti Balak', 13, '["m10", "m-roti-balak"]'::jsonb, '1 Kopi Susu Hot tradisional dan 1 Roti Kampung Balak klasik.', 'Tradisional', '/Produk/WhatsApp Image 2026-06-11 at 00.37.53.jpeg'),
('p5', 'Paket 5: Matcha Roti Coklat', 21, '["m5", "m-roti-coklat"]'::jsonb, '1 Ice Matcha latte dingin ditambah 1 Roti Kampung Coklat lezat.', 'Favorit', '/Produk/WhatsApp Image 2026-06-11 at 00.20.53.jpeg'),
('p6', 'Paket 6: Saraba Double Roti Coklat', 15, '["m11", "m-roti-coklat", "m-roti-coklat"]'::jsonb, '1 Saraba hangat khas Boltim ditemani 2 Roti Kampung Coklat lumer.', 'Rempah', '/Produk/WhatsApp Image 2026-06-11 at 00.44.57.jpeg'),
('p7', 'Paket 7: Brown Sugar & Roti Moka', 21, '["m2", "m-roti-moka"]'::jsonb, '1 Ice Coffee Brown Sugar aren dengan 1 Roti Kampung Moka.', 'Manis Legit', '/Produk/WhatsApp Image 2026-06-11 at 00.10.08.jpeg'),
('p8', 'Paket 8: Kenyang Lembur TPS', 20, '["m1", "m-roti-balak", "m-roti-balak"]'::jsonb, '1 Ice Coffee TPS reguler dipadukan dengan 2 Roti Kampung Balak.', 'Rame-Rame', '/Produk/WhatsApp Image 2026-06-11 at 00.03.19.jpeg')
ON CONFLICT (id) DO NOTHING;

-- Seed Users
INSERT INTO users (id, name, email, password, role, is_member, orders_count, last_active) VALUES
('u-admin-1', 'Mochammad Rifai (Owner)', 'kopi@tampaseduh.com', 'Kotabunan*98', 'admin', false, 0, 'Baru saja'),
('u-admin-2', 'Tampa Seduh Admin', 'tampaseduh@gmail.com', 'Kotabunan*98', 'admin', false, 0, 'Baru saja'),
('u-1', 'Andika Pratama', 'andika@gmail.com', 'andika123', 'customer', true, 1, '1 hari yang lalu'),
('u-2', 'Siti Rahma', 'siti.rahma@yahoo.com', 'siti123', 'customer', false, 1, '2 jam yang lalu'),
('u-3', 'Rivaldo Pontoh', 'rivaldo@outlook.co.id', 'rivaldo123', 'customer', true, 1, '30 menit yang lalu'),
('u-4', 'Jane Moningka', 'jane.m@gmail.com', 'jane123', 'customer', false, 0, '3 hari yang lalu')
ON CONFLICT (id) DO NOTHING;

-- Seed Berita
INSERT INTO blog_news (id, title, slug, content, author, date, cover_image, category) VALUES
('news-1', 'Mengenal Liberica Kotabunan: Biji Kopi Eksotis Kebanggaan Boltim', 'mengenal-liberica-kotabunan', 'Indonesia terkenal dengan keberagaman kopinya, salah satunya adalah varietas Liberica yang ditanam di pegunungan pesisir Kotabunan, Kabupaten Bolaang Mongondow Timur (Boltim), Sulawesi Utara. Biji kopi Liberica Kotabunan dikenal unik karena ukurannya yang besar—hampir menyamai buah nangka—serta ciri rasa istimewa. Dari tanah kaya besi vulkanis Trans Sulawesi Lingkar Selatan, kopi ini memantulkan wangi manis buah nangka (jackfruit) yang eksotis, dipadu rasa kayu hutan kayu oak yang elegan. Kandungan kafeinnya juga cenderung lebih rendah dan bersahabat di lambung dibanding Robusta.', 'Mochammad Rifai', '2026-06-15', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80', 'Biji Kopi'),
('news-2', 'Saraba: Minuman Rempah Tradisional Penghangat Cuaca Pesisir', 'saraba-penghangat-cuaca-pesisir', 'Di kala angin malam bertiup kencang melintasi Jalan Trans-Sulawesi, tidak ada yang lebih nikmat selain menyeduh cangkir hangat Saraba. Minuman jahe merah kental manis rempah kaya ini selalu disajikan di Tampa Seduh menggunakan gula kelapa asli Bolaang Mongondow. Sangat berkhasiat menjaga imunitas ditiap tetesnya, dan berkhasiat memberikan ketenangan dan kebugaran tubuh secara instan.', 'Tim Tampa Seduh', '2026-06-18', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&auto=format&fit=crop&q=80', 'Tips Seduh')
ON CONFLICT (id) DO NOTHING;

-- Seed AI Settings
INSERT INTO ai_settings (key, system_prompt, temperature) VALUES
('settings', 'Kamu adalah asisten digital virtual dari "Tampa Seduh", kedai kopi legendaris di Jl. Tangkudeagan No. 2 Kotabunan Selatan, Bolaang Mongondow Timur, Trans Sulawesi Lingkar Selatan.
Fokus kedai adalah minuman kopi dingin nikmat seperti Ice Coffe TPS, Ice Coffe Brown Sugar, dan kopi panas tradisional serta "Saraba" (minuman jahe rempah khas).
Biji kopi andalan kita adalah "Liberica Kotabunan" yang terkenal dengan rasa manis aroma nangka (jackfruit), buah-buahan tropis, aroma kayu oak yang smoky, dan bodi tebal namun rendah kafein & bersahabat bagi lambung.
Informasi Tambahan:
- Alamat: Jl. Tangkudeagan No. 2 Kotabunan Selatan.
- WA Admin: 085696224448.
- Email: kopi@tampaseduh.com.
- Jam Buka Kedai: Setiap hari pukul 18.00 WITA - 24.00 WITA (Layanan Pengantaran/Delivery aktif 24/7).
- Jika pelanggan ingin memesan langsung online, beri tahu mereka bahwa mereka bisa langsung mengklik tombol "Order Sekarang" yang ada di landing page untuk memicu formulir popup yang otomatis terkirim ke barista kami.

Jawablah dengan bahasa Indonesia yang ramah, sopan, bersahabat, penuh gairah kopi, dan logat khas Sulawesi Utara yang santun jika memungkinkan (misal memakai sapaan kawan, mar, mo, dll, namun tetap profesional!). Balaslah secara ringkas dan informatif.', 0.7)
ON CONFLICT (key) DO NOTHING;
