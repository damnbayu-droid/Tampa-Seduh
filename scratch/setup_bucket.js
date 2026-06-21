import pg from 'pg';

const connString = "postgresql://postgres:Kotabunan*98@db.yizsanjcyphlbtjcwzxl.supabase.co:5432/postgres";
const pool = new pg.Pool({ connectionString: connString });

async function setupBucket() {
  const client = await pool.connect();
  try {
    console.log("Creating 'Bukti Bayar' bucket...");
    await client.query(`
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('Bukti Bayar', 'Bukti Bayar', true) 
      ON CONFLICT (id) DO UPDATE SET public = true;
    `);
    console.log("Bucket created/updated.");

    console.log("Applying RLS policies to storage.objects...");
    
    // Policy for SELECT
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'public_select_bukti_bayar'
        ) THEN
            CREATE POLICY "public_select_bukti_bayar" ON storage.objects FOR SELECT TO public USING (bucket_id = 'Bukti Bayar');
        END IF;
      END
      $$;
    `);

    // Policy for INSERT
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'public_upload_bukti_bayar'
        ) THEN
            CREATE POLICY "public_upload_bukti_bayar" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'Bukti Bayar');
        END IF;
      END
      $$;
    `);
    
    // Policy for DELETE (Opsional, tapi mungkin berguna untuk membersihkan cache admin)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'public_delete_bukti_bayar'
        ) THEN
            CREATE POLICY "public_delete_bukti_bayar" ON storage.objects FOR DELETE TO public USING (bucket_id = 'Bukti Bayar');
        END IF;
      END
      $$;
    `);

    console.log("RLS policies applied successfully!");
  } catch (err) {
    console.error("Error setting up bucket:", err);
  } finally {
    client.release();
    pool.end();
  }
}

setupBucket();
