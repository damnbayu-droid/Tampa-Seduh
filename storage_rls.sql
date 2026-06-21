-- 1. Buat Storage Bucket "Bukti Bayar" jika belum ada dan pastikan aksesnya Public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('Bukti Bayar', 'Bukti Bayar', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Izinkan siapapun (termasuk anon/publik) untuk mengunggah gambar ke bucket ini
CREATE POLICY "Izinkan publik upload Bukti Bayar" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'Bukti Bayar');

-- 3. Izinkan siapapun melihat gambar dari bucket ini
CREATE POLICY "Izinkan publik melihat Bukti Bayar" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'Bukti Bayar');

-- 4. (Opsional) Izinkan admin/sistem untuk update/delete gambar
CREATE POLICY "Izinkan publik delete Bukti Bayar" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'Bukti Bayar');
