import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 
  (typeof window !== "undefined" && (window as any).__SUPABASE_URL__) ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  "";

const supabaseAnonKey = 
  (typeof window !== "undefined" && (window as any).__SUPABASE_ANON_KEY__) ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
