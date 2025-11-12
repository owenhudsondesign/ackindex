/**
 * Supabase Client for Server Components
 * Use this in server components and API routes
 */

import { createClient as createSupabaseServerClient } from '@supabase/supabase-js';

export async function createClient() {
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
