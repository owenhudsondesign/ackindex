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
    console.log('Staff auth - All cookies:', allCookies.map(c => ({ name: c.name, valueLength: c.value?.length })));

    // Find the Supabase auth token cookie
    const authCookie = allCookies.find(c => c.name.includes('-auth-token'));
    if (!authCookie) {
      console.log('Staff auth - No auth cookie found');
      return null;
    }

    // The cookie value could be:
    // 1. A JSON array with JWT as first element: ["eyJ..."]
    // 2. A raw JWT token: eyJ...
    // 3. base64 encoded
    try {
      let cookieValue = authCookie.value;
      let accessToken: string;

      console.log('Staff auth - Cookie value prefix:', cookieValue.substring(0, 20));

      // Handle "base64-" prefix format - the content is base64-encoded JSON
      if (cookieValue.startsWith('base64-')) {
        const base64Content = cookieValue.substring(7);
        try {
          const decodedJson = Buffer.from(base64Content, 'base64').toString('utf-8');
          const parsed = JSON.parse(decodedJson);
          accessToken = parsed.access_token || (Array.isArray(parsed) ? parsed[0] : null);
          console.log('Staff auth - Decoded base64 JSON, token length:', accessToken?.length);
        } catch (e) {
          console.log('Staff auth - Failed to decode base64 JSON:', e);
          return null;
        }
      }
      // Check if it's a JSON array (starts with "[")
      else if (cookieValue.startsWith('[')) {
        try {
          const parsed = JSON.parse(cookieValue);
          accessToken = Array.isArray(parsed) ? parsed[0] : parsed;
          console.log('Staff auth - Parsed JSON array, token length:', accessToken?.length);
        } catch (e) {
          console.log('Staff auth - Failed to parse as JSON array:', e);
          return null;
        }
      } else if (cookieValue.startsWith('eyJ')) {
        // Raw JWT token
        accessToken = cookieValue;
        console.log('Staff auth - Using raw JWT token, length:', accessToken.length);
      } else {
        console.log('Staff auth - Cookie format not recognized');
        return null;
      }

      if (!accessToken || !accessToken.startsWith('eyJ')) {
        console.log('Staff auth - No valid JWT token found');
        return null;
      }

      // Verify the token with Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
      console.log('Staff auth - Auth result:', { hasUser: !!user, userId: user?.id, error: error?.message });

      if (user) {
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
