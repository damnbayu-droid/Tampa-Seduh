import { createClient } from "@supabase/supabase-js";
class DummyWS {
    constructor() { console.log("DummyWS created"); }
    send() {}
    close() {}
}
const supabase = createClient("https://dummy.supabase.co", "dummy_key", {
    auth: { persistSession: false },
    realtime: { transport: DummyWS as any }
});
supabase.from("users").select("*").then(console.log).catch(console.error);
