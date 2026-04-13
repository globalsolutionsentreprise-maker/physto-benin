import { createClient } from "@supabase/supabase-js"

// Instance unique partagée - pattern singleton correct
let supabaseInstance = null

export function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        }
      }
    )
  }
  return supabaseInstance
}

export const supabase = getSupabase()
