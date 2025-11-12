/**
 * Supabase Client for Client Components
 * Use this in 'use client' components
 */

import { createClient as createSupabaseClient } from '@/lib/supabase';

export function createClient() {
  return createSupabaseClient();
}
