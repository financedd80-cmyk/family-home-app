import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && process.env.NODE_ENV !== "production") {
  console.error(
    "Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL and/or " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY are missing. Copy .env.local.example " +
      "to .env.local and fill in your project's values, then restart the dev server."
  );
}

// `supabase` is null when env vars are missing so the app can fall back to
// demo data instead of crashing (see isSupabaseConfigured above).
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
