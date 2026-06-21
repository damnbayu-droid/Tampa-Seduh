import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "https://yizsanjcyphlbtjcwzxl.supabase.co") as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_hwpesUwLh612Wxj-gQx-RA_lcSIGuvb") as string;

let supabaseClient: any;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase Client] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diisi di environment. Google Login & sinkronisasi Supabase tidak akan berfungsi."
  );
  
  // Objek tiruan (mock) agar website tidak crash jika variabel lingkungan kosong
  supabaseClient = {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithOAuth: async () => ({ data: null, error: new Error("Supabase URL / Anon Key tidak diset") }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null })
        })
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    })
  };
} else {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error("Gagal menginisialisasi client Supabase:", err);
    supabaseClient = {
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithOAuth: async () => ({ data: null, error: err }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null })
          })
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      })
    };
  }
}

export const supabase = supabaseClient;
