import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create a supabase client with service role for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper to get user from cookies - handles Next.js 15 async cookies API
// and Supabase's cookie format which stores tokens as JSON arrays
export async function getStaffUserFromRequest() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Find the Supabase auth token cookie
    const authCookie = allCookies.find(c => c.name.includes('-auth-token'));
    if (!authCookie) {
      return null;
    }

    // The cookie value could be:
    // 1. A JSON array with JWT as first element: ["eyJ..."]
    // 2. A raw JWT token: eyJ...
    // 3. base64 encoded
    try {
      let cookieValue = authCookie.value;
      let accessToken: string;

      // Handle "base64-" prefix format if present
      if (cookieValue.startsWith('base64-')) {
        cookieValue = cookieValue.substring(7);
      }

      // Check if it's a JSON array (starts with "[")
      if (cookieValue.startsWith('[')) {
        try {
          const parsed = JSON.parse(cookieValue);
          accessToken = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch {
          return null;
        }
      } else if (cookieValue.startsWith('eyJ')) {
        // Raw JWT token
        accessToken = cookieValue;
      } else {
        return null;
      }

      if (!accessToken || !accessToken.startsWith('eyJ')) {
        return null;
      }

      // Verify the token with Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

      if (user && !error) {
        return { user, supabase: supabaseAdmin };
      }
    } catch (parseError) {
      console.error('Staff auth - Cookie parse error:', parseError);
    }
  } catch (error) {
    console.error('Staff auth - Auth error:', error);
  }
  return null;
}
