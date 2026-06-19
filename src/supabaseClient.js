import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Surface a clear message instead of a cryptic network error later.
  console.error(
    "Missing Supabase env vars. Copy .env.example to .env and set " +
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(url, key);

// Whether config looks present — used by the UI to show a setup hint.
export const supabaseConfigured = Boolean(url && key);
