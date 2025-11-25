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

    // The cookie value is base64 encoded JSON with access_token
    try {
      // Try to decode the cookie - it might be base64 or JSON
      let tokenData;
      try {
        // First try: it might be raw JSON
        tokenData = JSON.parse(authCookie.value);
      } catch {
        // Second try: it might be base64 encoded
        const decoded = Buffer.from(authCookie.value, 'base64').toString('utf-8');
        tokenData = JSON.parse(decoded);
      }

      console.log('Staff uploads - Token data keys:', Object.keys(tokenData || {}));

      const accessToken = tokenData?.access_token || tokenData?.[0]?.access_token;
      if (!accessToken) {
        console.log('Staff uploads - No access token in cookie data');
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
