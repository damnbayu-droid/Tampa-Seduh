-- =============================================================
-- SECURITY HARDENING MIGRASI - TABEL USERS (PHASE 2A)
-- Tampa Seduh Kedai Kopi
-- =============================================================

-- 1. Buat atau perbarui Fungsi Trigger untuk membatasi manipulasi kolom sensitif
CREATE OR REPLACE FUNCTION public.check_user_columns_policy()
RETURNS TRIGGER AS $$
BEGIN
  -- 1.1. Jika query dieksekusi oleh superuser (postgres via direct connection) atau service_role, bypass seluruh pemeriksaan.
  IF current_user = 'postgres' OR current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 1.2. Validasi untuk operasi INSERT (Pendaftaran Baru / Google Sync Pertama)
  IF TG_OP = 'INSERT' THEN
    -- Mencegah pendaftaran langsung dengan role 'admin', is_blocked = true, atau membership aktif
    IF NEW.role IS DISTINCT FROM 'customer' OR
       NEW.is_blocked IS DISTINCT FROM false OR
       NEW.membership_status IS DISTINCT FROM 'none' OR
       NEW.is_member IS DISTINCT FROM false OR
       NEW.orders_count IS DISTINCT FROM 0
    THEN
      RAISE EXCEPTION 'Akses ditolak: Pendaftaran awal hanya diizinkan dengan peranan customer biasa dan tanpa status member aktif.';
    END IF;
  END IF;

  -- 1.3. Validasi untuk operasi UPDATE (Modifikasi Profil dari Client)
  IF TG_OP = 'UPDATE' THEN
    -- Memastikan pengguna hanya mengupdate baris miliknya sendiri berdasarkan UUID auth
    IF auth.uid() IS NULL OR auth.uid()::text != OLD.id THEN
      RAISE EXCEPTION 'Akses ditolak: Anda hanya dapat memperbarui data profil Anda sendiri.';
    END IF;

    -- Mencegah customer mengubah kolom terproteksi (role, status blokir, membership, order limit, dll)
    IF OLD.role IS DISTINCT FROM NEW.role OR
       OLD.is_blocked IS DISTINCT FROM NEW.is_blocked OR
       OLD.membership_status IS DISTINCT FROM NEW.membership_status OR
       OLD.is_member IS DISTINCT FROM NEW.is_member OR
       OLD.orders_count IS DISTINCT FROM NEW.orders_count
    THEN
      RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin untuk memodifikasi kolom terproteksi (role, status, membership, orders_count).';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Pasang Trigger ke tabel users
DROP TRIGGER IF EXISTS check_user_columns_trigger ON public.users;
CREATE TRIGGER check_user_columns_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_columns_policy();

-- 3. Konfigurasi Row Level Security (RLS) untuk Tabel Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Hapus policy select dan update lama agar tidak tumpang tindih
DROP POLICY IF EXISTS "Public can view users" ON public.users;
DROP POLICY IF EXISTS "Public can insert users" ON public.users;
DROP POLICY IF EXISTS "Public can update users" ON public.users;
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile fields" ON public.users;

-- 3.1. Policy SELECT: Pengguna hanya boleh melihat data miliknya sendiri (kecuali postgres / service_role)
CREATE POLICY "Users can only view their own profile" ON public.users
  FOR SELECT
  USING (
    current_user = 'postgres' OR 
    current_user = 'service_role' OR 
    (auth.uid() IS NOT NULL AND auth.uid()::text = id)
  );

-- 3.2. Policy INSERT: Publik diizinkan mendaftar (validasi role dilakukan oleh trigger)
CREATE POLICY "Public can insert users" ON public.users
  FOR INSERT
  WITH CHECK (true);

-- 3.3. Policy UPDATE: Pengguna diizinkan memperbarui profil mereka sendiri (kolom divalidasi oleh trigger)
CREATE POLICY "Users can update their own profile fields" ON public.users
  FOR UPDATE
  USING (
    current_user = 'postgres' OR 
    current_user = 'service_role' OR 
    (auth.uid() IS NOT NULL AND auth.uid()::text = id)
  )
  WITH CHECK (
    current_user = 'postgres' OR 
    current_user = 'service_role' OR 
    (auth.uid() IS NOT NULL AND auth.uid()::text = id)
  );
