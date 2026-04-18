// Admin Supabase client — bypasses RLS
// Use ONLY in API routes / server actions that need full access
// Never expose the service role key to the client
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL. " +
        "Set these in .env.local"
      );
    }
    
    _admin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _admin;
}

// Convenience export — call as supabaseAdmin() to get the client
export const supabaseAdmin = getSupabaseAdmin;
