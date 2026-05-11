import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser + Server component client (cookie aware)
export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })
}

// Admin client using Service Role (use only in API routes / server actions)
export const createAdminClient = () =>
  createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

// Alias so old code importing { supabaseAdmin } still works
export const supabaseAdmin = createAdminClient()