/**
 * Server-Side Admin Authentication Utilities
 * For use in API routes with Next.js server components
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Check if a user has admin role
 * Returns the admin user info if they're an admin, null otherwise
 */
export async function checkAdminRole(userId: string): Promise<{ id: string; email: string; role: string } | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data || data.role !== 'admin') {
      return null;
    }

    // Get user email from auth
    const { data: { user } } = await supabase.auth.getUser();

    return {
      id: userId,
      email: user?.email || '',
      role: data.role
    };
  } catch (error) {
    console.error('Error checking admin role:', error);
    return null;
  }
}

/**
 * Require admin access in API routes
 * Returns admin user if authorized, or error response if not
 *
 * Usage:
 * const adminOrError = await requireAdminApi(user);
 * if (adminOrError instanceof NextResponse) return adminOrError;
 * // adminOrError is now guaranteed to be admin user
 */
export async function requireAdminApi(
  user: { id: string; email?: string } | null
): Promise<{ id: string; email: string; role: string } | NextResponse> {
  // Check if user is authenticated
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  // Check if user is admin
  const adminUser = await checkAdminRole(user.id);

  if (!adminUser) {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    );
  }

  return adminUser;
}

/**
 * Create a server-side Supabase client for API routes
 * Helper function to reduce boilerplate
 */
export async function createAdminSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
