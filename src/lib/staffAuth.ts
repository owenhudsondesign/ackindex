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
      console.log('Staff auth - No auth cookie found');
      return null;
    }

    // The cookie value could be:
    // 1. A JSON array with [access_token, refresh_token]: ["eyJ...", "eyJ..."]
    // 2. A raw JWT token: eyJ...
    // 3. base64 encoded
    try {
      let cookieValue = authCookie.value;
      let accessToken: string;
      let refreshToken: string | undefined;

      // Handle "base64-" prefix format if present
      if (cookieValue.startsWith('base64-')) {
        cookieValue = cookieValue.substring(7);
      }

      // Check if it's a JSON array (starts with "[")
      if (cookieValue.startsWith('[')) {
        try {
          const parsed = JSON.parse(cookieValue);
          if (Array.isArray(parsed)) {
            accessToken = parsed[0];
            refreshToken = parsed[1]; // Second element is refresh token
          } else {
            accessToken = parsed;
          }
        } catch {
          console.log('Staff auth - Failed to parse JSON cookie');
          return null;
        }
      } else if (cookieValue.startsWith('eyJ')) {
        // Raw JWT token
        accessToken = cookieValue;
      } else {
        console.log('Staff auth - Unknown cookie format');
        return null;
      }

      if (!accessToken || !accessToken.startsWith('eyJ')) {
        console.log('Staff auth - No valid access token');
        return null;
      }

      // Verify the token with Supabase
      let { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

      // If access token is expired/invalid but we have a refresh token, try to refresh
      if (error && refreshToken) {
        console.log('Staff auth - Access token failed, trying refresh token');
        const { data: refreshData, error: refreshError } = await supabaseAdmin.auth.refreshSession({
          refresh_token: refreshToken,
        });

        if (refreshData?.user && !refreshError) {
          user = refreshData.user;
          error = null;
          console.log('Staff auth - Successfully refreshed session');
        } else {
          console.log('Staff auth - Refresh failed:', refreshError?.message);
        }
      }

      if (user && !error) {
        return { user, supabase: supabaseAdmin };
      }

      if (error) {
        console.log('Staff auth - Token verification failed:', error.message);
      }
    } catch (parseError) {
      console.error('Staff auth - Cookie parse error:', parseError);
    }
  } catch (error) {
    console.error('Staff auth - Auth error:', error);
  }
  return null;
}
