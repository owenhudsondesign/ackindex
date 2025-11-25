import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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

// Helper to get user from cookies
async function getUserFromRequest() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('Staff uploads - All cookies:', allCookies.map(c => ({ name: c.name, valueLength: c.value?.length })));

    // Find the Supabase auth token cookie
    const authCookie = allCookies.find(c => c.name.includes('-auth-token'));
    if (!authCookie) {
      console.log('Staff uploads - No auth cookie found');
      return null;
    }

    // The cookie value could be:
    // 1. A JSON array with JWT as first element: ["eyJ..."]
    // 2. A raw JWT token: eyJ...
    // 3. base64 encoded
    try {
      let cookieValue = authCookie.value;
      let accessToken: string;

      console.log('Staff uploads - Cookie value prefix:', cookieValue.substring(0, 20));

      // Handle "base64-" prefix format - decode the base64 content
      if (cookieValue.startsWith('base64-')) {
        const base64Content = cookieValue.substring(7);
        try {
          cookieValue = Buffer.from(base64Content, 'base64').toString('utf-8');
          console.log('Staff uploads - Decoded base64, result prefix:', cookieValue.substring(0, 30));
        } catch (e) {
          console.log('Staff uploads - Failed to decode base64:', e);
          return null;
        }
      }

      // Parse the cookie value - could be JSON object, JSON array, or raw JWT
      if (cookieValue.startsWith('{')) {
        // JSON object format: {"access_token": "...", "refresh_token": "..."}
        try {
          const parsed = JSON.parse(cookieValue);
          accessToken = parsed.access_token || parsed.accessToken;
          console.log('Staff uploads - Parsed JSON object, token length:', accessToken?.length);
        } catch (e) {
          console.log('Staff uploads - Failed to parse as JSON object:', e);
          return null;
        }
      } else if (cookieValue.startsWith('[')) {
        // JSON array format: ["access_token", "refresh_token"]
        try {
          const parsed = JSON.parse(cookieValue);
          accessToken = Array.isArray(parsed) ? parsed[0] : parsed;
          console.log('Staff uploads - Parsed JSON array, token length:', accessToken?.length);
        } catch (e) {
          console.log('Staff uploads - Failed to parse as JSON array:', e);
          return null;
        }
      } else if (cookieValue.startsWith('eyJ')) {
        // Raw JWT token
        accessToken = cookieValue;
        console.log('Staff uploads - Using raw JWT token, length:', accessToken.length);
      } else {
        console.log('Staff uploads - Cookie format not recognized');
        return null;
      }

      if (!accessToken || !accessToken.startsWith('eyJ')) {
        console.log('Staff uploads - No valid JWT token found');
        return null;
      }

      // Verify the token with Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
      console.log('Staff uploads - Auth result:', { hasUser: !!user, userId: user?.id, error: error?.message });

      if (user) {
        return { user, supabase: supabaseAdmin };
      }
    } catch (parseError) {
      console.error('Staff uploads - Cookie parse error:', parseError);
    }
  } catch (error) {
    console.error('Staff uploads - Auth error:', error);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getUserFromRequest();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, supabase } = auth;

    // Get user's uploads
    const { data: uploads, error: uploadsError } = await supabase
      .from('meeting_videos')
      .select('*')
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false });

    if (uploadsError) {
      console.error('Uploads fetch error:', uploadsError);
      return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 });
    }

    // Get active upload sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('video_upload_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Sessions fetch error:', sessionsError);
      // Non-fatal
    }

    return NextResponse.json({
      uploads: uploads || [],
      activeSessions: sessions || [],
    });

  } catch (error) {
    console.error('Get uploads error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
