import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase Client] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diisi di .env. Google Login tidak akan berfungsi."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
